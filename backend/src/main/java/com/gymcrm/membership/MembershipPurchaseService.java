package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.Member;
import com.gymcrm.member.MemberService;
import com.gymcrm.product.Product;
import com.gymcrm.product.ProductService;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

@Service
public class MembershipPurchaseService {
    private static final Set<String> PAYMENT_METHODS = Set.of("CASH", "CARD", "TRANSFER", "ETC");

    private final MemberService memberService;
    private final ProductService productService;
    private final MemberMembershipRepository memberMembershipRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserProvider currentUserProvider;

    public MembershipPurchaseService(
            MemberService memberService,
            ProductService productService,
            MemberMembershipRepository memberMembershipRepository,
            PaymentRepository paymentRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.memberService = memberService;
        this.productService = productService;
        this.memberMembershipRepository = memberMembershipRepository;
        this.paymentRepository = paymentRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public PurchaseResult purchase(PurchaseRequest request) {
        if (request.memberId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memberId is required");
        }
        if (request.productId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "productId is required");
        }

        Member member = memberService.get(request.memberId());
        Product product = productService.get(request.productId());
        validatePurchaseEligibility(member, product);

        PurchaseCalculation calculation = calculatePurchase(product, request.startDate());
        String paymentMethod = normalizePaymentMethod(request.paymentMethod());
        BigDecimal paidAmount = normalizePaidAmount(request.paidAmount(), product.priceAmount());
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Long actorUserId = currentUserProvider.currentUserId();

        try {
            MemberMembership membership = memberMembershipRepository.insert(new MemberMembershipRepository.MemberMembershipCreateCommand(
                    member.centerId(),
                    member.memberId(),
                    product.productId(),
                    MembershipStatus.ACTIVE.name(),
                    product.productName(),
                    product.productCategory(),
                    product.productType(),
                    product.priceAmount(),
                    now,
                    calculation.startDate(),
                    calculation.endDate(),
                    calculation.totalCount(),
                    calculation.remainingCount(),
                    0,
                    0,
                    0,
                    trimToNull(request.membershipMemo()),
                    actorUserId
            ));

            Payment payment = paymentRepository.insert(new PaymentRepository.PaymentCreateCommand(
                    member.centerId(),
                    member.memberId(),
                    membership.membershipId(),
                    "PURCHASE",
                    "COMPLETED",
                    paymentMethod,
                    paidAmount,
                    now,
                    null,
                    trimToNull(request.paymentMemo()),
                    actorUserId
            ));

            return new PurchaseResult(membership, payment, calculation);
        } catch (DataAccessException ex) {
            throw mapDataAccessException(ex);
        }
    }

    PurchaseCalculation calculatePurchase(Product product, LocalDate requestedStartDate) {
        LocalDate startDate = requestedStartDate == null ? LocalDate.now() : requestedStartDate;

        if ("DURATION".equals(product.productType())) {
            if (product.validityDays() == null || product.validityDays() <= 0) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "기간제 상품의 유효일수 정보가 올바르지 않습니다.");
            }
            LocalDate endDate = startDate.plusDays(product.validityDays().longValue() - 1L);
            return new PurchaseCalculation(startDate, endDate, null, null, product.priceAmount());
        }

        if ("COUNT".equals(product.productType())) {
            if (product.totalCount() == null || product.totalCount() <= 0) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "횟수제 상품의 총 횟수 정보가 올바르지 않습니다.");
            }
            LocalDate endDate = product.validityDays() == null ? null : startDate.plusDays(product.validityDays().longValue() - 1L);
            return new PurchaseCalculation(startDate, endDate, product.totalCount(), product.totalCount(), product.priceAmount());
        }

        throw new ApiException(ErrorCode.BUSINESS_RULE, "구매 가능한 상품 유형이 아닙니다. productType=" + product.productType());
    }

    void validatePurchaseEligibility(Member member, Product product) {
        if (!member.centerId().equals(product.centerId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "회원과 상품의 센터가 일치하지 않습니다.");
        }
        if (!"ACTIVE".equals(member.memberStatus())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "비활성 회원은 회원권을 구매할 수 없습니다.");
        }
        if (!"ACTIVE".equals(product.productStatus())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "비활성 상품은 구매할 수 없습니다.");
        }
        if (!"DURATION".equals(product.productType()) && !"COUNT".equals(product.productType())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "지원하지 않는 상품 유형입니다.");
        }
    }

    private String normalizePaymentMethod(String paymentMethod) {
        String normalized = paymentMethod == null || paymentMethod.isBlank() ? "CASH" : paymentMethod.trim().toUpperCase();
        if (!PAYMENT_METHODS.contains(normalized)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "paymentMethod is invalid");
        }
        return normalized;
    }

    private BigDecimal normalizePaidAmount(BigDecimal paidAmount, BigDecimal defaultAmount) {
        BigDecimal amount = paidAmount == null ? defaultAmount : paidAmount;
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "paidAmount must be >= 0");
        }
        return amount;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ApiException mapDataAccessException(DataAccessException ex) {
        return new ApiException(ErrorCode.INTERNAL_ERROR, "회원권 구매 처리 중 데이터 오류가 발생했습니다.");
    }

    public record PurchaseRequest(
            Long memberId,
            Long productId,
            LocalDate startDate,
            BigDecimal paidAmount,
            String paymentMethod,
            String membershipMemo,
            String paymentMemo
    ) {}

    public record PurchaseCalculation(
            LocalDate startDate,
            LocalDate endDate,
            Integer totalCount,
            Integer remainingCount,
            BigDecimal chargeAmount
    ) {}

    public record PurchaseResult(
            MemberMembership membership,
            Payment payment,
            PurchaseCalculation calculation
    ) {}
}
