package com.gymcrm.member;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberPiiRotationScheduler;
import com.gymcrm.member.service.MemberService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.mode=prototype",
        "app.security.pii.rotation-enabled=true",
        "app.security.pii.key-version=2",
        "app.security.pii.keys[1]=dev-only-pii-key-v1",
        "app.security.pii.keys[2]=dev-only-pii-key-v2",
        "app.security.pii.rotation-batch.enabled=true",
        "app.security.pii.rotation-batch.batch-size=10",
        "app.security.pii.rotation-batch.stale-updated-before=PT1M"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class MemberPiiRotationOperationalIntegrationTest {

    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberPiiRotationScheduler scheduler;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @Transactional
    void successfulBatchRunPersistsAggregatedRunSummaryWithoutRawPii() throws Exception {
        normalizeAllRowsToCurrentVersion();
        Member staleA = createMember("운영요약성공A");
        Member staleB = createMember("운영요약성공B");

        setStaleVersion(staleA.memberId(), staleA.phoneEncrypted(), staleA.birthDateEncrypted(), staleA.phone(), staleA.birthDate(), 1, 7);
        setStaleVersion(staleB.memberId(), staleB.phoneEncrypted(), staleB.birthDateEncrypted(), staleB.phone(), staleB.birthDate(), 1, 6);
        clearPersistenceContext();

        scheduler.runBatch();

        RetentionRunRow run = latestRun(MemberPiiRotationScheduler.JOB_NAME);
        assertNotNull(run);
        assertEquals("SUCCESS", run.status());

        JsonNode details = objectMapper.readTree(run.detailsJson());
        assertEquals(2, details.path("totalCandidates").asInt());
        assertEquals(2, details.path("upgradedCount").asInt());
        assertTrue(details.has("skippedCount"));
        assertEquals(0, details.path("failedCount").asInt());
        assertEquals(2, details.path("activeKeyVersion").asInt());

        String detailsJson = run.detailsJson();
        assertFalse(detailsJson.contains(staleA.phone()));
        assertFalse(detailsJson.contains(staleB.phone()));
        assertFalse(detailsJson.contains(staleA.birthDate().toString()));
        assertFalse(detailsJson.contains(staleB.birthDate().toString()));
    }

    @Test
    @Transactional
    void failedRowsAreCapturedInSummaryAndRunClosesWithPartialStatus() throws Exception {
        normalizeAllRowsToCurrentVersion();
        Member bad = createMember("운영요약실패");
        Member good = createMember("운영요약정상");

        setUnknownVersionWithoutPlaintext(bad.memberId(), bad.phone(), bad.birthDate(), 7);
        setStaleVersion(good.memberId(), good.phoneEncrypted(), good.birthDateEncrypted(), good.phone(), good.birthDate(), 1, 6);
        clearPersistenceContext();

        scheduler.runBatch();

        RetentionRunRow run = latestRun(MemberPiiRotationScheduler.JOB_NAME);
        assertNotNull(run);
        assertEquals("PARTIAL", run.status());

        JsonNode details = objectMapper.readTree(run.detailsJson());
        assertEquals(1, details.path("failedCount").asInt());
        assertTrue(details.path("rowFailures").isArray());
        assertEquals(1, details.path("rowFailures").size());
        assertEquals(bad.memberId(), details.path("rowFailures").get(0).path("memberId").asLong());
        assertEquals("ApiException", details.path("rowFailures").get(0).path("errorType").asText());
        assertEquals(2, readPiiVersion(good.memberId()));

        String detailsJson = run.detailsJson();
        assertFalse(detailsJson.contains(bad.phone()));
        assertFalse(detailsJson.contains(good.phone()));
        assertFalse(detailsJson.contains(bad.birthDate().toString()));
    }

    @Test
    @Transactional
    void memberDetailPiiReadAuditRemainsAndRotationWorkStaysOutOfMemberPiiReadLogs() throws Exception {
        normalizeAllRowsToCurrentVersion();
        Member lazyTarget = createMember("운영감사분리-지연");
        Member batchTarget = createMember("운영감사분리-배치");

        setStaleVersion(lazyTarget.memberId(), lazyTarget.phoneEncrypted(), lazyTarget.birthDateEncrypted(), lazyTarget.phone(), lazyTarget.birthDate(), 1, 8);
        setStaleVersion(batchTarget.memberId(), batchTarget.phoneEncrypted(), batchTarget.birthDateEncrypted(), batchTarget.phone(), batchTarget.birthDate(), 1, 7);
        clearPersistenceContext();

        memberService.get(lazyTarget.memberId());
        scheduler.runBatch();

        assertEquals(0, countMemberPiiReadAudit(lazyTarget.memberId()));
        assertEquals(0, countMemberPiiReadAudit(batchTarget.memberId()));

        mockMvc.perform(get("/api/v1/members/{memberId}", lazyTarget.memberId()))
                .andExpect(status().isOk());

        assertTrue(countMemberPiiReadAudit(lazyTarget.memberId()) >= 1);
    }

    private Member createMember(String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberCreateRequest(
                prefix + "-" + suffix,
                "010-" + suffix.substring(0, 4) + "-" + suffix.substring(4, 8),
                null,
                null,
                LocalDate.of(1992, 1, 1),
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));
    }

    private void normalizeAllRowsToCurrentVersion() {
        jdbcClient.sql("""
                UPDATE members
                SET pii_key_version = 2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE is_deleted = FALSE
                  AND (pii_key_version IS NULL OR pii_key_version <> 2)
                """)
                .update();
    }

    private void setStaleVersion(Long memberId, String phoneEncrypted, String birthDateEncrypted, String phone, LocalDate birthDate, int version, int minutesAgo) {
        jdbcClient.sql("""
                UPDATE members
                SET pii_key_version = :version,
                    phone_encrypted = :phoneEncrypted,
                    birth_date_encrypted = :birthDateEncrypted,
                    phone = :phone,
                    birth_date = :birthDate,
                    updated_at = CURRENT_TIMESTAMP - (:minutes || ' minute')::interval
                WHERE member_id = :memberId
                """)
                .param("version", version)
                .param("phoneEncrypted", phoneEncrypted)
                .param("birthDateEncrypted", birthDateEncrypted)
                .param("phone", phone)
                .param("birthDate", birthDate)
                .param("minutes", minutesAgo)
                .param("memberId", memberId)
                .update();
    }

    private void setUnknownVersionWithoutPlaintext(Long memberId, String phone, LocalDate birthDate, int minutesAgo) {
        jdbcClient.sql("""
                UPDATE members
                SET phone = '',
                    birth_date = NULL,
                    phone_encrypted = :phoneEncrypted,
                    birth_date_encrypted = :birthDateEncrypted,
                    pii_key_version = 999,
                    updated_at = CURRENT_TIMESTAMP - (:minutes || ' minute')::interval
                WHERE member_id = :memberId
                """)
                .param("phoneEncrypted", encryptWithRawKey(phone, "dev-only-pii-key-v1"))
                .param("birthDateEncrypted", encryptWithRawKey(birthDate.toString(), "dev-only-pii-key-v1"))
                .param("minutes", minutesAgo)
                .param("memberId", memberId)
                .update();
    }

    private int countMemberPiiReadAudit(Long memberId) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM audit_logs
                WHERE center_id = 1
                  AND event_type = 'PII_READ'
                  AND resource_type = 'MEMBER'
                  AND resource_id = :resourceId
                """)
                .param("resourceId", String.valueOf(memberId))
                .query(Integer.class)
                .single();
        return count == null ? 0 : count;
    }

    private Integer readPiiVersion(Long memberId) {
        return jdbcClient.sql("""
                SELECT pii_key_version
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", memberId)
                .query(Integer.class)
                .single();
    }

    private RetentionRunRow latestRun(String jobName) {
        return jdbcClient.sql("""
                SELECT status, details_json
                FROM audit_retention_job_runs
                WHERE job_name = :jobName
                ORDER BY completed_at DESC, audit_retention_job_run_id DESC
                LIMIT 1
                """)
                .param("jobName", jobName)
                .query((rs, rowNum) -> new RetentionRunRow(
                        rs.getString("status"),
                        rs.getString("details_json")
                ))
                .optional()
                .orElse(null);
    }

    private void clearPersistenceContext() {
        entityManager.clear();
    }

    private String encryptWithRawKey(String plain, String rawKey) {
        try {
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);

            javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");
            javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(sha256(rawKey), "AES");
            cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, keySpec, new javax.crypto.spec.GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));

            byte[] payload = ByteBuffer.allocate(iv.length + encrypted.length)
                    .put(iv)
                    .put(encrypted)
                    .array();
            return Base64.getEncoder().encodeToString(payload);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private byte[] sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(raw.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private record RetentionRunRow(
            String status,
            String detailsJson
    ) {
    }
}
