package com.gymcrm.member;

import com.gymcrm.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.mode=jwt"
})
@ActiveProfiles("dev")
@Transactional
class MemberSummaryQueryPerformanceIntegrationTest {
    private static final long CENTER_ID = 1L;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MemberRepository memberRepository;

    @Test
    void memberSummaryQueryHandlesHundredMembersAndFiveThousandMemberships() {
        LocalDate today = LocalDate.now();
        long durationProductId = insertProductFixture("PERF-DURATION-" + shortId(), "MEMBERSHIP", "DURATION");

        for (int memberIndex = 0; memberIndex < 100; memberIndex++) {
            long memberId = insertMemberFixture("성능회원-" + memberIndex + "-" + shortId());
            for (int membershipIndex = 0; membershipIndex < 50; membershipIndex++) {
                LocalDate endDate = today.plusDays((membershipIndex % 40) - 10L);
                insertMembershipFixture(
                        memberId,
                        durationProductId,
                        "ACTIVE",
                        "MEMBERSHIP",
                        "DURATION",
                        endDate
                );
            }
        }

        long startedAt = System.nanoTime();
        var rows = memberRepository.findAllSummaries(CENTER_ID, null, null, null, null, null, null, null, null, null, null, today);
        long elapsedMillis = (System.nanoTime() - startedAt) / 1_000_000L;

        assertEquals(100, rows.size());
        assertTrue(elapsedMillis < 4_000, "Expected member summary query under 4000ms, but was " + elapsedMillis + "ms");
    }

    private long insertMemberFixture(String memberName) {
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, 'ACTIVE', CURRENT_DATE,
                    FALSE, FALSE, 0, 0
                )
                RETURNING member_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberName", memberName)
                .param("phone", "010" + randomDigits(8))
                .query(Long.class)
                .single();
    }

    private long insertProductFixture(String productName, String category, String type) {
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, allow_transfer, product_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, :category, :type, :priceAmount,
                    30, NULL, FALSE, FALSE, 'ACTIVE',
                    0, 0
                )
                RETURNING product_id
                """)
                .param("centerId", CENTER_ID)
                .param("productName", productName)
                .param("category", category)
                .param("type", type)
                .param("priceAmount", BigDecimal.valueOf(100000))
                .query(Long.class)
                .single();
    }

    private long insertMembershipFixture(
            long memberId,
            long productId,
            String membershipStatus,
            String category,
            String type,
            LocalDate endDate
    ) {
        return jdbcClient.sql("""
                INSERT INTO member_memberships (
                    center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :productId, :membershipStatus,
                    :productNameSnapshot, :category, :type,
                    :priceAmountSnapshot, CURRENT_TIMESTAMP, CURRENT_DATE, :endDate,
                    NULL, NULL, 0,
                    0, 0, :memo,
                    0, 0
                )
                RETURNING membership_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("membershipStatus", membershipStatus)
                .param("productNameSnapshot", "PERF-SNAP-" + shortId())
                .param("category", category)
                .param("type", type)
                .param("priceAmountSnapshot", BigDecimal.valueOf(100000))
                .param("endDate", endDate)
                .param("memo", "perf-fixture")
                .query(Long.class)
                .single();
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private String randomDigits(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append((int) (Math.random() * 10));
        }
        return builder.toString();
    }
}
