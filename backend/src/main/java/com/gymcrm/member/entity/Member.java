package com.gymcrm.member.entity;

import com.gymcrm.member.enums.Gender;
import com.gymcrm.member.enums.MemberStatus;

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
        Gender gender,
        LocalDate birthDate,
        String birthDateEncrypted,
        Integer piiKeyVersion,
        MemberStatus memberStatus,
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
