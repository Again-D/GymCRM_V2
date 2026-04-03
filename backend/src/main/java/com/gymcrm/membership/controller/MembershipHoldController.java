package com.gymcrm.membership.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.membership.dto.request.MembershipHoldRequest;
import com.gymcrm.membership.dto.request.MembershipResumeRequest;
import com.gymcrm.membership.dto.response.MembershipHoldResponse;
import com.gymcrm.membership.dto.response.MembershipResumeResponse;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.service.MembershipHoldService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/members/{memberId}/memberships/{membershipId}")
public class MembershipHoldController {
    private final MembershipHoldService membershipHoldService;
    private final MemberMembershipRepository memberMembershipRepository;

    public MembershipHoldController(
            MembershipHoldService membershipHoldService,
            MemberMembershipRepository memberMembershipRepository
    ) {
        this.membershipHoldService = membershipHoldService;
        this.memberMembershipRepository = memberMembershipRepository;
    }

    @PostMapping("/hold")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<MembershipHoldResponse> hold(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody MembershipHoldRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipHoldService.HoldResult result = membershipHoldService.hold(new MembershipHoldService.HoldRequest(
                membershipId,
                request.holdStartDate(),
                request.holdEndDate(),
                request.reason(),
                request.memo(),
                request.overrideLimits()
        ));

        return ApiResponse.success(MembershipHoldResponse.from(result), "회원권 홀딩이 완료되었습니다.");
    }

    @PostMapping("/resume")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<MembershipResumeResponse> resume(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody MembershipResumeRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipHoldService.ResumeResult result = membershipHoldService.resume(new MembershipHoldService.ResumeRequest(
                membershipId,
                request.resumeDate()
        ));

        return ApiResponse.success(MembershipResumeResponse.from(result), "회원권 홀딩 해제가 완료되었습니다.");
    }

    private void assertMembershipBelongsToMember(Long memberId, Long membershipId) {
        MemberMembership membership = memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
        if (!membership.memberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId);
        }
    }
}
