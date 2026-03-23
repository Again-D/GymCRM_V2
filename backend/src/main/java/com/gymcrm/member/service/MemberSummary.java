package com.gymcrm.member.service;

import java.time.LocalDate;

public record MemberSummary(
        Long memberId,
        Long centerId,
        String memberCode,
        String memberName,
        String phone,
        String memberStatus,
        LocalDate joinDate,
        String membershipOperationalStatus,
        LocalDate membershipExpiryDate,
        Integer remainingPtCount
) {
}
