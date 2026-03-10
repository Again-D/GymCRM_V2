package com.gymcrm.access;

import com.gymcrm.member.QMemberEntity;
import com.querydsl.core.Tuple;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static com.gymcrm.access.QAccessEventEntity.accessEventEntity;

@Repository
public class AccessEventQueryRepository {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final JPAQueryFactory queryFactory;

    public AccessEventQueryRepository(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    public List<AccessEvent> findAll(Long centerId, Long memberId, String eventType, int limit) {
        BooleanExpression predicate = accessEventEntity.centerId.eq(centerId);
        if (memberId != null) {
            predicate = predicate.and(accessEventEntity.memberId.eq(memberId));
        }
        if (eventType != null) {
            predicate = predicate.and(accessEventEntity.eventType.eq(eventType));
        }
        return queryFactory.selectFrom(accessEventEntity)
                .where(predicate)
                .orderBy(accessEventEntity.processedAt.desc(), accessEventEntity.accessEventId.desc())
                .limit(limit)
                .fetch()
                .stream()
                .map(this::toDomain)
                .toList();
    }

    public int countTodayByType(Long centerId, String eventType) {
        OffsetDateTime from = LocalDate.now(BUSINESS_ZONE).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime to = from.plusDays(1);
        Long count = queryFactory.select(accessEventEntity.count())
                .from(accessEventEntity)
                .where(
                        accessEventEntity.centerId.eq(centerId),
                        accessEventEntity.eventType.eq(eventType),
                        accessEventEntity.processedAt.goe(from.withOffsetSameInstant(ZoneOffset.UTC)),
                        accessEventEntity.processedAt.lt(to.withOffsetSameInstant(ZoneOffset.UTC))
                )
                .fetchOne();
        return count == null ? 0 : count.intValue();
    }

    public int countDeniedBetween(Long centerId, OffsetDateTime from, OffsetDateTime to) {
        Long count = queryFactory.select(accessEventEntity.count())
                .from(accessEventEntity)
                .where(
                        accessEventEntity.centerId.eq(centerId),
                        accessEventEntity.eventType.eq("ENTRY_DENIED"),
                        accessEventEntity.processedAt.goe(from),
                        accessEventEntity.processedAt.lt(to)
                )
                .fetchOne();
        return count == null ? 0 : count.intValue();
    }

    public List<AccessEventRepository.DeniedReasonCount> countDeniedByReasonBetween(Long centerId, OffsetDateTime from, OffsetDateTime to) {
        List<Tuple> rows = queryFactory
                .select(accessEventEntity.denyReason, accessEventEntity.count())
                .from(accessEventEntity)
                .where(
                        accessEventEntity.centerId.eq(centerId),
                        accessEventEntity.eventType.eq("ENTRY_DENIED"),
                        accessEventEntity.processedAt.goe(from),
                        accessEventEntity.processedAt.lt(to)
                )
                .groupBy(accessEventEntity.denyReason)
                .orderBy(accessEventEntity.count().desc(), accessEventEntity.denyReason.asc())
                .fetch();
        return rows.stream()
                .map(row -> new AccessEventRepository.DeniedReasonCount(
                        row.get(accessEventEntity.denyReason),
                        row.get(accessEventEntity.count()).intValue()
                ))
                .toList();
    }

    public List<AccessEventRepository.DeniedEventRow> findRecentDenied(Long centerId, OffsetDateTime from, OffsetDateTime to, int limit) {
        QMemberEntity member = QMemberEntity.memberEntity;
        List<Tuple> rows = queryFactory
                .select(
                        accessEventEntity.accessEventId,
                        accessEventEntity.memberId,
                        member.memberName,
                        accessEventEntity.denyReason,
                        accessEventEntity.processedAt
                )
                .from(accessEventEntity)
                .join(member).on(member.memberId.eq(accessEventEntity.memberId))
                .where(
                        accessEventEntity.centerId.eq(centerId),
                        accessEventEntity.eventType.eq("ENTRY_DENIED"),
                        accessEventEntity.processedAt.goe(from),
                        accessEventEntity.processedAt.lt(to)
                )
                .orderBy(accessEventEntity.processedAt.desc(), accessEventEntity.accessEventId.desc())
                .limit(limit)
                .fetch();
        return rows.stream()
                .map(row -> new AccessEventRepository.DeniedEventRow(
                        row.get(accessEventEntity.accessEventId),
                        row.get(accessEventEntity.memberId),
                        row.get(member.memberName),
                        row.get(accessEventEntity.denyReason),
                        row.get(accessEventEntity.processedAt)
                ))
                .toList();
    }

    public List<AccessEventRepository.RepeatedDeniedMember> findRepeatedDeniedMembers(Long centerId, OffsetDateTime from, OffsetDateTime to, int minAttempts) {
        QMemberEntity member = QMemberEntity.memberEntity;
        List<Tuple> rows = queryFactory
                .select(
                        accessEventEntity.memberId,
                        member.memberName,
                        accessEventEntity.count(),
                        accessEventEntity.processedAt.max()
                )
                .from(accessEventEntity)
                .join(member).on(member.memberId.eq(accessEventEntity.memberId))
                .where(
                        accessEventEntity.centerId.eq(centerId),
                        accessEventEntity.eventType.eq("ENTRY_DENIED"),
                        accessEventEntity.processedAt.goe(from),
                        accessEventEntity.processedAt.lt(to)
                )
                .groupBy(accessEventEntity.memberId, member.memberName)
                .having(accessEventEntity.count().goe((long) minAttempts))
                .orderBy(accessEventEntity.count().desc(), accessEventEntity.processedAt.max().desc())
                .fetch();
        return rows.stream()
                .map(row -> new AccessEventRepository.RepeatedDeniedMember(
                        row.get(accessEventEntity.memberId),
                        row.get(member.memberName),
                        row.get(accessEventEntity.count()).intValue(),
                        row.get(accessEventEntity.processedAt.max())
                ))
                .toList();
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
}
