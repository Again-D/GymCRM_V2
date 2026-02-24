package com.gymcrm.auth;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class AuthService {
    private static final long DEFAULT_CENTER_ID = 1L;

    private final AuthUserRepository authUserRepository;
    private final AuthRefreshTokenRepository refreshTokenRepository;
    private final JwtTokenService jwtTokenService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            AuthUserRepository authUserRepository,
            AuthRefreshTokenRepository refreshTokenRepository,
            JwtTokenService jwtTokenService,
            PasswordEncoder passwordEncoder
    ) {
        this.authUserRepository = authUserRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtTokenService = jwtTokenService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthTokens login(LoginCommand command) {
        String loginId = requireText(command.loginId(), "loginId");
        String password = requireText(command.password(), "password");

        AuthUser user = authUserRepository.findActiveByCenterAndLoginId(DEFAULT_CENTER_ID, loginId)
                .filter(AuthUser::isActive)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "아이디 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(password, user.passwordHash())) {
            throw new ApiException(ErrorCode.AUTHENTICATION_FAILED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        authUserRepository.updateLastLoginAt(user.userId());

        JwtTokenService.IssuedAccessToken accessToken = jwtTokenService.issueAccessToken(user);
        JwtTokenService.IssuedRefreshToken refreshToken = jwtTokenService.issueRefreshToken(user, null);
        refreshTokenRepository.insert(new AuthRefreshTokenRepository.InsertCommand(
                user.userId(),
                refreshToken.tokenHash(),
                refreshToken.jti(),
                refreshToken.tokenFamilyId(),
                refreshToken.expiresAt()
        ));

        return new AuthTokens(
                accessToken.token(),
                accessToken.expiresAt(),
                refreshToken.token(),
                refreshToken.expiresAt(),
                UserSession.from(user)
        );
    }

    @Transactional
    public AuthTokens refresh(String rawRefreshToken) {
        JwtTokenService.RefreshTokenClaims refreshClaims = jwtTokenService.parseRefreshToken(rawRefreshToken);
        RefreshTokenRecord stored = refreshTokenRepository.findByTokenHash(refreshClaims.tokenHash())
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_INVALID, "저장된 refresh token을 찾을 수 없습니다."));

        if (stored.isRevoked()) {
            refreshTokenRepository.revokeFamilyIfActive(stored.tokenFamilyId(), "REPLAY_DETECTED");
            throw new ApiException(ErrorCode.TOKEN_REVOKED, "이미 무효화된 refresh token입니다.");
        }
        if (stored.expiresAt().isBefore(OffsetDateTime.now())) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED, "refresh token이 만료되었습니다.");
        }
        if (!stored.jti().equals(refreshClaims.jti())) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "refresh token jti가 일치하지 않습니다.");
        }

        AuthUser user = authUserRepository.findActiveById(stored.userId())
                .filter(AuthUser::isActive)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));

        int revoked = refreshTokenRepository.revokeIfActive(stored.refreshTokenId(), "ROTATED");
        if (revoked != 1) {
            refreshTokenRepository.revokeFamilyIfActive(stored.tokenFamilyId(), "REPLAY_DETECTED");
            throw new ApiException(ErrorCode.TOKEN_REVOKED, "이미 무효화된 refresh token입니다.");
        }

        JwtTokenService.IssuedAccessToken accessToken = jwtTokenService.issueAccessToken(user);
        JwtTokenService.IssuedRefreshToken nextRefreshToken = jwtTokenService.issueRefreshToken(user, stored.tokenFamilyId());
        refreshTokenRepository.insert(new AuthRefreshTokenRepository.InsertCommand(
                user.userId(),
                nextRefreshToken.tokenHash(),
                nextRefreshToken.jti(),
                nextRefreshToken.tokenFamilyId(),
                nextRefreshToken.expiresAt()
        ));

        return new AuthTokens(
                accessToken.token(),
                accessToken.expiresAt(),
                nextRefreshToken.token(),
                nextRefreshToken.expiresAt(),
                UserSession.from(user)
        );
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        try {
            String tokenHash = jwtTokenService.sha256Hex(rawRefreshToken);
            refreshTokenRepository.revokeByTokenHashIfActive(tokenHash, "LOGOUT");
        } catch (RuntimeException ignored) {
            // Logout is best-effort to keep client flow stable even with malformed/stale cookies.
        }
    }

    @Transactional(readOnly = true)
    public UserSession me(Long userId) {
        AuthUser user = authUserRepository.findActiveById(userId)
                .filter(AuthUser::isActive)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));
        return UserSession.from(user);
    }

    private String requireText(String value, String field) {
        if (value == null || value.trim().isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, field + " is required");
        }
        return value.trim();
    }

    public record LoginCommand(String loginId, String password) {}

    public record AuthTokens(
            String accessToken,
            OffsetDateTime accessTokenExpiresAt,
            String refreshToken,
            OffsetDateTime refreshTokenExpiresAt,
            UserSession user
    ) {}

    public record UserSession(
            Long userId,
            Long centerId,
            String loginId,
            String displayName,
            String roleCode
    ) {
        static UserSession from(AuthUser user) {
            return new UserSession(user.userId(), user.centerId(), user.loginId(), user.displayName(), user.roleCode());
        }
    }
}
