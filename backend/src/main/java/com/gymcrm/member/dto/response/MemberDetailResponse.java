package com.gymcrm.member.dto.response;

import com.gymcrm.member.entity.Member;

import java.time.LocalDate;

public record MemberDetailResponse(
        Long memberId,
        Long centerId,
        String memberCode,
        String memberName,
        String phone,
        String email,
        String gender,
        LocalDate birthDate,
        String memberStatus,
        LocalDate joinDate,
        boolean consentSms,
        boolean consentMarketing,
        String memo
) {
    public static MemberDetailResponse from(Member member) {
        return new MemberDetailResponse(
                member.memberId(),
                member.centerId(),
                member.memberCode(),
                member.memberName(),
                member.phone(),
                member.email(),
                member.gender() == null ? null : member.gender().value(),
                member.birthDate(),
                member.memberStatus().value(),
                member.joinDate(),
                member.consentSms(),
                member.consentMarketing(),
                member.memo()
        );
    }
}
