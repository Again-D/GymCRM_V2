package com.gymcrm.membership.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.membership.dto.request.MembershipPurchaseRequest;
import com.gymcrm.membership.dto.response.MembershipPurchaseResponse;
import com.gymcrm.membership.dto.response.MembershipSummaryResponse;
import com.gymcrm.membership.service.MembershipPurchaseService;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/members/{memberId}/memberships")
public class MembershipPurchaseController {
    private final MembershipPurchaseService membershipPurchaseService;

    public MembershipPurchaseController(MembershipPurchaseService membershipPurchaseService) {
        this.membershipPurchaseService = membershipPurchaseService;
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<java.util.List<MembershipSummaryResponse>> list(@PathVariable Long memberId) {
        return ApiResponse.success(
                membershipPurchaseService.listMemberships(memberId).stream().map(MembershipSummaryResponse::from).toList(),
                "회원권 목록 조회 성공"
        );
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<MembershipPurchaseResponse> purchase(
            @PathVariable Long memberId,
            @Valid @RequestBody MembershipPurchaseRequest request
    ) {
        MembershipPurchaseService.PurchaseResult result = membershipPurchaseService.purchase(
                new MembershipPurchaseService.PurchaseRequest(
                        memberId,
                        request.productId(),
                        request.assignedTrainerId(),
                        request.startDate(),
                        request.paidAmount(),
                        request.paymentMethod(),
                        request.membershipMemo(),
                        request.paymentMemo()
                )
        );

        return ApiResponse.success(MembershipPurchaseResponse.from(result), "회원권 구매가 완료되었습니다.");
    }
}
