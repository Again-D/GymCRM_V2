package com.gymcrm.member;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public class MemberRepository {
    private final JdbcClient jdbcClient;

    public MemberRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Member insert(MemberCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, phone_encrypted, email, gender, birth_date, birth_date_encrypted, pii_key_version, member_status,
                    join_date, consent_sms, consent_marketing, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, :phoneEncrypted, :email, :gender, :birthDate, :birthDateEncrypted, :piiKeyVersion, :memberStatus,
                    :joinDate, :consentSms, :consentMarketing, :memo,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    member_id, center_id, member_name, phone, phone_encrypted, email, gender, birth_date, birth_date_encrypted, pii_key_version, member_status,
                    join_date, consent_sms, consent_marketing, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(Member.class)
                .single();
    }

    public Optional<Member> findById(Long memberId) {
        return jdbcClient.sql("""
                SELECT
                    member_id, center_id, member_name, phone, phone_encrypted, email, gender, birth_date, birth_date_encrypted, pii_key_version, member_status,
                    join_date, consent_sms, consent_marketing, memo,
                    created_at, created_by, updated_at, updated_by
                FROM members
                WHERE member_id = :memberId
                  AND is_deleted = FALSE
                """)
                .param("memberId", memberId)
                .query(Member.class)
                .optional();
    }

    public List<Member> findAll(Long centerId, String nameKeyword, String phoneKeyword) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    member_id, center_id, member_name, phone, phone_encrypted, email, gender, birth_date, birth_date_encrypted, pii_key_version, member_status,
                    join_date, consent_sms, consent_marketing, memo,
                    created_at, created_by, updated_at, updated_by
                FROM members
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                """);

        JdbcClient.StatementSpec spec = jdbcClient.sql(sql.toString()).param("centerId", centerId);

        if (nameKeyword != null && !nameKeyword.isBlank()) {
            sql.append(" AND member_name ILIKE :nameKeyword ");
        }
        if (phoneKeyword != null && !phoneKeyword.isBlank()) {
            sql.append(" AND phone ILIKE :phoneKeyword ");
        }
        sql.append(" ORDER BY member_id DESC LIMIT 100 ");

        spec = jdbcClient.sql(sql.toString()).param("centerId", centerId);
        if (nameKeyword != null && !nameKeyword.isBlank()) {
            spec = spec.param("nameKeyword", "%" + nameKeyword.trim() + "%");
        }
        if (phoneKeyword != null && !phoneKeyword.isBlank()) {
            spec = spec.param("phoneKeyword", "%" + phoneKeyword.trim() + "%");
        }

        return spec.query(Member.class).list();
    }

    public List<MemberSummaryProjection> findAllSummaries(
            Long centerId,
            String nameKeyword,
            String phoneKeyword,
            LocalDate referenceDate
    ) {
        StringBuilder baseMembersSql = new StringBuilder("""
                WITH base_members AS (
                    SELECT
                        m.member_id,
                        m.center_id,
                        m.member_name,
                        m.phone,
                        m.member_status,
                        m.join_date
                    FROM members m
                    WHERE m.center_id = :centerId
                      AND m.is_deleted = FALSE
                """);

        if (nameKeyword != null && !nameKeyword.isBlank()) {
            baseMembersSql.append(" AND m.member_name ILIKE :nameKeyword ");
        }
        if (phoneKeyword != null && !phoneKeyword.isBlank()) {
            baseMembersSql.append(" AND m.phone ILIKE :phoneKeyword ");
        }

        baseMembersSql.append("""
                    ORDER BY m.member_id DESC
                    LIMIT 100
                ),
                representative_memberships AS (
                    SELECT DISTINCT ON (mm.member_id)
                        mm.member_id,
                        mm.end_date
                    FROM member_memberships mm
                    JOIN base_members bm ON bm.member_id = mm.member_id
                    WHERE mm.center_id = :centerId
                      AND mm.is_deleted = FALSE
                      AND mm.membership_status = 'ACTIVE'
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
                    FROM member_memberships mm
                    JOIN base_members bm ON bm.member_id = mm.member_id
                    WHERE mm.center_id = :centerId
                      AND mm.is_deleted = FALSE
                      AND mm.membership_status = 'ACTIVE'
                      AND mm.product_category_snapshot = 'PT'
                      AND mm.product_type_snapshot = 'COUNT'
                    GROUP BY mm.member_id
                )
                SELECT
                    bm.member_id,
                    bm.center_id,
                    bm.member_name,
                    bm.phone,
                    bm.member_status,
                    bm.join_date,
                    CASE
                        WHEN rm.member_id IS NULL THEN '없음'
                        WHEN rm.end_date IS NULL THEN '정상'
                        WHEN rm.end_date < :referenceDate THEN '만료'
                        WHEN rm.end_date <= (:referenceDate + 7) THEN '만료임박'
                        ELSE '정상'
                    END AS membership_operational_status,
                    rm.end_date AS membership_expiry_date,
                    pts.remaining_pt_count
                FROM base_members bm
                LEFT JOIN representative_memberships rm ON rm.member_id = bm.member_id
                LEFT JOIN pt_remaining_summary pts ON pts.member_id = bm.member_id
                ORDER BY bm.member_id DESC
                """);

        JdbcClient.StatementSpec spec = jdbcClient.sql(baseMembersSql.toString())
                .param("centerId", centerId)
                .param("referenceDate", referenceDate);
        if (nameKeyword != null && !nameKeyword.isBlank()) {
            spec = spec.param("nameKeyword", "%" + nameKeyword.trim() + "%");
        }
        if (phoneKeyword != null && !phoneKeyword.isBlank()) {
            spec = spec.param("phoneKeyword", "%" + phoneKeyword.trim() + "%");
        }

        return spec.query(MemberSummaryProjection.class).list();
    }

    public Member update(MemberUpdateCommand command) {
        return jdbcClient.sql("""
                UPDATE members
                SET
                    member_name = :memberName,
                    phone = :phone,
                    phone_encrypted = :phoneEncrypted,
                    email = :email,
                    gender = :gender,
                    birth_date = :birthDate,
                    birth_date_encrypted = :birthDateEncrypted,
                    pii_key_version = :piiKeyVersion,
                    member_status = :memberStatus,
                    join_date = :joinDate,
                    consent_sms = :consentSms,
                    consent_marketing = :consentMarketing,
                    memo = :memo,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE member_id = :memberId
                  AND is_deleted = FALSE
                RETURNING
                    member_id, center_id, member_name, phone, phone_encrypted, email, gender, birth_date, birth_date_encrypted, pii_key_version, member_status,
                    join_date, consent_sms, consent_marketing, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(Member.class)
                .single();
    }

    public record MemberCreateCommand(
            Long centerId,
            String memberName,
            String phone,
            String phoneEncrypted,
            String email,
            String gender,
            java.time.LocalDate birthDate,
            String birthDateEncrypted,
            Integer piiKeyVersion,
            String memberStatus,
            java.time.LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo,
            Long actorUserId
    ) {}

    public record MemberUpdateCommand(
            Long memberId,
            String memberName,
            String phone,
            String phoneEncrypted,
            String email,
            String gender,
            java.time.LocalDate birthDate,
            String birthDateEncrypted,
            Integer piiKeyVersion,
            String memberStatus,
            java.time.LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo,
            Long actorUserId
    ) {}

    public record MemberSummaryProjection(
            Long memberId,
            Long centerId,
            String memberName,
            String phone,
            String memberStatus,
            LocalDate joinDate,
            String membershipOperationalStatus,
            LocalDate membershipExpiryDate,
            Integer remainingPtCount
    ) {}
}
