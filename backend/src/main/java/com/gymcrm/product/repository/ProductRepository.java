package com.gymcrm.product.repository;

import com.gymcrm.product.entity.Product;
import com.gymcrm.product.entity.ProductEntity;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class ProductRepository {
    private final ProductJpaRepository productJpaRepository;
    private final ProductQueryRepository productQueryRepository;
    private final EntityManager entityManager;

    public ProductRepository(
            ProductJpaRepository productJpaRepository,
            ProductQueryRepository productQueryRepository,
            EntityManager entityManager
    ) {
        this.productJpaRepository = productJpaRepository;
        this.productQueryRepository = productQueryRepository;
        this.entityManager = entityManager;
    }

    public Product insert(ProductCreateCommand command) {
        OffsetDateTime now = OffsetDateTime.now();
        ProductEntity entity = new ProductEntity();
        entity.setCenterId(command.centerId());
        entity.setProductName(command.productName());
        entity.setProductCategory(command.productCategory());
        entity.setProductType(command.productType());
        entity.setPriceAmount(command.priceAmount());
        entity.setValidityDays(command.validityDays());
        entity.setTotalCount(command.totalCount());
        entity.setAllowHold(Boolean.TRUE.equals(command.allowHold()));
        entity.setMaxHoldDays(command.maxHoldDays());
        entity.setMaxHoldCount(command.maxHoldCount());
        entity.setAllowTransfer(Boolean.TRUE.equals(command.allowTransfer()));
        entity.setProductStatus(command.productStatus());
        entity.setDescription(command.description());
        entity.setDeleted(false);
        entity.setCreatedAt(now);
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(now);
        entity.setUpdatedBy(command.actorUserId());
        ProductEntity saved = productJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Optional<Product> findById(Long productId) {
        return productJpaRepository.findByProductIdAndIsDeletedFalse(productId).map(this::toDomain);
    }

    public List<Product> findAll(Long centerId, String category, String status) {
        return productQueryRepository.findAll(centerId, category, status);
    }

    public Product update(ProductUpdateCommand command) {
        ProductEntity entity = productJpaRepository.findByProductIdAndIsDeletedFalse(command.productId())
                .orElseThrow();
        entity.setProductName(command.productName());
        entity.setProductCategory(command.productCategory());
        entity.setProductType(command.productType());
        entity.setPriceAmount(command.priceAmount());
        entity.setValidityDays(command.validityDays());
        entity.setTotalCount(command.totalCount());
        entity.setAllowHold(Boolean.TRUE.equals(command.allowHold()));
        entity.setMaxHoldDays(command.maxHoldDays());
        entity.setMaxHoldCount(command.maxHoldCount());
        entity.setAllowTransfer(Boolean.TRUE.equals(command.allowTransfer()));
        entity.setProductStatus(command.productStatus());
        entity.setDescription(command.description());
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(command.actorUserId());
        ProductEntity saved = productJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Product updateStatus(Long productId, String productStatus, Long actorUserId) {
        ProductEntity entity = productJpaRepository.findByProductIdAndIsDeletedFalse(productId)
                .orElseThrow();
        entity.setProductStatus(productStatus);
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(actorUserId);
        ProductEntity saved = productJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    private Product toDomain(ProductEntity entity) {
        return new Product(
                entity.getProductId(),
                entity.getCenterId(),
                entity.getProductName(),
                entity.getProductCategory(),
                entity.getProductType(),
                entity.getPriceAmount(),
                entity.getValidityDays(),
                entity.getTotalCount(),
                entity.isAllowHold(),
                entity.getMaxHoldDays(),
                entity.getMaxHoldCount(),
                entity.isAllowTransfer(),
                entity.getProductStatus(),
                entity.getDescription(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
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
