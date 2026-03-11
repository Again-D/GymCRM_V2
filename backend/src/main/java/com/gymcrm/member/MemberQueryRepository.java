package com.gymcrm.member;

import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

import static com.gymcrm.member.QMemberEntity.memberEntity;

@Repository
public class MemberQueryRepository {
    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    public MemberQueryRepository(JPAQueryFactory queryFactory, EntityManager entityManager) {
        this.queryFactory = queryFactory;
        this.entityManager = entityManager;
    }

    public List<Member> findAll(Long centerId, String memberCodeKeyword, String nameKeyword, String phoneKeyword) {
        return queryFactory
                .select(Projections.constructor(
                        Member.class,
                        memberEntity.memberId,
                        memberEntity.centerId,
                        memberEntity.memberCode,
                        memberEntity.memberName,
                        memberEntity.phone,
                        memberEntity.phoneEncrypted,
                        memberEntity.email,
                        memberEntity.gender,
                        memberEntity.birthDate,
                        memberEntity.birthDateEncrypted,
                        memberEntity.piiKeyVersion,
                        memberEntity.memberStatus,
                        memberEntity.joinDate,
                        memberEntity.consentSms,
                        memberEntity.consentMarketing,
                        memberEntity.memo,
                        memberEntity.createdAt,
                        memberEntity.createdBy,
                        memberEntity.updatedAt,
                        memberEntity.updatedBy
                ))
                .from(memberEntity)
                .where(
                        memberEntity.centerId.eq(centerId),
                        memberEntity.isDeleted.isFalse(),
                        containsIgnoreCase(memberEntity.memberCode, memberCodeKeyword),
                        containsIgnoreCase(memberEntity.memberName, nameKeyword),
                        containsIgnoreCase(memberEntity.phone, phoneKeyword)
                )
                .orderBy(memberEntity.memberId.desc())
                .limit(100)
                .fetch();
    }

