package com.gymcrm.access;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class MemberAccessSessionRepository {
    private final MemberAccessSessionJpaRepository memberAccessSessionJpaRepository;
    private final MemberAccessSessionQueryRepository memberAccessSessionQueryRepository;
    private final EntityManager entityManager;

    public MemberAccessSessionRepository(
            MemberAccessSessionJpaRepository memberAccessSessionJpaRepository,
            MemberAccessSessionQueryRepository memberAccessSessionQueryRepository,
            EntityManager entityManager
    ) {
        this.memberAccessSessionJpaRepository = memberAccessSessionJpaRepository;
        this.memberAccessSessionQueryRepository = memberAccessSessionQueryRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public MemberAccessSession insertOpen(InsertOpenCommand command) {
        MemberAccessSessionEntity entity = new MemberAccessSessionEntity();
        entity.setCenterId(command.centerId());
        entity.setMemberId(command.memberId());
        entity.setMembershipId(command.membershipId());
        entity.setReservationId(command.reservationId());
        entity.setEntryEventId(command.entryEventId());
        entity.setEntryAt(command.entryAt());
        entity.setCreatedAt(command.entryAt());
        entity.setUpdatedAt(command.entryAt());
        MemberAccessSessionEntity saved = memberAccessSessionJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Optional<MemberAccessSession> findOpenByMember(Long centerId, Long memberId) {
        entityManager.clear();
        return memberAccessSessionQueryRepository.findOpenByMember(centerId, memberId);
    }

    @Transactional
    public Optional<MemberAccessSession> closeSession(CloseCommand command) {
        return memberAccessSessionQueryRepository.closeSession(command);
    }

    public List<MemberAccessSession> findOpenSessions(Long centerId, int limit) {
        entityManager.clear();
        return memberAccessSessionQueryRepository.findOpenSessions(centerId, limit);
    }

    public int countOpenSessions(Long centerId) {
        entityManager.clear();
        return memberAccessSessionQueryRepository.countOpenSessions(centerId);
    }

    private MemberAccessSession toDomain(MemberAccessSessionEntity entity) {
        return new MemberAccessSession(
                entity.getAccessSessionId(),
                entity.getCenterId(),
                entity.getMemberId(),
                null,
                null,
                entity.getMembershipId(),
                entity.getReservationId(),
                entity.getEntryEventId(),
                entity.getEntryAt(),
                entity.getExitEventId(),
                entity.getExitedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public record InsertOpenCommand(
            Long centerId,
            Long memberId,
            Long membershipId,
            Long reservationId,
            Long entryEventId,
            OffsetDateTime entryAt
    ) {}

    public record CloseCommand(
            Long accessSessionId,
            Long exitEventId,
            OffsetDateTime exitedAt
    ) {}
}
