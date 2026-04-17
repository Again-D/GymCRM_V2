package com.gymcrm.center.repository;

import com.gymcrm.center.entity.CenterEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CenterJpaRepository extends JpaRepository<CenterEntity, Long> {
    Optional<CenterEntity> findByCenterIdAndIsDeletedFalse(Long centerId);
}
