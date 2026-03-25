package com.gymcrm.settlement;

import com.gymcrm.settlement.service.SalesDashboardService;
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

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class SalesDashboardServiceIntegrationTest {

    @Autowired
    private SalesDashboardService salesDashboardService;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    @Transactional
    void dashboardAggregatesTodayMonthNewMembersAndExpiringMembers() {
        LocalDate baseDate = LocalDate.of(2099, 7, 15);
        long productId = insertProduct();
        long memberToday = insertMember(baseDate);
        long memberPast = insertMember(baseDate.minusDays(1));

        long membershipToday = insertMembership(memberToday, productId, "ACTIVE", baseDate.plusDays(3));
        long membershipLater = insertMembership(memberPast, productId, "ACTIVE", baseDate.plusDays(20));
        insertMembership(memberPast, productId, "HOLDING", baseDate.plusDays(2));

        insertPayment(memberToday, membershipToday, "PURCHASE", new BigDecimal("100000"), baseDate.atTime(10, 0).atOffset(ZoneOffset.UTC));
        insertPayment(memberToday, membershipToday, "REFUND", new BigDecimal("20000"), baseDate.atTime(12, 0).atOffset(ZoneOffset.UTC));
        insertPayment(memberPast, membershipLater, "PURCHASE", new BigDecimal("50000"), baseDate.withDayOfMonth(1).atTime(9, 0).atOffset(ZoneOffset.UTC));
        insertPayment(memberPast, membershipLater, "PURCHASE", new BigDecimal("99999"), baseDate.minusMonths(1).withDayOfMonth(15).atTime(9, 0).atOffset(ZoneOffset.UTC));

        SalesDashboardService.SalesDashboardResult result = salesDashboardService.getDashboard(
                new SalesDashboardService.DashboardQuery(baseDate, 7)
        );

        assertEquals(0, new BigDecimal("80000").compareTo(result.todayNetSales()));
        assertEquals(0, new BigDecimal("130000").compareTo(result.monthNetSales()));
        assertEquals(1L, result.newMemberCount());
        assertEquals(1L, result.expiringMemberCount());
    }

    private long insertMember(LocalDate joinDate) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    1, :memberName, :phone, 'ACTIVE', :joinDate,
                    TRUE, FALSE, 0, 0
                )
                RETURNING member_id
                """)
                .param("memberName", "SAL-DASH-" + suffix)
                .param("phone", "010-4" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7))
                .param("joinDate", joinDate)
                .query(Long.class)
                .single();
    }

    private long insertProduct() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type,
                    price_amount, validity_days, total_count,
                    allow_hold, allow_transfer, product_status,
                    created_by, updated_by
                )
                VALUES (
                    1, :productName, 'PT', 'COUNT',
                    100000, NULL, 10,
                    TRUE, FALSE, 'ACTIVE',
                    0, 0
                )
                RETURNING product_id
                """)
                .param("productName", "SAL-DASH-PRODUCT-" + suffix)
                .query(Long.class)
                .single();
    }

    private long insertMembership(long memberId, long productId, String status, LocalDate endDate) {
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
                    'SAL-DASH-PRODUCT', 'PT', 'COUNT',
                    100000, CURRENT_TIMESTAMP, :startDate, :endDate,
                    10, 10, 0,
                    0, 0,
                    0, 0
                )
                RETURNING membership_id
                """)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("status", status)
                .param("startDate", LocalDate.now(ZoneOffset.UTC))
                .param("endDate", endDate)
                .query(Long.class)
                .single();
    }

    private void insertPayment(
            long memberId,
            long membershipId,
            String paymentType,
            BigDecimal amount,
            OffsetDateTime paidAt
    ) {
        jdbcClient.sql("""
                INSERT INTO payments (
                    center_id, member_id, membership_id, payment_type, payment_status, payment_method,
                    amount, paid_at, created_by, updated_by
                )
                VALUES (
                    1, :memberId, :membershipId, :paymentType, 'COMPLETED', 'CARD',
                    :amount, :paidAt, 0, 0
                )
                """)
                .param("memberId", memberId)
                .param("membershipId", membershipId)
                .param("paymentType", paymentType)
                .param("amount", amount)
                .param("paidAt", paidAt)
                .update();
    }
}
