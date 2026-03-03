package com.gymcrm.locker;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record LockerAssignment(
        Long lockerAssignmentId,
        Long centerId,
        Long lockerSlotId,
        Long memberId,
        String assignmentStatus,
        OffsetDateTime assignedAt,
        LocalDate startDate,
        LocalDate endDate,
        OffsetDateTime returnedAt,
        BigDecimal refundAmount,
        String returnReason,
        String memo,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
