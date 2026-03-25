package com.gymcrm.membership.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.membership.dto.request.MembershipRefundConfirmRequest;
import com.gymcrm.membership.dto.request.MembershipRefundPreviewRequest;
import com.gymcrm.membership.dto.response.MembershipRefundPreviewResponse;
import com.gymcrm.membership.dto.response.MembershipRefundResponse;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.service.MembershipRefundService;
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
@RequestMapping("/api/v1/members/{memberId}/memberships/{membershipId}/refund")
public class MembershipRefundController {
    private final MembershipRefundService membershipRefundService;
    private final MemberMembershipRepository memberMembershipRepository;

    public MembershipRefundController(
            MembershipRefundService membershipRefundService,
            MemberMembershipRepository memberMembershipRepository
    ) {
        this.membershipRefundService = membershipRefundService;
        this.memberMembershipRepository = memberMembershipRepository;
    }

    @PostMapping("/preview")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<MembershipRefundPreviewResponse> preview(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody MembershipRefundPreviewRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipRefundService.RefundCalculation calculation = membershipRefundService.preview(
                new MembershipRefundService.RefundPreviewRequest(membershipId, request.refundDate())
        );

        return ApiResponse.success(MembershipRefundPreviewResponse.from(calculation), "환불 미리보기를 계산했습니다.");
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<MembershipRefundResponse> refund(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody MembershipRefundConfirmRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipRefundService.RefundResult result = membershipRefundService.refund(
                new MembershipRefundService.RefundRequest(
                        membershipId,
                        request.refundDate(),
                        request.refundPaymentMethod(),
                        request.refundReason(),
                        request.refundMemo(),
                        request.paymentMemo()
                )
        );

        return ApiResponse.success(MembershipRefundResponse.from(result), "회원권 환불이 완료되었습니다.");
    }

    private void assertMembershipBelongsToMember(Long memberId, Long membershipId) {
        MemberMembership membership = memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
        if (!membership.memberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId);
        }
    }
}
