package com.gymcrm.locker;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "locker_slots")
public class LockerSlotEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "locker_slot_id")
    private Long lockerSlotId;

    @Column(name = "center_id", nullable = false)
    private Long centerId;

    @Column(name = "locker_code", nullable = false)
    private String lockerCode;

    @Column(name = "locker_zone")
    private String lockerZone;

    @Column(name = "locker_grade")
    private String lockerGrade;

    @Column(name = "locker_status", nullable = false)
    private String lockerStatus;

    @Column(name = "memo")
    private String memo;

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

    protected LockerSlotEntity() {
    }

    public Long getLockerSlotId() {
        return lockerSlotId;
    }

    public Long getCenterId() {
        return centerId;
    }

    public void setCenterId(Long centerId) {
        this.centerId = centerId;
    }

    public String getLockerCode() {
        return lockerCode;
    }

    public void setLockerCode(String lockerCode) {
        this.lockerCode = lockerCode;
    }

    public String getLockerZone() {
        return lockerZone;
    }

    public void setLockerZone(String lockerZone) {
        this.lockerZone = lockerZone;
    }

    public String getLockerGrade() {
        return lockerGrade;
    }

    public void setLockerGrade(String lockerGrade) {
        this.lockerGrade = lockerGrade;
    }

    public String getLockerStatus() {
        return lockerStatus;
    }

    public void setLockerStatus(String lockerStatus) {
        this.lockerStatus = lockerStatus;
    }

    public String getMemo() {
        return memo;
    }

    public void setMemo(String memo) {
        this.memo = memo;
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
