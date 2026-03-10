package com.gymcrm.reservation;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

import static com.gymcrm.reservation.QReservationEntity.reservationEntity;

@Repository
public class ReservationRepository {
    private final ReservationJpaRepository reservationJpaRepository;
    private final ReservationQueryRepository reservationQueryRepository;
    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    public ReservationRepository(
            ReservationJpaRepository reservationJpaRepository,
            ReservationQueryRepository reservationQueryRepository,
            JPAQueryFactory queryFactory,
            EntityManager entityManager
    ) {
        this.reservationJpaRepository = reservationJpaRepository;
        this.reservationQueryRepository = reservationQueryRepository;
        this.queryFactory = queryFactory;
        this.entityManager = entityManager;
    }

    @Transactional
    public Reservation insert(ReservationCreateCommand command) {
        ReservationEntity entity = new ReservationEntity();
        entity.setCenterId(command.centerId());
        entity.setMemberId(command.memberId());
        entity.setMembershipId(command.membershipId());
        entity.setScheduleId(command.scheduleId());
        entity.setReservationStatus(command.reservationStatus());
        entity.setReservedAt(command.reservedAt());
        entity.setMemo(command.memo());
        entity.setDeleted(false);
        entity.setCreatedAt(command.reservedAt());
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(command.reservedAt());
        entity.setUpdatedBy(command.actorUserId());
        ReservationEntity saved = reservationJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Optional<Reservation> findById(Long reservationId, Long centerId) {
        entityManager.clear();
        return reservationJpaRepository.findByReservationIdAndCenterIdAndIsDeletedFalse(reservationId, centerId)
                .map(this::toDomain);
    }

    public java.util.List<Reservation> findAll(Long centerId, Long memberId, Long scheduleId, String reservationStatus) {
        entityManager.clear();
        return reservationQueryRepository.findAll(centerId, memberId, scheduleId, reservationStatus);
    }

    public boolean existsConfirmedByMemberAndSchedule(Long memberId, Long scheduleId) {
        entityManager.clear();
        return reservationQueryRepository.existsConfirmedByMemberAndSchedule(memberId, scheduleId);
    }

    @Transactional
    public Optional<Reservation> markCancelledIfCurrent(ReservationCancelCommand command) {
        long updated = queryFactory.update(reservationEntity)
                .set(reservationEntity.reservationStatus, "CANCELLED")
                .set(reservationEntity.cancelledAt, command.cancelledAt())
                .set(reservationEntity.cancelReason, command.cancelReason())
                .set(reservationEntity.updatedAt, OffsetDateTime.now())
                .set(reservationEntity.updatedBy, command.actorUserId())
                .where(
                        reservationEntity.reservationId.eq(command.reservationId()),
                        reservationEntity.centerId.eq(command.centerId()),
                        reservationEntity.reservationStatus.eq(command.expectedStatus()),
                        reservationEntity.isDeleted.isFalse()
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return reservationJpaRepository.findByReservationIdAndCenterIdAndIsDeletedFalse(
                command.reservationId(),
                command.centerId()
        ).map(this::toDomain);
    }

    @Transactional
    public Optional<Reservation> markCompletedIfCurrent(ReservationCompleteCommand command) {
        long updated = queryFactory.update(reservationEntity)
                .set(reservationEntity.reservationStatus, "COMPLETED")
                .set(reservationEntity.completedAt, command.completedAt())
                .set(reservationEntity.updatedAt, OffsetDateTime.now())
                .set(reservationEntity.updatedBy, command.actorUserId())
                .where(
                        reservationEntity.reservationId.eq(command.reservationId()),
                        reservationEntity.centerId.eq(command.centerId()),
                        reservationEntity.reservationStatus.eq(command.expectedStatus()),
                        reservationEntity.isDeleted.isFalse()
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return reservationJpaRepository.findByReservationIdAndCenterIdAndIsDeletedFalse(
                command.reservationId(),
                command.centerId()
        ).map(this::toDomain);
    }

    @Transactional
    public Optional<Reservation> markCheckedInIfEligible(ReservationCheckInCommand command) {
        long updated = queryFactory.update(reservationEntity)
                .set(reservationEntity.checkedInAt, command.checkedInAt())
                .set(reservationEntity.updatedAt, OffsetDateTime.now())
                .set(reservationEntity.updatedBy, command.actorUserId())
                .where(
                        reservationEntity.reservationId.eq(command.reservationId()),
                        reservationEntity.centerId.eq(command.centerId()),
                        reservationEntity.reservationStatus.eq(command.expectedStatus()),
                        reservationEntity.checkedInAt.isNull(),
                        reservationEntity.isDeleted.isFalse()
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return reservationJpaRepository.findByReservationIdAndCenterIdAndIsDeletedFalse(
                command.reservationId(),
                command.centerId()
        ).map(this::toDomain);
    }

    @Transactional
    public Optional<Reservation> markNoShowIfCurrent(ReservationNoShowCommand command) {
        long updated = queryFactory.update(reservationEntity)
                .set(reservationEntity.reservationStatus, "NO_SHOW")
                .set(reservationEntity.noShowAt, command.noShowAt())
                .set(reservationEntity.updatedAt, OffsetDateTime.now())
                .set(reservationEntity.updatedBy, command.actorUserId())
                .where(
                        reservationEntity.reservationId.eq(command.reservationId()),
                        reservationEntity.centerId.eq(command.centerId()),
                        reservationEntity.reservationStatus.eq(command.expectedStatus()),
                        reservationEntity.checkedInAt.isNull(),
                        reservationEntity.isDeleted.isFalse()
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return reservationJpaRepository.findByReservationIdAndCenterIdAndIsDeletedFalse(
                command.reservationId(),
                command.centerId()
        ).map(this::toDomain);
    }

    private Reservation toDomain(ReservationEntity entity) {
        return new Reservation(
                entity.getReservationId(),
                entity.getCenterId(),
                entity.getMemberId(),
                entity.getMembershipId(),
                entity.getScheduleId(),
                entity.getReservationStatus(),
                entity.getReservedAt(),
                entity.getCancelledAt(),
                entity.getCompletedAt(),
                entity.getNoShowAt(),
                entity.getCheckedInAt(),
                entity.getCancelReason(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public record ReservationCreateCommand(
            Long centerId,
            Long memberId,
            Long membershipId,
            Long scheduleId,
            String reservationStatus,
            OffsetDateTime reservedAt,
            String memo,
            Long actorUserId
    ) {}

    public record ReservationCancelCommand(
            Long reservationId,
            Long centerId,
            String expectedStatus,
            OffsetDateTime cancelledAt,
            String cancelReason,
            Long actorUserId
    ) {}

    public record ReservationCompleteCommand(
            Long reservationId,
            Long centerId,
            String expectedStatus,
            OffsetDateTime completedAt,
            Long actorUserId
    ) {}

    public record ReservationCheckInCommand(
            Long reservationId,
            Long centerId,
            String expectedStatus,
            OffsetDateTime checkedInAt,
            Long actorUserId
    ) {}

    public record ReservationNoShowCommand(
            Long reservationId,
            Long centerId,
            String expectedStatus,
            OffsetDateTime noShowAt,
            Long actorUserId
    ) {}
}
