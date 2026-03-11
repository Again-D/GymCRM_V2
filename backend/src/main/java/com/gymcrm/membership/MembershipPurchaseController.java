package com.gymcrm.membership;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

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
    public ApiResponse<java.util.List<MembershipResponse>> list(@PathVariable Long memberId) {
        return ApiResponse.success(
                membershipPurchaseService.listMemberships(memberId).stream().map(MembershipResponse::from).toList(),
                "회원권 목록 조회 성공"
        );
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<PurchaseMembershipResponse> purchase(
            @PathVariable Long memberId,
            @Valid @RequestBody PurchaseMembershipRequest request
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

        return ApiResponse.success(PurchaseMembershipResponse.from(result), "회원권 구매가 완료되었습니다.");
    }

    public record PurchaseMembershipRequest(
            @NotNull(message = "productId is required")
            Long productId,
            Long assignedTrainerId,
            LocalDate startDate,
            @DecimalMin(value = "0", inclusive = true, message = "paidAmount must be >= 0")
            BigDecimal paidAmount,
            @Pattern(regexp = "^(?i)(CASH|CARD|TRANSFER|ETC)?$", message = "paymentMethod is invalid")
            String paymentMethod,
            String membershipMemo,
            String paymentMemo
    ) {}

    public record PurchaseMembershipResponse(
            MembershipResponse membership,
            PaymentResponse payment,
            CalculationResponse calculation
    ) {
        static PurchaseMembershipResponse from(MembershipPurchaseService.PurchaseResult result) {
            return new PurchaseMembershipResponse(
                    MembershipResponse.from(result.membership()),
                    PaymentResponse.from(result.payment()),
                    CalculationResponse.from(result.calculation())
            );
        }
    }

    public record MembershipResponse(
            Long membershipId,
            Long centerId,
            Long memberId,
            Long productId,
            Long assignedTrainerId,
            String membershipStatus,
            String productNameSnapshot,
            String productCategorySnapshot,
            String productTypeSnapshot,
            BigDecimal priceAmountSnapshot,
            OffsetDateTime purchasedAt,
            LocalDate startDate,
            LocalDate endDate,
            Integer totalCount,
            Integer remainingCount,
            Integer usedCount,
            Integer holdDaysUsed,
            Integer holdCountUsed,
            String memo,
            String activeHoldStatus,
            LocalDate activeHoldStartDate,
            LocalDate activeHoldEndDate
    ) {
        static MembershipResponse from(MembershipPurchaseService.MembershipListItem item) {
            return from(item.membership(), item.activeHold());
        }

        static MembershipResponse from(MemberMembership membership) {
            return from(membership, null);
        }

        static MembershipResponse from(MemberMembership membership, MembershipHold activeHold) {
            return new MembershipResponse(
                    membership.membershipId(),
                    membership.centerId(),
                    membership.memberId(),
                    membership.productId(),
                    membership.assignedTrainerId(),
                    membership.membershipStatus(),
                    membership.productNameSnapshot(),
                    membership.productCategorySnapshot(),
                    membership.productTypeSnapshot(),
                    membership.priceAmountSnapshot(),
                    membership.purchasedAt(),
                    membership.startDate(),
                    membership.endDate(),
                    membership.totalCount(),
                    membership.remainingCount(),
                    membership.usedCount(),
                    membership.holdDaysUsed(),
                    membership.holdCountUsed(),
                    membership.memo(),
                    activeHold == null ? null : activeHold.holdStatus(),
                    activeHold == null ? null : activeHold.holdStartDate(),
                    activeHold == null ? null : activeHold.holdEndDate()
            );
        }
    }

    public record PaymentResponse(
            Long paymentId,
            Long membershipId,
            String paymentType,
            String paymentStatus,
            String paymentMethod,
            BigDecimal amount,
            OffsetDateTime paidAt,
            String memo
    ) {
        static PaymentResponse from(Payment payment) {
            return new PaymentResponse(
                    payment.paymentId(),
                    payment.membershipId(),
                    payment.paymentType(),
                    payment.paymentStatus(),
                    payment.paymentMethod(),
                    payment.amount(),
                    payment.paidAt(),
                    payment.memo()
            );
        }
    }

    public record CalculationResponse(
            LocalDate startDate,
            LocalDate endDate,
            Integer totalCount,
            Integer remainingCount,
            BigDecimal chargeAmount
    ) {
        static CalculationResponse from(MembershipPurchaseService.PurchaseCalculation calculation) {
            return new CalculationResponse(
                    calculation.startDate(),
                    calculation.endDate(),
                    calculation.totalCount(),
                    calculation.remainingCount(),
                    calculation.chargeAmount()
            );
        }
    }
}
