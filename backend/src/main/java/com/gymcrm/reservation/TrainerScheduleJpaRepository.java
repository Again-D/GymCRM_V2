package com.gymcrm.reservation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrainerScheduleJpaRepository extends JpaRepository<TrainerScheduleEntity, Long> {
    Optional<TrainerScheduleEntity> findByScheduleIdAndIsDeletedFalse(Long scheduleId);
}
