package com.gymcrm.common.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gymcrm.common.auth.entity.AuthRefreshTokenEntity;

import java.util.Optional;

public interface AuthRefreshTokenJpaRepository extends JpaRepository<AuthRefreshTokenEntity, Long> {
    Optional<AuthRefreshTokenEntity> findByTokenHash(String tokenHash);
}
