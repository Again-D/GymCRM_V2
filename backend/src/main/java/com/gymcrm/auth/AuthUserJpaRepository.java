package com.gymcrm.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthUserJpaRepository extends JpaRepository<AuthUserEntity, Long> {
    Optional<AuthUserEntity> findByCenterIdAndLoginIdAndIsDeletedFalse(Long centerId, String loginId);
    Optional<AuthUserEntity> findByCenterIdAndUserIdAndIsDeletedFalse(Long centerId, Long userId);
    Optional<AuthUserEntity> findByUserIdAndIsDeletedFalse(Long userId);
}
