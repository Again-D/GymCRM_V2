package com.gymcrm.common.auth.repository;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;

import static com.gymcrm.common.auth.entity.QAuthRefreshTokenEntity.authRefreshTokenEntity;

@Repository
public class AuthRefreshTokenQueryRepository {
    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    public AuthRefreshTokenQueryRepository(JPAQueryFactory queryFactory, EntityManager entityManager) {
        this.queryFactory = queryFactory;
        this.entityManager = entityManager;
    }

    public int revokeIfActive(Long refreshTokenId, String reason) {
        OffsetDateTime now = OffsetDateTime.now();
        var update = queryFactory.update(authRefreshTokenEntity)
                .set(authRefreshTokenEntity.revokedAt, now)
                .set(authRefreshTokenEntity.revokeReason, reason);
        if ("ROTATED".equals(reason)) {
            update.set(authRefreshTokenEntity.rotatedAt, now);
        }
        long updated = update.where(
                authRefreshTokenEntity.refreshTokenId.eq(refreshTokenId),
                authRefreshTokenEntity.revokedAt.isNull()
        ).execute();
        entityManager.clear();
        return (int) updated;
    }

    public int revokeByTokenHashIfActive(String tokenHash, String reason) {
        long updated = queryFactory.update(authRefreshTokenEntity)
                .set(authRefreshTokenEntity.revokedAt, OffsetDateTime.now())
                .set(authRefreshTokenEntity.revokeReason, reason)
                .where(
                        authRefreshTokenEntity.tokenHash.eq(tokenHash),
                        authRefreshTokenEntity.revokedAt.isNull()
                )
                .execute();
        entityManager.clear();
        return (int) updated;
    }

    public int revokeFamilyIfActive(String tokenFamilyId, String reason) {
        long updated = queryFactory.update(authRefreshTokenEntity)
                .set(authRefreshTokenEntity.revokedAt, OffsetDateTime.now())
                .set(authRefreshTokenEntity.revokeReason, reason)
                .where(
                        authRefreshTokenEntity.tokenFamilyId.eq(tokenFamilyId),
                        authRefreshTokenEntity.revokedAt.isNull()
                )
                .execute();
        entityManager.clear();
        return (int) updated;
    }

    public int revokeActiveByUserId(Long userId, String reason) {
        long updated = queryFactory.update(authRefreshTokenEntity)
                .set(authRefreshTokenEntity.revokedAt, OffsetDateTime.now())
                .set(authRefreshTokenEntity.revokeReason, reason)
                .where(
                        authRefreshTokenEntity.userId.eq(userId),
                        authRefreshTokenEntity.revokedAt.isNull()
                )
                .execute();
        entityManager.clear();
        return (int) updated;
    }
}
