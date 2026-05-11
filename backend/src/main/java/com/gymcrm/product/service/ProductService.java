package com.gymcrm.product.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.product.dto.request.ProductPromotionRequest;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.entity.ProductPromotion;
import com.gymcrm.product.repository.ProductRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Service
public class ProductService {
    private static final long DEFAULT_CENTER_ID = 1L;
    private static final Set<String> CATEGORIES = Set.of("MEMBERSHIP", "PT", "GX", "ETC");
    private static final Set<String> TYPES = Set.of("DURATION", "COUNT");
    private static final Set<String> STATUSES = Set.of("ACTIVE", "INACTIVE");
    private static final String PT_CATEGORY = "PT";

    private final ProductRepository productRepository;
    private final AuthUserRepository authUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public ProductService(
            ProductRepository productRepository,
            AuthUserRepository authUserRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.productRepository = productRepository;
        this.authUserRepository = authUserRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public Product create(ProductCreateRequest request) {
        NormalizedProductInput input = normalizeAndValidate(
                request.productName(),
                request.productCategory(),
                request.productType(),
                request.priceAmount(),
                request.validityDays(),
                request.totalCount(),
                request.allowHold(),
                request.maxHoldDays(),
                request.maxHoldCount(),
                request.allowHoldBypass(),
                request.allowTransfer(),
                request.assignedTrainerId(),
                request.promotion(),
                null,
                request.productStatus(),
                request.description()
        );
        if (input.assignedTrainerId() != null) {
            requireActiveTrainer(input.assignedTrainerId());
        }

        try {
            return productRepository.insert(new ProductRepository.ProductCreateCommand(
                    DEFAULT_CENTER_ID,
                    input.productName(),
                    input.productCategory(),
                    input.productType(),
                    input.priceAmount(),
                    input.validityDays(),
                    input.totalCount(),
                    input.allowHold(),
                    input.maxHoldDays(),
                    input.maxHoldCount(),
                    input.allowHoldBypass(),
                    input.allowTransfer(),
                    input.assignedTrainerId(),
                    input.promotionDiscountType(),
                    input.promotionDiscountValue(),
                    input.promotionStartDate(),
                    input.promotionEndDate(),
                    input.productStatus(),
                    input.description(),
                    currentUserProvider.currentUserId()
            ));
        } catch (DataAccessException ex) {
            throw mapDataAccessException(ex);
        }
    }

    @Transactional(readOnly = true)
    public List<Product> list(String category, String status) {
        String normalizedCategory = category == null || category.isBlank() ? null : upper(category);
        String normalizedStatus = status == null || status.isBlank() ? null : upper(status);
        if (normalizedCategory != null && !CATEGORIES.contains(normalizedCategory)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "category filter is invalid");
        }
        if (normalizedStatus != null && !STATUSES.contains(normalizedStatus)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "status filter is invalid");
        }
        return productRepository.findAll(DEFAULT_CENTER_ID, normalizedCategory, normalizedStatus);
    }

    @Transactional(readOnly = true)
    public Product get(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "상품을 찾을 수 없습니다. productId=" + productId));
    }

    @Transactional
    public Product update(Long productId, ProductUpdateRequest request) {
        Product current = get(productId);
        NormalizedProductInput input = normalizeAndValidate(
                request.productName() == null ? current.productName() : request.productName(),
                request.productCategory() == null ? current.productCategory() : request.productCategory(),
                request.productType() == null ? current.productType() : request.productType(),
                request.priceAmount() == null ? current.priceAmount() : request.priceAmount(),
                request.validityDays() == null && request.totalCount() == null ? current.validityDays() : request.validityDays(),
                request.validityDays() == null && request.totalCount() == null ? current.totalCount() : request.totalCount(),
                request.allowHold() == null ? current.allowHold() : request.allowHold(),
                request.maxHoldDays() == null ? current.maxHoldDays() : request.maxHoldDays(),
                request.maxHoldCount() == null ? current.maxHoldCount() : request.maxHoldCount(),
                request.allowHoldBypass() == null ? current.allowHoldBypass() : request.allowHoldBypass(),
                request.allowTransfer() == null ? current.allowTransfer() : request.allowTransfer(),
                resolveAssignedTrainerId(current, request),
                request.promotion(),
                Boolean.TRUE.equals(request.clearPromotion()) ? null : current.promotion(),
                request.productStatus() == null ? current.productStatus() : request.productStatus(),
                request.description() == null ? current.description() : request.description()
        );
        if (input.assignedTrainerId() != null) {
            requireActiveTrainer(input.assignedTrainerId());
        }

        try {
            return productRepository.update(new ProductRepository.ProductUpdateCommand(
                    productId,
                    input.productName(),
                    input.productCategory(),
                    input.productType(),
                    input.priceAmount(),
                    input.validityDays(),
                    input.totalCount(),
                    input.allowHold(),
                    input.maxHoldDays(),
                    input.maxHoldCount(),
                    input.allowHoldBypass(),
                    input.allowTransfer(),
                    input.assignedTrainerId(),
                    input.promotionDiscountType(),
                    input.promotionDiscountValue(),
                    input.promotionStartDate(),
                    input.promotionEndDate(),
                    input.productStatus(),
                    input.description(),
                    currentUserProvider.currentUserId()
            ));
        } catch (DataAccessException ex) {
            throw mapDataAccessException(ex);
        }
    }

    @Transactional
    public Product updateStatus(Long productId, String productStatus) {
        get(productId);
        String normalizedStatus = upper(productStatus);
        if (!STATUSES.contains(normalizedStatus)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "productStatus must be ACTIVE or INACTIVE");
        }
        try {
            return productRepository.updateStatus(productId, normalizedStatus, currentUserProvider.currentUserId());
        } catch (DataAccessException ex) {
            throw mapDataAccessException(ex);
        }
    }

    private NormalizedProductInput normalizeAndValidate(
            String productName,
            String productCategory,
            String productType,
            BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            Boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            Boolean allowHoldBypass,
            Boolean allowTransfer,
            Long assignedTrainerId,
            ProductPromotionRequest promotion,
            ProductPromotion currentPromotion,
            String productStatus,
            String description
    ) {
        if (productName == null || productName.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "productName is required");
        }

        String category = upper(defaultIfBlank(productCategory, "MEMBERSHIP"));
        String type = upper(productType);
        String status = upper(defaultIfBlank(productStatus, "ACTIVE"));

        if (!CATEGORIES.contains(category)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "productCategory is invalid");
        }
        if (!TYPES.contains(type)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "productType must be DURATION or COUNT");
        }
        if (!STATUSES.contains(status)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "productStatus must be ACTIVE or INACTIVE");
        }
        if (priceAmount == null || priceAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "priceAmount must be >= 0");
        }
        Long normalizedAssignedTrainerId = normalizeAssignedTrainerLinkage(category, assignedTrainerId);
        ProductPromotion normalizedPromotion = normalizePromotion(promotion);
        if (normalizedPromotion == null) {
            normalizedPromotion = currentPromotion;
        }
        if (Boolean.TRUE.equals(allowHold)) {
            if (maxHoldDays != null && maxHoldDays < 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "maxHoldDays must be >= 0");
            }
            if (maxHoldCount != null && maxHoldCount < 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "maxHoldCount must be >= 0");
            }
        }

        Integer normalizedValidityDays = validityDays;
        Integer normalizedTotalCount = totalCount;
        if ("DURATION".equals(type)) {
            if (normalizedValidityDays == null || normalizedValidityDays <= 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "validityDays must be > 0 for DURATION product");
            }
            normalizedTotalCount = null;
        } else {
            if (normalizedTotalCount == null || normalizedTotalCount <= 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "totalCount must be > 0 for COUNT product");
            }
            normalizedValidityDays = null;
        }

        return new NormalizedProductInput(
                productName.trim(),
                category,
                type,
                priceAmount,
                normalizedValidityDays,
                normalizedTotalCount,
                allowHold != null && allowHold,
                maxHoldDays,
                maxHoldCount,
                allowHold != null && allowHold && allowHoldBypass != null && allowHoldBypass,
                allowTransfer != null && allowTransfer,
                normalizedAssignedTrainerId,
                normalizedPromotion == null ? null : normalizedPromotion.promotionDiscountType(),
                normalizedPromotion == null ? null : normalizedPromotion.promotionDiscountValue(),
                normalizedPromotion == null ? null : normalizedPromotion.promotionStartDate(),
                normalizedPromotion == null ? null : normalizedPromotion.promotionEndDate(),
                status,
                trimToNull(description)
        );
    }

    private Long resolveAssignedTrainerId(Product current, ProductUpdateRequest request) {
        String requestedCategory = request.productCategory() == null ? current.productCategory() : request.productCategory();
        if (request.assignedTrainerId() != null) {
            return request.assignedTrainerId();
        }
        if (PT_CATEGORY.equals(upper(requestedCategory))) {
            return current.assignedTrainerId();
        }
        return null;
    }

    private Long normalizeAssignedTrainerLinkage(String productCategory, Long assignedTrainerId) {
        if (PT_CATEGORY.equals(productCategory)) {
            if (assignedTrainerId == null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "PT product requires assignedTrainerId");
            }
            if (assignedTrainerId <= 0) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "assignedTrainerId must be a positive number");
            }
            return assignedTrainerId;
        }
        if (assignedTrainerId != null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "assignedTrainerId is only allowed for PT products");
        }
        return null;
    }

    private Long requireActiveTrainer(Long trainerUserId) {
        if (trainerUserId == null || trainerUserId <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "assignedTrainerId must be a positive number");
        }
        AuthUser trainer = authUserRepository.findActiveByCenterAndUserId(DEFAULT_CENTER_ID, trainerUserId)
                .filter(AuthUser::isActive)
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_ERROR, "assignedTrainerId is invalid"));
        if (!"ROLE_TRAINER".equals(trainer.roleCode())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "assignedTrainerId must reference an active trainer");
        }
        return trainer.userId();
    }

    private ProductPromotion normalizePromotion(ProductPromotionRequest promotion) {
        if (promotion == null) {
            return null;
        }
        boolean hasAnyValue =
                promotion.promotionDiscountType() != null
                        || promotion.promotionDiscountValue() != null
                        || promotion.promotionStartDate() != null
                        || promotion.promotionEndDate() != null;
        if (!hasAnyValue) {
            return null;
        }
        if (promotion.promotionDiscountType() == null
                || promotion.promotionDiscountValue() == null
                || promotion.promotionStartDate() == null
                || promotion.promotionEndDate() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "promotion fields must be provided together");
        }

        String discountType = upper(promotion.promotionDiscountType());
        if (!Set.of("PERCENT", "AMOUNT").contains(discountType)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "promotionDiscountType must be PERCENT or AMOUNT");
        }
        if (promotion.promotionDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "promotionDiscountValue must be > 0");
        }
        if ("PERCENT".equals(discountType) && promotion.promotionDiscountValue().compareTo(new BigDecimal("100")) > 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "promotionDiscountValue must be <= 100 for PERCENT");
        }
        if (promotion.promotionEndDate().isBefore(promotion.promotionStartDate())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "promotionEndDate must be on or after promotionStartDate");
        }

        return new ProductPromotion(
                discountType,
                promotion.promotionDiscountValue(),
                promotion.promotionStartDate(),
                promotion.promotionEndDate()
        );
    }

    private ApiException mapDataAccessException(DataAccessException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message != null && message.contains("uk_products_center_name_active")) {
            return new ApiException(ErrorCode.CONFLICT, "동일 상품명이 이미 존재합니다.");
        }
        return new ApiException(ErrorCode.INTERNAL_ERROR, "상품 데이터 처리 중 오류가 발생했습니다.");
    }

    private String upper(String value) {
        if (value == null || value.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "required value is missing");
        }
        return value.trim().toUpperCase();
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record ProductCreateRequest(
            String productName,
            String productCategory,
            String productType,
            BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            Boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            Boolean allowHoldBypass,
            Boolean allowTransfer,
            Long assignedTrainerId,
            ProductPromotionRequest promotion,
            String productStatus,
            String description
    ) {}

    public record ProductUpdateRequest(
            String productName,
            String productCategory,
            String productType,
            BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            Boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            Boolean allowHoldBypass,
            Boolean allowTransfer,
            Long assignedTrainerId,
            ProductPromotionRequest promotion,
            Boolean clearPromotion,
            String productStatus,
            String description
    ) {}

    private record NormalizedProductInput(
            String productName,
            String productCategory,
            String productType,
            BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            boolean allowHoldBypass,
            boolean allowTransfer,
            Long assignedTrainerId,
            String promotionDiscountType,
            BigDecimal promotionDiscountValue,
            java.time.LocalDate promotionStartDate,
            java.time.LocalDate promotionEndDate,
            String productStatus,
            String description
    ) {}

}
