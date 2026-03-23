package com.gymcrm.member.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record MemberCreateRequest(
        @NotBlank(message = "memberName is required")
        String memberName,
        @NotBlank(message = "phone is required")
        String phone,
        String email,
        @Pattern(regexp = "^\\s*(?i:(MALE|FEMALE|OTHER)?)\\s*$", message = "gender must be MALE, FEMALE, or OTHER")
        String gender,
        LocalDate birthDate,
        @NotBlank(message = "memberStatus is required")
        @Pattern(regexp = "^\\s*(?i:(ACTIVE|INACTIVE))\\s*$", message = "memberStatus must be ACTIVE or INACTIVE")
        String memberStatus,
        LocalDate joinDate,
        Boolean consentSms,
        Boolean consentMarketing,
        String memo
) {
}
