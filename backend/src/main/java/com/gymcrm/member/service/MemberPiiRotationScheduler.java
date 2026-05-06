package com.gymcrm.member.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.audit.AuditLogService;
import com.gymcrm.common.security.PiiEncryptionService;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.repository.MemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
public class MemberPiiRotationScheduler {
    private static final Logger log = LoggerFactory.getLogger(MemberPiiRotationScheduler.class);
    public static final String JOB_NAME = "member_pii_rotation_batch";

    private final MemberRepository memberRepository;
    private final MemberPiiRotationService memberPiiRotationService;
    private final PiiEncryptionService piiEncryptionService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final MemberPiiRotationSchedulerActorGuard actorGuard;
    private final boolean batchEnabled;
    private final int batchSize;
    private final Duration staleUpdatedBefore;

    public MemberPiiRotationScheduler(
            MemberRepository memberRepository,
            MemberPiiRotationService memberPiiRotationService,
            PiiEncryptionService piiEncryptionService,
            AuditLogService auditLogService,
            ObjectMapper objectMapper,
            MemberPiiRotationSchedulerActorGuard actorGuard,
            @Value("${app.security.pii.rotation-batch.enabled:false}") boolean batchEnabled,
            @Value("${app.security.pii.rotation-batch.batch-size:100}") int batchSize,
            @Value("${app.security.pii.rotation-batch.stale-updated-before:PT5M}") Duration staleUpdatedBefore
    ) {
        this.memberRepository = memberRepository;
        this.memberPiiRotationService = memberPiiRotationService;
        this.piiEncryptionService = piiEncryptionService;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.actorGuard = actorGuard;
        this.batchEnabled = batchEnabled;
        this.batchSize = batchSize;
        this.staleUpdatedBefore = staleUpdatedBefore;
    }

    @Scheduled(cron = "${app.security.pii.rotation-batch.cron:0 */5 * * * *}")
    @Transactional
    public void runBatch() {
        if (!batchEnabled) {
            log.debug("Skipping member PII rotation batch: feature flag disabled");
            return;
        }

        OffsetDateTime startedAt = OffsetDateTime.now(ZoneOffset.UTC);

        int effectiveBatchSize = Math.max(1, batchSize);
        int activeKeyVersion = piiEncryptionService.activeKeyVersion();
        OffsetDateTime updatedBefore = OffsetDateTime.now().minus(staleUpdatedBefore);
        Long actorUserId = actorGuard.schedulerActorUserId();

        List<MemberRepository.MemberPiiRotationCandidate> candidates = memberRepository.findStalePiiRotationCandidates(
                activeKeyVersion,
                updatedBefore,
                effectiveBatchSize
        );

        if (candidates.isEmpty()) {
            log.debug("No stale member PII rows found for batch rotation");
            return;
        }

        log.info(
                "Starting member PII rotation batch: candidates={}, activeKeyVersion={}, batchSize={}, updatedBefore={}",
                candidates.size(),
                activeKeyVersion,
                effectiveBatchSize,
                updatedBefore
        );

        int upgradedCount = 0;
        int skippedCount = 0;
        int failedCount = 0;
        List<RowFailure> rowFailures = new ArrayList<>();

        for (MemberRepository.MemberPiiRotationCandidate candidate : candidates) {
            try {
                boolean upgraded = rotateCandidate(candidate.memberId(), actorUserId, activeKeyVersion);
                if (upgraded) {
                    upgradedCount++;
                } else {
                    skippedCount++;
                }
            } catch (Exception ex) {
                failedCount++;
                rowFailures.add(new RowFailure(candidate.memberId(), ex.getClass().getSimpleName()));
                log.error("Failed to rotate member PII in batch. memberId={}", candidate.memberId(), ex);
            }
        }

        String status = resolveRunStatus(candidates.size(), upgradedCount, skippedCount, failedCount);
        auditLogService.recordRetentionJobRun(
                JOB_NAME,
                status,
                startedAt,
                OffsetDateTime.now(ZoneOffset.UTC),
                buildRunDetailsJson(
                        activeKeyVersion,
                        candidates.size(),
                        upgradedCount,
                        skippedCount,
                        failedCount,
                        rowFailures
                ),
                actorUserId
        );

        log.info(
                "Completed member PII rotation batch: totalCandidates={}, upgraded={}, skipped={}, failed={}, activeKeyVersion={}, status={}",
                candidates.size(),
                upgradedCount,
                skippedCount,
                failedCount,
                activeKeyVersion,
                status
        );
    }

    private String resolveRunStatus(int totalCandidates, int upgradedCount, int skippedCount, int failedCount) {
        if (failedCount == 0) {
            return "SUCCESS";
        }
        if ((upgradedCount + skippedCount) > 0 || totalCandidates > failedCount) {
            return "PARTIAL";
        }
        return "FAILED";
    }

    private String buildRunDetailsJson(
            int activeKeyVersion,
            int totalCandidates,
            int upgradedCount,
            int skippedCount,
            int failedCount,
            List<RowFailure> rowFailures
    ) {
        try {
            return objectMapper.writeValueAsString(new RotationRunDetails(
                    activeKeyVersion,
                    totalCandidates,
                    upgradedCount,
                    skippedCount,
                    failedCount,
                    rowFailures
            ));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize member PII rotation run details", ex);
        }
    }

    private boolean rotateCandidate(Long memberId, Long actorUserId, int activeKeyVersion) {
        return memberRepository.findById(memberId)
                .map(member -> rotateIfStale(member, actorUserId, activeKeyVersion))
                .orElse(false);
    }

    private boolean rotateIfStale(Member member, Long actorUserId, int activeKeyVersion) {
        Integer currentVersion = member.piiKeyVersion();
        int resolvedVersion = currentVersion == null ? activeKeyVersion : currentVersion;
        if (resolvedVersion == activeKeyVersion) {
            return false;
        }
        return memberPiiRotationService.resolveForReadWithOutcome(member, actorUserId).rotated();
    }

    private record RotationRunDetails(
            int activeKeyVersion,
            int totalCandidates,
            int upgradedCount,
            int skippedCount,
            int failedCount,
            List<RowFailure> rowFailures
    ) {
    }

    private record RowFailure(
            Long memberId,
            String errorType
    ) {
    }
}
