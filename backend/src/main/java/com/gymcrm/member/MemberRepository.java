package com.gymcrm.member;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

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
                    center_id, member_name, phone, email, gender, birth_date, member_status,
                    join_date, consent_sms, consent_marketing, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, :email, :gender, :birthDate, :memberStatus,
                    :joinDate, :consentSms, :consentMarketing, :memo,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    member_id, center_id, member_name, phone, email, gender, birth_date, member_status,
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
                    member_id, center_id, member_name, phone, email, gender, birth_date, member_status,
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
                    member_id, center_id, member_name, phone, email, gender, birth_date, member_status,
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

    public Member update(MemberUpdateCommand command) {
        return jdbcClient.sql("""
                UPDATE members
                SET
                    member_name = :memberName,
                    phone = :phone,
                    email = :email,
                    gender = :gender,
                    birth_date = :birthDate,
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
                    member_id, center_id, member_name, phone, email, gender, birth_date, member_status,
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
            String email,
            String gender,
            java.time.LocalDate birthDate,
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
            String email,
            String gender,
            java.time.LocalDate birthDate,
            String memberStatus,
            java.time.LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo,
            Long actorUserId
    ) {}
}
