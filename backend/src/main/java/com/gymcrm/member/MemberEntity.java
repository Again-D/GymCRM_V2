package com.gymcrm.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.DynamicInsert;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "members")
@DynamicInsert
public class MemberEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "center_id", nullable = false)
    private Long centerId;

    @Column(name = "member_code")
    private String memberCode;

    @Column(name = "member_name", nullable = false)
    private String memberName;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "phone_encrypted")
    private String phoneEncrypted;

    @Column(name = "email")
    private String email;

    @Column(name = "gender")
    private String gender;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "birth_date_encrypted")
    private String birthDateEncrypted;

    @Column(name = "pii_key_version")
    private Integer piiKeyVersion;

    @Column(name = "member_status", nullable = false)
    private String memberStatus;

    @Column(name = "join_date", nullable = false)
    private LocalDate joinDate;

    @Column(name = "consent_sms", nullable = false)
    private boolean consentSms;

    @Column(name = "consent_marketing", nullable = false)
    private boolean consentMarketing;

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

    protected MemberEntity() {
    }

    public Long getMemberId() {
        return memberId;
    }

    public Long getCenterId() {
        return centerId;
    }

    public void setCenterId(Long centerId) {
        this.centerId = centerId;
    }

    public String getMemberCode() {
        return memberCode;
    }

    public String getMemberName() {
        return memberName;
    }

    public void setMemberName(String memberName) {
        this.memberName = memberName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPhoneEncrypted() {
        return phoneEncrypted;
    }

    public void setPhoneEncrypted(String phoneEncrypted) {
        this.phoneEncrypted = phoneEncrypted;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public String getBirthDateEncrypted() {
        return birthDateEncrypted;
    }

    public void setBirthDateEncrypted(String birthDateEncrypted) {
        this.birthDateEncrypted = birthDateEncrypted;
    }

    public Integer getPiiKeyVersion() {
        return piiKeyVersion;
    }

    public void setPiiKeyVersion(Integer piiKeyVersion) {
        this.piiKeyVersion = piiKeyVersion;
    }

    public String getMemberStatus() {
        return memberStatus;
    }

    public void setMemberStatus(String memberStatus) {
        this.memberStatus = memberStatus;
    }

    public LocalDate getJoinDate() {
        return joinDate;
    }

    public void setJoinDate(LocalDate joinDate) {
        this.joinDate = joinDate;
    }

    public boolean isConsentSms() {
        return consentSms;
    }

    public void setConsentSms(boolean consentSms) {
        this.consentSms = consentSms;
    }

    public boolean isConsentMarketing() {
        return consentMarketing;
    }

    public void setConsentMarketing(boolean consentMarketing) {
        this.consentMarketing = consentMarketing;
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

    public OffsetDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(OffsetDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public Long getDeletedBy() {
        return deletedBy;
    }

    public void setDeletedBy(Long deletedBy) {
        this.deletedBy = deletedBy;
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
