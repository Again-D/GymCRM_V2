package com.gymcrm.crm;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public class CrmTargetRepository {
    private final JdbcClient jdbcClient;

    public CrmTargetRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<ExpiringMembershipTarget> findExpiringMembershipTargets(Long centerId, LocalDate targetDate) {
        String sql = """
                SELECT
                    mm.membership_id,
                    mm.member_id,
                    mm.product_name_snapshot,
                    mm.end_date,
                    m.member_name,
                    m.phone
                FROM member_memberships mm
                JOIN members m ON m.member_id = mm.member_id
                WHERE mm.center_id = :centerId
                  AND mm.is_deleted = FALSE
                  AND m.is_deleted = FALSE
                  AND mm.membership_status = 'ACTIVE'
                  AND mm.end_date = :targetDate
                ORDER BY mm.membership_id ASC
                """;

        return jdbcClient.sql(sql)
                .param("centerId", centerId)
                .param("targetDate", targetDate)
                .query(ExpiringMembershipTarget.class)
                .list();
    }

    public List<BirthdayTarget> findBirthdayTargets(Long centerId, LocalDate targetDate) {
        String sql = """
                SELECT
                    m.member_id,
                    m.member_name,
                    m.phone,
                    m.birth_date
                FROM members m
                WHERE m.center_id = :centerId
                  AND m.is_deleted = FALSE
                  AND m.member_status = 'ACTIVE'
                  AND m.consent_marketing = TRUE
                  AND m.birth_date IS NOT NULL
                  AND EXTRACT(MONTH FROM m.birth_date) = :month
                  AND EXTRACT(DAY FROM m.birth_date) = :day
                ORDER BY m.member_id ASC
                """;

        return jdbcClient.sql(sql)
                .param("centerId", centerId)
                .param("month", targetDate.getMonthValue())
                .param("day", targetDate.getDayOfMonth())
                .query(BirthdayTarget.class)
                .list();
    }

    public List<EventCampaignTarget> findEventCampaignTargets(Long centerId, String productCategory) {
        StringBuilder sql = new StringBuilder("""
                SELECT DISTINCT
                    m.member_id,
                    m.member_name,
                    m.phone,
                    mm.membership_id,
                    mm.product_category_snapshot
                FROM members m
                JOIN member_memberships mm ON mm.member_id = m.member_id
                WHERE m.center_id = :centerId
                  AND m.is_deleted = FALSE
                  AND m.member_status = 'ACTIVE'
                  AND m.consent_marketing = TRUE
                  AND mm.center_id = :centerId
                  AND mm.is_deleted = FALSE
                  AND mm.membership_status = 'ACTIVE'
                """);
        if (productCategory != null) {
            sql.append(" AND mm.product_category_snapshot = :productCategory");
        }
        sql.append(" ORDER BY m.member_id ASC");

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("centerId", centerId);
        if (productCategory != null) {
            statement = statement.param("productCategory", productCategory);
        }
        return statement.query(EventCampaignTarget.class).list();
    }

    public record ExpiringMembershipTarget(
            Long membershipId,
            Long memberId,
            String productNameSnapshot,
            LocalDate endDate,
            String memberName,
            String phone
    ) {
    }

    public record BirthdayTarget(
            Long memberId,
            String memberName,
            String phone,
            LocalDate birthDate
    ) {
    }

    public record EventCampaignTarget(
            Long memberId,
            String memberName,
            String phone,
            Long membershipId,
            String productCategorySnapshot
    ) {
    }
}
