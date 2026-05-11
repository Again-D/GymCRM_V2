package com.gymcrm.crm.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.logging.TraceIdFilter;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.crm.CrmMessageSender;
import com.gymcrm.crm.CrmMessageSender.SendResult;
import com.gymcrm.crm.entity.CrmMessageEvent;
import com.gymcrm.crm.entity.CrmMessageTemplate;
import com.gymcrm.crm.repository.CrmMessageEventRepository;
import com.gymcrm.crm.repository.CrmTargetRepository;
import com.gymcrm.crm.repository.CrmMessageEventRepository.InsertCommand;
import com.gymcrm.crm.repository.CrmMessageEventRepository.UpdateDeadCommand;
import com.gymcrm.crm.repository.CrmMessageEventRepository.UpdateRetryCommand;
import com.gymcrm.crm.repository.CrmMessageEventRepository.UpdateSentCommand;
import com.gymcrm.crm.repository.CrmTargetRepository.BirthdayTarget;
import com.gymcrm.crm.repository.CrmTargetRepository.EventCampaignTarget;
import com.gymcrm.crm.repository.CrmTargetRepository.ExpiringMembershipTarget;
import com.gymcrm.crm.repository.CrmTargetRepository.LongTermInactiveTarget;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
    private final CrmMessageTemplateService crmMessageTemplateService;
    private final CurrentUserProvider currentUserProvider;

    public CrmMessageService(
            CrmMessageEventRepository eventRepository,
            CrmTargetRepository targetRepository,
            CrmMessageSender messageSender,
            CrmDispatchClaimService crmDispatchClaimService,
            CrmRetryWheelService crmRetryWheelService,
            CrmMessageTemplateService crmMessageTemplateService,
            CurrentUserProvider currentUserProvider
    ) {
        this.eventRepository = eventRepository;
        this.targetRepository = targetRepository;
        this.messageSender = messageSender;
        this.crmDispatchClaimService = crmDispatchClaimService;
        this.crmRetryWheelService = crmRetryWheelService;
        this.crmMessageTemplateService = crmMessageTemplateService;
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
                    "PRIMARY",
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
                    "PRIMARY",
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
                    "PRIMARY",
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
    public TriggerResult triggerLongTermInactiveCampaign(LongTermInactiveCampaignTriggerRequest request) {
        LocalDate baseDate = request.baseDate() == null ? LocalDate.now(ZoneOffset.UTC) : request.baseDate();
        int inactiveDays = request.inactiveDays() == null ? 30 : request.inactiveDays();
        if (inactiveDays < 1 || inactiveDays > 3650) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "inactiveDays must be between 1 and 3650");
        }

        CrmMessageTemplate template = crmMessageTemplateService.requireSendableTemplate(request.templateId());
        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        String traceId = TraceIdFilter.currentTraceIdOrGenerate();
        OffsetDateTime cutoffAt = baseDate.minusDays(inactiveDays).atStartOfDay(ZoneOffset.UTC).toOffsetDateTime();

        List<LongTermInactiveTarget> targets = targetRepository.findLongTermInactiveTargets(centerId, cutoffAt);
        int createdCount = 0;
        int duplicatedCount = 0;

        for (LongTermInactiveTarget target : targets) {
            String dedupeKey = "LONG_TERM_INACTIVE_CAMPAIGN:" + centerId + ":" + target.memberId() + ":" + baseDate + ":" + inactiveDays + ":" + template.templateCode();
            String payloadJson = "{" +
                    "\"memberName\":\"" + escapeJson(target.memberName()) + "\"," +
                    "\"phone\":\"" + escapeJson(target.phone()) + "\"," +
                    "\"templateCode\":\"" + escapeJson(template.templateCode()) + "\"," +
                    "\"templateName\":\"" + escapeJson(template.templateName()) + "\"," +
                    "\"templateBody\":\"" + escapeJson(template.templateBody()) + "\"," +
                    "\"inactiveDays\":" + inactiveDays + "," +
                    "\"lastAccessAt\":\"" + (target.lastAccessAt() == null ? "" : target.lastAccessAt()) + "\"" +
                    "}";
            boolean inserted = eventRepository.insertIfAbsent(new CrmMessageEventRepository.InsertCommand(
                    centerId,
                    target.memberId(),
                    null,
                    "LONG_TERM_INACTIVE_CAMPAIGN",
                    template.channelType(),
                    "PRIMARY",
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
    public TriggerResult triggerInactiveMemberCampaign(InactiveMemberTriggerRequest request) {
        LocalDate baseDate = request.baseDate() == null ? LocalDate.now(ZoneOffset.UTC) : request.baseDate();
        int inactiveDays = request.inactiveDays() == null ? 30 : request.inactiveDays();
        if (inactiveDays < 0 || inactiveDays > 365) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "inactiveDays must be between 0 and 365");
        }

        LocalDate cutoffDate = baseDate.minusDays(inactiveDays);
        OffsetDateTime cutoffAt = cutoffDate.plusDays(1).atStartOfDay(ZoneId.of("Asia/Seoul")).toOffsetDateTime();

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        String traceId = TraceIdFilter.currentTraceIdOrGenerate();

        List<CrmTargetRepository.InactiveMemberTarget> targets = targetRepository.findInactiveMemberTargets(centerId, cutoffDate, cutoffAt);
        int createdCount = 0;
        int duplicatedCount = 0;

        for (CrmTargetRepository.InactiveMemberTarget target : targets) {
            String dedupeKey = "INACTIVE_MEMBER_CAMPAIGN:" + centerId + ":" + target.memberId() + ":" + cutoffDate;
            String payloadJson = "{" +
                    "\"memberName\":\"" + escapeJson(target.memberName()) + "\"," +
                    "\"phone\":\"" + escapeJson(target.phone()) + "\"," +
                    "\"inactiveDays\":" + inactiveDays + "," +
                    "\"lastAccessAt\":" + jsonString(target.lastAccessAt()) + "," +
                    "\"forceFail\":" + request.forceFail() +
                    "}";
            boolean inserted = eventRepository.insertIfAbsent(new CrmMessageEventRepository.InsertCommand(
                    centerId,
                    target.memberId(),
                    null,
                    "INACTIVE_MEMBER_CAMPAIGN",
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

        return new TriggerResult(baseDate, cutoffDate, targets.size(), createdCount, duplicatedCount);
    }

    @Transactional
    public boolean enqueueMembershipHoldResumed(MembershipHoldResumedRequest request) {
        String dedupeKey = "MEMBERSHIP_HOLD_RESUMED:" + request.centerId() + ":" + request.membershipHoldId();
        String payloadJson = "{" +
                "\"memberName\":\"" + escapeJson(request.memberName()) + "\"," +
                "\"phone\":\"" + escapeJson(request.phone()) + "\"," +
                "\"membershipId\":" + request.membershipId() + "," +
                "\"productName\":\"" + escapeJson(request.productName()) + "\"," +
                "\"today\":\"" + request.resumedOn() + "\"" +
                "}";

        return eventRepository.insertIfAbsent(new InsertCommand(
                request.centerId(),
                request.memberId(),
                request.membershipId(),
                "MEMBERSHIP_HOLD_RESUMED",
                "SMS",
                "PRIMARY",
                dedupeKey,
                payloadJson,
                "PENDING",
                null,
                TraceIdFilter.currentTraceIdOrGenerate(),
                request.actorUserId()
        )).isPresent();
    }

    @Transactional
    public boolean enqueueReservationWaitlistPromoted(ReservationWaitlistPromotedRequest request) {
        String dedupeKey = "RESERVATION_WAITLIST_PROMOTED:" + request.centerId() + ":" + request.waitlistId();
        String payloadJson = "{" +
                "\"memberId\":" + request.memberId() + "," +
                "\"membershipId\":" + request.membershipId() + "," +
                "\"scheduleId\":" + request.scheduleId() + "," +
                "\"reservationId\":" + request.reservationId() + "," +
                "\"waitlistId\":" + request.waitlistId() + "," +
                "\"queueOrder\":" + request.queueOrder() + "," +
                "\"promotedAt\":\"" + request.promotedAt() + "\"" +
                "}";

        return eventRepository.insertIfAbsent(new CrmMessageEventRepository.InsertCommand(
                request.centerId(),
                request.memberId(),
                request.membershipId(),
                "RESERVATION_WAITLIST_PROMOTED",
                "SMS",
                dedupeKey,
                payloadJson,
                "PENDING",
                request.promotedAt(),
                TraceIdFilter.currentTraceIdOrGenerate(),
                currentUserProvider.currentUserId()
        )).isPresent();
    }

    @Transactional
    public boolean enqueueReservationConfirmed(ReservationNotificationRequest request) {
        return enqueueReservationNotification(request, "RESERVATION_CONFIRMED", null);
    }

    @Transactional
    public boolean enqueueReservationReminder(ReservationNotificationRequest request) {
        return enqueueReservationNotification(request, "RESERVATION_REMINDER", request.reminderAt());
    }

    private boolean enqueueReservationNotification(
            ReservationNotificationRequest request,
            String eventType,
            OffsetDateTime nextAttemptAt
    ) {
        String dedupeKey = eventType + ":" + request.centerId() + ":" + request.reservationId();
        String payloadJson = "{" +
                "\"memberId\":" + request.memberId() + "," +
                "\"membershipId\":" + request.membershipId() + "," +
                "\"reservationId\":" + request.reservationId() + "," +
                "\"scheduleId\":" + request.scheduleId() + "," +
                "\"scheduleStartAt\":\"" + request.scheduleStartAt() + "\"," +
                "\"reminderAt\":\"" + request.reminderAt() + "\"" +
                "}";

        return eventRepository.insertIfAbsent(new CrmMessageEventRepository.InsertCommand(
                request.centerId(),
                request.memberId(),
                request.membershipId(),
                eventType,
                "SMS",
                dedupeKey,
                payloadJson,
                "PENDING",
                nextAttemptAt,
                TraceIdFilter.currentTraceIdOrGenerate(),
                request.actorUserId()
        )).isPresent();
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
            SendAttempt sendAttempt = sendWithFallback(event);
            if (sendAttempt.sendResult().success()) {
                eventRepository.markSent(new CrmMessageEventRepository.UpdateSentCommand(
                        event.crmMessageEventId(),
                        centerId,
                        now,
                        sendAttempt.deliveryMode(),
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
                        sendAttempt.errorMessage(),
                        sendAttempt.deliveryMode(),
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
                        sendAttempt.errorMessage(),
                        sendAttempt.deliveryMode(),
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

    private String jsonString(OffsetDateTime value) {
        return value == null ? "null" : "\"" + value + "\"";
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

    private SendAttempt sendWithFallback(CrmMessageEvent event) {
        CrmMessageSender.SendResult primaryResult;
        try {
            primaryResult = messageSender.send(event);
        } catch (Exception ex) {
            primaryResult = new SendResult(false, null, "primary sender threw: " + ex.getMessage());
        }
        if (primaryResult.success() || !shouldTrySmsFallback(event)) {
            return new SendAttempt(primaryResult, "PRIMARY");
        }

        CrmMessageEvent smsFallbackEvent = new CrmMessageEvent(
                event.crmMessageEventId(),
                event.centerId(),
                event.memberId(),
                event.membershipId(),
                event.eventType(),
                "SMS",
                event.deliveryMode(),
                event.dedupeKey(),
                event.payloadJson(),
                event.sendStatus(),
                event.attemptCount(),
                event.lastAttemptedAt(),
                event.nextAttemptAt(),
                event.sentAt(),
                event.failedAt(),
                event.lastErrorMessage(),
                event.traceId(),
                event.createdAt(),
                event.updatedAt()
        );
        CrmMessageSender.SendResult fallbackResult;
        try {
            fallbackResult = messageSender.send(smsFallbackEvent);
        } catch (Exception ex) {
            fallbackResult = new SendResult(false, null, "sms fallback sender threw: " + ex.getMessage());
        }
        if (fallbackResult.success()) {
            return new SendAttempt(fallbackResult, "SMS_FALLBACK");
        }
        return new SendAttempt(
                fallbackResult,
                "SMS_FALLBACK",
                combineErrorMessages(primaryResult.errorMessage(), fallbackResult.errorMessage())
        );
    }

    private boolean shouldTrySmsFallback(CrmMessageEvent event) {
        return !"SMS".equalsIgnoreCase(event.channelType());
    }

    private String combineErrorMessages(String primaryError, String fallbackError) {
        if (primaryError == null || primaryError.isBlank()) {
            return fallbackError;
        }
        if (fallbackError == null || fallbackError.isBlank()) {
            return primaryError;
        }
        return "primary: " + primaryError + "; fallback: " + fallbackError;
    }

    private record SendAttempt(CrmMessageSender.SendResult sendResult, String deliveryMode, String errorMessage) {
        private SendAttempt(CrmMessageSender.SendResult sendResult, String deliveryMode) {
            this(sendResult, deliveryMode, sendResult.errorMessage());
        }
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

    public record InactiveMemberTriggerRequest(
            LocalDate baseDate,
            Integer inactiveDays,
            boolean forceFail,
            OffsetDateTime scheduledAt
    ) {
    }

    public record MessageHistoryResult(
            List<CrmMessageEvent> rows
    ) {
    }

    public record MembershipHoldResumedRequest(
            Long centerId,
            Long memberId,
            Long membershipId,
            Long membershipHoldId,
            String memberName,
            String phone,
            String productName,
            LocalDate resumedOn,
            Long actorUserId
    ) {
    }

    public record ReservationWaitlistPromotedRequest(
            Long centerId,
            Long memberId,
            Long membershipId,
            Long scheduleId,
            Long reservationId,
            Long waitlistId,
            Integer queueOrder,
            OffsetDateTime promotedAt
    ) {
    }

    public record ReservationNotificationRequest(
            Long centerId,
            Long memberId,
            Long membershipId,
            Long reservationId,
            Long scheduleId,
            OffsetDateTime scheduleStartAt,
            OffsetDateTime reminderAt,
            Long actorUserId
    ) {
    }
}
