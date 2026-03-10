package com.gymcrm.locker;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LockerSlotJpaRepository extends JpaRepository<LockerSlotEntity, Long> {
    Optional<LockerSlotEntity> findByLockerSlotIdAndCenterIdAndIsDeletedFalse(Long lockerSlotId, Long centerId);
}
