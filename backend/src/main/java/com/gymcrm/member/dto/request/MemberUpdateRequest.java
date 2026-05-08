package com.gymcrm.member.dto.request;

import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record MemberUpdateRequest(
        String memberName,
        String phone,
        String email,
        @Pattern(regexp = "^\\s*(?i:(MALE|FEMALE|OTHER)?)\\s*$", message = "gender must be MALE, FEMALE, or OTHER")
        String gender,
        LocalDate birthDate,
        @Pattern(regexp = "^\\s*(?i:(ACTIVE|INACTIVE)?)\\s*$", message = "memberStatus must be ACTIVE or INACTIVE")
        String memberStatus,
        LocalDate joinDate,
        Boolean consentSms,
        Boolean consentMarketing,
        String memo,
        String emergencyContactName,
        String emergencyContactPhone,
        String emergencyContactRelationship
) {
    public MemberUpdateRequest(
            String memberName,
            String phone,
            String email,
            String gender,
            LocalDate birthDate,
            String memberStatus,
            LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo
    ) {
        this(memberName, phone, email, gender, birthDate, memberStatus, joinDate, consentSms, consentMarketing, memo, null, null, null);
    }
}
