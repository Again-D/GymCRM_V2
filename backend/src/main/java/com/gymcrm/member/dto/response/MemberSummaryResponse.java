package com.gymcrm.member.dto.response;

import com.gymcrm.member.service.MemberSummary;

import java.time.LocalDate;

public record MemberSummaryResponse(
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
    public static MemberSummaryResponse from(MemberSummary member) {
        return new MemberSummaryResponse(
                member.memberId(),
                member.centerId(),
                member.memberCode(),
                member.memberName(),
                member.phone(),
                member.memberStatus(),
                member.joinDate(),
                member.membershipOperationalStatus(),
                member.membershipExpiryDate(),
                member.remainingPtCount()
        );
    }
}
