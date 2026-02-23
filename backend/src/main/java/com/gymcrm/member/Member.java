package com.gymcrm.member;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record Member(
        Long memberId,
        Long centerId,
        String memberName,
        String phone,
        String email,
        String gender,
        LocalDate birthDate,
        String memberStatus,
        LocalDate joinDate,
        boolean consentSms,
        boolean consentMarketing,
        String memo,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
}
