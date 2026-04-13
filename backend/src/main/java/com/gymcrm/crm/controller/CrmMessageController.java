package com.gymcrm.crm.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.crm.dto.request.BirthdayTriggerRequest;
import com.gymcrm.crm.dto.request.EventCampaignTriggerRequest;
import com.gymcrm.crm.dto.request.ProcessRequest;
import com.gymcrm.crm.dto.request.TriggerRequest;
import com.gymcrm.crm.dto.response.HistoryResponse;
import com.gymcrm.crm.dto.response.ProcessResponse;
import com.gymcrm.crm.dto.response.TriggerResponse;
import com.gymcrm.crm.service.CrmMessageService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@Validated
@RestController
@RequestMapping("/api/v1/crm/messages")
public class CrmMessageController {
    private final CrmMessageService crmMessageService;

    public CrmMessageController(CrmMessageService crmMessageService) {
        this.crmMessageService = crmMessageService;
    }

    @PostMapping("/triggers/membership-expiry-reminder")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<TriggerResponse> triggerMembershipExpiryReminder(@Valid @RequestBody TriggerRequest request) {
        CrmMessageService.TriggerResult result = crmMessageService.triggerMembershipExpiryReminder(
                new CrmMessageService.TriggerRequest(
                        request.baseDate(),
                        request.daysAhead(),
                        Boolean.TRUE.equals(request.forceFail()),
                        request.scheduledAt()
                )
        );
        return ApiResponse.success(TriggerResponse.from(result), "CRM 만료임박 메시지 이벤트가 큐에 적재되었습니다.");
    }

    @PostMapping("/triggers/birthday-campaign")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<TriggerResponse> triggerBirthdayCampaign(@Valid @RequestBody BirthdayTriggerRequest request) {
        CrmMessageService.TriggerResult result = crmMessageService.triggerBirthdayCampaign(
                new CrmMessageService.BirthdayTriggerRequest(
                        request.baseDate(),
                        Boolean.TRUE.equals(request.forceFail()),
                        request.scheduledAt()
                )
        );
        return ApiResponse.success(TriggerResponse.from(result), "CRM 생일 캠페인 메시지 이벤트가 큐에 적재되었습니다.");
    }

    @PostMapping("/triggers/event-campaign")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<TriggerResponse> triggerEventCampaign(@Valid @RequestBody EventCampaignTriggerRequest request) {
        CrmMessageService.TriggerResult result = crmMessageService.triggerEventCampaign(
                new CrmMessageService.EventCampaignTriggerRequest(
                        request.baseDate(),
                        request.eventCode(),
                        request.productCategory(),
                        Boolean.TRUE.equals(request.forceFail()),
                        request.scheduledAt()
                )
        );
        return ApiResponse.success(TriggerResponse.from(result), "CRM 이벤트 캠페인 메시지 이벤트가 큐에 적재되었습니다.");
    }

    @PostMapping("/process")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<ProcessResponse> processPending(@Valid @RequestBody ProcessRequest request) {
        CrmMessageService.ProcessResult result = crmMessageService.processPending(new CrmMessageService.ProcessRequest(request.limit()));
        return ApiResponse.success(ProcessResponse.from(result), "CRM 메시지 큐 처리 완료");
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
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

}
