package com.gymcrm.membership.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.entity.MembershipExtension;
import com.gymcrm.membership.enums.MembershipStatus;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.repository.MembershipExtensionRepository;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.settlement.entity.Payment;
import com.gymcrm.settlement.repository.PaymentRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class MembershipExtendService {
    private final ProductService productService;
    private final MemberMembershipRepository memberMembershipRepository;
    private final MembershipExtensionRepository membershipExtensionRepository;
    private final PaymentRepository paymentRepository;
    private final MembershipStatusTransitionService membershipStatusTransitionService;
    private final CurrentUserProvider currentUserProvider;

    public MembershipExtendService(
            ProductService productService,
            MemberMembershipRepository memberMembershipRepository,
            MembershipExtensionRepository membershipExtensionRepository,
            PaymentRepository paymentRepository,
            MembershipStatusTransitionService membershipStatusTransitionService,
            CurrentUserProvider currentUserProvider
    ) {
        this.productService = productService;
        this.memberMembershipRepository = memberMembershipRepository;
        this.membershipExtensionRepository = membershipExtensionRepository;
        this.paymentRepository = paymentRepository;
        this.membershipStatusTransitionService = membershipStatusTransitionService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public ExtendCalculation preview(ExtendPreviewRequest request) {
        MemberMembership membership = getMembership(request.membershipId());
        validateExtendEligibility(membership, request.extensionDays());
        Product product = getProduct(membership.productId());
        validateDurationProduct(product);
        return calculateExtension(membership, product, request.extensionDays(), request.customAmount());
    }

    @Transactional
    public ExtendResult extend(ExtendRequest request) {
        if (request.membershipId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "membershipId is required");
        }

        MemberMembership membership = getMembership(request.membershipId());
        validateExtendEligibility(membership, request.extensionDays());
        Product product = getProduct(membership.productId());
        validateDurationProduct(product);

        ExtendCalculation calculation = calculateExtension(membership, product, request.extensionDays(), request.customAmount());
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Long actorUserId = currentUserProvider.currentUserId();

        try {
            Payment payment = paymentRepository.insert(new PaymentRepository.PaymentCreateCommand(
                    membership.centerId(),
                    membership.memberId(),
                    membership.membershipId(),
                    "EXTENSION",
                    "COMPLETED",
                    "CASH",
                    calculation.actualFee(),
                    now,
                    null,
                    "회원권 연장 결제",
                    actorUserId
            ));

            String newStatus = membershipStatusTransitionService
                    .transition(MembershipStatus.valueOf(membership.membershipStatus()), MembershipStatus.EXTENDED)
                    .name();

            MemberMembership updatedMembership = memberMembershipRepository.updateEndDate(
                    membership.membershipId(),
                    calculation.newEndDate(),
                    newStatus,
                    actorUserId
            );

            MembershipExtension extension = membershipExtensionRepository.insert(
                    new MembershipExtensionRepository.MembershipExtensionCreateCommand(
                            membership.centerId(),
                            membership.membershipId(),
                            calculation.originalEndDate(),
                            calculation.newEndDate(),
                            calculation.extensionDays(),
                            payment.paymentId(),
                            trimToNull(request.reason()),
                            trimToNull(request.memo()),
                            actorUserId
                    )
            );

            return new ExtendResult(updatedMembership, extension, payment, calculation);
        } catch (DataAccessException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "회원권 연장 처리 중 데이터 오류가 발생했습니다.");
        }
    }

    public ExtendCalculation calculateExtension(
            MemberMembership membership,
            Product product,
            Integer extensionDays,
            BigDecimal customAmount
    ) {

        if (membership.endDate() == null) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "종료일이 없는 회원권은 연장할 수 없습니다.");
        }
        if (product.validityDays() == null || product.validityDays() <= 0) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "유효기간 정보가 없는 상품은 연장할 수 없습니다.");
        }

        BigDecimal calculatedFee = membership.priceAmountSnapshot()
                .divide(BigDecimal.valueOf(product.validityDays()), 8, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(extensionDays))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal actualFee = customAmount != null
                ? customAmount.setScale(2, RoundingMode.HALF_UP)
                : calculatedFee;
        if (actualFee.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "customAmount must be greater than or equal to 0");
        }

        LocalDate originalEndDate = membership.endDate();
        LocalDate newEndDate = originalEndDate.plusDays(extensionDays);

        return new ExtendCalculation(
                originalEndDate,
                newEndDate,
                extensionDays,
                calculatedFee,
                actualFee
        );
    }

    public void validateExtendEligibility(MemberMembership membership, Integer extensionDays) {
        boolean activeOrExtended = MembershipStatus.ACTIVE.name().equals(membership.membershipStatus())
                || MembershipStatus.EXTENDED.name().equals(membership.membershipStatus());
        if (!activeOrExtended) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "활성 또는 연장 상태의 회원권만 연장할 수 있습니다.");
        }
        if (extensionDays == null || extensionDays <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "extensionDays must be greater than 0");
        }
    }

    private void validateDurationProduct(Product product) {
        if (product == null) {
            throw new ApiException(ErrorCode.NOT_FOUND, "상품 정보를 찾을 수 없습니다.");
        }
        if (!"DURATION".equals(product.productType())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "기간제 회원권만 연장할 수 있습니다.");
        }
    }

    private MemberMembership getMembership(Long membershipId) {
        return memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
    }

    private Product getProduct(Long productId) {
        return productService.get(productId);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record ExtendPreviewRequest(
            Long membershipId,
            Integer extensionDays,
            BigDecimal customAmount
    ) {}

    public record ExtendRequest(
            Long membershipId,
            Integer extensionDays,
            BigDecimal customAmount,
            String reason,
            String memo
    ) {}

    public record ExtendCalculation(
            LocalDate originalEndDate,
            LocalDate newEndDate,
            Integer extensionDays,
            BigDecimal calculatedFee,
            BigDecimal actualFee
    ) {}

    public record ExtendResult(
            MemberMembership membership,
            MembershipExtension extension,
            Payment payment,
            ExtendCalculation calculation
    ) {}
}
