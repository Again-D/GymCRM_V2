package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

@Service
public class MembershipRefundService {
    private static final BigDecimal PENALTY_RATE = new BigDecimal("0.10");

    private final MemberMembershipRepository memberMembershipRepository;
    private final MembershipRefundRepository membershipRefundRepository;
    private final PaymentRepository paymentRepository;
    private final MembershipStatusTransitionService membershipStatusTransitionService;
    private final CurrentUserProvider currentUserProvider;

    public MembershipRefundService(
            MemberMembershipRepository memberMembershipRepository,
            MembershipRefundRepository membershipRefundRepository,
            PaymentRepository paymentRepository,
            MembershipStatusTransitionService membershipStatusTransitionService,
            CurrentUserProvider currentUserProvider
    ) {
        this.memberMembershipRepository = memberMembershipRepository;
        this.membershipRefundRepository = membershipRefundRepository;
        this.paymentRepository = paymentRepository;
        this.membershipStatusTransitionService = membershipStatusTransitionService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public RefundCalculation preview(RefundPreviewRequest request) {
        MemberMembership membership = getMembership(request.membershipId());
        validateRefundEligibility(membership);
        ensureNotRefunded(membership.membershipId());
        Payment purchasePayment = getPurchasePayment(membership.membershipId());
        LocalDate refundDate = normalizeRefundDate(request.refundDate());
        return calculateRefund(membership, purchasePayment.amount(), refundDate);
    }

    @Transactional
    public RefundResult refund(RefundRequest request) {
        if (request.membershipId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "membershipId is required");
        }

        MemberMembership membership = getMembership(request.membershipId());
        validateRefundEligibility(membership);
        ensureNotRefunded(membership.membershipId());

        Payment purchasePayment = getPurchasePayment(membership.membershipId());
        LocalDate refundDate = normalizeRefundDate(request.refundDate());
        RefundCalculation calculation = calculateRefund(membership, purchasePayment.amount(), refundDate);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Long actorUserId = currentUserProvider.currentUserId();

        try {
            Payment refundPayment = paymentRepository.insert(new PaymentRepository.PaymentCreateCommand(
                    membership.centerId(),
                    membership.memberId(),
                    membership.membershipId(),
                    "REFUND",
                    "COMPLETED",
                    normalizeRefundPaymentMethod(request.refundPaymentMethod(), purchasePayment.paymentMethod()),
                    calculation.refundAmount(),
                    now,
                    null,
                    trimToNull(request.paymentMemo()),
                    actorUserId
            ));

            MembershipRefund refund = membershipRefundRepository.insert(new MembershipRefundRepository.MembershipRefundCreateCommand(
                    membership.centerId(),
                    membership.membershipId(),
                    refundPayment.paymentId(),
                    "COMPLETED",
                    trimToNull(request.refundReason()),
                    now,
                    now,
                    calculation.originalAmount(),
                    calculation.usedAmount(),
                    calculation.penaltyAmount(),
                    calculation.refundAmount(),
                    trimToNull(request.refundMemo()),
                    actorUserId
            ));

            MemberMembership updatedMembership = memberMembershipRepository.updateStatus(
                    membership.membershipId(),
                    membershipStatusTransitionService
                            .transition(MembershipStatus.valueOf(membership.membershipStatus()), MembershipStatus.REFUNDED)
                            .name(),
                    actorUserId
            );

            return new RefundResult(updatedMembership, refund, refundPayment, calculation);
        } catch (DataAccessException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "회원권 환불 처리 중 데이터 오류가 발생했습니다.");
        }
    }

    RefundCalculation calculateRefund(MemberMembership membership, BigDecimal purchaseAmount, LocalDate refundDate) {
        if (purchaseAmount == null || purchaseAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "구매 결제금액이 올바르지 않습니다.");
        }

        BigDecimal originalAmount = scale(purchaseAmount);
        BigDecimal usedAmount = switch (membership.productTypeSnapshot()) {
            case "DURATION" -> calculateDurationUsedAmount(membership, originalAmount, refundDate);
            case "COUNT" -> calculateCountUsedAmount(membership, originalAmount);
            default -> throw new ApiException(ErrorCode.BUSINESS_RULE, "환불 계산을 지원하지 않는 회원권 유형입니다.");
        };
        BigDecimal penaltyAmount = scale(originalAmount.multiply(PENALTY_RATE));
        BigDecimal refundAmount = scale(originalAmount.subtract(usedAmount).subtract(penaltyAmount));
        if (refundAmount.compareTo(BigDecimal.ZERO) < 0) {
            refundAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return new RefundCalculation(
                refundDate,
                originalAmount,
                usedAmount,
                penaltyAmount,
                refundAmount
        );
    }

    private BigDecimal calculateDurationUsedAmount(MemberMembership membership, BigDecimal originalAmount, LocalDate refundDate) {
        if (membership.startDate() == null || membership.endDate() == null) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "기간제 회원권의 시작일/만료일 정보가 올바르지 않습니다.");
        }

        long rawTotalDays = ChronoUnit.DAYS.between(membership.startDate(), membership.endDate()) + 1L;
        long totalDays = Math.max(1L, rawTotalDays - safeInt(membership.holdDaysUsed()));

        if (refundDate.isBefore(membership.startDate())) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        LocalDate effectiveDate = refundDate.isAfter(membership.endDate()) ? membership.endDate() : refundDate;
        long elapsedDays = ChronoUnit.DAYS.between(membership.startDate(), effectiveDate) + 1L;
        long usedDays = Math.max(0L, elapsedDays - safeInt(membership.holdDaysUsed()));
        if (usedDays > totalDays) {
            usedDays = totalDays;
        }

        return scale(originalAmount.multiply(BigDecimal.valueOf(usedDays))
                .divide(BigDecimal.valueOf(totalDays), 2, RoundingMode.HALF_UP));
    }

    private BigDecimal calculateCountUsedAmount(MemberMembership membership, BigDecimal originalAmount) {
        if (membership.totalCount() == null || membership.totalCount() <= 0) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "횟수제 회원권의 총횟수 정보가 올바르지 않습니다.");
        }
        int derivedUsed = membership.remainingCount() == null
                ? safeInt(membership.usedCount())
                : Math.max(0, membership.totalCount() - membership.remainingCount());
        int usedCount = Math.max(safeInt(membership.usedCount()), derivedUsed);
        if (usedCount > membership.totalCount()) {
            usedCount = membership.totalCount();
        }

        return scale(originalAmount.multiply(BigDecimal.valueOf(usedCount))
                .divide(BigDecimal.valueOf(membership.totalCount()), 2, RoundingMode.HALF_UP));
    }

    void validateRefundEligibility(MemberMembership membership) {
        if (!MembershipStatus.ACTIVE.name().equals(membership.membershipStatus())) {
            throw new ApiException(
                    ErrorCode.BUSINESS_RULE,
                    "홀딩/종료/환불 상태 회원권은 환불할 수 없습니다. 홀딩 상태는 먼저 해제 후 환불해주세요."
            );
        }
        membershipStatusTransitionService.assertTransitionAllowed(
                MembershipStatus.valueOf(membership.membershipStatus()),
                MembershipStatus.REFUNDED
        );
    }

    private void ensureNotRefunded(Long membershipId) {
        if (membershipRefundRepository.findByMembershipId(membershipId).isPresent()) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 환불 처리된 회원권입니다.");
        }
    }

    private MemberMembership getMembership(Long membershipId) {
        return memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
    }

    private Payment getPurchasePayment(Long membershipId) {
        return paymentRepository.findLatestCompletedPurchaseByMembershipId(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.BUSINESS_RULE, "구매 결제기록을 찾을 수 없습니다."));
    }

    private LocalDate normalizeRefundDate(LocalDate refundDate) {
        return refundDate == null ? LocalDate.now() : refundDate;
    }

    private String normalizeRefundPaymentMethod(String requestedMethod, String defaultMethod) {
        if (requestedMethod != null && !requestedMethod.isBlank()) {
            String normalized = requestedMethod.trim().toUpperCase();
            if (!normalized.equals("CASH") && !normalized.equals("CARD") && !normalized.equals("TRANSFER") && !normalized.equals("ETC")) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "refundPaymentMethod is invalid");
            }
            return normalized;
        }
        return (defaultMethod == null || defaultMethod.isBlank()) ? "CASH" : defaultMethod;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private BigDecimal scale(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record RefundPreviewRequest(
            Long membershipId,
            LocalDate refundDate
    ) {}

    public record RefundRequest(
            Long membershipId,
            LocalDate refundDate,
            String refundPaymentMethod,
            String refundReason,
            String refundMemo,
            String paymentMemo
    ) {}

    public record RefundCalculation(
            LocalDate refundDate,
            BigDecimal originalAmount,
            BigDecimal usedAmount,
            BigDecimal penaltyAmount,
            BigDecimal refundAmount
    ) {}

    public record RefundResult(
            MemberMembership membership,
            MembershipRefund refund,
            Payment refundPayment,
            RefundCalculation calculation
    ) {}
}
