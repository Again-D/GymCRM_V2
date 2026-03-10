package com.gymcrm.auth;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class AuthRefreshTokenRepository {
    private final AuthRefreshTokenJpaRepository authRefreshTokenJpaRepository;
    private final AuthRefreshTokenQueryRepository authRefreshTokenQueryRepository;
    private final EntityManager entityManager;

    public AuthRefreshTokenRepository(
            AuthRefreshTokenJpaRepository authRefreshTokenJpaRepository,
            AuthRefreshTokenQueryRepository authRefreshTokenQueryRepository,
            EntityManager entityManager
    ) {
        this.authRefreshTokenJpaRepository = authRefreshTokenJpaRepository;
        this.authRefreshTokenQueryRepository = authRefreshTokenQueryRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public RefreshTokenRecord insert(InsertCommand command) {
        AuthRefreshTokenEntity entity = new AuthRefreshTokenEntity();
        entity.setUserId(command.userId());
        entity.setTokenHash(command.tokenHash());
        entity.setJti(command.jti());
        entity.setTokenFamilyId(command.tokenFamilyId());
        entity.setExpiresAt(command.expiresAt());
        entity.setCreatedAt(OffsetDateTime.now());
        AuthRefreshTokenEntity saved = authRefreshTokenJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Optional<RefreshTokenRecord> findByTokenHash(String tokenHash) {
        entityManager.clear();
        return authRefreshTokenJpaRepository.findByTokenHash(tokenHash).map(this::toDomain);
    }

    @Transactional
    public int revokeIfActive(Long refreshTokenId, String reason) {
        return authRefreshTokenQueryRepository.revokeIfActive(refreshTokenId, reason);
    }

    @Transactional
    public int revokeByTokenHashIfActive(String tokenHash, String reason) {
        return authRefreshTokenQueryRepository.revokeByTokenHashIfActive(tokenHash, reason);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int revokeFamilyIfActive(String tokenFamilyId, String reason) {
        return authRefreshTokenQueryRepository.revokeFamilyIfActive(tokenFamilyId, reason);
    }

    @Transactional
    public int revokeActiveByUserId(Long userId, String reason) {
        return authRefreshTokenQueryRepository.revokeActiveByUserId(userId, reason);
    }

    private RefreshTokenRecord toDomain(AuthRefreshTokenEntity entity) {
        return new RefreshTokenRecord(
                entity.getRefreshTokenId(),
                entity.getUserId(),
                entity.getTokenHash(),
                entity.getJti(),
                entity.getTokenFamilyId(),
                entity.getExpiresAt(),
                entity.getRevokedAt(),
                entity.getRevokeReason(),
                entity.getCreatedAt(),
                entity.getRotatedAt()
        );
    }

    public record InsertCommand(
            Long userId,
            String tokenHash,
            String jti,
            String tokenFamilyId,
            OffsetDateTime expiresAt
    ) {}
}
