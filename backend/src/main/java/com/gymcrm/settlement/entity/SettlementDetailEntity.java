package com.gymcrm.settlement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "settlement_details")
public class SettlementDetailEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "settlement_detail_id")
    private Long settlementDetailId;

    @Column(name = "settlement_id", nullable = false)
    private Long settlementId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "lesson_type", nullable = false)
    private String lessonType;

    @Column(name = "lesson_count", nullable = false)
    private Integer lessonCount;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "bonus_amount", nullable = false)
    private BigDecimal bonusAmount;

    @Column(name = "deduction_amount", nullable = false)
    private BigDecimal deductionAmount;

    @Column(name = "net_amount", nullable = false)
    private BigDecimal netAmount;

    @Column(name = "memo")
    private String memo;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "updated_by", nullable = false)
    private Long updatedBy;

    public Long getSettlementDetailId() {
        return settlementDetailId;
    }

    public Long getSettlementId() {
        return settlementId;
    }

    public void setSettlementId(Long settlementId) {
        this.settlementId = settlementId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getLessonType() {
        return lessonType;
    }

    public void setLessonType(String lessonType) {
        this.lessonType = lessonType;
    }

    public Integer getLessonCount() {
        return lessonCount;
    }

    public void setLessonCount(Integer lessonCount) {
        this.lessonCount = lessonCount;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BigDecimal getBonusAmount() {
        return bonusAmount;
    }

    public void setBonusAmount(BigDecimal bonusAmount) {
        this.bonusAmount = bonusAmount;
    }

    public BigDecimal getDeductionAmount() {
        return deductionAmount;
    }

    public void setDeductionAmount(BigDecimal deductionAmount) {
        this.deductionAmount = deductionAmount;
    }

    public BigDecimal getNetAmount() {
        return netAmount;
    }

    public void setNetAmount(BigDecimal netAmount) {
        this.netAmount = netAmount;
    }

    public String getMemo() {
        return memo;
    }

    public void setMemo(String memo) {
        this.memo = memo;
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
