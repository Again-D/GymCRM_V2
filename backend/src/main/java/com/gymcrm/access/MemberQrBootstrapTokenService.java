package com.gymcrm.access;

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
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Service
public class MemberQrBootstrapTokenService {
    private static final String TOKEN_TYPE = "member-qr-bootstrap";
    private static final String AUDIENCE = "gymcrm-member-qr";

    private final SecretKey signingKey;
    private final String issuer;
    private final long bootstrapTokenDays;

    public MemberQrBootstrapTokenService(
            @Value("${app.security.jwt.secret}") String secret,
            @Value("${app.security.jwt.issuer:gymcrm}") String issuer,
            @Value("${app.member.qr.bootstrap-token-days:365}") long bootstrapTokenDays
    ) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("app.security.jwt.secret must not be blank");
        }
        this.signingKey = Keys.hmacShaKeyFor(normalizeSecret(secret));
        this.issuer = issuer;
        this.bootstrapTokenDays = bootstrapTokenDays;
    }

    public IssuedBootstrapToken issue(Long centerId, Long memberId) {
        if (centerId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "centerId is required");
        }
        if (memberId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memberId is required");
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime expiresAt = now.plusDays(bootstrapTokenDays);
        String token = Jwts.builder()
                .issuer(issuer)
                .audience().add(AUDIENCE).and()
                .subject(String.valueOf(memberId))
                .issuedAt(Date.from(now.toInstant()))
                .notBefore(Date.from(now.toInstant()))
                .expiration(Date.from(expiresAt.toInstant()))
                .id(UUID.randomUUID().toString())
                .claim("typ", TOKEN_TYPE)
                .claim("centerId", centerId)
                .claim("memberId", memberId)
                .signWith(signingKey)
                .compact();

        return new IssuedBootstrapToken(token, now, expiresAt);
    }

    public BootstrapClaims parse(String token) {
        if (token == null || token.isBlank()) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "회원 QR 링크 토큰이 비어 있습니다.");
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (claims.getAudience() == null || !claims.getAudience().contains(AUDIENCE)) {
                throw new ApiException(ErrorCode.TOKEN_INVALID, "회원 QR 링크 토큰 audience가 일치하지 않습니다.");
            }
            String type = claims.get("typ", String.class);
            if (!TOKEN_TYPE.equals(type)) {
                throw new ApiException(ErrorCode.TOKEN_INVALID, "회원 QR 링크 토큰 타입이 올바르지 않습니다.");
            }

            return new BootstrapClaims(
                    claims.get("centerId", Number.class).longValue(),
                    claims.get("memberId", Number.class).longValue(),
                    OffsetDateTime.ofInstant(claims.getIssuedAt().toInstant(), ZoneOffset.UTC),
                    OffsetDateTime.ofInstant(claims.getExpiration().toInstant(), ZoneOffset.UTC)
            );
        } catch (ExpiredJwtException ex) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED, "회원 QR 링크가 만료되었습니다.");
        } catch (ApiException ex) {
            throw ex;
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "유효하지 않은 회원 QR 링크입니다.");
        }
    }

    private byte[] normalizeSecret(String secret) {
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        if (raw.length >= 32) {
            return raw;
        }
        return Base64.getEncoder().encode(secret.repeat((32 / Math.max(1, raw.length)) + 1).getBytes(StandardCharsets.UTF_8));
    }

    public record IssuedBootstrapToken(String token, OffsetDateTime issuedAt, OffsetDateTime expiresAt) {
    }

    public record BootstrapClaims(Long centerId, Long memberId, OffsetDateTime issuedAt, OffsetDateTime expiresAt) {
    }
}
