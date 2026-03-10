package com.gymcrm.auth;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class AuthUserRepository {
    private final AuthUserJpaRepository authUserJpaRepository;
    private final EntityManager entityManager;

    public AuthUserRepository(AuthUserJpaRepository authUserJpaRepository, EntityManager entityManager) {
        this.authUserJpaRepository = authUserJpaRepository;
        this.entityManager = entityManager;
    }

    public Optional<AuthUser> findActiveByCenterAndLoginId(Long centerId, String loginId) {
        entityManager.clear();
        return authUserJpaRepository.findByCenterIdAndLoginIdAndIsDeletedFalse(centerId, loginId).map(this::toDomain);
    }

    public Optional<AuthUser> findActiveById(Long userId) {
        entityManager.clear();
        return authUserJpaRepository.findByUserIdAndIsDeletedFalse(userId).map(this::toDomain);
    }

    public Optional<AuthUser> findById(Long userId) {
        entityManager.clear();
        return authUserJpaRepository.findByUserIdAndIsDeletedFalse(userId).map(this::toDomain);
    }

    public Optional<AuthUser> findActiveByCenterAndUserId(Long centerId, Long userId) {
        entityManager.clear();
        return authUserJpaRepository.findByCenterIdAndUserIdAndIsDeletedFalse(centerId, userId).map(this::toDomain);
    }

    @Transactional
    public int updateLastLoginAt(Long userId) {
        AuthUserEntity entity = authUserJpaRepository.findByUserIdAndIsDeletedFalse(userId).orElse(null);
        if (entity == null) {
            return 0;
        }
        entity.setLastLoginAt(OffsetDateTime.now());
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(userId);
        authUserJpaRepository.saveAndFlush(entity);
        return 1;
    }

    private AuthUser toDomain(AuthUserEntity entity) {
        return new AuthUser(
                entity.getUserId(),
                entity.getCenterId(),
                entity.getLoginId(),
                entity.getPasswordHash(),
                entity.getDisplayName(),
                entity.getRoleCode(),
                entity.getUserStatus(),
                entity.getLastLoginAt(),
                entity.getAccessRevokedAfter()
        );
    }

    @Transactional
    public int updateAccessRevokedAfter(Long userId, OffsetDateTime revokedAfter, Long updatedBy) {
        AuthUserEntity entity = authUserJpaRepository.findByUserIdAndIsDeletedFalse(userId).orElse(null);
        if (entity == null) {
            return 0;
        }
        entity.setAccessRevokedAfter(revokedAfter);
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(updatedBy == null ? userId : updatedBy);
        authUserJpaRepository.saveAndFlush(entity);
        return 1;
    }

    @Transactional
    public int updateRoleCode(Long userId, String roleCode, Long updatedBy) {
        AuthUserEntity entity = authUserJpaRepository.findByUserIdAndIsDeletedFalse(userId).orElse(null);
        if (entity == null) {
            return 0;
        }
        entity.setRoleCode(roleCode);
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(updatedBy == null ? userId : updatedBy);
        authUserJpaRepository.saveAndFlush(entity);
        return 1;
    }

    @Transactional
    public int updateUserStatus(Long userId, String userStatus, Long updatedBy) {
        AuthUserEntity entity = authUserJpaRepository.findByUserIdAndIsDeletedFalse(userId).orElse(null);
        if (entity == null) {
            return 0;
        }
        entity.setUserStatus(userStatus);
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(updatedBy == null ? userId : updatedBy);
        authUserJpaRepository.saveAndFlush(entity);
        return 1;
    }
}
