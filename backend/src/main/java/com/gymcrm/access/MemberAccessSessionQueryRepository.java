package com.gymcrm.access;

import com.gymcrm.member.entity.QMemberEntity;
import com.querydsl.core.Tuple;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static com.gymcrm.access.QMemberAccessSessionEntity.memberAccessSessionEntity;

@Repository
public class MemberAccessSessionQueryRepository {
    private final JPAQueryFactory queryFactory;
    private final MemberAccessSessionJpaRepository memberAccessSessionJpaRepository;
    private final EntityManager entityManager;

    public MemberAccessSessionQueryRepository(
            JPAQueryFactory queryFactory,
            MemberAccessSessionJpaRepository memberAccessSessionJpaRepository,
            EntityManager entityManager
    ) {
        this.queryFactory = queryFactory;
        this.memberAccessSessionJpaRepository = memberAccessSessionJpaRepository;
        this.entityManager = entityManager;
    }

    public Optional<MemberAccessSession> findOpenByMember(Long centerId, Long memberId) {
        QMemberEntity member = QMemberEntity.memberEntity;
        Tuple row = queryFactory
                .select(
                        memberAccessSessionEntity.accessSessionId,
                        memberAccessSessionEntity.centerId,
                        memberAccessSessionEntity.memberId,
                        member.memberName,
                        member.phone,
                        memberAccessSessionEntity.membershipId,
                        memberAccessSessionEntity.reservationId,
                        memberAccessSessionEntity.entryEventId,
                        memberAccessSessionEntity.entryAt,
                        memberAccessSessionEntity.exitEventId,
                        memberAccessSessionEntity.exitedAt,
                        memberAccessSessionEntity.createdAt,
                        memberAccessSessionEntity.updatedAt
                )
                .from(memberAccessSessionEntity)
                .join(member).on(member.memberId.eq(memberAccessSessionEntity.memberId))
                .where(
                        memberAccessSessionEntity.centerId.eq(centerId),
                        memberAccessSessionEntity.memberId.eq(memberId),
                        memberAccessSessionEntity.exitedAt.isNull()
                )
                .fetchOne();
        return Optional.ofNullable(row).map(this::toDomain);
    }

    public Optional<MemberAccessSession> closeSession(MemberAccessSessionRepository.CloseCommand command) {
        long updated = queryFactory.update(memberAccessSessionEntity)
                .set(memberAccessSessionEntity.exitEventId, command.exitEventId())
                .set(memberAccessSessionEntity.exitedAt, command.exitedAt())
                .set(memberAccessSessionEntity.updatedAt, OffsetDateTime.now())
                .where(
                        memberAccessSessionEntity.accessSessionId.eq(command.accessSessionId()),
                        memberAccessSessionEntity.exitedAt.isNull()
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return memberAccessSessionJpaRepository.findById(command.accessSessionId())
                .map(entity -> toDomain(entity, null, null));
    }

    public List<MemberAccessSession> findOpenSessions(Long centerId, int limit) {
        QMemberEntity member = QMemberEntity.memberEntity;
        return queryFactory
                .select(
                        memberAccessSessionEntity.accessSessionId,
                        memberAccessSessionEntity.centerId,
                        memberAccessSessionEntity.memberId,
                        member.memberName,
                        member.phone,
                        memberAccessSessionEntity.membershipId,
                        memberAccessSessionEntity.reservationId,
                        memberAccessSessionEntity.entryEventId,
                        memberAccessSessionEntity.entryAt,
                        memberAccessSessionEntity.exitEventId,
                        memberAccessSessionEntity.exitedAt,
                        memberAccessSessionEntity.createdAt,
                        memberAccessSessionEntity.updatedAt
                )
                .from(memberAccessSessionEntity)
                .join(member).on(member.memberId.eq(memberAccessSessionEntity.memberId))
                .where(
                        memberAccessSessionEntity.centerId.eq(centerId),
                        memberAccessSessionEntity.exitedAt.isNull()
                )
                .orderBy(memberAccessSessionEntity.entryAt.desc())
                .limit(limit)
                .fetch()
                .stream()
                .map(this::toDomain)
                .toList();
    }

    public int countOpenSessions(Long centerId) {
        Long count = queryFactory.select(memberAccessSessionEntity.count())
                .from(memberAccessSessionEntity)
                .where(
                        memberAccessSessionEntity.centerId.eq(centerId),
                        memberAccessSessionEntity.exitedAt.isNull()
                )
                .fetchOne();
        return count == null ? 0 : count.intValue();
    }

    private MemberAccessSession toDomain(Tuple row) {
        QMemberEntity member = QMemberEntity.memberEntity;
        return new MemberAccessSession(
                row.get(memberAccessSessionEntity.accessSessionId),
                row.get(memberAccessSessionEntity.centerId),
                row.get(memberAccessSessionEntity.memberId),
                row.get(member.memberName),
                row.get(member.phone),
                row.get(memberAccessSessionEntity.membershipId),
                row.get(memberAccessSessionEntity.reservationId),
                row.get(memberAccessSessionEntity.entryEventId),
                row.get(memberAccessSessionEntity.entryAt),
                row.get(memberAccessSessionEntity.exitEventId),
                row.get(memberAccessSessionEntity.exitedAt),
                row.get(memberAccessSessionEntity.createdAt),
                row.get(memberAccessSessionEntity.updatedAt)
        );
    }

    private MemberAccessSession toDomain(MemberAccessSessionEntity entity, String memberName, String phone) {
        return new MemberAccessSession(
                entity.getAccessSessionId(),
                entity.getCenterId(),
                entity.getMemberId(),
                memberName,
                phone,
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
}
