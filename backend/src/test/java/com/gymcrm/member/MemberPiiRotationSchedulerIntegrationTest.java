package com.gymcrm.member;

import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberPiiRotationScheduler;
import com.gymcrm.member.service.MemberService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.pii.rotation-enabled=true",
        "app.security.pii.key-version=2",
        "app.security.pii.keys[1]=dev-only-pii-key-v1",
        "app.security.pii.keys[2]=dev-only-pii-key-v2",
        "app.security.pii.rotation-batch.enabled=true",
        "app.security.pii.rotation-batch.batch-size=2",
        "app.security.pii.rotation-batch.stale-updated-before=PT1M"
})
@ActiveProfiles("dev")
class MemberPiiRotationSchedulerIntegrationTest {

    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberPiiRotationScheduler scheduler;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void upgradesBoundedStaleRowsAndLeavesCurrentRowsUntouched() {
        normalizeAllRowsToCurrentVersion();
        Member staleA = createMember("배치대상A");
        Member staleB = createMember("배치대상B");
        Member staleC = createMember("배치대상C");
        Member current = createMember("현재버전");

        setStaleVersion(staleA.memberId(), staleA.phoneEncrypted(), staleA.birthDateEncrypted(), staleA.phone(), staleA.birthDate(), 1, 10);
        setStaleVersion(staleB.memberId(), staleB.phoneEncrypted(), staleB.birthDateEncrypted(), staleB.phone(), staleB.birthDate(), 1, 9);
        setStaleVersion(staleC.memberId(), staleC.phoneEncrypted(), staleC.birthDateEncrypted(), staleC.phone(), staleC.birthDate(), 1, 8);

        String currentCipherBefore = readPhoneEncrypted(current.memberId());
        clearPersistenceContext();

        scheduler.runBatch();

        assertEquals(2, readPiiVersion(staleA.memberId()));
        assertEquals(2, readPiiVersion(staleB.memberId()));
        assertEquals(1, readPiiVersion(staleC.memberId()));
        assertEquals(2, readPiiVersion(current.memberId()));
        assertEquals(currentCipherBefore, readPhoneEncrypted(current.memberId()));
    }

    @Test
    @Transactional
    void rowMissingPlaintextStillUpgradesUsingDecryptFallback() {
        normalizeAllRowsToCurrentVersion();
        Member stale = createMember("평문누락");
        setStaleWithoutPlaintext(stale.memberId(), stale.phone(), stale.birthDate(), 6);
        clearPersistenceContext();

        scheduler.runBatch();

        assertEquals(2, readPiiVersion(stale.memberId()));
        assertEquals(stale.phone(), readPhone(stale.memberId()));
    }

    @Test
    @Transactional
    void badRowFailureIsIsolatedAndOtherRowsContinue() {
        normalizeAllRowsToCurrentVersion();
        Member bad = createMember("배드키");
        Member good = createMember("굿키");

        setUnknownVersionWithoutPlaintext(bad.memberId(), bad.phone(), bad.birthDate(), 7);
        setStaleVersion(good.memberId(), good.phoneEncrypted(), good.birthDateEncrypted(), good.phone(), good.birthDate(), 1, 7);
        clearPersistenceContext();

        scheduler.runBatch();

        assertEquals(999, readPiiVersion(bad.memberId()));
        assertEquals(2, readPiiVersion(good.memberId()));
    }

    @Test
    @Transactional
    void rerunIsIdempotentForAlreadyCurrentRows() {
        normalizeAllRowsToCurrentVersion();
        Member stale = createMember("재실행");
        setStaleVersion(stale.memberId(), stale.phoneEncrypted(), stale.birthDateEncrypted(), stale.phone(), stale.birthDate(), 1, 6);
        clearPersistenceContext();

        scheduler.runBatch();
        String cipherAfterFirstRun = readPhoneEncrypted(stale.memberId());
        OffsetDateTime updatedAfterFirstRun = readUpdatedAt(stale.memberId());

        scheduler.runBatch();

        assertEquals(2, readPiiVersion(stale.memberId()));
        assertEquals(cipherAfterFirstRun, readPhoneEncrypted(stale.memberId()));
        assertEquals(updatedAfterFirstRun, readUpdatedAt(stale.memberId()));
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

    private void setStaleWithoutPlaintext(Long memberId, String phone, LocalDate birthDate, int minutesAgo) {
        jdbcClient.sql("""
                UPDATE members
                SET phone = '',
                    birth_date = NULL,
                    phone_encrypted = :phoneEncrypted,
                    birth_date_encrypted = :birthDateEncrypted,
                    pii_key_version = 1,
                    updated_at = CURRENT_TIMESTAMP - (:minutes || ' minute')::interval
                WHERE member_id = :memberId
                """)
                .param("phoneEncrypted", encryptWithRawKey(phone, "dev-only-pii-key-v1"))
                .param("birthDateEncrypted", encryptWithRawKey(birthDate.toString(), "dev-only-pii-key-v1"))
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

    private void clearPersistenceContext() {
        entityManager.clear();
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

    private String readPhone(Long memberId) {
        return jdbcClient.sql("""
                SELECT phone
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", memberId)
                .query(String.class)
                .single();
    }

    private String readPhoneEncrypted(Long memberId) {
        return jdbcClient.sql("""
                SELECT phone_encrypted
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", memberId)
                .query(String.class)
                .single();
    }

    private OffsetDateTime readUpdatedAt(Long memberId) {
        return jdbcClient.sql("""
                SELECT updated_at
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", memberId)
                .query(OffsetDateTime.class)
                .single();
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
}

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.pii.rotation-enabled=true",
        "app.security.pii.key-version=2",
        "app.security.pii.keys[1]=dev-only-pii-key-v1",
        "app.security.pii.keys[2]=dev-only-pii-key-v2",
        "app.security.pii.rotation-batch.enabled=false",
        "app.security.pii.rotation-batch.batch-size=10",
        "app.security.pii.rotation-batch.stale-updated-before=PT1M"
})
@ActiveProfiles("dev")
class MemberPiiRotationSchedulerDisabledIntegrationTest {

    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberPiiRotationScheduler scheduler;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void disabledFlagSkipsBatchExecution() {
        jdbcClient.sql("""
                UPDATE members
                SET pii_key_version = 2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE is_deleted = FALSE
                  AND (pii_key_version IS NULL OR pii_key_version <> 2)
                """)
                .update();

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Member member = memberService.create(new MemberCreateRequest(
                "비활성-" + suffix,
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

        jdbcClient.sql("""
                UPDATE members
                SET pii_key_version = 1,
                    updated_at = CURRENT_TIMESTAMP - INTERVAL '10 minute'
                WHERE member_id = :memberId
                """)
                .param("memberId", member.memberId())
                .update();
        entityManager.clear();

        scheduler.runBatch();

        Integer version = jdbcClient.sql("""
                SELECT pii_key_version
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", member.memberId())
                .query(Integer.class)
                .single();
        assertEquals(1, version);
    }
}
