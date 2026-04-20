package com.gymcrm.common.auth;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.auth.service.AccessRevocationMarkerService;
import com.gymcrm.common.auth.service.AccessTokenDenylistService;
import com.gymcrm.common.auth.service.JwtTokenService;
import com.gymcrm.common.security.SecurityContextCurrentUserProvider.AuthenticatedUserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String API_PREFIX = "/api/v1/";
    private static final String PATH_AUTH_ME = "/api/v1/auth/me";
    private static final String PATH_AUTH_LOGOUT = "/api/v1/auth/logout";
    private static final String PATH_AUTH_PASSWORD = "/api/v1/auth/password";
    private static final String PATH_ACTUATOR_PROMETHEUS = "/actuator/prometheus";

    private final JwtTokenService jwtTokenService;
    private final AuthUserRepository authUserRepository;
    private final AccessTokenDenylistService accessTokenDenylistService;
    private final AccessRevocationMarkerService accessRevocationMarkerService;

    public JwtAuthenticationFilter(
            JwtTokenService jwtTokenService,
            AuthUserRepository authUserRepository,
            AccessTokenDenylistService accessTokenDenylistService,
            AccessRevocationMarkerService accessRevocationMarkerService
    ) {
        this.jwtTokenService = jwtTokenService;
        this.authUserRepository = authUserRepository;
        this.accessTokenDenylistService = accessTokenDenylistService;
        this.accessRevocationMarkerService = accessRevocationMarkerService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring("Bearer ".length()).trim();
        if (token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            JwtTokenService.AccessTokenClaims claims = jwtTokenService.parseAccessToken(token);
            if (accessTokenDenylistService.isDenied(claims.jti())) {
                throw new ApiException(com.gymcrm.common.error.ErrorCode.TOKEN_REVOKED, "무효화된 access token입니다.");
            }
            AuthUser user = authUserRepository.findById(claims.userId())
                    .orElseThrow(() -> new ApiException(com.gymcrm.common.error.ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));
            if (isRevokedByUserMarker(claims, user)) {
                throw new ApiException(com.gymcrm.common.error.ErrorCode.TOKEN_REVOKED, "운영 이벤트로 무효화된 access token입니다.");
            }
            if (!user.isActive()) {
                throw new ApiException(com.gymcrm.common.error.ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다.");
            }
            if (user.passwordChangeRequired() && !isPasswordChangeAllowedRequest(request)) {
                throw new ApiException(com.gymcrm.common.error.ErrorCode.PASSWORD_CHANGE_REQUIRED, "비밀번호 변경이 필요합니다.");
            }

            AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(
                    user.userId(),
                    user.centerId(),
                    user.loginId(),
                    claims.roleCode()
            );
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    List.of(new SimpleGrantedAuthority(claims.roleCode()))
            );
            authentication.setDetails(claims);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (ApiException ex) {
            SecurityContextHolder.clearContext();
            request.setAttribute("jwt_auth_exception", ex);
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRevokedByUserMarker(JwtTokenService.AccessTokenClaims claims, AuthUser user) {
        if (claims.issuedAt() == null) {
            return false;
        }
        var revokeAfter = accessRevocationMarkerService.resolveRevokeAfter(user.userId(), user.accessRevokedAfter());
        if (revokeAfter == null) {
            return false;
        }
        // Strict: any token issued at or before the revoke marker is revoked.
        // JwtTokenService.issueAccessToken() already pushes newly minted iat forward
        // past revokeAfter, so no grace window is needed on the validation side.
        return !claims.issuedAt().isAfter(revokeAfter);
    }

    private boolean isPasswordChangeAllowedRequest(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return false;
        }
        return path.equals(PATH_AUTH_ME)
                || path.equals(PATH_AUTH_LOGOUT)
                || path.equals(PATH_AUTH_PASSWORD);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return true;
        }
        return !path.startsWith(API_PREFIX) && !path.equals(PATH_ACTUATOR_PROMETHEUS);
    }
}
