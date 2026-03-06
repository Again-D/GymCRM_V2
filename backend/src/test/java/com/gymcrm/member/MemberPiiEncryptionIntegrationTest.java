package com.gymcrm.member;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
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
        Member created = memberService.create(new MemberService.MemberCreateRequest(
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
                FROM members
                WHERE member_id = :memberId
                """)
                .param("memberId", created.memberId())
                .query(String.class)
                .single();

        assertNotNull(encryptedPhone);
        assertNotNull(encryptedBirthDate);
    }

    @Test
    @Transactional
    void getUsesEncryptedFallbackWhenPlaintextColumnsAreNull() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String phone = "010-6" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7);
        LocalDate birthDate = LocalDate.of(1995, 8, 20);
        Member created = memberService.create(new MemberService.MemberCreateRequest(
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
}
