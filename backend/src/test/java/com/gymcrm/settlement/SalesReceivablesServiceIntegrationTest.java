package com.gymcrm.settlement;

import com.gymcrm.settlement.service.SalesReceivablesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class SalesReceivablesServiceIntegrationTest {

    @Autowired
    private SalesReceivablesService salesReceivablesService;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    @Transactional
    void receivablesQueryReturnsOutstandingBalancesAndReminderCandidates() {
        LocalDate baseDate = LocalDate.of(2099, 7, 15);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        long productId = insertProduct(suffix);
        long memberOne = insertMember("RECV-A-" + suffix);
        long memberTwo = insertMember("RECV-B-" + suffix);
        long memberPaid = insertMember("RECV-C-" + suffix);

        long membershipOne = insertMembership(memberOne, productId, "ACTIVE", new BigDecimal("550000"), baseDate.minusDays(5), baseDate.plusDays(20));
        long membershipTwo = insertMembership(memberTwo, productId, "HOLDING", new BigDecimal("550000"), baseDate.minusDays(1), baseDate.plusDays(20));
        long membershipPaid = insertMembership(memberPaid, productId, "ACTIVE", new BigDecimal("550000"), baseDate.minusDays(4), baseDate.plusDays(20));

        insertPayment(memberOne, membershipOne, new BigDecimal("500000"), baseDate.minusDays(5).atTime(10, 0).atOffset(ZoneOffset.UTC));
        insertPayment(memberTwo, membershipTwo, new BigDecimal("520000"), baseDate.minusDays(1).atTime(10, 0).atOffset(ZoneOffset.UTC));
        insertPayment(memberPaid, membershipPaid, new BigDecimal("550000"), baseDate.minusDays(4).atTime(10, 0).atOffset(ZoneOffset.UTC));

        SalesReceivablesService.ReceivablesResult result = salesReceivablesService.getReceivables(
                new SalesReceivablesService.ReceivablesQuery(baseDate, 10)
        );

        assertEquals(2L, result.receivableCount());
        assertEquals(1L, result.reminderEligibleCount());
        assertEquals(0, new BigDecimal("80000").compareTo(result.totalOutstandingAmount()));
        assertEquals(memberOne, result.rows().get(0).memberId());
        assertTrue(result.rows().get(0).reminderEligible());
    }

    private long insertMember(String memberName) {
        String phoneSuffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    1, :memberName, :phone, 'ACTIVE', CURRENT_DATE,
                    TRUE, FALSE, 0, 0
                )
                RETURNING member_id
                """)
                .param("memberName", memberName)
                .param("phone", "010-9" + phoneSuffix.substring(0, 3) + "-" + phoneSuffix.substring(3, 7))
                .query(Long.class)
                .single();
    }

    private long insertProduct(String suffix) {
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type,
                    price_amount, validity_days, total_count,
                    allow_hold, allow_transfer, product_status,
                    created_by, updated_by
                )
                VALUES (
                    1, :productName, 'PT', 'COUNT',
                    550000, NULL, 10,
                    FALSE, FALSE, 'ACTIVE',
                    0, 0
                )
                RETURNING product_id
                """)
                .param("productName", "RECV-PRODUCT-" + suffix)
                .query(Long.class)
                .single();
    }

    private long insertMembership(long memberId, long productId, String status, BigDecimal priceAmount, LocalDate purchasedAt, LocalDate endDate) {
        return jdbcClient.sql("""
                INSERT INTO member_memberships (
                    center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used,
                    created_by, updated_by
                )
                VALUES (
                    1, :memberId, :productId, :status,
                    'RECV-PRODUCT', 'PT', 'COUNT',
                    :priceAmount, :purchasedAt, :startDate, :endDate,
                    10, 10, 0,
                    0, 0,
                    0, 0
                )
                RETURNING membership_id
                """)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("status", status)
                .param("priceAmount", priceAmount)
                .param("purchasedAt", purchasedAt.atStartOfDay().atOffset(ZoneOffset.UTC))
                .param("startDate", purchasedAt)
                .param("endDate", endDate)
                .query(Long.class)
                .single();
    }

    private void insertPayment(long memberId, long membershipId, BigDecimal amount, OffsetDateTime paidAt) {
        jdbcClient.sql("""
                INSERT INTO payments (
                    center_id, member_id, membership_id, payment_type, payment_status, payment_method,
                    amount, paid_at, created_by, updated_by
                )
                VALUES (
                    1, :memberId, :membershipId, 'PURCHASE', 'COMPLETED', 'TRANSFER',
                    :amount, :paidAt, 0, 0
                )
                """)
                .param("memberId", memberId)
                .param("membershipId", membershipId)
                .param("amount", amount)
                .param("paidAt", paidAt)
                .update();
    }
}
