package com.gymcrm.settlement.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class SalesReceivablesRepository {
    private static final String BUSINESS_ZONE = "Asia/Seoul";

    private final JdbcClient jdbcClient;

    public SalesReceivablesRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<SalesReceivableRow> findReceivables(QueryCommand command) {
        String sql = """
                SELECT
                    mm.membership_id AS "membershipId",
                    mm.member_id AS "memberId",
                    m.member_name AS "memberName",
                    COALESCE(mm.product_name_snapshot, 'UNKNOWN') AS "productName",
                    COALESCE(mm.product_category_snapshot, 'UNKNOWN') AS "productCategory",
                    mm.membership_status AS "membershipStatus",
                    mm.price_amount_snapshot AS "contractAmount",
                    p.payment_id AS "paymentId",
                    p.payment_method AS "paymentMethod",
                    p.amount AS "paidAmount",
                    p.paid_at AS "paidAt",
                    (p.paid_at AT TIME ZONE 'Asia/Seoul')::date AS "paidDate",
                    ((p.paid_at AT TIME ZONE 'Asia/Seoul')::date + 3) AS "followUpDate",
                    GREATEST(mm.price_amount_snapshot - p.amount, 0) AS "outstandingAmount",
                    CASE
                        WHEN ((p.paid_at AT TIME ZONE 'Asia/Seoul')::date + 3) <= :baseDate THEN TRUE
                        ELSE FALSE
                    END AS "reminderEligible"
                FROM member_memberships mm
                JOIN members m ON m.member_id = mm.member_id
                JOIN LATERAL (
                    SELECT p.*
                    FROM payments p
                    WHERE p.center_id = :centerId
                      AND p.membership_id = mm.membership_id
                      AND p.is_deleted = FALSE
                      AND p.payment_type = 'PURCHASE'
                      AND p.payment_status = 'COMPLETED'
                    ORDER BY p.paid_at DESC, p.payment_id DESC
                    LIMIT 1
                ) p ON TRUE
                WHERE mm.center_id = :centerId
                  AND mm.is_deleted = FALSE
                  AND mm.membership_status IN ('ACTIVE', 'HOLDING')
                  AND mm.price_amount_snapshot > p.amount
                ORDER BY
                    CASE
                        WHEN ((p.paid_at AT TIME ZONE 'Asia/Seoul')::date + 3) <= :baseDate THEN 0
                        ELSE 1
                    END,
                    GREATEST(mm.price_amount_snapshot - p.amount, 0) DESC,
                    p.paid_at ASC,
                    mm.membership_id DESC
                LIMIT :limit
                """;

        return jdbcClient.sql(sql)
                .param("centerId", command.centerId())
                .param("baseDate", command.baseDate())
                .param("limit", command.limit())
                .query(SalesReceivableRow.class)
                .list();
    }

    public record QueryCommand(
            Long centerId,
            LocalDate baseDate,
            int limit
    ) {
    }

    public record SalesReceivableRow(
            Long membershipId,
            Long memberId,
            String memberName,
            String productName,
            String productCategory,
            String membershipStatus,
            BigDecimal contractAmount,
            Long paymentId,
            String paymentMethod,
            BigDecimal paidAmount,
            OffsetDateTime paidAt,
            LocalDate paidDate,
            LocalDate followUpDate,
            BigDecimal outstandingAmount,
            boolean reminderEligible
    ) {
    }
}
