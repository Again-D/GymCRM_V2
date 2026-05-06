package com.gymcrm.membership.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.membership.dto.request.MembershipExtendPreviewRequest;
import com.gymcrm.membership.dto.request.MembershipExtendRequest;
import com.gymcrm.membership.dto.response.MembershipExtendPreviewResponse;
import com.gymcrm.membership.dto.response.MembershipExtendResponse;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.service.MembershipExtendService;
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
public class MembershipExtendController {
    private final MembershipExtendService membershipExtendService;
    private final MemberMembershipRepository memberMembershipRepository;

    public MembershipExtendController(
            MembershipExtendService membershipExtendService,
            MemberMembershipRepository memberMembershipRepository
    ) {
        this.membershipExtendService = membershipExtendService;
        this.memberMembershipRepository = memberMembershipRepository;
    }

    @PostMapping("/extend/preview")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<MembershipExtendPreviewResponse> previewExtend(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody MembershipExtendPreviewRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipExtendService.ExtendCalculation calculation = membershipExtendService.preview(
                new MembershipExtendService.ExtendPreviewRequest(
                        membershipId,
                        request.extensionDays(),
                        request.customAmount()
                )
        );
        return ApiResponse.success(MembershipExtendPreviewResponse.from(calculation), "회원권 연장 미리보기를 계산했습니다.");
    }

    @PostMapping("/extend")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<MembershipExtendResponse> extend(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody MembershipExtendRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipExtendService.ExtendResult result = membershipExtendService.extend(
                new MembershipExtendService.ExtendRequest(
                        membershipId,
                        request.extensionDays(),
                        request.customAmount(),
                        request.reason(),
                        request.memo()
                )
        );
        return ApiResponse.success(MembershipExtendResponse.from(result), "회원권 연장이 완료되었습니다.");
    }

    private void assertMembershipBelongsToMember(Long memberId, Long membershipId) {
        MemberMembership membership = memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
        if (!membership.memberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId);
        }
    }
}
