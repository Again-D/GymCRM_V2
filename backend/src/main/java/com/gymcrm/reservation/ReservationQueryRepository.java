package com.gymcrm.reservation;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.gymcrm.reservation.QReservationEntity.reservationEntity;

@Repository
public class ReservationQueryRepository {
    private final JPAQueryFactory queryFactory;

    public ReservationQueryRepository(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    public List<Reservation> findAll(Long centerId, Long memberId, Long scheduleId, String reservationStatus) {
        BooleanBuilder where = new BooleanBuilder()
                .and(reservationEntity.centerId.eq(centerId))
                .and(reservationEntity.isDeleted.isFalse());
        if (memberId != null) {
            where.and(reservationEntity.memberId.eq(memberId));
        }
        if (scheduleId != null) {
            where.and(reservationEntity.scheduleId.eq(scheduleId));
        }
        if (reservationStatus != null) {
            where.and(reservationEntity.reservationStatus.eq(reservationStatus));
        }
        return queryFactory
                .selectFrom(reservationEntity)
                .where(where)
                .orderBy(reservationEntity.reservationId.desc())
                .fetch()
                .stream()
                .map(this::toDomain)
                .toList();
    }

    public boolean existsConfirmedByMemberAndSchedule(Long memberId, Long scheduleId) {
        Integer fetched = queryFactory
                .selectOne()
                .from(reservationEntity)
                .where(
                        reservationEntity.memberId.eq(memberId),
                        reservationEntity.scheduleId.eq(scheduleId),
                        reservationEntity.reservationStatus.eq("CONFIRMED"),
                        reservationEntity.isDeleted.isFalse()
                )
                .fetchFirst();
        return fetched != null;
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
}
