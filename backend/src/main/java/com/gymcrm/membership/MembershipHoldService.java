package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.product.Product;
import com.gymcrm.product.ProductService;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

@Service
public class MembershipHoldService {
    private final MemberMembershipRepository memberMembershipRepository;
    private final MembershipHoldRepository membershipHoldRepository;
    private final MembershipStatusTransitionService membershipStatusTransitionService;
    private final ProductService productService;
    private final CurrentUserProvider currentUserProvider;

    public MembershipHoldService(
            MemberMembershipRepository memberMembershipRepository,
            MembershipHoldRepository membershipHoldRepository,
            MembershipStatusTransitionService membershipStatusTransitionService,
            ProductService productService,
            CurrentUserProvider currentUserProvider
    ) {
        this.memberMembershipRepository = memberMembershipRepository;
        this.membershipHoldRepository = membershipHoldRepository;
        this.membershipStatusTransitionService = membershipStatusTransitionService;
        this.productService = productService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public HoldResult hold(HoldRequest request) {
        if (request.membershipId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "membershipId is required");
        }

        MemberMembership membership = getMembership(request.membershipId());
        Product product = productService.get(membership.productId());
        LocalDate holdStartDate = request.holdStartDate() == null ? LocalDate.now() : request.holdStartDate();
        LocalDate holdEndDate = request.holdEndDate();

        validateHoldDateRange(holdStartDate, holdEndDate);
        validateHoldEligibility(membership, product, holdStartDate, holdEndDate);
        ensureNoActiveHoldExists(membership.membershipId());

        Long actorUserId = currentUserProvider.currentUserId();
        String targetStatus = membershipStatusTransitionService
                .transition(MembershipStatus.valueOf(membership.membershipStatus()), MembershipStatus.HOLDING)
                .name();

        try {
            MembershipHold hold = membershipHoldRepository.insert(new MembershipHoldRepository.MembershipHoldCreateCommand(
                    membership.centerId(),
                    membership.membershipId(),
                    "ACTIVE",
                    holdStartDate,
                    holdEndDate,
                    trimToNull(request.reason()),
                    trimToNull(request.memo()),
                    actorUserId
            ));

            MemberMembership updatedMembership = memberMembershipRepository.updateStatusIfCurrent(
                            membership.membershipId(),
                            membership.membershipStatus(),
                            targetStatus,
                            actorUserId
                    )
                    .orElseThrow(() -> new ApiException(
                            ErrorCode.CONFLICT,
                            "회원권 상태가 변경되어 홀딩을 처리할 수 없습니다. 다시 조회 후 시도해주세요."
                    ));

            return new HoldResult(updatedMembership, hold);
        } catch (DataAccessException ex) {
            throw mapHoldDataAccessException(ex);
        }
    }

    @Transactional
    public ResumeResult resume(ResumeRequest request) {
        if (request.membershipId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "membershipId is required");
        }

