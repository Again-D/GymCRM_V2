package com.gymcrm.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthRefreshTokenJpaRepository extends JpaRepository<AuthRefreshTokenEntity, Long> {
    Optional<AuthRefreshTokenEntity> findByTokenHash(String tokenHash);
}
