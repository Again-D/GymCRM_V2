package com.gymcrm.membership;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;

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
    public ApiResponse<RefundPreviewResponse> preview(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody RefundPreviewRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipRefundService.RefundCalculation calculation = membershipRefundService.preview(
                new MembershipRefundService.RefundPreviewRequest(membershipId, request.refundDate())
        );

        return ApiResponse.success(RefundPreviewResponse.from(calculation), "환불 미리보기를 계산했습니다.");
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<RefundMembershipResponse> refund(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody RefundConfirmRequest request
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

        return ApiResponse.success(RefundMembershipResponse.from(result), "회원권 환불이 완료되었습니다.");
    }

    private void assertMembershipBelongsToMember(Long memberId, Long membershipId) {
        MemberMembership membership = memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
        if (!membership.memberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId);
        }
    }

    public record RefundPreviewRequest(
            LocalDate refundDate
    ) {}

    public record RefundConfirmRequest(
            LocalDate refundDate,
            @Pattern(regexp = "^(?i)(CASH|CARD|TRANSFER|ETC)?$", message = "refundPaymentMethod is invalid")
            String refundPaymentMethod,
            String refundReason,
            String refundMemo,
            String paymentMemo
    ) {}

    public record RefundPreviewResponse(
            RefundCalculationResponse calculation
    ) {
        static RefundPreviewResponse from(MembershipRefundService.RefundCalculation calculation) {
            return new RefundPreviewResponse(RefundCalculationResponse.from(calculation));
        }
    }

    public record RefundMembershipResponse(
            MembershipPurchaseController.MembershipResponse membership,
            MembershipPurchaseController.PaymentResponse payment,
            MembershipRefundResponse refund,
            RefundCalculationResponse calculation
    ) {
        static RefundMembershipResponse from(MembershipRefundService.RefundResult result) {
            return new RefundMembershipResponse(
                    MembershipPurchaseController.MembershipResponse.from(result.membership()),
                    MembershipPurchaseController.PaymentResponse.from(result.refundPayment()),
                    MembershipRefundResponse.from(result.refund()),
                    RefundCalculationResponse.from(result.calculation())
            );
        }
    }

    public record MembershipRefundResponse(
            Long membershipRefundId,
            Long centerId,
            Long membershipId,
            Long refundPaymentId,
            String refundStatus,
            String refundReason,
            BigDecimal originalAmount,
            BigDecimal usedAmount,
            BigDecimal penaltyAmount,
            BigDecimal refundAmount,
            String memo
    ) {
        static MembershipRefundResponse from(MembershipRefund refund) {
            return new MembershipRefundResponse(
                    refund.membershipRefundId(),
                    refund.centerId(),
                    refund.membershipId(),
                    refund.refundPaymentId(),
                    refund.refundStatus(),
                    refund.refundReason(),
                    refund.originalAmount(),
                    refund.usedAmount(),
                    refund.penaltyAmount(),
                    refund.refundAmount(),
                    refund.memo()
            );
        }
    }

    public record RefundCalculationResponse(
            LocalDate refundDate,
            BigDecimal originalAmount,
            BigDecimal usedAmount,
            BigDecimal penaltyAmount,
            BigDecimal refundAmount
    ) {
        static RefundCalculationResponse from(MembershipRefundService.RefundCalculation calculation) {
            return new RefundCalculationResponse(
                    calculation.refundDate(),
                    calculation.originalAmount(),
                    calculation.usedAmount(),
                    calculation.penaltyAmount(),
                    calculation.refundAmount()
            );
        }
    }
}
