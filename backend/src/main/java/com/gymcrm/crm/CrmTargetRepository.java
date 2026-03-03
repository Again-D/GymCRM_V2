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

    public record ExpiringMembershipTarget(
            Long membershipId,
            Long memberId,
            String productNameSnapshot,
            LocalDate endDate,
            String memberName,
            String phone
    ) {
    }
}
