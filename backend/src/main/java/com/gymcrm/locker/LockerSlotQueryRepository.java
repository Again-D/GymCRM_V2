package com.gymcrm.locker;

import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static com.gymcrm.locker.QLockerSlotEntity.lockerSlotEntity;

@Repository
public class LockerSlotQueryRepository {
    private final JPAQueryFactory queryFactory;
    private final LockerSlotJpaRepository lockerSlotJpaRepository;
    private final EntityManager entityManager;

    public LockerSlotQueryRepository(
            JPAQueryFactory queryFactory,
            LockerSlotJpaRepository lockerSlotJpaRepository,
            EntityManager entityManager
    ) {
        this.queryFactory = queryFactory;
        this.lockerSlotJpaRepository = lockerSlotJpaRepository;
        this.entityManager = entityManager;
    }

    public List<LockerSlot> findAll(Long centerId, String lockerStatus, String lockerZone) {
        return queryFactory
                .select(Projections.constructor(
                        LockerSlot.class,
                        lockerSlotEntity.lockerSlotId,
                        lockerSlotEntity.centerId,
                        lockerSlotEntity.lockerCode,
                        lockerSlotEntity.lockerZone,
                        lockerSlotEntity.lockerGrade,
                        lockerSlotEntity.lockerStatus,
                        lockerSlotEntity.memo,
                        lockerSlotEntity.createdAt,
                        lockerSlotEntity.updatedAt
                ))
                .from(lockerSlotEntity)
                .where(
                        lockerSlotEntity.centerId.eq(centerId),
                        lockerSlotEntity.isDeleted.isFalse(),
                        eqIfPresent(lockerSlotEntity.lockerStatus, lockerStatus),
                        eqIfPresent(lockerSlotEntity.lockerZone, lockerZone)
                )
                .orderBy(lockerSlotEntity.lockerCode.asc())
                .fetch();
    }

    public Optional<LockerSlot> markAssignedIfAvailable(LockerSlotRepository.UpdateStatusCommand command) {
        long updated = queryFactory.update(lockerSlotEntity)
                .set(lockerSlotEntity.lockerStatus, "ASSIGNED")
                .set(lockerSlotEntity.updatedAt, command.now())
                .set(lockerSlotEntity.updatedBy, command.actorUserId())
                .where(
                        lockerSlotEntity.lockerSlotId.eq(command.lockerSlotId()),
                        lockerSlotEntity.centerId.eq(command.centerId()),
                        lockerSlotEntity.isDeleted.isFalse(),
                        lockerSlotEntity.lockerStatus.eq("AVAILABLE")
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return lockerSlotJpaRepository.findByLockerSlotIdAndCenterIdAndIsDeletedFalse(command.lockerSlotId(), command.centerId())
                .map(this::toDomain);
    }

    public Optional<LockerSlot> markAvailableIfAssigned(LockerSlotRepository.UpdateStatusCommand command) {
        long updated = queryFactory.update(lockerSlotEntity)
                .set(lockerSlotEntity.lockerStatus, "AVAILABLE")
                .set(lockerSlotEntity.updatedAt, command.now())
                .set(lockerSlotEntity.updatedBy, command.actorUserId())
                .where(
                        lockerSlotEntity.lockerSlotId.eq(command.lockerSlotId()),
                        lockerSlotEntity.centerId.eq(command.centerId()),
                        lockerSlotEntity.isDeleted.isFalse(),
                        lockerSlotEntity.lockerStatus.eq("ASSIGNED")
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return lockerSlotJpaRepository.findByLockerSlotIdAndCenterIdAndIsDeletedFalse(command.lockerSlotId(), command.centerId())
                .map(this::toDomain);
    }

    private com.querydsl.core.types.Predicate eqIfPresent(
            com.querydsl.core.types.dsl.StringPath path,
            String value
    ) {
        return value == null ? null : path.eq(value);
    }

    private LockerSlot toDomain(LockerSlotEntity entity) {
        return new LockerSlot(
                entity.getLockerSlotId(),
                entity.getCenterId(),
                entity.getLockerCode(),
                entity.getLockerZone(),
                entity.getLockerGrade(),
                entity.getLockerStatus(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
