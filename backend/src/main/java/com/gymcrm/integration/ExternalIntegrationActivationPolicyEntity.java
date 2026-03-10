package com.gymcrm.integration;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "external_integration_activation_policies")
public class ExternalIntegrationActivationPolicyEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "external_integration_activation_policy_id")
    private Long externalIntegrationActivationPolicyId;

    @Column(name = "center_id", nullable = false)
    private Long centerId;

    @Column(name = "activation_stage", nullable = false)
    private String activationStage;

    @Column(name = "payment_enabled", nullable = false)
    private boolean paymentEnabled;

    @Column(name = "messaging_enabled", nullable = false)
    private boolean messagingEnabled;

    @Column(name = "qr_enabled", nullable = false)
    private boolean qrEnabled;

    @Column(name = "last_drill_outcome")
    private String lastDrillOutcome;

    @Column(name = "last_drill_at")
    private OffsetDateTime lastDrillAt;

    @Column(name = "last_drill_summary")
    private String lastDrillSummary;

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

    protected ExternalIntegrationActivationPolicyEntity() {}

    public Long getExternalIntegrationActivationPolicyId() { return externalIntegrationActivationPolicyId; }
    public Long getCenterId() { return centerId; }
    public void setCenterId(Long centerId) { this.centerId = centerId; }
    public String getActivationStage() { return activationStage; }
    public void setActivationStage(String activationStage) { this.activationStage = activationStage; }
    public boolean isPaymentEnabled() { return paymentEnabled; }
    public void setPaymentEnabled(boolean paymentEnabled) { this.paymentEnabled = paymentEnabled; }
    public boolean isMessagingEnabled() { return messagingEnabled; }
    public void setMessagingEnabled(boolean messagingEnabled) { this.messagingEnabled = messagingEnabled; }
    public boolean isQrEnabled() { return qrEnabled; }
    public void setQrEnabled(boolean qrEnabled) { this.qrEnabled = qrEnabled; }
    public String getLastDrillOutcome() { return lastDrillOutcome; }
    public void setLastDrillOutcome(String lastDrillOutcome) { this.lastDrillOutcome = lastDrillOutcome; }
    public OffsetDateTime getLastDrillAt() { return lastDrillAt; }
    public void setLastDrillAt(OffsetDateTime lastDrillAt) { this.lastDrillAt = lastDrillAt; }
    public String getLastDrillSummary() { return lastDrillSummary; }
    public void setLastDrillSummary(String lastDrillSummary) { this.lastDrillSummary = lastDrillSummary; }
    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean deleted) { isDeleted = deleted; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
