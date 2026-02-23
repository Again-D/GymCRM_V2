package com.gymcrm.membership;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Validated
@RestController
@RequestMapping("/api/v1/members/{memberId}/memberships/{membershipId}")
public class MembershipHoldController {
    private final MembershipHoldService membershipHoldService;
    private final MemberMembershipRepository memberMembershipRepository;

    public MembershipHoldController(
            MembershipHoldService membershipHoldService,
            MemberMembershipRepository memberMembershipRepository
    ) {
        this.membershipHoldService = membershipHoldService;
        this.memberMembershipRepository = memberMembershipRepository;
    }

    @PostMapping("/hold")
    public ApiResponse<HoldMembershipResponse> hold(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody HoldMembershipRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipHoldService.HoldResult result = membershipHoldService.hold(new MembershipHoldService.HoldRequest(
                membershipId,
                request.holdStartDate(),
                request.holdEndDate(),
                request.reason(),
                request.memo()
        ));

        return ApiResponse.success(HoldMembershipResponse.from(result), "회원권 홀딩이 완료되었습니다.");
    }

    @PostMapping("/resume")
    public ApiResponse<ResumeMembershipResponse> resume(
            @PathVariable Long memberId,
            @PathVariable Long membershipId,
            @Valid @RequestBody ResumeMembershipRequest request
    ) {
        assertMembershipBelongsToMember(memberId, membershipId);
        MembershipHoldService.ResumeResult result = membershipHoldService.resume(new MembershipHoldService.ResumeRequest(
                membershipId,
                request.resumeDate()
        ));

        return ApiResponse.success(ResumeMembershipResponse.from(result), "회원권 홀딩 해제가 완료되었습니다.");
    }

    private void assertMembershipBelongsToMember(Long memberId, Long membershipId) {
        MemberMembership membership = memberMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId));
        if (!membership.memberId().equals(memberId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + membershipId);
        }
    }

    public record HoldMembershipRequest(
            LocalDate holdStartDate,
            LocalDate holdEndDate,
            String reason,
            String memo
    ) {}

    public record ResumeMembershipRequest(
            LocalDate resumeDate
    ) {}

    public record HoldMembershipResponse(
            MembershipPurchaseController.MembershipResponse membership,
            MembershipHoldResponse hold,
            HoldPreviewResponse preview
    ) {
        static HoldMembershipResponse from(MembershipHoldService.HoldResult result) {
            int plannedHoldDays = (int) (result.hold().holdEndDate().toEpochDay() - result.hold().holdStartDate().toEpochDay() + 1L);
            LocalDate recalculatedEndDate = result.membership().endDate() == null ? null : result.membership().endDate().plusDays(plannedHoldDays);
            return new HoldMembershipResponse(
                    MembershipPurchaseController.MembershipResponse.from(result.membership()),
                    MembershipHoldResponse.from(result.hold()),
                    new HoldPreviewResponse(plannedHoldDays, recalculatedEndDate)
            );
        }
    }

    public record ResumeMembershipResponse(
            MembershipPurchaseController.MembershipResponse membership,
            MembershipHoldResponse hold,
            ResumeCalculationResponse calculation
    ) {
        static ResumeMembershipResponse from(MembershipHoldService.ResumeResult result) {
            return new ResumeMembershipResponse(
                    MembershipPurchaseController.MembershipResponse.from(result.membership()),
                    MembershipHoldResponse.from(result.hold()),
                    new ResumeCalculationResponse(result.actualHoldDays(), result.recalculatedEndDate())
            );
        }
    }

    public record MembershipHoldResponse(
            Long membershipHoldId,
            Long centerId,
            Long membershipId,
            String holdStatus,
            LocalDate holdStartDate,
            LocalDate holdEndDate,
            OffsetDateTime resumedAt,
            Integer actualHoldDays,
            String reason,
            String memo
    ) {
        static MembershipHoldResponse from(MembershipHold hold) {
            return new MembershipHoldResponse(
                    hold.membershipHoldId(),
                    hold.centerId(),
                    hold.membershipId(),
                    hold.holdStatus(),
                    hold.holdStartDate(),
                    hold.holdEndDate(),
                    hold.resumedAt(),
                    hold.actualHoldDays(),
                    hold.reason(),
                    hold.memo()
            );
        }
    }

    public record HoldPreviewResponse(
            Integer plannedHoldDays,
            LocalDate recalculatedEndDate
    ) {}

    public record ResumeCalculationResponse(
            Integer actualHoldDays,
            LocalDate recalculatedEndDate
    ) {}
}
