package com.gymcrm.membership;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public class MemberMembershipRepository {
    private final JdbcClient jdbcClient;

    public MemberMembershipRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public MemberMembership insert(MemberMembershipCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO member_memberships (
                    center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :productId, :membershipStatus,
                    :productNameSnapshot, :productCategorySnapshot, :productTypeSnapshot,
                    :priceAmountSnapshot, :purchasedAt, :startDate, :endDate,
                    :totalCount, :remainingCount, :usedCount,
                    :holdDaysUsed, :holdCountUsed, :memo,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    membership_id, center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(MemberMembership.class)
                .single();
    }

    public Optional<MemberMembership> findById(Long membershipId) {
        return jdbcClient.sql("""
                SELECT
                    membership_id, center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_at, created_by, updated_at, updated_by
                FROM member_memberships
                WHERE membership_id = :membershipId
                  AND is_deleted = FALSE
                """)
                .param("membershipId", membershipId)
                .query(MemberMembership.class)
                .optional();
    }

    public MemberMembership updateStatus(Long membershipId, String membershipStatus, Long actorUserId) {
        return jdbcClient.sql("""
                UPDATE member_memberships
                SET
                    membership_status = :membershipStatus,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE membership_id = :membershipId
                  AND is_deleted = FALSE
                RETURNING
                    membership_id, center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .param("membershipId", membershipId)
                .param("membershipStatus", membershipStatus)
                .param("actorUserId", actorUserId)
                .query(MemberMembership.class)
                .single();
    }

    public Optional<MemberMembership> updateStatusIfCurrent(
            Long membershipId,
            String expectedStatus,
            String membershipStatus,
            Long actorUserId
    ) {
        return jdbcClient.sql("""
                UPDATE member_memberships
                SET
                    membership_status = :membershipStatus,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE membership_id = :membershipId
                  AND membership_status = :expectedStatus
                  AND is_deleted = FALSE
                RETURNING
                    membership_id, center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .param("membershipId", membershipId)
                .param("expectedStatus", expectedStatus)
                .param("membershipStatus", membershipStatus)
                .param("actorUserId", actorUserId)
                .query(MemberMembership.class)
                .optional();
    }

    public MemberMembership updateAfterResume(MembershipResumeUpdateCommand command) {
        return jdbcClient.sql("""
                UPDATE member_memberships
                SET
                    membership_status = :membershipStatus,
                    end_date = :endDate,
                    hold_days_used = :holdDaysUsed,
                    hold_count_used = :holdCountUsed,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE membership_id = :membershipId
                  AND is_deleted = FALSE
                RETURNING
                    membership_id, center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(MemberMembership.class)
                .single();
    }

    public Optional<MemberMembership> consumeOneCountIfEligible(Long membershipId, Long actorUserId) {
        return jdbcClient.sql("""
                UPDATE member_memberships
                SET
                    remaining_count = remaining_count - 1,
                    used_count = used_count + 1,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE membership_id = :membershipId
                  AND membership_status = 'ACTIVE'
                  AND product_type_snapshot = 'COUNT'
                  AND remaining_count IS NOT NULL
                  AND remaining_count > 0
                  AND is_deleted = FALSE
                RETURNING
                    membership_id, center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .param("membershipId", membershipId)
                .param("actorUserId", actorUserId)
                .query(MemberMembership.class)
                .optional();
    }

    public record MemberMembershipCreateCommand(
            Long centerId,
            Long memberId,
            Long productId,
            String membershipStatus,
            String productNameSnapshot,
            String productCategorySnapshot,
            String productTypeSnapshot,
            java.math.BigDecimal priceAmountSnapshot,
            java.time.OffsetDateTime purchasedAt,
            java.time.LocalDate startDate,
            java.time.LocalDate endDate,
            Integer totalCount,
            Integer remainingCount,
            Integer usedCount,
            Integer holdDaysUsed,
            Integer holdCountUsed,
            String memo,
            Long actorUserId
    ) {}

    public record MembershipResumeUpdateCommand(
            Long membershipId,
            String membershipStatus,
            LocalDate endDate,
            Integer holdDaysUsed,
            Integer holdCountUsed,
            Long actorUserId
    ) {}
}
