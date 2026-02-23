package com.gymcrm.product;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
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

    private final ProductRepository productRepository;
    private final CurrentUserProvider currentUserProvider;

    public ProductService(ProductRepository productRepository, CurrentUserProvider currentUserProvider) {
        this.productRepository = productRepository;
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
                request.allowTransfer(),
                request.productStatus(),
                request.description()
        );

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
                    input.allowTransfer(),
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
                request.allowTransfer() == null ? current.allowTransfer() : request.allowTransfer(),
                request.productStatus() == null ? current.productStatus() : request.productStatus(),
                request.description() == null ? current.description() : request.description()
        );

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
                    input.allowTransfer(),
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
            Boolean allowTransfer,
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
                allowTransfer != null && allowTransfer,
                status,
                trimToNull(description)
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
            Boolean allowTransfer,
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
            Boolean allowTransfer,
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
            boolean allowTransfer,
            String productStatus,
            String description
    ) {}
}