    public List<MemberRepository.MemberSummaryProjection> findAllSummaries(
            Long centerId,
            String keyword,
            String memberCodeKeyword,
            String nameKeyword,
            String phoneKeyword,
            Long trainerId,
            Long productId,
            LocalDate dateFrom,
            LocalDate dateTo,
            LocalDate referenceDate
    ) {
        LocalDate expiringThresholdDate = referenceDate.plusDays(7);
        boolean hasMembershipFilters = trainerId != null || productId != null || dateFrom != null || dateTo != null;
        StringBuilder sql = new StringBuilder("""
                WITH base_members AS (
                    SELECT
                        m.member_id,
                        m.center_id,
                        m.member_code,
                        m.member_name,
                        m.phone,
                        m.member_status,
                        m.join_date
                    FROM members m
                    WHERE m.center_id = :centerId
                      AND m.is_deleted = FALSE
                """);

        if (hasText(keyword)) {
            sql.append("""
                     AND (
                        CAST(m.member_id AS TEXT) ILIKE :keyword
                        OR m.member_code ILIKE :keyword
                        OR m.member_name ILIKE :keyword
                        OR m.phone ILIKE :keyword
                        OR m.member_status ILIKE :keyword
                     )
                    """);
        }
        if (hasText(memberCodeKeyword)) {
            sql.append(" AND m.member_code ILIKE :memberCodeKeyword ");
        }
        if (hasText(nameKeyword)) {
            sql.append(" AND m.member_name ILIKE :nameKeyword ");
        }
        if (hasText(phoneKeyword)) {
            sql.append(" AND m.phone ILIKE :phoneKeyword ");
        }

        sql.append("""
                    ORDER BY m.member_id DESC
                    LIMIT 100
                )
                ,
                filtered_memberships AS (
                    SELECT
                        mm.member_id,
                        mm.membership_id,
                        mm.end_date,
                        mm.remaining_count,
                        mm.product_category_snapshot,
                        mm.product_type_snapshot
                    FROM member_memberships mm
                    JOIN base_members bm ON bm.member_id = mm.member_id
                    WHERE mm.center_id = :centerId
                      AND mm.is_deleted = FALSE
                      AND mm.membership_status = 'ACTIVE'
                """);

        if (trainerId != null) {
            sql.append(" AND mm.assigned_trainer_id = :trainerId ");
        }
        if (productId != null) {
            sql.append(" AND mm.product_id = :productId ");
        }
        if (dateFrom != null) {
            sql.append(" AND (mm.end_date IS NULL OR mm.end_date >= :dateFrom) ");
        }
        if (dateTo != null) {
            sql.append(" AND mm.start_date <= :dateTo ");
        }

        sql.append("""
                ),
                scoped_members AS (
                    SELECT bm.*
                    FROM base_members bm
                """);

        if (hasMembershipFilters) {
            sql.append("""
                    WHERE EXISTS (
                        SELECT 1
                        FROM filtered_memberships fm
                        WHERE fm.member_id = bm.member_id
                    )
                    """);
        }

        sql.append("""
                ),
                representative_memberships AS (
                    SELECT DISTINCT ON (mm.member_id)
                        mm.member_id,
                        mm.end_date
                    FROM filtered_memberships mm
                    JOIN scoped_members bm ON bm.member_id = mm.member_id
                    ORDER BY mm.member_id, mm.end_date NULLS LAST, mm.membership_id ASC
                ),
                pt_remaining_summary AS (
                    SELECT
                        mm.member_id,
                        NULLIF(SUM(
                            CASE
                                WHEN mm.remaining_count IS NOT NULL AND mm.remaining_count > 0
                                    THEN mm.remaining_count
                                ELSE 0
                            END
                        ), 0) AS remaining_pt_count
                    FROM filtered_memberships mm
                    JOIN scoped_members bm ON bm.member_id = mm.member_id
                    WHERE 1 = 1
                      AND mm.product_category_snapshot = 'PT'
                      AND mm.product_type_snapshot = 'COUNT'
                    GROUP BY mm.member_id
                )
                SELECT
                    bm.member_id,
                    bm.center_id,
                    bm.member_code,
                    bm.member_name,
                    bm.phone,
                    bm.member_status,
                    bm.join_date,
                    CASE
                        WHEN rm.member_id IS NULL THEN '없음'
                        WHEN rm.end_date IS NULL THEN '정상'
                        WHEN rm.end_date < :referenceDate THEN '만료'
                        WHEN rm.end_date <= :expiringThresholdDate THEN '만료임박'
                        ELSE '정상'
                    END AS membership_operational_status,
                    rm.end_date AS membership_expiry_date,
                    pts.remaining_pt_count
                FROM scoped_members bm
                LEFT JOIN representative_memberships rm ON rm.member_id = bm.member_id
                LEFT JOIN pt_remaining_summary pts ON pts.member_id = bm.member_id
                ORDER BY bm.member_id DESC
                """);

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("centerId", centerId);
        query.setParameter("referenceDate", referenceDate);
        query.setParameter("expiringThresholdDate", expiringThresholdDate);
        if (hasText(keyword)) {
            query.setParameter("keyword", "%" + keyword.trim() + "%");
        }
        if (hasText(memberCodeKeyword)) {
            query.setParameter("memberCodeKeyword", "%" + memberCodeKeyword.trim() + "%");
        }
        if (hasText(nameKeyword)) {
            query.setParameter("nameKeyword", "%" + nameKeyword.trim() + "%");
        }
        if (hasText(phoneKeyword)) {
            query.setParameter("phoneKeyword", "%" + phoneKeyword.trim() + "%");
        }
        if (trainerId != null) {
            query.setParameter("trainerId", trainerId);
        }
        if (productId != null) {
            query.setParameter("productId", productId);
        }
        if (dateFrom != null) {
            query.setParameter("dateFrom", dateFrom);
        }
        if (dateTo != null) {
            query.setParameter("dateTo", dateTo);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        return rows.stream()
                .map(this::toSummaryProjection)
                .toList();
    }

    private MemberRepository.MemberSummaryProjection toSummaryProjection(Object[] row) {
        return new MemberRepository.MemberSummaryProjection(
                ((Number) row[0]).longValue(),
                ((Number) row[1]).longValue(),
                (String) row[2],
                (String) row[3],
                (String) row[4],
                (String) row[5],
                toLocalDate(row[6]),
                (String) row[7],
                toLocalDate(row[8]),
                row[9] == null ? null : ((Number) row[9]).intValue()
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

    private com.querydsl.core.types.Predicate containsIgnoreCase(
            com.querydsl.core.types.dsl.StringPath path,
            String keyword
    ) {
        return hasText(keyword) ? path.containsIgnoreCase(keyword.trim()) : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
