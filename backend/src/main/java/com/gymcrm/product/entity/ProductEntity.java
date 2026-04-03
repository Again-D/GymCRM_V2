package com.gymcrm.product.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "products")
public class ProductEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "center_id", nullable = false)
    private Long centerId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "product_category", nullable = false)
    private String productCategory;

    @Column(name = "product_type", nullable = false)
    private String productType;

    @Column(name = "price_amount", nullable = false)
    private BigDecimal priceAmount;

    @Column(name = "validity_days")
    private Integer validityDays;

    @Column(name = "total_count")
    private Integer totalCount;

    @Column(name = "allow_hold", nullable = false)
    private boolean allowHold;

    @Column(name = "max_hold_days")
    private Integer maxHoldDays;

    @Column(name = "max_hold_count")
    private Integer maxHoldCount;

    @Column(name = "allow_hold_bypass", nullable = false)
    private boolean allowHoldBypass;

    @Column(name = "allow_transfer", nullable = false)
    private boolean allowTransfer;

    @Column(name = "product_status", nullable = false)
    private String productStatus;

    @Column(name = "description")
    private String description;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "deleted_by")
    private Long deletedBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "updated_by", nullable = false)
    private Long updatedBy;

    public ProductEntity() {
    }

    public Long getProductId() {
        return productId;
    }

    public Long getCenterId() {
        return centerId;
    }

    public void setCenterId(Long centerId) {
        this.centerId = centerId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductCategory() {
        return productCategory;
    }

    public void setProductCategory(String productCategory) {
        this.productCategory = productCategory;
    }

    public String getProductType() {
        return productType;
    }

    public void setProductType(String productType) {
        this.productType = productType;
    }

    public BigDecimal getPriceAmount() {
        return priceAmount;
    }

    public void setPriceAmount(BigDecimal priceAmount) {
        this.priceAmount = priceAmount;
    }

    public Integer getValidityDays() {
        return validityDays;
    }

    public void setValidityDays(Integer validityDays) {
        this.validityDays = validityDays;
    }

    public Integer getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(Integer totalCount) {
        this.totalCount = totalCount;
    }

    public boolean isAllowHold() {
        return allowHold;
    }

    public void setAllowHold(boolean allowHold) {
        this.allowHold = allowHold;
    }

    public Integer getMaxHoldDays() {
        return maxHoldDays;
    }

    public void setMaxHoldDays(Integer maxHoldDays) {
        this.maxHoldDays = maxHoldDays;
    }

    public Integer getMaxHoldCount() {
        return maxHoldCount;
    }

    public void setMaxHoldCount(Integer maxHoldCount) {
        this.maxHoldCount = maxHoldCount;
    }

    public boolean isAllowHoldBypass() {
        return allowHoldBypass;
    }

    public void setAllowHoldBypass(boolean allowHoldBypass) {
        this.allowHoldBypass = allowHoldBypass;
    }

    public boolean isAllowTransfer() {
        return allowTransfer;
    }

    public void setAllowTransfer(boolean allowTransfer) {
        this.allowTransfer = allowTransfer;
    }

    public String getProductStatus() {
        return productStatus;
    }

    public void setProductStatus(String productStatus) {
        this.productStatus = productStatus;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isDeleted() {
        return isDeleted;
    }

    public void setDeleted(boolean deleted) {
        isDeleted = deleted;
    }

    public OffsetDateTime getDeletedAt() {
        return deletedAt;
    }

    public Long getDeletedBy() {
        return deletedBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(Long updatedBy) {
        this.updatedBy = updatedBy;
    }
}
