package com.gymcrm.reservation.repository;

import com.gymcrm.reservation.entity.TrainerSchedule;
import com.gymcrm.reservation.entity.TrainerScheduleEntity;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static com.gymcrm.reservation.entity.QTrainerScheduleEntity.trainerScheduleEntity;

@Repository
public class TrainerScheduleQueryRepository {
    private final JPAQueryFactory queryFactory;
    private final TrainerScheduleJpaRepository trainerScheduleJpaRepository;
    private final EntityManager entityManager;

    public TrainerScheduleQueryRepository(
            JPAQueryFactory queryFactory,
            TrainerScheduleJpaRepository trainerScheduleJpaRepository,
            EntityManager entityManager
    ) {
        this.queryFactory = queryFactory;
        this.trainerScheduleJpaRepository = trainerScheduleJpaRepository;
        this.entityManager = entityManager;
    }

    public List<TrainerSchedule> findAll(Long centerId) {
        return queryFactory
                .selectFrom(trainerScheduleEntity)
                .where(
                        trainerScheduleEntity.centerId.eq(centerId),
                        trainerScheduleEntity.isDeleted.isFalse()
                )
                .orderBy(trainerScheduleEntity.startAt.asc(), trainerScheduleEntity.scheduleId.asc())
                .fetch()
                .stream()
                .map(this::toDomain)
                .toList();
    }

    public List<TrainerSchedule> findAllByIds(Long centerId, List<Long> scheduleIds) {
        Set<Long> normalizedIds = scheduleIds == null
                ? Set.of()
                : scheduleIds.stream()
                .filter(id -> id != null && id > 0)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (normalizedIds.isEmpty()) {
            return List.of();
        }

        return queryFactory
                .selectFrom(trainerScheduleEntity)
                .where(
                        trainerScheduleEntity.centerId.eq(centerId),
                        trainerScheduleEntity.isDeleted.isFalse(),
                        trainerScheduleEntity.scheduleId.in(normalizedIds)
                )
                .orderBy(trainerScheduleEntity.startAt.asc(), trainerScheduleEntity.scheduleId.asc())
                .fetch()
                .stream()
                .map(this::toDomain)
                .toList();
    }

    public Optional<TrainerSchedule> incrementCurrentCountIfAvailable(Long scheduleId, Long actorUserId) {
        long updated = queryFactory.update(trainerScheduleEntity)
                .set(trainerScheduleEntity.currentCount, trainerScheduleEntity.currentCount.add(1))
                .set(trainerScheduleEntity.updatedAt, OffsetDateTime.now())
                .set(trainerScheduleEntity.updatedBy, actorUserId)
                .where(
                        trainerScheduleEntity.scheduleId.eq(scheduleId),
                        trainerScheduleEntity.isDeleted.isFalse(),
                        trainerScheduleEntity.currentCount.lt(trainerScheduleEntity.capacity)
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return trainerScheduleJpaRepository.findByScheduleIdAndIsDeletedFalse(scheduleId).map(this::toDomain);
    }

    public Optional<TrainerSchedule> decrementCurrentCountIfPositive(Long scheduleId, Long actorUserId) {
        long updated = queryFactory.update(trainerScheduleEntity)
                .set(trainerScheduleEntity.currentCount, trainerScheduleEntity.currentCount.subtract(1))
                .set(trainerScheduleEntity.updatedAt, OffsetDateTime.now())
                .set(trainerScheduleEntity.updatedBy, actorUserId)
                .where(
                        trainerScheduleEntity.scheduleId.eq(scheduleId),
                        trainerScheduleEntity.isDeleted.isFalse(),
                        trainerScheduleEntity.currentCount.gt(0)
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return trainerScheduleJpaRepository.findByScheduleIdAndIsDeletedFalse(scheduleId).map(this::toDomain);
    }

    private TrainerSchedule toDomain(TrainerScheduleEntity entity) {
        return new TrainerSchedule(
                entity.getScheduleId(),
                entity.getCenterId(),
                entity.getTrainerUserId(),
                entity.getScheduleType(),
                entity.getTrainerName(),
                entity.getSlotTitle(),
                entity.getStartAt(),
                entity.getEndAt(),
                entity.getCapacity(),
                entity.getCurrentCount(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy(),
                entity.getSourceRuleId(),
                entity.getSourceExceptionId()
        );
    }

    public List<TimeBlock> findTimeBlocksByTrainerAndRange(
            Long centerId,
            Long trainerUserId,
            OffsetDateTime rangeStart,
            OffsetDateTime rangeEnd
    ) {
        return queryFactory
                .select(
                        trainerScheduleEntity.startAt,
                        trainerScheduleEntity.endAt
                )
                .from(trainerScheduleEntity)
                .where(
                        trainerScheduleEntity.centerId.eq(centerId),
                        trainerScheduleEntity.trainerUserId.eq(trainerUserId),
                        trainerScheduleEntity.isDeleted.isFalse(),
                        trainerScheduleEntity.startAt.lt(rangeEnd),
                        trainerScheduleEntity.endAt.gt(rangeStart)
                )
                .fetch()
                .stream()
                .map(tuple -> new TimeBlock(
                        tuple.get(trainerScheduleEntity.startAt),
                        tuple.get(trainerScheduleEntity.endAt)
                ))
                .toList();
    }

    public record TimeBlock(
            OffsetDateTime startAt,
            OffsetDateTime endAt
    ) {
    }
}
