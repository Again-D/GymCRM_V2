package com.gymcrm.common.auth.repository;

import com.gymcrm.common.auth.entity.RoleEntity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleJpaRepository extends JpaRepository<RoleEntity, Long> {
    Optional<RoleEntity> findByRoleCode(String roleCode);
}
