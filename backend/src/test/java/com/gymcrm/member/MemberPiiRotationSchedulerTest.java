package com.gymcrm.member;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.audit.AuditLogService;
import com.gymcrm.audit.AuditRetentionJobRun;
import com.gymcrm.common.security.PiiEncryptionService;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.member.service.MemberPiiRotationScheduler;
import com.gymcrm.member.service.MemberPiiRotationSchedulerActorGuard;
import com.gymcrm.member.service.MemberPiiRotationService;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MemberPiiRotationSchedulerTest {

    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final MemberPiiRotationService memberPiiRotationService = mock(MemberPiiRotationService.class);
    private final PiiEncryptionService piiEncryptionService = mock(PiiEncryptionService.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final MemberPiiRotationSchedulerActorGuard actorGuard = mock(MemberPiiRotationSchedulerActorGuard.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final MemberPiiRotationScheduler scheduler = new MemberPiiRotationScheduler(
            memberRepository,
            memberPiiRotationService,
            piiEncryptionService,
            auditLogService,
            objectMapper,
            actorGuard,
            true,
            10,
            java.time.Duration.ofMinutes(5)
    );

    @Test
    void countsRotationResultFromRepositoryOutcome() throws Exception {
        Member staleMember = sampleMember(10L, 1);

        when(piiEncryptionService.activeKeyVersion()).thenReturn(2);
        when(actorGuard.schedulerActorUserId()).thenReturn(99L);
        when(memberRepository.findStalePiiRotationCandidates(eq(2), any(), eq(10)))
                .thenReturn(List.of(new MemberRepository.MemberPiiRotationCandidate(10L, 1)));
        when(memberRepository.findById(10L)).thenReturn(java.util.Optional.of(staleMember));
        when(memberPiiRotationService.resolveForReadWithOutcome(staleMember, 99L))
                .thenReturn(new MemberPiiRotationService.ResolutionResult(sampleMember(10L, 2), false));
        when(auditLogService.recordRetentionJobRun(eq(MemberPiiRotationScheduler.JOB_NAME), eq("SUCCESS"), any(), any(), any(), eq(99L)))
                .thenAnswer(invocation -> new AuditRetentionJobRun(
                        1L,
                        invocation.getArgument(0),
                        invocation.getArgument(1),
                        invocation.getArgument(2),
                        invocation.getArgument(3),
                        invocation.getArgument(4),
                        invocation.getArgument(5),
                        OffsetDateTime.now()
                ));

        scheduler.runBatch();

        String detailsJson = (String) org.mockito.Mockito.mockingDetails(auditLogService)
                .getInvocations()
                .stream()
                .filter(invocation -> invocation.getMethod().getName().equals("recordRetentionJobRun"))
                .findFirst()
                .orElseThrow()
                .getArgument(4);

        JsonNode details = objectMapper.readTree(detailsJson);
        assertEquals(1, details.path("totalCandidates").asInt());
        assertEquals(0, details.path("upgradedCount").asInt());
        assertEquals(1, details.path("skippedCount").asInt());
        assertEquals(0, details.path("failedCount").asInt());
    }

    private Member sampleMember(Long memberId, Integer piiKeyVersion) {
        OffsetDateTime now = OffsetDateTime.parse("2026-05-06T00:00:00Z");
        return new Member(
                memberId,
                1L,
                "MBR-2026-001001",
                "테스트회원",
                "010-9999-0000",
                "enc-phone",
                null,
                null,
                LocalDate.of(1992, 1, 1),
                "enc-birth",
                piiKeyVersion,
                MemberStatus.ACTIVE,
                LocalDate.of(2026, 5, 6),
                true,
                false,
                null,
                null,
                null,
                now,
                99L,
                now,
                99L
        );
    }
}
