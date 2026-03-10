package com.gymcrm.access;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "member_access_sessions")
public class MemberAccessSessionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "access_session_id")
    private Long accessSessionId;

    @Column(name = "center_id", nullable = false)
    private Long centerId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "membership_id")
    private Long membershipId;

    @Column(name = "reservation_id")
    private Long reservationId;

    @Column(name = "entry_event_id", nullable = false)
    private Long entryEventId;

    @Column(name = "entry_at", nullable = false)
    private OffsetDateTime entryAt;

    @Column(name = "exit_event_id")
    private Long exitEventId;

    @Column(name = "exited_at")
    private OffsetDateTime exitedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected MemberAccessSessionEntity() {
    }

    public Long getAccessSessionId() { return accessSessionId; }
    public Long getCenterId() { return centerId; }
    public void setCenterId(Long centerId) { this.centerId = centerId; }
    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }
    public Long getMembershipId() { return membershipId; }
    public void setMembershipId(Long membershipId) { this.membershipId = membershipId; }
    public Long getReservationId() { return reservationId; }
    public void setReservationId(Long reservationId) { this.reservationId = reservationId; }
    public Long getEntryEventId() { return entryEventId; }
    public void setEntryEventId(Long entryEventId) { this.entryEventId = entryEventId; }
    public OffsetDateTime getEntryAt() { return entryAt; }
    public void setEntryAt(OffsetDateTime entryAt) { this.entryAt = entryAt; }
    public Long getExitEventId() { return exitEventId; }
    public void setExitEventId(Long exitEventId) { this.exitEventId = exitEventId; }
    public OffsetDateTime getExitedAt() { return exitedAt; }
    public void setExitedAt(OffsetDateTime exitedAt) { this.exitedAt = exitedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