        MemberMembership membership = getMembership(request.membershipId());
        MembershipHold activeHold = membershipHoldRepository.findActiveByMembershipId(request.membershipId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "활성 홀딩 이력을 찾을 수 없습니다. membershipId=" + request.membershipId()));

        LocalDate resumeDate = request.resumeDate() == null ? LocalDate.now() : request.resumeDate();
        validateResumeEligibility(membership, activeHold, resumeDate);

        int actualHoldDays = calculateActualHoldDays(activeHold.holdStartDate(), resumeDate);
        LocalDate recalculatedEndDate = recalculateEndDateAfterResume(membership.endDate(), actualHoldDays);
        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime resumedAt = OffsetDateTime.now(ZoneOffset.UTC);
        String targetStatus = membershipStatusTransitionService
                .transition(MembershipStatus.valueOf(membership.membershipStatus()), MembershipStatus.ACTIVE)
                .name();

        try {
            MembershipHold resumedHold = membershipHoldRepository.markResumed(new MembershipHoldRepository.MembershipHoldResumeCommand(
                    activeHold.membershipHoldId(),
                    resumedAt,
                    actualHoldDays,
                    actorUserId
            ));

            MemberMembership updatedMembership = memberMembershipRepository.updateAfterResume(
                    new MemberMembershipRepository.MembershipResumeUpdateCommand(
                            membership.membershipId(),
                            targetStatus,
                            recalculatedEndDate,
                            safeInt(membership.holdDaysUsed()) + actualHoldDays,
                            safeInt(membership.holdCountUsed()) + 1,
                            actorUserId
                    )
            );

            return new ResumeResult(updatedMembership, resumedHold, actualHoldDays, recalculatedEndDate);
        } catch (DataAccessException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "회원권 홀딩 해제 처리 중 데이터 오류가 발생했습니다.");
        }
    }

    void validateHoldDateRange(LocalDate holdStartDate, LocalDate holdEndDate) {
        if (holdStartDate == null || holdEndDate == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "holdStartDate and holdEndDate are required");
        }
        if (holdEndDate.isBefore(holdStartDate)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "홀딩 종료일은 시작일보다 빠를 수 없습니다.");
        }
    }

    void validateHoldEligibility(MemberMembership membership, Product product, LocalDate holdStartDate, LocalDate holdEndDate) {
        if (!membership.centerId().equals(product.centerId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "회원권과 상품의 센터가 일치하지 않습니다.");
        }
        if (!product.allowHold()) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "해당 상품은 홀딩이 허용되지 않습니다.");
        }

        membershipStatusTransitionService.assertTransitionAllowed(
                MembershipStatus.valueOf(membership.membershipStatus()),
                MembershipStatus.HOLDING
        );

        if ("COUNT".equals(membership.productTypeSnapshot())) {
            if (membership.remainingCount() == null || membership.remainingCount() <= 0) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "잔여 횟수가 없는 회원권은 홀딩할 수 없습니다.");
            }
        }

        if (membership.endDate() != null && holdStartDate.isAfter(membership.endDate())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "만료된 회원권은 홀딩할 수 없습니다.");
        }

        int requestedHoldDays = calculateRequestedHoldDays(holdStartDate, holdEndDate);
        if (product.maxHoldDays() != null && product.maxHoldDays() > 0) {
            int afterDays = safeInt(membership.holdDaysUsed()) + requestedHoldDays;
            if (afterDays > product.maxHoldDays()) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "상품 홀딩 가능 일수를 초과했습니다.");
            }
        }
        if (product.maxHoldCount() != null && product.maxHoldCount() > 0) {
            int afterCount = safeInt(membership.holdCountUsed()) + 1;
            if (afterCount > product.maxHoldCount()) {
                throw new ApiException(ErrorCode.BUSINESS_RULE, "상품 홀딩 가능 횟수를 초과했습니다.");
            }
        }
    }

    void validateResumeEligibility(MemberMembership membership, MembershipHold activeHold, LocalDate resumeDate) {
        membershipStatusTransitionService.assertTransitionAllowed(
                MembershipStatus.valueOf(membership.membershipStatus()),
                MembershipStatus.ACTIVE
        );

        if (resumeDate.isBefore(activeHold.holdStartDate())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "resumeDate must be on or after holdStartDate");
        }
    }

    int calculateActualHoldDays(LocalDate holdStartDate, LocalDate resumeDate) {
        long days = ChronoUnit.DAYS.between(holdStartDate, resumeDate) + 1L;
        if (days <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "actual hold days must be positive");
        }
        return Math.toIntExact(days);
    }

    int calculateRequestedHoldDays(LocalDate holdStartDate, LocalDate holdEndDate) {
        return calculateActualHoldDays(holdStartDate, holdEndDate);
    }

    LocalDate recalculateEndDateAfterResume(LocalDate currentEndDate, int actualHoldDays) {
        if (currentEndDate == null) {
            return null;
        }
        return currentEndDate.plusDays(actualHoldDays);
    }

    private MemberMembership getMembership(Long membershipId) {
        return memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
    }

    private void ensureNoActiveHoldExists(Long membershipId) {
        if (membershipHoldRepository.findActiveByMembershipId(membershipId).isPresent()) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 활성 홀딩이 존재합니다.");
        }
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ApiException mapHoldDataAccessException(DataAccessException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message != null && message.contains("uk_membership_holds_membership_active")) {
            return new ApiException(ErrorCode.CONFLICT, "이미 활성 홀딩이 존재합니다.");
        }
        return new ApiException(ErrorCode.INTERNAL_ERROR, "회원권 홀딩 처리 중 데이터 오류가 발생했습니다.");
    }

    public record HoldRequest(
            Long membershipId,
            LocalDate holdStartDate,
            LocalDate holdEndDate,
            String reason,
            String memo
    ) {}

    public record ResumeRequest(
            Long membershipId,
            LocalDate resumeDate
    ) {}

    public record HoldResult(
            MemberMembership membership,
            MembershipHold hold
    ) {}

    public record ResumeResult(
            MemberMembership membership,
            MembershipHold hold,
            int actualHoldDays,
            LocalDate recalculatedEndDate
    ) {}
}
