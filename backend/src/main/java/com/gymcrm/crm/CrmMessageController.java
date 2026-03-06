package com.gymcrm.crm;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/crm/messages")
public class CrmMessageController {
    private final CrmMessageService crmMessageService;

    public CrmMessageController(CrmMessageService crmMessageService) {
        this.crmMessageService = crmMessageService;
    }

    @PostMapping("/triggers/membership-expiry-reminder")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<TriggerResponse> triggerMembershipExpiryReminder(@Valid @RequestBody TriggerRequest request) {
        CrmMessageService.TriggerResult result = crmMessageService.triggerMembershipExpiryReminder(
                new CrmMessageService.TriggerRequest(request.baseDate(), request.daysAhead(), Boolean.TRUE.equals(request.forceFail()))
        );
        return ApiResponse.success(TriggerResponse.from(result), "CRM 만료임박 메시지 이벤트가 큐에 적재되었습니다.");
    }

    @PostMapping("/triggers/birthday-campaign")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<TriggerResponse> triggerBirthdayCampaign(@Valid @RequestBody BirthdayTriggerRequest request) {
        CrmMessageService.TriggerResult result = crmMessageService.triggerBirthdayCampaign(
                new CrmMessageService.BirthdayTriggerRequest(request.baseDate(), Boolean.TRUE.equals(request.forceFail()))
        );
        return ApiResponse.success(TriggerResponse.from(result), "CRM 생일 캠페인 메시지 이벤트가 큐에 적재되었습니다.");
    }

    @PostMapping("/triggers/event-campaign")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<TriggerResponse> triggerEventCampaign(@Valid @RequestBody EventCampaignTriggerRequest request) {
        CrmMessageService.TriggerResult result = crmMessageService.triggerEventCampaign(
                new CrmMessageService.EventCampaignTriggerRequest(
                        request.baseDate(),
                        request.eventCode(),
                        request.productCategory(),
                        Boolean.TRUE.equals(request.forceFail())
                )
        );
        return ApiResponse.success(TriggerResponse.from(result), "CRM 이벤트 캠페인 메시지 이벤트가 큐에 적재되었습니다.");
    }

    @PostMapping("/process")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<ProcessResponse> processPending(@Valid @RequestBody ProcessRequest request) {
        CrmMessageService.ProcessResult result = crmMessageService.processPending(new CrmMessageService.ProcessRequest(request.limit()));
        return ApiResponse.success(ProcessResponse.from(result), "CRM 메시지 큐 처리 완료");
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<HistoryResponse> listHistory(
            @RequestParam(required = false)
            @Pattern(regexp = "^(?i)(PENDING|RETRY_WAIT|SENT|DEAD)?$", message = "sendStatus is invalid")
            String sendStatus,
            @RequestParam(defaultValue = "100") @Min(1) @Max(500) Integer limit
    ) {
        CrmMessageService.MessageHistoryResult result = crmMessageService.getRecentHistory(
                new CrmMessageService.HistoryRequest(sendStatus, limit)
        );
        return ApiResponse.success(HistoryResponse.from(result), "CRM 메시지 이력 조회 성공");
    }

    public record TriggerRequest(
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDate,
            @Min(0) @Max(30) Integer daysAhead,
            Boolean forceFail
    ) {
    }

    public record ProcessRequest(
            @Min(1) @Max(200) Integer limit
    ) {
    }

    public record BirthdayTriggerRequest(
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDate,
            Boolean forceFail
    ) {
    }

    public record EventCampaignTriggerRequest(
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDate,
            @Pattern(regexp = "^[A-Z0-9_\\-]{2,40}$", message = "eventCode is invalid")
            String eventCode,
            @Pattern(regexp = "^(?i)(MEMBERSHIP|PT|GX|ETC)?$", message = "productCategory is invalid")
            String productCategory,
            Boolean forceFail
    ) {
    }

    public record TriggerResponse(
            LocalDate baseDate,
            LocalDate targetDate,
            int totalTargets,
            int createdCount,
            int duplicatedCount
    ) {
        static TriggerResponse from(CrmMessageService.TriggerResult result) {
            return new TriggerResponse(
                    result.baseDate(),
                    result.targetDate(),
                    result.totalTargets(),
                    result.createdCount(),
                    result.duplicatedCount()
            );
        }
    }

    public record ProcessResponse(
            int pickedCount,
            int sentCount,
            int retryWaitCount,
            int deadCount,
            int maxAttempts
    ) {
        static ProcessResponse from(CrmMessageService.ProcessResult result) {
            return new ProcessResponse(
                    result.pickedCount(),
                    result.sentCount(),
                    result.retryWaitCount(),
                    result.deadCount(),
                    result.maxAttempts()
            );
        }
    }

    public record HistoryResponse(
            List<HistoryRowResponse> rows
    ) {
        static HistoryResponse from(CrmMessageService.MessageHistoryResult result) {
            return new HistoryResponse(result.rows().stream().map(HistoryRowResponse::from).toList());
        }
    }

    public record HistoryRowResponse(
            Long crmMessageEventId,
            Long memberId,
            Long membershipId,
            String eventType,
            String channelType,
            String sendStatus,
            Integer attemptCount,
            OffsetDateTime lastAttemptedAt,
            OffsetDateTime nextAttemptAt,
            OffsetDateTime sentAt,
            OffsetDateTime failedAt,
            String lastErrorMessage,
            String traceId,
            OffsetDateTime createdAt
    ) {
        static HistoryRowResponse from(CrmMessageEvent event) {
            return new HistoryRowResponse(
                    event.crmMessageEventId(),
                    event.memberId(),
                    event.membershipId(),
                    event.eventType(),
                    event.channelType(),
                    event.sendStatus(),
                    event.attemptCount(),
                    event.lastAttemptedAt(),
                    event.nextAttemptAt(),
                    event.sentAt(),
                    event.failedAt(),
                    event.lastErrorMessage(),
                    event.traceId(),
                    event.createdAt()
            );
        }
    }
}
