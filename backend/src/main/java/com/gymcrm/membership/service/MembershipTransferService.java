package com.gymcrm.membership.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.entity.MembershipTransfer;
import com.gymcrm.membership.enums.MembershipStatus;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.repository.MembershipTransferRepository;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.settlement.entity.Payment;
import com.gymcrm.settlement.repository.PaymentRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

@Service
public class MembershipTransferService {
    private final MemberService memberService;
    private final ProductService productService;
    private final MemberMembershipRepository memberMembershipRepository;
    private final MembershipTransferRepository membershipTransferRepository;
    private final PaymentRepository paymentRepository;
    private final MembershipStatusTransitionService membershipStatusTransitionService;
    private final CurrentUserProvider currentUserProvider;

    public MembershipTransferService(
            MemberService memberService,
            ProductService productService,
            MemberMembershipRepository memberMembershipRepository,
            MembershipTransferRepository membershipTransferRepository,
            PaymentRepository paymentRepository,
            MembershipStatusTransitionService membershipStatusTransitionService,
            CurrentUserProvider currentUserProvider
    ) {
        this.memberService = memberService;
        this.productService = productService;
        this.memberMembershipRepository = memberMembershipRepository;
        this.membershipTransferRepository = membershipTransferRepository;
        this.paymentRepository = paymentRepository;
        this.membershipStatusTransitionService = membershipStatusTransitionService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public TransferCalculation preview(TransferPreviewRequest request) {
        MemberMembership transferorMembership = getMembership(request.transferorMembershipId());
        validateTransferEligibility(transferorMembership);
        Product product = getProduct(transferorMembership.productId());

        Member transfereeMember = getMember(request.transfereeMemberId());
        validateSameCenter(transferorMembership, transfereeMember);

        return calculateTransfer(transferorMembership, product, request.transferFee());
    }

    @Transactional
    public TransferResult transfer(TransferRequest request) {
        if (request.transferorMembershipId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "transferorMembershipId is required");
        }
        if (request.transfereeMemberId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "transfereeMemberId is required");
        }

        MemberMembership transferorMembership = getMembership(request.transferorMembershipId());
        validateTransferEligibility(transferorMembership);
        Product product = getProduct(transferorMembership.productId());

        Member transfereeMember = getMember(request.transfereeMemberId());
        validateSameCenter(transferorMembership, transfereeMember);

        TransferCalculation calculation = calculateTransfer(transferorMembership, product, request.transferFee());
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Long actorUserId = currentUserProvider.currentUserId();

