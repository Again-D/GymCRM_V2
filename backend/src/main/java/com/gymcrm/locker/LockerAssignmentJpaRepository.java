package com.gymcrm.locker;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LockerAssignmentJpaRepository extends JpaRepository<LockerAssignmentEntity, Long> {
    Optional<LockerAssignmentEntity> findByLockerAssignmentIdAndCenterIdAndIsDeletedFalse(Long lockerAssignmentId, Long centerId);
}
