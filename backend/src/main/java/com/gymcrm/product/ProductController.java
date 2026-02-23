package com.gymcrm.product;

import com.gymcrm.common.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    public ApiResponse<ProductResponse> create(@Valid @RequestBody CreateProductRequest request) {
        Product product = productService.create(new ProductService.ProductCreateRequest(
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
        ));
        return ApiResponse.success(ProductResponse.from(product), "상품이 등록되었습니다.");
    }

    @GetMapping
    public ApiResponse<List<ProductSummaryResponse>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status
    ) {
        List<ProductSummaryResponse> items = productService.list(category, status).stream()
                .map(ProductSummaryResponse::from)
                .toList();
        return ApiResponse.success(items, "상품 목록 조회 성공");
    }

    @GetMapping("/{productId}")
    public ApiResponse<ProductResponse> detail(@PathVariable Long productId) {
        return ApiResponse.success(ProductResponse.from(productService.get(productId)), "상품 상세 조회 성공");
    }

    @PatchMapping("/{productId}")
    public ApiResponse<ProductResponse> update(
            @PathVariable Long productId,
            @Valid @RequestBody UpdateProductRequest request
    ) {
        Product product = productService.update(productId, new ProductService.ProductUpdateRequest(
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
        ));
        return ApiResponse.success(ProductResponse.from(product), "상품 정보가 수정되었습니다.");
    }

    @PatchMapping("/{productId}/status")
    public ApiResponse<ProductResponse> updateStatus(
            @PathVariable Long productId,
            @Valid @RequestBody UpdateProductStatusRequest request
    ) {
        Product product = productService.updateStatus(productId, request.productStatus());
        return ApiResponse.success(ProductResponse.from(product), "상품 상태가 변경되었습니다.");
    }

    public record CreateProductRequest(
            @NotBlank(message = "productName is required")
            String productName,
            @Pattern(regexp = "^(?i)(MEMBERSHIP|PT|GX|ETC)?$", message = "productCategory is invalid")
            String productCategory,
            @NotBlank(message = "productType is required")
            @Pattern(regexp = "^(?i)(DURATION|COUNT)$", message = "productType must be DURATION or COUNT")
            String productType,
            @DecimalMin(value = "0", inclusive = true, message = "priceAmount must be >= 0")
            BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            Boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            Boolean allowTransfer,
            @Pattern(regexp = "^(?i)(ACTIVE|INACTIVE)?$", message = "productStatus must be ACTIVE or INACTIVE")
            String productStatus,
            String description
    ) {}

    public record UpdateProductRequest(
            String productName,
            @Pattern(regexp = "^(?i)(MEMBERSHIP|PT|GX|ETC)?$", message = "productCategory is invalid")
            String productCategory,
            @Pattern(regexp = "^(?i)(DURATION|COUNT)?$", message = "productType must be DURATION or COUNT")
            String productType,
            @DecimalMin(value = "0", inclusive = true, message = "priceAmount must be >= 0")
            BigDecimal priceAmount,
            Integer validityDays,
            Integer totalCount,
            Boolean allowHold,
            Integer maxHoldDays,
            Integer maxHoldCount,
            Boolean allowTransfer,
            @Pattern(regexp = "^(?i)(ACTIVE|INACTIVE)?$", message = "productStatus must be ACTIVE or INACTIVE")
            String productStatus,
            String description
    ) {}

    public record UpdateProductStatusRequest(
            @NotBlank(message = "productStatus is required")
            @Pattern(regexp = "^(?i)(ACTIVE|INACTIVE)$", message = "productStatus must be ACTIVE or INACTIVE")
            String productStatus
    ) {}

    public record ProductSummaryResponse(
            Long productId,
            Long centerId,
            String productName,
            String productCategory,
            String productType,
            BigDecimal priceAmount,
            String productStatus
    ) {
        static ProductSummaryResponse from(Product product) {
            return new ProductSummaryResponse(
                    product.productId(),
                    product.centerId(),
                    product.productName(),
                    product.productCategory(),
                    product.productType(),
                    product.priceAmount(),
                    product.productStatus()
            );
        }
    }

    public record ProductResponse(
            Long productId,
            Long centerId,
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
    ) {
        static ProductResponse from(Product product) {
            return new ProductResponse(
                    product.productId(),
                    product.centerId(),
                    product.productName(),
                    product.productCategory(),
                    product.productType(),
                    product.priceAmount(),
                    product.validityDays(),
                    product.totalCount(),
                    product.allowHold(),
                    product.maxHoldDays(),
                    product.maxHoldCount(),
                    product.allowTransfer(),
                    product.productStatus(),
                    product.description()
            );
        }
    }
}
