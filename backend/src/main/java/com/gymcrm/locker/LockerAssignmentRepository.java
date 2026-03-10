package com.gymcrm.locker;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static com.gymcrm.locker.QLockerAssignmentEntity.lockerAssignmentEntity;

@Repository
public class LockerAssignmentRepository {
    private final LockerAssignmentJpaRepository lockerAssignmentJpaRepository;
    private final LockerAssignmentQueryRepository lockerAssignmentQueryRepository;
    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    public LockerAssignmentRepository(
            LockerAssignmentJpaRepository lockerAssignmentJpaRepository,
            LockerAssignmentQueryRepository lockerAssignmentQueryRepository,
            JPAQueryFactory queryFactory,
            EntityManager entityManager
    ) {
        this.lockerAssignmentJpaRepository = lockerAssignmentJpaRepository;
        this.lockerAssignmentQueryRepository = lockerAssignmentQueryRepository;
        this.queryFactory = queryFactory;
        this.entityManager = entityManager;
    }

    public LockerAssignment insertActive(InsertCommand command) {
        LockerAssignmentEntity entity = new LockerAssignmentEntity();
        entity.setCenterId(command.centerId());
        entity.setLockerSlotId(command.lockerSlotId());
        entity.setMemberId(command.memberId());
        entity.setAssignmentStatus("ACTIVE");
        entity.setAssignedAt(command.assignedAt());
        entity.setStartDate(command.startDate());
        entity.setEndDate(command.endDate());
        entity.setMemo(command.memo());
        entity.setDeleted(false);
        entity.setCreatedAt(command.assignedAt());
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(command.assignedAt());
        entity.setUpdatedBy(command.actorUserId());
        return toDomain(lockerAssignmentJpaRepository.saveAndFlush(entity));
    }

    public Optional<LockerAssignment> findById(Long lockerAssignmentId, Long centerId) {
        return lockerAssignmentJpaRepository.findByLockerAssignmentIdAndCenterIdAndIsDeletedFalse(lockerAssignmentId, centerId)
                .map(this::toDomain);
    }

    public List<LockerAssignment> findAll(Long centerId, boolean activeOnly) {
        return lockerAssignmentQueryRepository.findAll(centerId, activeOnly);
    }

    public Optional<LockerAssignment> closeAssignment(CloseCommand command) {
        var updateClause = queryFactory.update(lockerAssignmentEntity)
                .set(lockerAssignmentEntity.assignmentStatus, "RETURNED")
                .set(lockerAssignmentEntity.returnedAt, command.returnedAt())
                .set(lockerAssignmentEntity.refundAmount, command.refundAmount())
                .set(lockerAssignmentEntity.returnReason, command.returnReason())
                .set(lockerAssignmentEntity.updatedAt, command.returnedAt())
                .set(lockerAssignmentEntity.updatedBy, command.actorUserId())
                .where(
                        lockerAssignmentEntity.lockerAssignmentId.eq(command.lockerAssignmentId()),
                        lockerAssignmentEntity.centerId.eq(command.centerId()),
                        lockerAssignmentEntity.isDeleted.isFalse(),
                        lockerAssignmentEntity.assignmentStatus.eq("ACTIVE")
                );
        if (command.memo() != null) {
            updateClause.set(lockerAssignmentEntity.memo, command.memo());
        }
        long updated = updateClause.execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return lockerAssignmentJpaRepository.findByLockerAssignmentIdAndCenterIdAndIsDeletedFalse(
                command.lockerAssignmentId(),
                command.centerId()
        ).map(this::toDomain);
    }

    private LockerAssignment toDomain(LockerAssignmentEntity entity) {
        return new LockerAssignment(
                entity.getLockerAssignmentId(),
                entity.getCenterId(),
                entity.getLockerSlotId(),
                entity.getMemberId(),
                entity.getAssignmentStatus(),
                entity.getAssignedAt(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getReturnedAt(),
                entity.getRefundAmount(),
                entity.getReturnReason(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public record InsertCommand(
            Long centerId,
            Long lockerSlotId,
            Long memberId,
            OffsetDateTime assignedAt,
            LocalDate startDate,
            LocalDate endDate,
            String memo,
            Long actorUserId
    ) {
    }

    public record CloseCommand(
            Long lockerAssignmentId,
            Long centerId,
            OffsetDateTime returnedAt,
            BigDecimal refundAmount,
            String returnReason,
            String memo,
            Long actorUserId
    ) {
    }
}
