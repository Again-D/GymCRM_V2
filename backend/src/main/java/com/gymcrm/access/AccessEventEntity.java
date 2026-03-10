package com.gymcrm.access;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "access_events")
public class AccessEventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "access_event_id")
    private Long accessEventId;

    @Column(name = "center_id", nullable = false)
    private Long centerId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "membership_id")
    private Long membershipId;

    @Column(name = "reservation_id")
    private Long reservationId;

    @Column(name = "processed_by", nullable = false)
    private Long processedBy;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "deny_reason")
    private String denyReason;

    @Column(name = "processed_at", nullable = false)
    private OffsetDateTime processedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected AccessEventEntity() {
    }

    public Long getAccessEventId() { return accessEventId; }
    public Long getCenterId() { return centerId; }
    public void setCenterId(Long centerId) { this.centerId = centerId; }
    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }
    public Long getMembershipId() { return membershipId; }
    public void setMembershipId(Long membershipId) { this.membershipId = membershipId; }
    public Long getReservationId() { return reservationId; }
    public void setReservationId(Long reservationId) { this.reservationId = reservationId; }
    public Long getProcessedBy() { return processedBy; }
    public void setProcessedBy(Long processedBy) { this.processedBy = processedBy; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getDenyReason() { return denyReason; }
    public void setDenyReason(String denyReason) { this.denyReason = denyReason; }
    public OffsetDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(OffsetDateTime processedAt) { this.processedAt = processedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
