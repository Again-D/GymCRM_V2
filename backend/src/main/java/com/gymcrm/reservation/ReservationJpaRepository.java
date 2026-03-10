package com.gymcrm.reservation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReservationJpaRepository extends JpaRepository<ReservationEntity, Long> {
    Optional<ReservationEntity> findByReservationIdAndCenterIdAndIsDeletedFalse(Long reservationId, Long centerId);
}
