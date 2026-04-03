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
        String sql = buildBaseSql(command) + """
                GROUP BY COALESCE(mm.product_name_snapshot, 'UNKNOWN'), p.payment_method
                ORDER BY "netSales" DESC, "productName" ASC, "paymentMethod" ASC
                """;

        return bindBaseParams(jdbcClient.sql(sql), command)
                .query(SalesAggregateRow.class)
                .list();
    }

    public List<SalesTrendRow> findTrendRows(QueryCommand command, String bucketExpression) {
        String sql = """
                SELECT
                    %s AS "bucketStartAt",
                    SUM(CASE WHEN p.payment_type = 'PURCHASE' THEN p.amount ELSE 0 END) AS "grossSales",
                    SUM(CASE WHEN p.payment_type = 'REFUND' THEN p.amount ELSE 0 END) AS "refundAmount",
                    SUM(CASE
                        WHEN p.payment_type = 'PURCHASE' THEN p.amount
                        WHEN p.payment_type = 'REFUND' THEN -p.amount
                        ELSE 0
                    END) AS "netSales",
                    COUNT(*) AS "transactionCount"
                """.formatted(bucketExpression)
                + buildFromAndWhere(command)
                + """
                GROUP BY %s
                ORDER BY %s ASC
                """.formatted(bucketExpression, bucketExpression);

        return bindBaseParams(jdbcClient.sql(sql), command)
                .query(SalesTrendRow.class)
                .list();
    }

    public List<RecentAdjustmentRow> findRecentAdjustmentRows(QueryCommand command, int limit) {
        String sql = """
                SELECT
                    p.payment_id AS "paymentId",
                    CASE
                        WHEN p.payment_status = 'CANCELED' THEN 'CANCELED'
                        ELSE 'REFUND'
                    END AS "adjustmentType",
                    COALESCE(mm.product_name_snapshot, 'UNKNOWN') AS "productName",
                    COALESCE(m.member_name, 'UNKNOWN') AS "memberName",
                    p.payment_method AS "paymentMethod",
                    p.amount AS "amount",
                    p.paid_at AS "paidAt",
                    p.memo AS "memo",
                    p.approval_ref AS "approvalRef"
                FROM payments p
                LEFT JOIN member_memberships mm ON mm.membership_id = p.membership_id
                LEFT JOIN members m ON m.member_id = p.member_id
                WHERE p.center_id = :centerId
                  AND p.is_deleted = FALSE
                  AND p.paid_at >= :startAt
                  AND p.paid_at < :endExclusiveAt
                  AND (
                      p.payment_type = 'REFUND'
                      OR p.payment_status = 'CANCELED'
                  )
                """
                + buildOptionalFilters(command)
                + """
                ORDER BY p.paid_at DESC, p.payment_id DESC
                LIMIT :limit
                """;

        return bindBaseParams(jdbcClient.sql(sql), command)
                .param("limit", limit)
                .query(RecentAdjustmentRow.class)
                .list();
    }

    private String buildBaseSql(QueryCommand command) {
        return """
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
                """
                + buildFromAndWhere(command);
    }

    private String buildFromAndWhere(QueryCommand command) {
        return """
                FROM payments p
                LEFT JOIN member_memberships mm ON mm.membership_id = p.membership_id
                WHERE p.center_id = :centerId
                  AND p.is_deleted = FALSE
                  AND p.payment_status = 'COMPLETED'
                  AND p.paid_at >= :startAt
                  AND p.paid_at < :endExclusiveAt
                """
                + buildOptionalFilters(command);
    }

    private String buildOptionalFilters(QueryCommand command) {
        StringBuilder sql = new StringBuilder();
        if (command.paymentMethod() != null) {
            sql.append(" AND p.payment_method = :paymentMethod");
        }
        if (command.productKeyword() != null) {
            sql.append(" AND COALESCE(mm.product_name_snapshot, '') ILIKE ('%' || :productKeyword || '%')");
        }
        return sql.toString();
    }

    private JdbcClient.StatementSpec bindBaseParams(JdbcClient.StatementSpec statement, QueryCommand command) {
        statement = statement
                .param("centerId", command.centerId())
                .param("startAt", command.startAt())
                .param("endExclusiveAt", command.endExclusiveAt());

        if (command.paymentMethod() != null) {
            statement = statement.param("paymentMethod", command.paymentMethod());
        }
        if (command.productKeyword() != null) {
            statement = statement.param("productKeyword", command.productKeyword());
        }
        return statement;
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

    public record SalesTrendRow(
            OffsetDateTime bucketStartAt,
            BigDecimal grossSales,
            BigDecimal refundAmount,
            BigDecimal netSales,
            Long transactionCount
    ) {
    }

    public record RecentAdjustmentRow(
            Long paymentId,
            String adjustmentType,
            String productName,
            String memberName,
            String paymentMethod,
            BigDecimal amount,
            OffsetDateTime paidAt,
            String memo,
            String approvalRef
    ) {
    }
}
