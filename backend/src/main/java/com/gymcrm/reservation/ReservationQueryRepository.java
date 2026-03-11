package com.gymcrm.reservation;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

import static com.gymcrm.membership.QMemberMembershipEntity.memberMembershipEntity;
import static com.gymcrm.reservation.QReservationEntity.reservationEntity;

@Repository
public class ReservationQueryRepository {
    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    public ReservationQueryRepository(JPAQueryFactory queryFactory, EntityManager entityManager) {
        this.queryFactory = queryFactory;
        this.entityManager = entityManager;
    }

    public List<Reservation> findAll(Long centerId, Long memberId, Long scheduleId, String reservationStatus, Long trainerUserId) {
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
        if (trainerUserId != null) {
            where.and(reservationEntity.membershipId.in(
                    queryFactory.select(memberMembershipEntity.membershipId)
                            .from(memberMembershipEntity)
                            .where(
                                    memberMembershipEntity.centerId.eq(centerId),
                                    memberMembershipEntity.assignedTrainerId.eq(trainerUserId),
                                    memberMembershipEntity.isDeleted.isFalse()
                            )
            ));
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

    public List<ReservationTargetProjection> findReservationTargets(Long centerId, String keyword, Long trainerUserId, LocalDate businessDate) {
        StringBuilder sql = new StringBuilder("""
                WITH reservable_memberships AS (
                    SELECT
                        mm.member_id,
                        mm.membership_id,
                        mm.end_date
                    FROM member_memberships mm
                    JOIN members m ON m.member_id = mm.member_id
                    WHERE mm.center_id = :centerId
                      AND mm.is_deleted = FALSE
                      AND mm.membership_status = 'ACTIVE'
                      AND m.center_id = :centerId
                      AND m.is_deleted = FALSE
                      AND m.member_status = 'ACTIVE'
                      AND (mm.end_date IS NULL OR mm.end_date >= :businessDate)
                      AND (mm.product_type_snapshot <> 'COUNT' OR COALESCE(mm.remaining_count, 0) > 0)
                """);

        if (trainerUserId != null) {
            sql.append(" AND mm.assigned_trainer_id = :trainerUserId ");
        }
        if (hasText(keyword)) {
            sql.append("""
                     AND (
                        CAST(m.member_id AS TEXT) ILIKE :keyword
                        OR m.member_code ILIKE :keyword
                        OR m.member_name ILIKE :keyword
                        OR m.phone ILIKE :keyword
                     )
                    """);
        }

        sql.append("""
                ),
                scoped_members AS (
                    SELECT
                        m.member_id,
                        m.member_code,
                        m.member_name,
                        m.phone
                    FROM members m
                    WHERE EXISTS (
                        SELECT 1
                        FROM reservable_memberships rm
                        WHERE rm.member_id = m.member_id
                    )
                ),
                representative_memberships AS (
                    SELECT DISTINCT ON (rm.member_id)
                        rm.member_id,
                        rm.end_date
                    FROM reservable_memberships rm
                    ORDER BY rm.member_id, rm.end_date NULLS LAST, rm.membership_id ASC
                ),
                confirmed_reservations AS (
                    SELECT
                        r.member_id,
                        COUNT(*) AS confirmed_reservation_count
                    FROM reservations r
                    JOIN reservable_memberships rm ON rm.membership_id = r.membership_id
                    WHERE r.center_id = :centerId
                      AND r.is_deleted = FALSE
                      AND r.reservation_status = 'CONFIRMED'
                    GROUP BY r.member_id
                )
                SELECT
                    sm.member_id,
                    sm.member_code,
                    sm.member_name,
                    sm.phone,
                    COUNT(rm.membership_id) AS reservable_membership_count,
                    rep.end_date AS membership_expiry_date,
                    COALESCE(cr.confirmed_reservation_count, 0) AS confirmed_reservation_count
                FROM scoped_members sm
                JOIN reservable_memberships rm ON rm.member_id = sm.member_id
                LEFT JOIN representative_memberships rep ON rep.member_id = sm.member_id
                LEFT JOIN confirmed_reservations cr ON cr.member_id = sm.member_id
                GROUP BY sm.member_id, sm.member_code, sm.member_name, sm.phone, rep.end_date, cr.confirmed_reservation_count
                ORDER BY sm.member_id DESC
                """);

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("centerId", centerId);
        query.setParameter("businessDate", businessDate);
        if (trainerUserId != null) {
            query.setParameter("trainerUserId", trainerUserId);
        }
        if (hasText(keyword)) {
            query.setParameter("keyword", "%" + keyword.trim() + "%");
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        return rows.stream().map(this::toReservationTargetProjection).toList();
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

    private ReservationTargetProjection toReservationTargetProjection(Object[] row) {
        return new ReservationTargetProjection(
                ((Number) row[0]).longValue(),
                (String) row[1],
                (String) row[2],
                (String) row[3],
                ((Number) row[4]).intValue(),
                toLocalDate(row[5]),
                ((Number) row[6]).intValue()
        );
    }

    private LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date date) {
            return date.toLocalDate();
        }
        return LocalDate.parse(value.toString());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public record ReservationTargetProjection(
            Long memberId,
            String memberCode,
            String memberName,
            String phone,
            Integer reservableMembershipCount,
            LocalDate membershipExpiryDate,
            Integer confirmedReservationCount
    ) {}
}
