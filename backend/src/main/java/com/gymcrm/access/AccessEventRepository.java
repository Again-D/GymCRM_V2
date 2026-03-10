package com.gymcrm.access;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class AccessEventRepository {
    private final AccessEventJpaRepository accessEventJpaRepository;
    private final AccessEventQueryRepository accessEventQueryRepository;
    private final EntityManager entityManager;

    public AccessEventRepository(
            AccessEventJpaRepository accessEventJpaRepository,
            AccessEventQueryRepository accessEventQueryRepository,
            EntityManager entityManager
    ) {
        this.accessEventJpaRepository = accessEventJpaRepository;
        this.accessEventQueryRepository = accessEventQueryRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public AccessEvent insert(InsertCommand command) {
        AccessEventEntity entity = new AccessEventEntity();
        entity.setCenterId(command.centerId());
        entity.setMemberId(command.memberId());
        entity.setMembershipId(command.membershipId());
        entity.setReservationId(command.reservationId());
        entity.setProcessedBy(command.processedBy());
        entity.setEventType(command.eventType());
        entity.setDenyReason(command.denyReason());
        entity.setProcessedAt(command.processedAt());
        entity.setCreatedAt(command.processedAt());
        AccessEventEntity saved = accessEventJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public List<AccessEvent> findAll(Long centerId, Long memberId, String eventType, int limit) {
        entityManager.clear();
        return accessEventQueryRepository.findAll(centerId, memberId, eventType, limit);
    }

    public int countTodayByType(Long centerId, String eventType) {
        entityManager.clear();
        return accessEventQueryRepository.countTodayByType(centerId, eventType);
    }

    public int countDeniedBetween(Long centerId, OffsetDateTime from, OffsetDateTime to) {
        entityManager.clear();
        return accessEventQueryRepository.countDeniedBetween(centerId, from, to);
    }

    public List<DeniedReasonCount> countDeniedByReasonBetween(Long centerId, OffsetDateTime from, OffsetDateTime to) {
        entityManager.clear();
        return accessEventQueryRepository.countDeniedByReasonBetween(centerId, from, to);
    }

    public List<DeniedEventRow> findRecentDenied(Long centerId, OffsetDateTime from, OffsetDateTime to, int limit) {
        entityManager.clear();
        return accessEventQueryRepository.findRecentDenied(centerId, from, to, limit);
    }

    public List<RepeatedDeniedMember> findRepeatedDeniedMembers(Long centerId, OffsetDateTime from, OffsetDateTime to, int minAttempts) {
        entityManager.clear();
        return accessEventQueryRepository.findRepeatedDeniedMembers(centerId, from, to, minAttempts);
    }

    private AccessEvent toDomain(AccessEventEntity entity) {
        return new AccessEvent(
                entity.getAccessEventId(),
                entity.getCenterId(),
                entity.getMemberId(),
                entity.getMembershipId(),
                entity.getReservationId(),
                entity.getProcessedBy(),
                entity.getEventType(),
                entity.getDenyReason(),
                entity.getProcessedAt(),
                entity.getCreatedAt()
        );
    }

    public record InsertCommand(
            Long centerId,
            Long memberId,
            Long membershipId,
            Long reservationId,
            Long processedBy,
            String eventType,
            String denyReason,
            OffsetDateTime processedAt
    ) {}

    public record DeniedReasonCount(
            String denyReason,
            int deniedCount
    ) {}

    public record DeniedEventRow(
            Long accessEventId,
            Long memberId,
            String memberName,
            String denyReason,
            OffsetDateTime processedAt
    ) {}

    public record RepeatedDeniedMember(
            Long memberId,
            String memberName,
            int deniedCount,
            OffsetDateTime lastDeniedAt
    ) {}
}
