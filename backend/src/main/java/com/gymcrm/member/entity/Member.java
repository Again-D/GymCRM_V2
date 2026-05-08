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
        String emergencyContactName,
        String emergencyContactPhone,
        String emergencyContactRelationship,
        OffsetDateTime withdrawnAt,
        OffsetDateTime createdAt,
        Long createdBy,
        OffsetDateTime updatedAt,
        Long updatedBy
) {
    public Member(
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
            OffsetDateTime withdrawnAt,
            OffsetDateTime createdAt,
            Long createdBy,
            OffsetDateTime updatedAt,
            Long updatedBy
    ) {
        this(memberId, centerId, memberCode, memberName, phone, phoneEncrypted, email, gender, birthDate, birthDateEncrypted, piiKeyVersion, memberStatus, joinDate, consentSms, consentMarketing, memo, null, null, null, withdrawnAt, createdAt, createdBy, updatedAt, updatedBy);
    }
}
