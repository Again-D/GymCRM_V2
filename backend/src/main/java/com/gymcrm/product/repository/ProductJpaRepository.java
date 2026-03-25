package com.gymcrm.product.repository;

import com.gymcrm.product.entity.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductJpaRepository extends JpaRepository<ProductEntity, Long> {
    Optional<ProductEntity> findByProductIdAndIsDeletedFalse(Long productId);
}
