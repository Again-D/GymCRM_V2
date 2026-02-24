package com.gymcrm.auth;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.core.env.Environment;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Arrays;

@RestController
@RequestMapping("/api/v1/auth")
@Validated
public class AuthController {
    private final AuthService authService;
    private final AuthCookieSupport authCookieSupport;
    private final JwtTokenService jwtTokenService;
    private final CurrentUserProvider currentUserProvider;
    private final Environment environment;

    public AuthController(
            AuthService authService,
            AuthCookieSupport authCookieSupport,
            JwtTokenService jwtTokenService,
            CurrentUserProvider currentUserProvider,
            Environment environment
    ) {
        this.authService = authService;
        this.authCookieSupport = authCookieSupport;
        this.jwtTokenService = jwtTokenService;
        this.currentUserProvider = currentUserProvider;
        this.environment = environment;
    }

    @PostMapping("/login")
    public ApiResponse<AuthTokenResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        AuthService.AuthTokens tokens = authService.login(new AuthService.LoginCommand(request.loginId(), request.password()));
        authCookieSupport.writeRefreshTokenCookie(response, tokens.refreshToken(), isProdProfileActive());
        return ApiResponse.success(AuthTokenResponse.from(tokens, jwtTokenService.accessTokenExpiresInSeconds()), "로그인에 성공했습니다.");
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthTokenResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String refreshToken = authCookieSupport.extractRefreshToken(request);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "refresh token cookie가 없습니다.");
        }
        AuthService.AuthTokens tokens = authService.refresh(refreshToken);
        authCookieSupport.writeRefreshTokenCookie(response, tokens.refreshToken(), isProdProfileActive());
        return ApiResponse.success(AuthTokenResponse.from(tokens, jwtTokenService.accessTokenExpiresInSeconds()), "토큰이 재발급되었습니다.");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = authCookieSupport.extractRefreshToken(request);
        authService.logout(refreshToken);
        authCookieSupport.clearRefreshTokenCookie(response, isProdProfileActive());
        return ApiResponse.success(null, "로그아웃되었습니다.");
    }

    @GetMapping("/me")
    public ApiResponse<AuthMeResponse> me() {
        AuthService.UserSession session = authService.me(currentUserProvider.currentUserId());
        return ApiResponse.success(AuthMeResponse.from(session), "현재 사용자 정보입니다.");
    }

    private boolean isProdProfileActive() {
        return Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase);
    }

    public record LoginRequest(
            @NotBlank(message = "loginId is required") String loginId,
            @NotBlank(message = "password is required") String password
    ) {}

    public record AuthTokenResponse(
            String accessToken,
            long accessTokenExpiresInSeconds,
            OffsetDateTime accessTokenExpiresAt,
            AuthMeResponse user
    ) {
        static AuthTokenResponse from(AuthService.AuthTokens tokens, long accessTokenExpiresInSeconds) {
            return new AuthTokenResponse(
                    tokens.accessToken(),
                    accessTokenExpiresInSeconds,
                    tokens.accessTokenExpiresAt(),
                    AuthMeResponse.from(tokens.user())
            );
        }
    }

    public record AuthMeResponse(
            Long userId,
            Long centerId,
            String loginId,
            String displayName,
            String roleCode
    ) {
        static AuthMeResponse from(AuthService.UserSession session) {
            return new AuthMeResponse(
                    session.userId(),
                    session.centerId(),
                    session.loginId(),
                    session.displayName(),
                    session.roleCode()
            );
        }
    }
}
