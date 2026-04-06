package com.gymcrm.product.repository;

import com.gymcrm.product.entity.Product;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.gymcrm.product.entity.QProductEntity.productEntity;

@Repository
public class ProductQueryRepository {
    private final JPAQueryFactory queryFactory;

    public ProductQueryRepository(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    public List<Product> findAll(Long centerId, String category, String status) {
        return queryFactory
                .select(Projections.constructor(
                        Product.class,
                        productEntity.productId,
                        productEntity.centerId,
                        productEntity.productName,
                        productEntity.productCategory,
                        productEntity.productType,
                        productEntity.priceAmount,
                        productEntity.validityDays,
                        productEntity.totalCount,
                        productEntity.allowHold,
                        productEntity.maxHoldDays,
                        productEntity.maxHoldCount,
                        productEntity.allowHoldBypass,
                        productEntity.allowTransfer,
                        productEntity.productStatus,
                        productEntity.description,
                        productEntity.createdAt,
                        productEntity.createdBy,
                        productEntity.updatedAt,
                        productEntity.updatedBy
                ))
                .from(productEntity)
                .where(
                        productEntity.centerId.eq(centerId),
                        productEntity.isDeleted.isFalse(),
                        eqIfPresent(productEntity.productCategory, category),
                        eqIfPresent(productEntity.productStatus, status)
                )
                .orderBy(productEntity.productId.desc())
                .limit(100)
                .fetch();
    }

    private com.querydsl.core.types.Predicate eqIfPresent(
            com.querydsl.core.types.dsl.StringPath path,
            String value
    ) {
        return value == null || value.isBlank() ? null : path.eq(value);
    }
}
