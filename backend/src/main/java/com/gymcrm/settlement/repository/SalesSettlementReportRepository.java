package com.gymcrm.settlement.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class SalesSettlementReportRepository {
    private final JdbcClient jdbcClient;

    public SalesSettlementReportRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<SalesAggregateRow> findSalesRows(QueryCommand command) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    COALESCE(mm.product_name_snapshot, 'UNKNOWN') AS "productName",
                    p.payment_method AS "paymentMethod",
                    SUM(CASE WHEN p.payment_type = 'PURCHASE' THEN p.amount ELSE 0 END) AS "grossSales",
                    SUM(CASE WHEN p.payment_type = 'REFUND' THEN p.amount ELSE 0 END) AS "refundAmount",
                    SUM(CASE
                        WHEN p.payment_type = 'PURCHASE' THEN p.amount
                        WHEN p.payment_type = 'REFUND' THEN -p.amount
                        ELSE 0
                    END) AS "netSales",
                    COUNT(*) AS "transactionCount"
                FROM payments p
                LEFT JOIN member_memberships mm ON mm.membership_id = p.membership_id
                WHERE p.center_id = :centerId
                  AND p.is_deleted = FALSE
                  AND p.payment_status = 'COMPLETED'
                  AND p.paid_at >= :startAt
                  AND p.paid_at < :endExclusiveAt
                """);

        if (command.paymentMethod() != null) {
            sql.append(" AND p.payment_method = :paymentMethod");
        }
        if (command.productKeyword() != null) {
            sql.append(" AND COALESCE(mm.product_name_snapshot, '') ILIKE ('%' || :productKeyword || '%')");
        }
        sql.append("""
                GROUP BY COALESCE(mm.product_name_snapshot, 'UNKNOWN'), p.payment_method
                ORDER BY "netSales" DESC, "productName" ASC, "paymentMethod" ASC
                """);

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("centerId", command.centerId())
                .param("startAt", command.startAt())
                .param("endExclusiveAt", command.endExclusiveAt());

        if (command.paymentMethod() != null) {
            statement = statement.param("paymentMethod", command.paymentMethod());
        }
        if (command.productKeyword() != null) {
            statement = statement.param("productKeyword", command.productKeyword());
        }

        return statement.query(SalesAggregateRow.class).list();
    }

    public record QueryCommand(
            Long centerId,
            OffsetDateTime startAt,
            OffsetDateTime endExclusiveAt,
            String paymentMethod,
            String productKeyword
    ) {
    }

    public record SalesAggregateRow(
            String productName,
            String paymentMethod,
            BigDecimal grossSales,
            BigDecimal refundAmount,
            BigDecimal netSales,
            Long transactionCount
    ) {
    }
}