        try {
            MemberMembership transfereeMembership = memberMembershipRepository.insert(
                    new MemberMembershipRepository.MemberMembershipCreateCommand(
                            transfereeMember.centerId(),
                            transfereeMember.memberId(),
                            product.productId(),
                            null,
                            MembershipStatus.ACTIVE.name(),
                            product.productName(),
                            product.productCategory(),
                            product.productType(),
                            transferorMembership.priceAmountSnapshot(),
                            now,
                            LocalDate.now(),
                            calculation.newEndDate(),
                            calculation.newTotalCount(),
                            calculation.newRemainingCount(),
                            0,
                            0,
                            0,
                            "양도 회원권 (원 회원권 ID: %d)".formatted(transferorMembership.membershipId()),
                            actorUserId
                    )
            );

            Long transferFeePaymentId = null;
            BigDecimal fee = request.transferFee();
            if (fee != null && fee.compareTo(BigDecimal.ZERO) > 0) {
                Payment transferFeePayment = paymentRepository.insert(new PaymentRepository.PaymentCreateCommand(
                        transferorMembership.centerId(),
                        transferorMembership.memberId(),
                        transferorMembership.membershipId(),
                        "TRANSFER_FEE",
                        "COMPLETED",
                        "CASH",
                        fee,
                        now,
                        null,
                        "회원권 양도 수수료",
                        actorUserId
                ));
                transferFeePaymentId = transferFeePayment.paymentId();
            }

            MemberMembership updatedTransferor = memberMembershipRepository.updateStatusIfCurrent(
                    transferorMembership.membershipId(),
                    MembershipStatus.ACTIVE.name(),
                    membershipStatusTransitionService
                            .transition(MembershipStatus.valueOf(transferorMembership.membershipStatus()), MembershipStatus.TRANSFERRED)
                            .name(),
                    actorUserId
            ).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "회원권 양도 처리 중 상태 변경에 실패했습니다."));

            MembershipTransfer transfer = membershipTransferRepository.insert(
                    new MembershipTransferRepository.MembershipTransferCreateCommand(
                            transferorMembership.centerId(),
                            updatedTransferor.membershipId(),
                            transfereeMembership.membershipId(),
                            transferorMembership.memberId(),
                            transfereeMember.memberId(),
                            transferFeePaymentId,
                            trimToNull(request.reason()),
                            trimToNull(request.memo()),
                            actorUserId
                    )
            );

            return new TransferResult(updatedTransferor, transfereeMembership, transfer, calculation);
        } catch (DataAccessException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "회원권 양도 처리 중 데이터 오류가 발생했습니다.");
        }
    }

    public TransferCalculation calculateTransfer(MemberMembership membership, Product product, BigDecimal transferFee) {
        if (product == null) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "상품 정보를 찾을 수 없습니다.");
        }

        BigDecimal fee = transferFee != null && transferFee.compareTo(BigDecimal.ZERO) > 0
                ? transferFee.setScale(2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);

        if ("DURATION".equals(product.productType())) {
            LocalDate today = LocalDate.now();
            long remainingDays = calculateRemainingDays(membership, today);
            if (remainingDays <= 0) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "양도 가능한 잔여 일수가 없습니다.");
            }
            LocalDate newEndDate = today.plusDays(remainingDays - 1);
            return new TransferCalculation(
                    "DURATION",
                    null, null,
                    (int) remainingDays,
                    (int) remainingDays,
                    newEndDate,
                    fee
            );
        }

        if ("COUNT".equals(product.productType())) {
            int remainingCount = membership.remainingCount() != null ? membership.remainingCount() : 0;
            if (remainingCount <= 0) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "양도 가능한 잔여 횟수가 없습니다.");
            }
            return new TransferCalculation(
                    "COUNT",
                    membership.totalCount(),
                    remainingCount,
                    remainingCount,
                    remainingCount,
                    null,
                    fee
            );
        }

        throw new ApiException(ErrorCode.BUSINESS_RULE, "양도 계산을 지원하지 않는 상품 유형입니다.");
    }

    private long calculateRemainingDays(MemberMembership membership, LocalDate today) {
        if (membership.startDate() == null || membership.endDate() == null) {
            return 0;
        }
        long totalDays = ChronoUnit.DAYS.between(membership.startDate(), membership.endDate()) + 1;
        long holdDaysUsed = membership.holdDaysUsed() != null ? membership.holdDaysUsed() : 0;
        long effectiveTotalDays = Math.max(1, totalDays - holdDaysUsed);

        if (today.isBefore(membership.startDate())) {
            return effectiveTotalDays;
        }
        if (today.isAfter(membership.endDate())) {
            return 0;
        }

        long elapsedDays = ChronoUnit.DAYS.between(membership.startDate(), today) + 1;
        long usedDays = Math.max(0, elapsedDays - holdDaysUsed);
        return Math.max(0, effectiveTotalDays - usedDays);
    }

    public void validateTransferEligibility(MemberMembership membership) {
        if (!MembershipStatus.ACTIVE.name().equals(membership.membershipStatus())) {
            throw new ApiException(
                    ErrorCode.BUSINESS_RULE,
                    "활성 상태의 회원권만 양도할 수 있습니다."
            );
        }
        membershipStatusTransitionService.assertTransitionAllowed(
                MembershipStatus.valueOf(membership.membershipStatus()),
                MembershipStatus.TRANSFERRED
        );
    }

    private void validateSameCenter(MemberMembership transferorMembership, Member transfereeMember) {
        if (!transferorMembership.centerId().equals(transfereeMember.centerId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "양도인과 양수인은 같은 센터에 소속되어야 합니다.");
        }
    }

    private void validateProductTransferAllowed(Product product) {
        if (!product.allowTransfer()) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "양도할 수 없는 상품입니다.");
        }
    }

    private MemberMembership getMembership(Long membershipId) {
        return memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
    }

    private Member getMember(Long memberId) {
        Member member = memberService.get(memberId);
        if (member.memberStatus() != MemberStatus.ACTIVE) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "양수인은 활성 상태의 회원이어야 합니다.");
        }
        return member;
    }

    private Product getProduct(Long productId) {
        Product product = productService.get(productId);
        validateProductTransferAllowed(product);
        return product;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record TransferPreviewRequest(
            Long transferorMembershipId,
            Long transfereeMemberId,
            BigDecimal transferFee
    ) {}

    public record TransferRequest(
            Long transferorMembershipId,
            Long transfereeMemberId,
            BigDecimal transferFee,
            String reason,
            String memo
    ) {}

    public record TransferCalculation(
            String productType,
            Integer originalTotalCount,
            Integer originalRemainingCount,
            Integer newTotalCount,
            Integer newRemainingCount,
            LocalDate newEndDate,
            BigDecimal transferFee
    ) {}

    public record TransferResult(
            MemberMembership transferorMembership,
            MemberMembership transfereeMembership,
            MembershipTransfer transfer,
            TransferCalculation calculation
    ) {}
}
