package com.gymcrm.auth;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

@Repository
public class AuthUserRepository {
    private final AuthUserJpaRepository authUserJpaRepository;
    private final RoleJpaRepository roleJpaRepository;
    private final EntityManager entityManager;

    public AuthUserRepository(
            AuthUserJpaRepository authUserJpaRepository,
            RoleJpaRepository roleJpaRepository,
            EntityManager entityManager
    ) {
        this.authUserJpaRepository = authUserJpaRepository;
        this.roleJpaRepository = roleJpaRepository;
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

    public List<AuthUser> findActiveByCenterAndRoleCode(Long centerId, String roleCode) {
        entityManager.clear();
        return authUserJpaRepository
                .findDistinctByCenterIdAndUserStatusAndIsDeletedFalseAndRoles_RoleCodeOrderByUserIdAsc(
                        centerId,
                        "ACTIVE",
                        roleCode
                )
                .stream()
                .map(this::toDomain)
                .toList();
    }

    @Transactional
    public AuthUser insert(AuthUserCreateCommand command) {
        AuthUserEntity entity = new AuthUserEntity();
        entity.setCenterId(command.centerId());
        entity.setLoginId(command.loginId());
        entity.setPasswordHash(command.passwordHash());
        entity.setDisplayName(command.displayName());
        entity.setPhone(command.phone());
        entity.setRoles(new LinkedHashSet<>(List.of(requireRole(command.roleCode()))));
        entity.setUserStatus(command.userStatus());
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(command.actorUserId());
        return toDomain(authUserJpaRepository.saveAndFlush(entity));
    }

    @Transactional
    public AuthUser updateProfile(AuthUserProfileUpdateCommand command) {
        AuthUserEntity entity = authUserJpaRepository.findByUserIdAndIsDeletedFalse(command.userId()).orElse(null);
        if (entity == null) {
            return null;
        }
        entity.setLoginId(command.loginId());
        entity.setDisplayName(command.displayName());
        entity.setPhone(command.phone());
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(command.actorUserId());
        return toDomain(authUserJpaRepository.saveAndFlush(entity));
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
        entity.setRoles(new LinkedHashSet<>(List.of(requireRole(roleCode))));
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

    private AuthUser toDomain(AuthUserEntity entity) {
        return new AuthUser(
                entity.getUserId(),
                entity.getCenterId(),
                entity.getLoginId(),
                entity.getPasswordHash(),
                entity.getDisplayName(),
                entity.getPhone(),
                entity.getRoles().stream().map(RoleEntity::getRoleCode).findFirst().orElse(null),
                entity.getUserStatus(),
                entity.getLastLoginAt(),
                entity.getAccessRevokedAfter()
        );
    }

    private RoleEntity requireRole(String roleCode) {
        return roleJpaRepository.findByRoleCode(roleCode)
                .orElseThrow(() -> new IllegalStateException("Role not found: " + roleCode));
    }

    public record AuthUserCreateCommand(
            Long centerId,
            String loginId,
            String passwordHash,
            String displayName,
            String phone,
            String roleCode,
            String userStatus,
            Long actorUserId
    ) {
    }

    public record AuthUserProfileUpdateCommand(
            Long userId,
            String loginId,
            String displayName,
            String phone,
            Long actorUserId
    ) {
    }
}
