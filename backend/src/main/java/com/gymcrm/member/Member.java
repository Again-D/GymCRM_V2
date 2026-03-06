package com.gymcrm.member;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record Member(
        Long memberId,
        Long centerId,
        String memberCode,
        String memberName,
        String phone,
        String phoneEncrypted,
        String email,
        String gender,
        LocalDate birthDate,
        String birthDateEncrypted,
        Integer piiKeyVersion,
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
