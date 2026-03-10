package com.gymcrm.locker;

import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.gymcrm.locker.QLockerAssignmentEntity.lockerAssignmentEntity;

@Repository
public class LockerAssignmentQueryRepository {
    private final JPAQueryFactory queryFactory;

    public LockerAssignmentQueryRepository(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    public List<LockerAssignment> findAll(Long centerId, boolean activeOnly) {
        return queryFactory
                .select(Projections.constructor(
                        LockerAssignment.class,
                        lockerAssignmentEntity.lockerAssignmentId,
                        lockerAssignmentEntity.centerId,
                        lockerAssignmentEntity.lockerSlotId,
                        lockerAssignmentEntity.memberId,
                        lockerAssignmentEntity.assignmentStatus,
                        lockerAssignmentEntity.assignedAt,
                        lockerAssignmentEntity.startDate,
                        lockerAssignmentEntity.endDate,
                        lockerAssignmentEntity.returnedAt,
                        lockerAssignmentEntity.refundAmount,
                        lockerAssignmentEntity.returnReason,
                        lockerAssignmentEntity.memo,
                        lockerAssignmentEntity.createdAt,
                        lockerAssignmentEntity.updatedAt
                ))
                .from(lockerAssignmentEntity)
                .where(
                        lockerAssignmentEntity.centerId.eq(centerId),
                        lockerAssignmentEntity.isDeleted.isFalse(),
                        activeOnly ? lockerAssignmentEntity.assignmentStatus.eq("ACTIVE") : null
                )
                .orderBy(lockerAssignmentEntity.assignedAt.desc(), lockerAssignmentEntity.lockerAssignmentId.desc())
                .fetch();
    }
}
