package com.gymcrm.crm.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.logging.TraceIdFilter;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.crm.CrmMessageSender;
import com.gymcrm.crm.CrmMessageSender.SendResult;
import com.gymcrm.crm.entity.CrmMessageEvent;
import com.gymcrm.crm.repository.CrmMessageEventRepository;
import com.gymcrm.crm.repository.CrmTargetRepository;
import com.gymcrm.crm.repository.CrmMessageEventRepository.InsertCommand;
import com.gymcrm.crm.repository.CrmMessageEventRepository.UpdateDeadCommand;
import com.gymcrm.crm.repository.CrmMessageEventRepository.UpdateRetryCommand;
import com.gymcrm.crm.repository.CrmMessageEventRepository.UpdateSentCommand;
import com.gymcrm.crm.repository.CrmTargetRepository.BirthdayTarget;
import com.gymcrm.crm.repository.CrmTargetRepository.EventCampaignTarget;
import com.gymcrm.crm.repository.CrmTargetRepository.ExpiringMembershipTarget;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class CrmMessageService {
    private static final int MAX_ATTEMPTS = 3;

    private final CrmMessageEventRepository eventRepository;
    private final CrmTargetRepository targetRepository;
    private final CrmMessageSender messageSender;
    private final CrmDispatchClaimService crmDispatchClaimService;
    private final CrmRetryWheelService crmRetryWheelService;
    private final CurrentUserProvider currentUserProvider;

    public CrmMessageService(
            CrmMessageEventRepository eventRepository,
            CrmTargetRepository targetRepository,
            CrmMessageSender messageSender,
            CrmDispatchClaimService crmDispatchClaimService,
            CrmRetryWheelService crmRetryWheelService,
            CurrentUserProvider currentUserProvider
    ) {
        this.eventRepository = eventRepository;
        this.targetRepository = targetRepository;
        this.messageSender = messageSender;
        this.crmDispatchClaimService = crmDispatchClaimService;
        this.crmRetryWheelService = crmRetryWheelService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public TriggerResult triggerMembershipExpiryReminder(TriggerRequest request) {
        LocalDate baseDate = request.baseDate() == null ? LocalDate.now(ZoneOffset.UTC) : request.baseDate();
        int daysAhead = request.daysAhead() == null ? 3 : request.daysAhead();
        if (daysAhead < 0 || daysAhead > 30) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "daysAhead must be between 0 and 30");
        }

        LocalDate targetDate = baseDate.plusDays(daysAhead);
        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        String traceId = TraceIdFilter.currentTraceIdOrGenerate();

        List<CrmTargetRepository.ExpiringMembershipTarget> targets = targetRepository.findExpiringMembershipTargets(centerId, targetDate);
        int createdCount = 0;
        int duplicatedCount = 0;

        for (CrmTargetRepository.ExpiringMembershipTarget target : targets) {
            String dedupeKey = "MEMBERSHIP_EXPIRY_REMINDER:" + centerId + ":" + target.membershipId() + ":" + targetDate;
            String payloadJson = toPayloadJson(target, targetDate, request.forceFail());
            boolean inserted = eventRepository.insertIfAbsent(new CrmMessageEventRepository.InsertCommand(
                    centerId,
                    target.memberId(),
                    target.membershipId(),
                    "MEMBERSHIP_EXPIRY_REMINDER",
                    "SMS",
                    dedupeKey,
                    payloadJson,
                    "PENDING",
                    resolveScheduledAt(request.scheduledAt()),
                    traceId,
                    actorUserId
            )).isPresent();

            if (inserted) {
                createdCount += 1;
            } else {
                duplicatedCount += 1;
            }
        }

        return new TriggerResult(baseDate, targetDate, targets.size(), createdCount, duplicatedCount);
    }

    @Transactional
    public TriggerResult triggerBirthdayCampaign(BirthdayTriggerRequest request) {
        LocalDate baseDate = request.baseDate() == null ? LocalDate.now(ZoneOffset.UTC) : request.baseDate();
        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        String traceId = TraceIdFilter.currentTraceIdOrGenerate();

        List<CrmTargetRepository.BirthdayTarget> targets = targetRepository.findBirthdayTargets(centerId, baseDate);
        int createdCount = 0;
        int duplicatedCount = 0;

        for (CrmTargetRepository.BirthdayTarget target : targets) {
            String dedupeKey = "BIRTHDAY_CAMPAIGN:" + centerId + ":" + target.memberId() + ":" + baseDate;
            String payloadJson = "{" +
                    "\"memberName\":\"" + escapeJson(target.memberName()) + "\"," +
                    "\"phone\":\"" + escapeJson(target.phone()) + "\"," +
                    "\"birthDate\":\"" + target.birthDate() + "\"," +
                    "\"forceFail\":" + request.forceFail() +
                    "}";
            boolean inserted = eventRepository.insertIfAbsent(new CrmMessageEventRepository.InsertCommand(
                    centerId,
                    target.memberId(),
                    null,
                    "BIRTHDAY_CAMPAIGN",
                    "SMS",
                    dedupeKey,
                    payloadJson,
                    "PENDING",
                    resolveScheduledAt(request.scheduledAt()),
                    traceId,
                    actorUserId
            )).isPresent();
            if (inserted) {
                createdCount += 1;
            } else {
                duplicatedCount += 1;
            }
        }

        return new TriggerResult(baseDate, baseDate, targets.size(), createdCount, duplicatedCount);
    }

    @Transactional
    public TriggerResult triggerEventCampaign(EventCampaignTriggerRequest request) {
        LocalDate baseDate = request.baseDate() == null ? LocalDate.now(ZoneOffset.UTC) : request.baseDate();
        if (request.eventCode() == null || request.eventCode().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "eventCode is required");
        }
        String productCategory = normalizeProductCategory(request.productCategory());
        String eventCode = request.eventCode().trim().toUpperCase();

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        String traceId = TraceIdFilter.currentTraceIdOrGenerate();

        List<CrmTargetRepository.EventCampaignTarget> targets = targetRepository.findEventCampaignTargets(centerId, productCategory);
        int createdCount = 0;
        int duplicatedCount = 0;

        for (CrmTargetRepository.EventCampaignTarget target : targets) {
            String dedupeKey = "EVENT_CAMPAIGN:" + centerId + ":" + target.memberId() + ":" + baseDate + ":" + eventCode;
            String payloadJson = "{" +
                    "\"memberName\":\"" + escapeJson(target.memberName()) + "\"," +
                    "\"phone\":\"" + escapeJson(target.phone()) + "\"," +
                    "\"eventCode\":\"" + escapeJson(eventCode) + "\"," +
                    "\"productCategory\":\"" + escapeJson(target.productCategorySnapshot()) + "\"," +
                    "\"forceFail\":" + request.forceFail() +
                    "}";
            boolean inserted = eventRepository.insertIfAbsent(new CrmMessageEventRepository.InsertCommand(
                    centerId,
                    target.memberId(),
                    target.membershipId(),
                    "EVENT_CAMPAIGN",
                    "SMS",
                    dedupeKey,
                    payloadJson,
                    "PENDING",
                    resolveScheduledAt(request.scheduledAt()),
                    traceId,
                    actorUserId
            )).isPresent();
            if (inserted) {
                createdCount += 1;
            } else {
                duplicatedCount += 1;
            }
        }

        return new TriggerResult(baseDate, baseDate, targets.size(), createdCount, duplicatedCount);
    }

    @Transactional
    public ProcessResult processPending(ProcessRequest request) {
        int limit = request.limit() == null ? 20 : request.limit();
        if (limit < 1 || limit > 200) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "limit must be between 1 and 200");
        }

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String traceId = TraceIdFilter.currentTraceIdOrGenerate();

        List<CrmMessageEvent> dispatchable = loadDispatchable(centerId, limit, now);
        int pickedCount = 0;
        int sentCount = 0;
        int retryWaitCount = 0;
        int deadCount = 0;

        for (CrmMessageEvent event : dispatchable) {
            if (!crmDispatchClaimService.tryClaim(centerId, event.crmMessageEventId())) {
                continue;
            }

            pickedCount += 1;
            CrmMessageSender.SendResult sendResult = messageSender.send(event);
            if (sendResult.success()) {
                eventRepository.markSent(new CrmMessageEventRepository.UpdateSentCommand(
                        event.crmMessageEventId(),
                        centerId,
                        now,
                        traceId,
                        actorUserId
                ));
                crmRetryWheelService.remove(centerId, event.crmMessageEventId());
                sentCount += 1;
                continue;
            }

            int nextAttemptCount = event.attemptCount() + 1;
            if (nextAttemptCount >= MAX_ATTEMPTS) {
                eventRepository.markDead(new CrmMessageEventRepository.UpdateDeadCommand(
                        event.crmMessageEventId(),
                        centerId,
                        now,
                        sendResult.errorMessage(),
                        traceId,
                        actorUserId
                ));
                crmRetryWheelService.remove(centerId, event.crmMessageEventId());
                deadCount += 1;
            } else {
                OffsetDateTime nextAttemptAt = now;
                eventRepository.markRetryWait(new CrmMessageEventRepository.UpdateRetryCommand(
                        event.crmMessageEventId(),
                        centerId,
                        now,
                        nextAttemptAt,
                        sendResult.errorMessage(),
                        traceId,
                        actorUserId
                ));
                crmRetryWheelService.schedule(centerId, event.crmMessageEventId(), nextAttemptAt);
                retryWaitCount += 1;
            }
        }

        return new ProcessResult(pickedCount, sentCount, retryWaitCount, deadCount, MAX_ATTEMPTS);
    }

    private List<CrmMessageEvent> loadDispatchable(Long centerId, int limit, OffsetDateTime now) {
        List<Long> dueRetryIds = crmRetryWheelService.pollDue(centerId, now, limit);
        if (dueRetryIds.isEmpty()) {
            return eventRepository.findDispatchable(centerId, limit, now);
        }

        List<CrmMessageEvent> retryDispatchable = eventRepository.findRetryDispatchableByIds(centerId, dueRetryIds, now);
        int remaining = Math.max(0, limit - retryDispatchable.size());
        if (remaining == 0) {
            return retryDispatchable;
        }

        List<CrmMessageEvent> pendingDispatchable = eventRepository.findPendingDispatchable(centerId, remaining, now);
        if (pendingDispatchable.isEmpty()) {
            return retryDispatchable;
        }

        return java.util.stream.Stream.concat(retryDispatchable.stream(), pendingDispatchable.stream()).toList();
    }

    @Transactional(readOnly = true)
    public MessageHistoryResult getRecentHistory(HistoryRequest request) {
        int limit = request.limit() == null ? 100 : request.limit();
        if (limit < 1 || limit > 500) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "limit must be between 1 and 500");
        }

        String status = normalizeStatus(request.sendStatus());
        List<CrmMessageEvent> rows = eventRepository.findRecent(currentUserProvider.currentCenterId(), status, limit);
        return new MessageHistoryResult(rows);
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String normalized = status.trim().toUpperCase();
        if (!normalized.equals("PENDING") && !normalized.equals("RETRY_WAIT") && !normalized.equals("SENT") && !normalized.equals("DEAD")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "sendStatus is invalid");
        }
        return normalized;
    }

    private String normalizeProductCategory(String productCategory) {
        if (productCategory == null || productCategory.isBlank()) {
            return null;
        }
        String normalized = productCategory.trim().toUpperCase();
        if (!normalized.equals("MEMBERSHIP") && !normalized.equals("PT") && !normalized.equals("GX") && !normalized.equals("ETC")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "productCategory is invalid");
        }
        return normalized;
    }

    private String toPayloadJson(CrmTargetRepository.ExpiringMembershipTarget target, LocalDate targetDate, boolean forceFail) {
        return "{" +
                "\"memberName\":\"" + escapeJson(target.memberName()) + "\"," +
                "\"phone\":\"" + escapeJson(target.phone()) + "\"," +
                "\"productName\":\"" + escapeJson(target.productNameSnapshot()) + "\"," +
                "\"expiryDate\":\"" + targetDate + "\"," +
                "\"forceFail\":" + forceFail +
                "}";
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private OffsetDateTime resolveScheduledAt(OffsetDateTime scheduledAt) {
        if (scheduledAt == null) {
            return OffsetDateTime.now(ZoneOffset.UTC);
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (scheduledAt.isBefore(now)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "scheduledAt must be current or future time");
        }
        return scheduledAt.withOffsetSameInstant(ZoneOffset.UTC);
    }

    public record TriggerRequest(
            LocalDate baseDate,
            Integer daysAhead,
            boolean forceFail,
            OffsetDateTime scheduledAt
    ) {
    }

    public record TriggerResult(
            LocalDate baseDate,
            LocalDate targetDate,
            int totalTargets,
            int createdCount,
            int duplicatedCount
    ) {
    }

    public record ProcessRequest(
            Integer limit
    ) {
    }

    public record ProcessResult(
            int pickedCount,
            int sentCount,
            int retryWaitCount,
            int deadCount,
            int maxAttempts
    ) {
    }

    public record HistoryRequest(
            String sendStatus,
            Integer limit
    ) {
    }

    public record BirthdayTriggerRequest(
            LocalDate baseDate,
            boolean forceFail,
            OffsetDateTime scheduledAt
    ) {
    }

    public record EventCampaignTriggerRequest(
            LocalDate baseDate,
            String eventCode,
            String productCategory,
            boolean forceFail,
            OffsetDateTime scheduledAt
    ) {
    }

    public record MessageHistoryResult(
            List<CrmMessageEvent> rows
    ) {
    }
}
