package com.gymcrm.settlement.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;

@Repository
public class SalesDashboardRepository {
    private final JdbcClient jdbcClient;

    public SalesDashboardRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public SalesDashboardAggregateRow aggregate(DashboardQueryCommand command) {
        return jdbcClient.sql("""
                SELECT
                    COALESCE(SUM(CASE
                        WHEN p.payment_type = 'PURCHASE'
                         AND (p.paid_at AT TIME ZONE 'Asia/Seoul')::date = :baseDate
                        THEN p.amount
                        WHEN p.payment_type = 'REFUND'
                         AND (p.paid_at AT TIME ZONE 'Asia/Seoul')::date = :baseDate
                        THEN -p.amount
                        ELSE 0
                    END), 0) AS "todayNetSales",
                    COALESCE(SUM(CASE
                        WHEN p.payment_type = 'PURCHASE'
                         AND (p.paid_at AT TIME ZONE 'Asia/Seoul')::date >= :monthStartDate
                         AND (p.paid_at AT TIME ZONE 'Asia/Seoul')::date < :nextMonthStartDate
                        THEN p.amount
                        WHEN p.payment_type = 'REFUND'
                         AND (p.paid_at AT TIME ZONE 'Asia/Seoul')::date >= :monthStartDate
                         AND (p.paid_at AT TIME ZONE 'Asia/Seoul')::date < :nextMonthStartDate
                        THEN -p.amount
                        ELSE 0
                    END), 0) AS "monthNetSales",
                    (
                        SELECT COUNT(*)
                        FROM members m
                        WHERE m.center_id = :centerId
                          AND m.is_deleted = FALSE
                          AND m.join_date = :baseDate
                    ) AS "newMemberCount",
                    (
                        SELECT COUNT(DISTINCT mm.member_id)
                        FROM member_memberships mm
                        WHERE mm.center_id = :centerId
                          AND mm.is_deleted = FALSE
                          AND mm.membership_status = 'ACTIVE'
                          AND mm.end_date IS NOT NULL
                          AND mm.end_date >= :baseDate
                          AND mm.end_date <= :expiringEndDate
                    ) AS "expiringMemberCount",
                    (
                        SELECT COUNT(*)
                        FROM payments pr
                        WHERE pr.center_id = :centerId
                          AND pr.is_deleted = FALSE
                          AND (
                              pr.payment_type = 'REFUND'
                              OR pr.payment_status = 'CANCELED'
                          )
                          AND (pr.paid_at AT TIME ZONE 'Asia/Seoul')::date = :baseDate
                    ) AS "refundCount"
                FROM payments p
                WHERE p.center_id = :centerId
                  AND p.is_deleted = FALSE
                  AND p.payment_status = 'COMPLETED'
                """)
                .param("centerId", command.centerId())
                .param("baseDate", command.baseDate())
                .param("monthStartDate", command.monthStartDate())
                .param("nextMonthStartDate", command.nextMonthStartDate())
                .param("expiringEndDate", command.expiringEndDate())
                .query(SalesDashboardAggregateRow.class)
                .single();
    }

    public record DashboardQueryCommand(
            Long centerId,
            LocalDate baseDate,
            LocalDate monthStartDate,
            LocalDate nextMonthStartDate,
            LocalDate expiringEndDate
    ) {
    }

    public record SalesDashboardAggregateRow(
            BigDecimal todayNetSales,
            BigDecimal monthNetSales,
            Long newMemberCount,
            Long expiringMemberCount,
            Long refundCount
    ) {
    }
}
