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
@Table(name = "settlements")
public class SettlementEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "settlement_id")
    private Long settlementId;

    @Column(name = "center_id", nullable = false)
    private Long centerId;

    @Column(name = "settlement_year", nullable = false)
    private Integer settlementYear;

    @Column(name = "settlement_month", nullable = false)
    private Integer settlementMonth;

    @Column(name = "total_lesson_count", nullable = false)
    private Integer totalLessonCount;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "settlement_date", nullable = false)
    private LocalDate settlementDate;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

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

    public Long getSettlementId() {
        return settlementId;
    }

    public Long getCenterId() {
        return centerId;
    }

    public void setCenterId(Long centerId) {
        this.centerId = centerId;
    }

    public Integer getSettlementYear() {
        return settlementYear;
    }

    public void setSettlementYear(Integer settlementYear) {
        this.settlementYear = settlementYear;
    }

    public Integer getSettlementMonth() {
        return settlementMonth;
    }

    public void setSettlementMonth(Integer settlementMonth) {
        this.settlementMonth = settlementMonth;
    }

    public Integer getTotalLessonCount() {
        return totalLessonCount;
    }

    public void setTotalLessonCount(Integer totalLessonCount) {
        this.totalLessonCount = totalLessonCount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDate getSettlementDate() {
        return settlementDate;
    }

    public void setSettlementDate(LocalDate settlementDate) {
        this.settlementDate = settlementDate;
    }

    public Long getConfirmedBy() {
        return confirmedBy;
    }

    public void setConfirmedBy(Long confirmedBy) {
        this.confirmedBy = confirmedBy;
    }

    public OffsetDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(OffsetDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
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
