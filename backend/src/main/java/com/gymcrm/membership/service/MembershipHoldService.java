package com.gymcrm.membership.service;

import com.gymcrm.audit.AuditLogService;
import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.entity.MembershipHold;
import com.gymcrm.membership.enums.HoldStatus;
import com.gymcrm.membership.enums.MembershipStatus;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.repository.MembershipHoldRepository;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

@Service
public class MembershipHoldService {
    private static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";
    private static final String ROLE_MANAGER = "ROLE_MANAGER";

    private final MemberMembershipRepository memberMembershipRepository;
    private final MembershipHoldRepository membershipHoldRepository;
    private final MembershipStatusTransitionService membershipStatusTransitionService;
    private final ProductService productService;
    private final CurrentUserProvider currentUserProvider;
    private final AuditLogService auditLogService;
    private final AuthUserRepository authUserRepository;

    public MembershipHoldService(
            MemberMembershipRepository memberMembershipRepository,
            MembershipHoldRepository membershipHoldRepository,
            MembershipStatusTransitionService membershipStatusTransitionService,
            ProductService productService,
            CurrentUserProvider currentUserProvider,
            AuditLogService auditLogService,
            AuthUserRepository authUserRepository
    ) {
        this.memberMembershipRepository = memberMembershipRepository;
        this.membershipHoldRepository = membershipHoldRepository;
        this.membershipStatusTransitionService = membershipStatusTransitionService;
        this.productService = productService;
        this.currentUserProvider = currentUserProvider;
        this.auditLogService = auditLogService;
        this.authUserRepository = authUserRepository;
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
        validateHoldEligibility(membership, product, holdStartDate, holdEndDate, request.overrideLimits());
        ensureNoActiveHoldExists(membership.membershipId());

        Long actorUserId = currentUserProvider.currentUserId();
        String targetStatus = membershipStatusTransitionService
                .transition(MembershipStatus.valueOf(membership.membershipStatus()), MembershipStatus.HOLDING)
                .name();

        try {
            MembershipHold hold = membershipHoldRepository.insert(new MembershipHoldRepository.MembershipHoldCreateCommand(
                    membership.centerId(),
                    membership.membershipId(),
                    HoldStatus.ACTIVE.name(),
                    holdStartDate,
                    holdEndDate,
                    trimToNull(request.reason()),
                    trimToNull(request.memo()),
                    Boolean.TRUE.equals(request.overrideLimits()),
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

            // Record Audit Log
            auditLogService.recordEvent(
                    "MEMBERSHIP_HOLD",
                    "MEMBERSHIP",
                    membership.membershipId().toString(),
                    String.format("{\"holdId\":%d, \"startDate\":\"%s\", \"endDate\":\"%s\", \"override\":%b}",
                            hold.membershipHoldId(), holdStartDate, holdEndDate, Boolean.TRUE.equals(request.overrideLimits()))
            );

            return new HoldResult(updatedMembership, hold);
        } catch (DataAccessException ex) {
            throw mapHoldDataAccessException(ex);
        }
    }

    @Transactional
    public ResumeResult resume(ResumeRequest request) {
        return resumeInternal(request, currentUserProvider.currentUserId(), true);
    }

    @Transactional
    public ResumeResult resumeByScheduler(ResumeRequest request, Long actorUserId) {
        return resumeInternal(request, actorUserId, false);
    }

    private ResumeResult resumeInternal(ResumeRequest request, Long actorUserId, boolean recordAuditWithCurrentContext) {
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

            // Record Audit Log
            String attributesJson = String.format(
                    "{\"holdId\":%d, \"resumeDate\":\"%s\", \"actualDays\":%d}",
                    activeHold.membershipHoldId(),
                    resumeDate,
                    actualHoldDays
            );
            if (recordAuditWithCurrentContext) {
                auditLogService.recordEvent(
                        "MEMBERSHIP_RESUME",
                        "MEMBERSHIP",
                        membership.membershipId().toString(),
                        attributesJson
                );
            } else {
                auditLogService.recordEvent(
                        membership.centerId(),
                        actorUserId,
                        "MEMBERSHIP_RESUME",
                        "MEMBERSHIP",
                        membership.membershipId().toString(),
                        attributesJson
                );
            }

            return new ResumeResult(updatedMembership, resumedHold, actualHoldDays, recalculatedEndDate);
        } catch (DataAccessException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "회원권 홀딩 해제 처리 중 데이터 오류가 발생했습니다.");
        }
    }

    public void validateHoldDateRange(LocalDate holdStartDate, LocalDate holdEndDate) {
        if (holdStartDate == null || holdEndDate == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "holdStartDate and holdEndDate are required");
        }
        if (holdEndDate.isBefore(holdStartDate)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "홀딩 종료일은 시작일보다 빠를 수 없습니다.");
        }
    }

    public void validateHoldEligibility(MemberMembership membership, Product product, LocalDate holdStartDate, LocalDate holdEndDate, Boolean overrideLimits) {
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

        if (Boolean.TRUE.equals(overrideLimits)) {
            validateOverrideAccess(product);
            return;
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

    public void validateResumeEligibility(MemberMembership membership, MembershipHold activeHold, LocalDate resumeDate) {
        membershipStatusTransitionService.assertTransitionAllowed(
                MembershipStatus.valueOf(membership.membershipStatus()),
                MembershipStatus.ACTIVE
        );

        if (resumeDate.isBefore(activeHold.holdStartDate())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "resumeDate must be on or after holdStartDate");
        }
    }

    public int calculateActualHoldDays(LocalDate holdStartDate, LocalDate resumeDate) {
        long days = ChronoUnit.DAYS.between(holdStartDate, resumeDate) + 1L;
        if (days <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "actual hold days must be positive");
        }
        return Math.toIntExact(days);
    }

    public int calculateRequestedHoldDays(LocalDate holdStartDate, LocalDate holdEndDate) {
        return calculateActualHoldDays(holdStartDate, holdEndDate);
    }

    public LocalDate recalculateEndDateAfterResume(LocalDate currentEndDate, int actualHoldDays) {
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

    private void validateOverrideAccess(Product product) {
        if (!product.allowHoldBypass()) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "해당 상품은 홀딩 제한 우회를 허용하지 않습니다.");
        }

        AuthUser actor = authUserRepository.findActiveById(currentUserProvider.currentUserId())
                .filter(AuthUser::isActive)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));

        if (!canOverrideHoldLimits(actor.roleCode())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "홀딩 제한 우회 권한이 없습니다.");
        }
    }

    private boolean canOverrideHoldLimits(String roleCode) {
        return ROLE_SUPER_ADMIN.equals(roleCode)
                || ROLE_MANAGER.equals(roleCode);
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
            String memo,
            Boolean overrideLimits
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
