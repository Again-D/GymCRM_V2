package com.gymcrm.crm;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.logging.TraceIdFilter;
import com.gymcrm.common.security.CurrentUserProvider;
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
    private final CurrentUserProvider currentUserProvider;

    public CrmMessageService(
            CrmMessageEventRepository eventRepository,
            CrmTargetRepository targetRepository,
            CrmMessageSender messageSender,
            CurrentUserProvider currentUserProvider
    ) {
        this.eventRepository = eventRepository;
        this.targetRepository = targetRepository;
        this.messageSender = messageSender;
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
                    OffsetDateTime.now(ZoneOffset.UTC),
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
    public ProcessResult processPending(ProcessRequest request) {
        int limit = request.limit() == null ? 20 : request.limit();
        if (limit < 1 || limit > 200) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "limit must be between 1 and 200");
        }

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String traceId = TraceIdFilter.currentTraceIdOrGenerate();

        List<CrmMessageEvent> dispatchable = eventRepository.findDispatchable(centerId, limit, now);
        int sentCount = 0;
        int retryWaitCount = 0;
        int deadCount = 0;

        for (CrmMessageEvent event : dispatchable) {
            CrmMessageSender.SendResult sendResult = messageSender.send(event);
            if (sendResult.success()) {
                eventRepository.markSent(new CrmMessageEventRepository.UpdateSentCommand(
                        event.crmMessageEventId(),
                        centerId,
                        now,
                        traceId,
                        actorUserId
                ));
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
                deadCount += 1;
            } else {
                eventRepository.markRetryWait(new CrmMessageEventRepository.UpdateRetryCommand(
                        event.crmMessageEventId(),
                        centerId,
                        now,
                        now,
                        sendResult.errorMessage(),
                        traceId,
                        actorUserId
                ));
                retryWaitCount += 1;
            }
        }

        return new ProcessResult(dispatchable.size(), sentCount, retryWaitCount, deadCount, MAX_ATTEMPTS);
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

    public record TriggerRequest(
            LocalDate baseDate,
            Integer daysAhead,
            boolean forceFail
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

    public record MessageHistoryResult(
            List<CrmMessageEvent> rows
    ) {
    }
}
