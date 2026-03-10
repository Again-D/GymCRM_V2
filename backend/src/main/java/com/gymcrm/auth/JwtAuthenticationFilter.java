package com.gymcrm.auth;

import com.gymcrm.common.error.ApiException;
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
            AuthUser user = authUserRepository.findActiveById(claims.userId())
                    .filter(AuthUser::isActive)
                    .orElseThrow(() -> new ApiException(com.gymcrm.common.error.ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));
            if (isRevokedByUserMarker(claims, user)) {
                throw new ApiException(com.gymcrm.common.error.ErrorCode.TOKEN_REVOKED, "운영 이벤트로 무효화된 access token입니다.");
            }

            AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(
                    user.userId(),
                    user.centerId(),
                    user.loginId(),
                    user.roleCode()
            );
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    List.of(new SimpleGrantedAuthority(user.roleCode()))
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
        return revokeAfter != null && !claims.issuedAt().isAfter(revokeAfter);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return true;
        }
        return !path.startsWith("/api/v1/") && !path.equals("/actuator/prometheus");
    }
}
