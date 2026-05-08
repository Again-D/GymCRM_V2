package com.gymcrm.member.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.audit.AuditLogService;
import com.gymcrm.member.repository.MemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
public class MemberPiiDestructionScheduler {
    private static final Logger log = LoggerFactory.getLogger(MemberPiiDestructionScheduler.class);
    public static final String JOB_NAME = "member_pii_destruction_batch";

    private final MemberRepository memberRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final MemberPiiDestructionSchedulerActorGuard actorGuard;
    private final boolean batchEnabled;
    private final int retentionYears;
    private final int batchSize;

    public MemberPiiDestructionScheduler(
            MemberRepository memberRepository,
            AuditLogService auditLogService,
            ObjectMapper objectMapper,
            MemberPiiDestructionSchedulerActorGuard actorGuard,
            @Value("${app.member.pii-destruction.enabled:false}") boolean batchEnabled,
            @Value("${app.member.pii-destruction.retention-years:5}") int retentionYears,
            @Value("${app.member.pii-destruction.batch-size:100}") int batchSize
    ) {
        this.memberRepository = memberRepository;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.actorGuard = actorGuard;
        this.batchEnabled = batchEnabled;
        this.retentionYears = retentionYears;
        this.batchSize = batchSize;
    }

    @Scheduled(cron = "${app.member.pii-destruction.cron:0 30 3 * * *}")
    public void runBatch() {
        if (!batchEnabled) {
            log.debug("Skipping member PII destruction batch: feature flag disabled");
            return;
        }

        OffsetDateTime startedAt = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusYears(retentionYears);
        int effectiveBatchSize = Math.max(1, batchSize);
        Long actorUserId = actorGuard.schedulerActorUserId();

        List<MemberRepository.WithdrawnMemberProjection> candidates =
                memberRepository.findWithdrawnBefore(cutoff, effectiveBatchSize);

        if (candidates.isEmpty()) {
            log.debug("No withdrawn members eligible for PII destruction (cutoff={})", cutoff);
            return;
        }

        log.info("Starting member PII destruction batch: candidates={}, cutoff={}, batchSize={}",
                candidates.size(), cutoff, effectiveBatchSize);

        int destroyedCount = 0;
        int failedCount = 0;
        List<RowFailure> rowFailures = new ArrayList<>();

        for (MemberRepository.WithdrawnMemberProjection candidate : candidates) {
            try {
                memberRepository.destroyPii(candidate.memberId(), actorUserId);
                destroyedCount++;
            } catch (Exception ex) {
                failedCount++;
                rowFailures.add(new RowFailure(candidate.memberId(), ex.getClass().getSimpleName()));
                log.error("Failed to destroy PII for memberId={}", candidate.memberId(), ex);
            }
        }

        String status = resolveRunStatus(candidates.size(), destroyedCount, failedCount);
        auditLogService.recordRetentionJobRun(
                JOB_NAME,
                status,
                startedAt,
                OffsetDateTime.now(ZoneOffset.UTC),
                buildRunDetailsJson(retentionYears, candidates.size(), destroyedCount, failedCount, rowFailures),
                actorUserId
        );

        log.info("Completed member PII destruction batch: totalCandidates={}, destroyed={}, failed={}, status={}",
                candidates.size(), destroyedCount, failedCount, status);
    }

    private String resolveRunStatus(int totalCandidates, int destroyedCount, int failedCount) {
        if (failedCount == 0) {
            return "SUCCESS";
        }
        if (destroyedCount > 0 || totalCandidates > failedCount) {
            return "PARTIAL";
        }
        return "FAILED";
    }

    private String buildRunDetailsJson(
            int retentionYears,
            int totalCandidates,
            int destroyedCount,
            int failedCount,
            List<RowFailure> rowFailures
    ) {
        try {
            return objectMapper.writeValueAsString(new DestructionRunDetails(
                    retentionYears,
                    totalCandidates,
                    destroyedCount,
                    failedCount,
                    rowFailures
            ));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize member PII destruction run details", ex);
        }
    }

    private record DestructionRunDetails(
            int retentionYears,
            int totalCandidates,
            int destroyedCount,
            int failedCount,
            List<RowFailure> rowFailures
    ) {}

    private record RowFailure(
            Long memberId,
            String errorType
    ) {}
}
