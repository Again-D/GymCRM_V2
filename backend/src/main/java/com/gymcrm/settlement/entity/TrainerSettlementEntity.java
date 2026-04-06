package com.gymcrm.settlement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "trainer_settlements")
public class TrainerSettlementEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "settlement_id")
    private Long settlementId;

    @Column(name = "center_id", nullable = false)
    private Long centerId;

    @Column(name = "settlement_month", nullable = false)
    private LocalDate settlementMonth;

    @Column(name = "trainer_user_id")
    private Long trainerUserId;

    @Column(name = "trainer_name", nullable = false)
    private String trainerName;

    @Column(name = "completed_class_count", nullable = false)
    private Long completedClassCount;

    @Column(name = "session_unit_price", nullable = false)
    private BigDecimal sessionUnitPrice;

    @Column(name = "payroll_amount", nullable = false)
    private BigDecimal payrollAmount;

    @Column(name = "settlement_status", nullable = false)
    private String settlementStatus;

    @Column(name = "confirmed_at", nullable = false)
    private OffsetDateTime confirmedAt;

    @Column(name = "confirmed_by", nullable = false)
    private Long confirmedBy;

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

    public TrainerSettlementEntity() {
    }

    public Long getSettlementId() {
        return settlementId;
    }

    public Long getCenterId() {
        return centerId;
    }

    public void setCenterId(Long centerId) {
        this.centerId = centerId;
    }

    public LocalDate getSettlementMonth() {
        return settlementMonth;
    }

    public void setSettlementMonth(LocalDate settlementMonth) {
        this.settlementMonth = settlementMonth;
    }

    public Long getTrainerUserId() {
        return trainerUserId;
    }

    public void setTrainerUserId(Long trainerUserId) {
        this.trainerUserId = trainerUserId;
    }

    public String getTrainerName() {
        return trainerName;
    }

    public void setTrainerName(String trainerName) {
        this.trainerName = trainerName;
    }

    public Long getCompletedClassCount() {
        return completedClassCount;
    }

    public void setCompletedClassCount(Long completedClassCount) {
        this.completedClassCount = completedClassCount;
    }

    public BigDecimal getSessionUnitPrice() {
        return sessionUnitPrice;
    }

    public void setSessionUnitPrice(BigDecimal sessionUnitPrice) {
        this.sessionUnitPrice = sessionUnitPrice;
    }

    public BigDecimal getPayrollAmount() {
        return payrollAmount;
    }

    public void setPayrollAmount(BigDecimal payrollAmount) {
        this.payrollAmount = payrollAmount;
    }

    public String getSettlementStatus() {
        return settlementStatus;
    }

    public void setSettlementStatus(String settlementStatus) {
        this.settlementStatus = settlementStatus;
    }

    public OffsetDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(OffsetDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public Long getConfirmedBy() {
        return confirmedBy;
    }

    public void setConfirmedBy(Long confirmedBy) {
        this.confirmedBy = confirmedBy;
    }

    public boolean isDeleted() {
        return isDeleted;
    }

    public void setDeleted(boolean deleted) {
        isDeleted = deleted;
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
