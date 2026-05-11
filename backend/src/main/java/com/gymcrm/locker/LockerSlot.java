package com.gymcrm.locker;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record LockerSlot(
        Long lockerSlotId,
        Long centerId,
        String lockerCode,
        String lockerZone,
        String lockerGrade,
        BigDecimal monthlyFee,
        String lockerStatus,
        String memo,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
