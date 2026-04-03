package com.gymcrm.product.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.product.dto.request.UpdateProductStatusRequest;
import com.gymcrm.product.dto.response.ProductResponse;
import com.gymcrm.product.dto.response.ProductSummaryResponse;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.product.service.ProductService.ProductCreateRequest;
import com.gymcrm.product.service.ProductService.ProductUpdateRequest;

import jakarta.validation.Valid;

import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


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
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<ProductResponse> create(@Valid @RequestBody ProductCreateRequest request) {
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
                request.allowHoldBypass(),
                request.allowTransfer(),
                request.productStatus(),
                request.description()
        ));
        return ApiResponse.success(ProductResponse.from(product), "상품이 등록되었습니다.");
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
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
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<ProductResponse> detail(@PathVariable Long productId) {
        return ApiResponse.success(ProductResponse.from(productService.get(productId)), "상품 상세 조회 성공");
    }

    @PatchMapping("/{productId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<ProductResponse> update(
            @PathVariable Long productId,
            @Valid @RequestBody ProductUpdateRequest request
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
                request.allowHoldBypass(),
                request.allowTransfer(),
                request.productStatus(),
                request.description()
        ));
        return ApiResponse.success(ProductResponse.from(product), "상품 정보가 수정되었습니다.");
    }

    @PatchMapping("/{productId}/status")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<ProductResponse> updateStatus(
            @PathVariable Long productId,
            @Valid @RequestBody UpdateProductStatusRequest request
    ) {
        Product product = productService.updateStatus(productId, request.productStatus());
        return ApiResponse.success(ProductResponse.from(product), "상품 상태가 변경되었습니다.");
    }



    
}
