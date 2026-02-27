package com.gymcrm.access;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/access")
public class AccessController {
    private final AccessService accessService;

    public AccessController(AccessService accessService) {
        this.accessService = accessService;
    }

    @PostMapping("/entry")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<AccessEventResponse> entry(@Valid @RequestBody EntryRequest request) {
        AccessEvent event = accessService.enter(new AccessService.EnterRequest(
                request.memberId(),
                request.membershipId(),
                request.reservationId()
        ));
        return ApiResponse.success(AccessEventResponse.from(event), "입장 처리되었습니다.");
    }

    @PostMapping("/exit")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<AccessEventResponse> exit(@Valid @RequestBody ExitRequest request) {
        AccessEvent event = accessService.exit(new AccessService.ExitRequest(request.memberId()));
        return ApiResponse.success(AccessEventResponse.from(event), "퇴장 처리되었습니다.");
    }

    @GetMapping("/events")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<List<AccessEventResponse>> listEvents(
            @RequestParam(required = false) Long memberId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) Integer limit
    ) {
        List<AccessEventResponse> items = accessService.listEvents(memberId, eventType, limit).stream()
                .map(AccessEventResponse::from)
                .toList();
        return ApiResponse.success(items, "출입 이벤트 목록 조회 성공");
    }

    @GetMapping("/presence")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<PresenceResponse> presence() {
        AccessService.PresenceSummary summary = accessService.getPresence();
        return ApiResponse.success(PresenceResponse.from(summary), "출입 현황 조회 성공");
    }

    public record EntryRequest(
            @NotNull(message = "memberId is required") Long memberId,
            Long membershipId,
            Long reservationId
    ) {}

    public record ExitRequest(
            @NotNull(message = "memberId is required") Long memberId
    ) {}

    public record AccessEventResponse(
            Long accessEventId,
            Long centerId,
            Long memberId,
            Long membershipId,
            Long reservationId,
            Long processedBy,
            String eventType,
            String denyReason,
            OffsetDateTime processedAt
    ) {
        static AccessEventResponse from(AccessEvent event) {
            return new AccessEventResponse(
                    event.accessEventId(),
                    event.centerId(),
                    event.memberId(),
                    event.membershipId(),
                    event.reservationId(),
                    event.processedBy(),
                    event.eventType(),
                    event.denyReason(),
                    event.processedAt()
            );
        }
    }

    public record PresenceResponse(
            int openSessionCount,
            int todayEntryGrantedCount,
            int todayExitCount,
            int todayEntryDeniedCount,
            List<OpenSessionResponse> openSessions
    ) {
        static PresenceResponse from(AccessService.PresenceSummary summary) {
            return new PresenceResponse(
                    summary.openSessionCount(),
                    summary.todayEntryGrantedCount(),
                    summary.todayExitCount(),
                    summary.todayEntryDeniedCount(),
                    summary.openSessions().stream().map(OpenSessionResponse::from).toList()
            );
        }
    }

    public record OpenSessionResponse(
            Long accessSessionId,
            Long memberId,
            String memberName,
            String phone,
            Long membershipId,
            Long reservationId,
            OffsetDateTime entryAt
    ) {
        static OpenSessionResponse from(MemberAccessSession session) {
            return new OpenSessionResponse(
                    session.accessSessionId(),
                    session.memberId(),
                    session.memberName(),
                    session.phone(),
                    session.membershipId(),
                    session.reservationId(),
                    session.entryAt()
            );
        }
    }
}
