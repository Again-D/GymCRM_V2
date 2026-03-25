package com.gymcrm.reservation.repository;

import com.gymcrm.reservation.entity.TrainerScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrainerScheduleJpaRepository extends JpaRepository<TrainerScheduleEntity, Long> {
    Optional<TrainerScheduleEntity> findByScheduleIdAndIsDeletedFalse(Long scheduleId);
}
