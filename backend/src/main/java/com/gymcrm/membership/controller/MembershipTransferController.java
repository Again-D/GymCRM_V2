package com.gymcrm.membership.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.membership.dto.request.MembershipTransferPreviewRequest;
import com.gymcrm.membership.dto.request.MembershipTransferRequest;
import com.gymcrm.membership.dto.response.MembershipTransferPreviewResponse;
import com.gymcrm.membership.dto.response.MembershipTransferResponse;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.service.MembershipTransferService;
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
public class MembershipTransferController {
    private final MembershipTransferService membershipTransferService;
    private final MemberMembershipRepository memberMembershipRepository;

    public MembershipTransferController(
            MembershipTransferService membershipTransferService,
            MemberMembershipRepository memberMembershipRepository
    ) {
        this.membershipTransferService = membershipTransferService;
        this.memberMembershipRepository = memberMembershipRepository;
    }

    @PostMapping("/transfer/preview")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<MembershipTransferPreviewResponse> previewTransfer(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody MembershipTransferPreviewRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipTransferService.TransferCalculation calculation = membershipTransferService.preview(
                new MembershipTransferService.TransferPreviewRequest(
                        membershipId,
                        request.transfereeMemberId(),
                        request.transferFee()
                )
        );
        return ApiResponse.success(MembershipTransferPreviewResponse.from(calculation), "양도 미리보기를 계산했습니다.");
    }

    @PostMapping("/transfer")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<MembershipTransferResponse> transfer(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody MembershipTransferRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipTransferService.TransferResult result = membershipTransferService.transfer(
                new MembershipTransferService.TransferRequest(
                        membershipId,
                        request.transfereeMemberId(),
                        request.transferFee(),
                        request.reason(),
                        request.memo()
                )
        );
        return ApiResponse.success(MembershipTransferResponse.from(result), "회원권 양도가 완료되었습니다.");
    }

    private void assertMembershipBelongsToMember(Long memberId, Long membershipId) {
        MemberMembership membership = memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
        if (!membership.memberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId);
        }
    }
}
