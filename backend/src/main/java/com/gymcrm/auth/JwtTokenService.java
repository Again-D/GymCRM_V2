package com.gymcrm.auth;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class JwtTokenService {
    private final SecretKey signingKey;
    private final String issuer;
    private final String audience;
    private final long accessTokenMinutes;
    private final long refreshTokenDays;

    public JwtTokenService(
            @Value("${app.security.jwt.secret}") String secret,
            @Value("${app.security.jwt.issuer:gymcrm}") String issuer,
            @Value("${app.security.jwt.audience:gymcrm-admin}") String audience,
            @Value("${app.security.jwt.access-token-minutes:15}") long accessTokenMinutes,
            @Value("${app.security.jwt.refresh-token-days:7}") long refreshTokenDays
    ) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("app.security.jwt.secret must not be blank");
        }
        // jjwt HS256 requires sufficient key length; pad deterministic dev secret safely.
        byte[] keyBytes = normalizeSecret(secret);
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.issuer = issuer;
        this.audience = audience;
        this.accessTokenMinutes = accessTokenMinutes;
        this.refreshTokenDays = refreshTokenDays;
    }

    public IssuedAccessToken issueAccessToken(AuthUser user) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime expiresAt = now.plusMinutes(accessTokenMinutes);
        String jti = UUID.randomUUID().toString();

        String token = Jwts.builder()
                .issuer(issuer)
                .audience().add(audience).and()
                .subject(String.valueOf(user.userId()))
                .issuedAt(Date.from(now.toInstant()))
                .notBefore(Date.from(now.toInstant()))
                .expiration(Date.from(expiresAt.toInstant()))
                .id(jti)
                .claim("typ", "access")
                .claim("uid", user.userId())
                .claim("centerId", user.centerId())
                .claim("username", user.loginId())
                .claim("role", user.roleCode())
                .signWith(signingKey)
                .compact();

        return new IssuedAccessToken(token, jti, expiresAt);
    }

    public IssuedRefreshToken issueRefreshToken(AuthUser user, String tokenFamilyId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime expiresAt = now.plusDays(refreshTokenDays);
        String jti = UUID.randomUUID().toString();
        String familyId = (tokenFamilyId == null || tokenFamilyId.isBlank()) ? UUID.randomUUID().toString() : tokenFamilyId;

        String token = Jwts.builder()
                .issuer(issuer)
                .audience().add(audience).and()
                .subject(String.valueOf(user.userId()))
                .issuedAt(Date.from(now.toInstant()))
                .notBefore(Date.from(now.toInstant()))
                .expiration(Date.from(expiresAt.toInstant()))
                .id(jti)
                .claim("typ", "refresh")
                .claim("uid", user.userId())
                .claim("centerId", user.centerId())
                .claim("username", user.loginId())
                .claim("role", user.roleCode())
                .claim("familyId", familyId)
                .signWith(signingKey)
                .compact();

        return new IssuedRefreshToken(token, jti, familyId, expiresAt, sha256Hex(token));
    }

    public AccessTokenClaims parseAccessToken(String token) {
        Claims claims = parseClaims(token, "access");
        return new AccessTokenClaims(
                claims.get("uid", Number.class).longValue(),
                claims.get("centerId", Number.class).longValue(),
                claims.get("username", String.class),
                claims.get("role", String.class),
                claims.getId(),
                toOffsetDateTime(claims.getExpiration())
        );
    }

    public RefreshTokenClaims parseRefreshToken(String token) {
        Claims claims = parseClaims(token, "refresh");
        return new RefreshTokenClaims(
                claims.get("uid", Number.class).longValue(),
                claims.get("centerId", Number.class).longValue(),
                claims.get("username", String.class),
                claims.get("role", String.class),
                claims.get("familyId", String.class),
                claims.getId(),
                toOffsetDateTime(claims.getExpiration()),
                sha256Hex(token)
        );
    }

    public String sha256Hex(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public long accessTokenExpiresInSeconds() {
        return accessTokenMinutes * 60;
    }

    public long refreshTokenExpiresInSeconds() {
        return refreshTokenDays * 24 * 60 * 60;
    }

    private Claims parseClaims(String token, String expectedType) {
        if (token == null || token.isBlank()) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "토큰이 비어 있습니다.");
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (claims.getAudience() == null || !claims.getAudience().contains(audience)) {
                throw new ApiException(ErrorCode.TOKEN_INVALID, "토큰 audience가 일치하지 않습니다.");
            }
            String type = claims.get("typ", String.class);
            if (!expectedType.equals(type)) {
                throw new ApiException(ErrorCode.TOKEN_INVALID, "토큰 타입이 올바르지 않습니다.");
            }
            return claims;
        } catch (ExpiredJwtException ex) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED, "토큰이 만료되었습니다.");
        } catch (ApiException ex) {
            throw ex;
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "유효하지 않은 토큰입니다.");
        }
    }

    private OffsetDateTime toOffsetDateTime(Date date) {
        return date.toInstant().atOffset(ZoneOffset.UTC);
    }

    private byte[] normalizeSecret(String secret) {
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        if (raw.length >= 32) {
            return raw;
        }
        return Base64.getEncoder().encode(secret.repeat((32 / Math.max(1, raw.length)) + 1).getBytes(StandardCharsets.UTF_8));
    }

    public record IssuedAccessToken(String token, String jti, OffsetDateTime expiresAt) {}

    public record IssuedRefreshToken(
            String token,
            String jti,
            String tokenFamilyId,
            OffsetDateTime expiresAt,
            String tokenHash
    ) {}

    public record AccessTokenClaims(
            Long userId,
            Long centerId,
            String username,
            String roleCode,
            String jti,
            OffsetDateTime expiresAt
    ) {}

    public record RefreshTokenClaims(
            Long userId,
            Long centerId,
            String username,
            String roleCode,
            String tokenFamilyId,
            String jti,
            OffsetDateTime expiresAt,
            String tokenHash
    ) {}
}
