package com.gymcrm.member;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.dto.request.MemberUpdateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.UUID;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.pii.rotation-enabled=true",
        "app.security.pii.key-version=2",
        "app.security.pii.keys[1]=dev-only-pii-key-v1",
        "app.security.pii.keys[2]=dev-only-pii-key-v2"
})
@ActiveProfiles("dev")
class MemberPiiEncryptionIntegrationTest {

    @Autowired
    private MemberService memberService;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    @Transactional
    void createWritesEncryptedPiiColumns() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Member created = memberService.create(new MemberCreateRequest(
                "PII회원-" + suffix,
                "010-2" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
                null,
                null,
                LocalDate.of(1992, 3, 14),
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));

        String encryptedPhone = jdbcClient.sql("""
                SELECT phone_encrypted
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .query(String.class)
                .single();
        String encryptedBirthDate = jdbcClient.sql("""
                SELECT birth_date_encrypted
                     , pii_key_version
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .query((rs, rowNum) -> rs.getString("birth_date_encrypted") + "|" + rs.getInt("pii_key_version"))
                .single();

        assertNotNull(encryptedPhone);
        assertNotNull(encryptedBirthDate);
        assertTrue(encryptedBirthDate.endsWith("|2"));
    }

    @Test
    @Transactional
    void updateWritesActiveVersionAndPreservesPlaintextSearchField() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Member created = memberService.create(new MemberCreateRequest(
                "PII업데이트-" + suffix,
                "010-3" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
                null,
                null,
                LocalDate.of(1994, 9, 11),
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));

        String updatedPhone = "010-1" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7);
        Member updated = memberService.update(created.memberId(), new MemberUpdateRequest(
                null,
                updatedPhone,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        ));

        assertEquals(updatedPhone, updated.phone());
        assertEquals(2, updated.piiKeyVersion());

        String persistedPhone = jdbcClient.sql("""
                SELECT phone
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .query(String.class)
                .single();
        Integer persistedVersion = jdbcClient.sql("""
                SELECT pii_key_version
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .query(Integer.class)
                .single();
        assertEquals(updatedPhone, persistedPhone);
        assertEquals(2, persistedVersion);
    }

    @Test
    @Transactional
    void getUsesEncryptedFallbackWhenPlaintextColumnsAreNull() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String phone = "010-6" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7);
        LocalDate birthDate = LocalDate.of(1995, 8, 20);
        Member created = memberService.create(new MemberCreateRequest(
                "PII복호회원-" + suffix,
                phone,
                null,
                null,
                birthDate,
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));

        jdbcClient.sql("""
                UPDATE members
                SET phone = '',
                    birth_date = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .update();

        Member loaded = memberService.get(created.memberId());
        assertEquals(phone, loaded.phone());
        assertEquals(birthDate, loaded.birthDate());
    }

    @Test
    @Transactional
    void staleVersionWithPlaintextPresentIsLazilyUpgraded() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String phone = "010-8" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7);
        Member created = memberService.create(new MemberCreateRequest(
                "PII지연업그레이드-" + suffix,
                phone,
                null,
                null,
                LocalDate.of(1991, 4, 2),
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));

        jdbcClient.sql("""
                UPDATE members
                SET pii_key_version = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .update();

        Member loaded = memberService.get(created.memberId());
        assertEquals(phone, loaded.phone());
        assertEquals(2, loaded.piiKeyVersion());

        Integer upgradedVersion = jdbcClient.sql("""
                SELECT pii_key_version
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .query(Integer.class)
                .single();
        assertEquals(2, upgradedVersion);
    }

    @Test
    @Transactional
    void staleVersionWithoutPlaintextDecryptsWithStoredVersionThenUpgrades() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String phone = "010-7" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7);
        LocalDate birthDate = LocalDate.of(1990, 11, 5);
        Member created = memberService.create(new MemberCreateRequest(
                "PII버전복구-" + suffix,
                phone,
                null,
                null,
                birthDate,
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));

        jdbcClient.sql("""
                UPDATE members
                SET phone = '',
                    birth_date = NULL,
                    phone_encrypted = :phoneEncryptedV1,
                    birth_date_encrypted = :birthDateEncryptedV1,
                    pii_key_version = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE member_id = :memberId
                """)
                .param("phoneEncryptedV1", encryptWithRawKey(phone, "dev-only-pii-key-v1"))
                .param("birthDateEncryptedV1", encryptWithRawKey(birthDate.toString(), "dev-only-pii-key-v1"))
                .param("memberId", created.memberId())
                .update();

        Member loaded = memberService.get(created.memberId());
        assertEquals(phone, loaded.phone());
        assertEquals(birthDate, loaded.birthDate());
        assertEquals(2, loaded.piiKeyVersion());

        String storedPhone = jdbcClient.sql("""
                SELECT phone
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .query(String.class)
                .single();
        assertEquals(phone, storedPhone);
    }

    @Test
    @Transactional
    void unknownVersionFailsWithControlledError() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String phone = "010-5" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7);
        Member created = memberService.create(new MemberCreateRequest(
                "PII키누락-" + suffix,
                phone,
                null,
                null,
                LocalDate.of(1999, 1, 15),
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));

        jdbcClient.sql("""
                UPDATE members
                SET phone = '',
                    birth_date = NULL,
                    pii_key_version = 999,
                    updated_at = CURRENT_TIMESTAMP
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .update();

        ApiException exception = assertThrows(ApiException.class, () -> memberService.get(created.memberId()));
        assertEquals(ErrorCode.INTERNAL_ERROR, exception.getErrorCode());
        assertEquals("회원 PII 복호화에 실패했습니다.", exception.getMessage());
    }

    @Test
    @Transactional
    void searchResultStaysStableAfterLazyUpgrade() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String phone = "010-4" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7);
        Member created = memberService.create(new MemberCreateRequest(
                "PII검색안정성-" + suffix,
                phone,
                null,
                null,
                LocalDate.of(1993, 6, 25),
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));

        jdbcClient.sql("""
                UPDATE members
                SET pii_key_version = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .update();

        boolean foundBefore = memberService.list(
                        null,
                        null,
                        null,
                        suffix.substring(0, 4),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                ).stream()
                .anyMatch(summary -> summary.memberId().equals(created.memberId()));
        assertTrue(foundBefore);

        memberService.get(created.memberId());

        boolean foundAfter = memberService.list(
                        null,
                        null,
                        null,
                        suffix.substring(0, 4),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                ).stream()
                .anyMatch(summary -> summary.memberId().equals(created.memberId()));
        assertTrue(foundAfter);
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
