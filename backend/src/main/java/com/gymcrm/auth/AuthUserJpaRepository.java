package com.gymcrm.auth;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthUserJpaRepository extends JpaRepository<AuthUserEntity, Long> {
    @EntityGraph(attributePaths = "roles")
    Optional<AuthUserEntity> findByCenterIdAndLoginIdAndIsDeletedFalse(Long centerId, String loginId);
    @EntityGraph(attributePaths = "roles")
    Optional<AuthUserEntity> findByCenterIdAndUserIdAndIsDeletedFalse(Long centerId, Long userId);
    @EntityGraph(attributePaths = "roles")
    Optional<AuthUserEntity> findByUserIdAndIsDeletedFalse(Long userId);
}
