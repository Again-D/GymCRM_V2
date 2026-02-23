package com.gymcrm.product;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class ProductRepository {
    private final JdbcClient jdbcClient;

    public ProductRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Product insert(ProductCreateCommand command) {
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, max_hold_days, max_hold_count,
                    allow_transfer, product_status, description,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, :productCategory, :productType, :priceAmount,
                    :validityDays, :totalCount, :allowHold, :maxHoldDays, :maxHoldCount,
                    :allowTransfer, :productStatus, :description,
                    :actorUserId, :actorUserId
                )
                RETURNING
                    product_id, center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, max_hold_days, max_hold_count,
                    allow_transfer, product_status, description,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(Product.class)
                .single();
    }

    public Optional<Product> findById(Long productId) {
        return jdbcClient.sql("""
                SELECT
                    product_id, center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, max_hold_days, max_hold_count,
                    allow_transfer, product_status, description,
                    created_at, created_by, updated_at, updated_by
                FROM products
                WHERE product_id = :productId
                  AND is_deleted = FALSE
                """)
                .param("productId", productId)
                .query(Product.class)
                .optional();
    }

    public List<Product> findAll(Long centerId, String category, String status) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    product_id, center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, max_hold_days, max_hold_count,
                    allow_transfer, product_status, description,
                    created_at, created_by, updated_at, updated_by
                FROM products
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                """);

        if (category != null && !category.isBlank()) {
            sql.append(" AND product_category = :category ");
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND product_status = :status ");
        }
        sql.append(" ORDER BY product_id DESC LIMIT 100 ");

        JdbcClient.StatementSpec spec = jdbcClient.sql(sql.toString()).param("centerId", centerId);
        if (category != null && !category.isBlank()) {
            spec = spec.param("category", category);
        }
        if (status != null && !status.isBlank()) {
            spec = spec.param("status", status);
        }
        return spec.query(Product.class).list();
    }

    public Product update(ProductUpdateCommand command) {
        return jdbcClient.sql("""
                UPDATE products
                SET
                    product_name = :productName,
                    product_category = :productCategory,
                    product_type = :productType,
                    price_amount = :priceAmount,
                    validity_days = :validityDays,
                    total_count = :totalCount,
                    allow_hold = :allowHold,
                    max_hold_days = :maxHoldDays,
                    max_hold_count = :maxHoldCount,
                    allow_transfer = :allowTransfer,
                    product_status = :productStatus,
                    description = :description,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE product_id = :productId
                  AND is_deleted = FALSE
                RETURNING
                    product_id, center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, max_hold_days, max_hold_count,
                    allow_transfer, product_status, description,
                    created_at, created_by, updated_at, updated_by
                """)
                .paramSource(command)
                .query(Product.class)
                .single();
    }

    public Product updateStatus(Long productId, String productStatus, Long actorUserId) {
        return jdbcClient.sql("""
                UPDATE products
                SET
                    product_status = :productStatus,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE product_id = :productId
                  AND is_deleted = FALSE
                RETURNING
                    product_id, center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, max_hold_days, max_hold_count,
                    allow_transfer, product_status, description,
                    created_at, created_by, updated_at, updated_by
                """)
                .param("productId", productId)
                .param("productStatus", productStatus)
                .param("actorUserId", actorUserId)
                .query(Product.class)
                .single();
    }

    public record ProductCreateCommand(
            Long centerId,
            String productName,
            String productCategory,
            String productType,
            java.math.BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            Boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            Boolean allowTransfer,
            String productStatus,
            String description,
            Long actorUserId
    ) {}

    public record ProductUpdateCommand(
            Long productId,
            String productName,
            String productCategory,
            String productType,
            java.math.BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            Boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            Boolean allowTransfer,
            String productStatus,
            String description,
            Long actorUserId
    ) {}
}
