package com.gymcrm.settlement;

import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.service.MembershipPurchaseService;
import com.gymcrm.membership.service.MembershipRefundService;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.settlement.service.SalesSettlementReportService;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class SalesSettlementReportServiceIntegrationTest {

    @Autowired
    private SalesSettlementReportService reportService;

    @Autowired
    private MemberService memberService;

    @Autowired
    private ProductService productService;

    @Autowired
    private MembershipPurchaseService purchaseService;

    @Autowired
    private MembershipRefundService refundService;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    @Transactional
    void reportAggregatesGrossRefundAndNetSalesByProductAndPaymentMethod() {
        LocalDate reportDate = OffsetDateTime.now(ZoneOffset.UTC).toLocalDate();
        String keyword = "SAL-" + UUID.randomUUID().toString().substring(0, 6);
        Member member1 = createActiveMember();
        Product productCard = createCountProduct(keyword + "-CARD", new BigDecimal("100000"));

        MembershipPurchaseService.PurchaseResult purchase1 = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member1.memberId(),
                productCard.productId(),
                null,
                LocalDate.now(),
                null,
                "CARD",
                null,
                null
        ));

        refundService.refund(new MembershipRefundService.RefundRequest(
                purchase1.membership().membershipId(),
                LocalDate.now(),
                "CARD",
                "테스트 환불",
                null,
                null
        ));

        Member member2 = createActiveMember();
        Product productCash = createCountProduct(keyword + "-CASH", new BigDecimal("50000"));
        purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member2.memberId(),
                productCash.productId(),
                null,
                LocalDate.now(),
                null,
                "CASH",
                null,
                null
        ));

        SalesSettlementReportService.SalesReportResult report = reportService.getReport(
                new SalesSettlementReportService.ReportQuery(reportDate, reportDate, null, keyword)
        );

        assertNotNull(report.totalGrossSales());
        assertNotNull(report.totalRefundAmount());
        assertNotNull(report.totalNetSales());
        assertTrue(report.totalGrossSales().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(report.totalRefundAmount().compareTo(BigDecimal.ZERO) > 0);
        assertEquals(0, report.totalGrossSales().subtract(report.totalRefundAmount()).compareTo(report.totalNetSales()));
        assertEquals(2, report.rows().size());

        SalesSettlementReportService.SalesReportRow cardRow = report.rows().stream()
                .filter(row -> row.paymentMethod().equals("CARD"))
                .findFirst()
                .orElseThrow();
        assertNotNull(cardRow.grossSales());
        assertNotNull(cardRow.refundAmount());
        assertNotNull(cardRow.netSales());
        assertTrue(cardRow.grossSales().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(cardRow.refundAmount().compareTo(BigDecimal.ZERO) > 0);
        assertEquals(0, cardRow.grossSales().subtract(cardRow.refundAmount()).compareTo(cardRow.netSales()));

        SalesSettlementReportService.SalesReportResult cardOnlyReport = reportService.getReport(
                new SalesSettlementReportService.ReportQuery(reportDate, reportDate, "CARD", keyword + "-CARD")
        );
        assertEquals(1, cardOnlyReport.rows().size());
        assertEquals("CARD", cardOnlyReport.rows().get(0).paymentMethod());
        assertTrue(cardOnlyReport.rows().get(0).productName().contains(keyword + "-CARD"));
    }

    @Test
    @Transactional
    void reportUsesBusinessTimezoneForDailyBoundaries() {
        LocalDate reportDate = LocalDate.of(2026, 3, 1);
        String keyword = "TZ-SAL-" + UUID.randomUUID().toString().substring(0, 6);
        Member member = createActiveMember();
        Product product = createCountProduct(keyword, new BigDecimal("100000"));
        long membershipId = insertMembership(member.memberId(), product.productId(), keyword, reportDate);

        insertPayment(member.memberId(), membershipId, "PURCHASE", "CARD", new BigDecimal("100000"),
                OffsetDateTime.parse("2026-02-28T15:30:00Z"));
        insertPayment(member.memberId(), membershipId, "PURCHASE", "CARD", new BigDecimal("50000"),
                OffsetDateTime.parse("2026-03-01T15:30:00Z"));

        SalesSettlementReportService.SalesReportResult report = reportService.getReport(
                new SalesSettlementReportService.ReportQuery(reportDate, reportDate, "CARD", keyword)
        );

        assertEquals(1, report.rows().size());
        assertEquals(0, new BigDecimal("100000").compareTo(report.totalGrossSales()));
        assertEquals(0, BigDecimal.ZERO.compareTo(report.totalRefundAmount()));
        assertEquals(0, new BigDecimal("100000").compareTo(report.totalNetSales()));
    }

    private Member createActiveMember() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberCreateRequest(
                "SAL회원-" + suffix,
                "010-6" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
                null,
                null,
                null,
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));
    }

    private Product createCountProduct(String prefix, BigDecimal price) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return productService.create(new ProductService.ProductCreateRequest(
                prefix + "-" + suffix,
                "PT",
                "COUNT",
                price,
                null,
                10,
                true,
                30,
                1,
                false,
                "ACTIVE",
                null
        ));
    }

    private long insertMembership(long memberId, long productId, String productNameSnapshot, LocalDate startDate) {
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
                    1, :memberId, :productId, 'ACTIVE',
                    :productNameSnapshot, 'PT', 'COUNT',
                    100000, CURRENT_TIMESTAMP, :startDate, :endDate,
                    10, 10, 0,
                    0, 0,
                    0, 0
                )
                RETURNING membership_id
                """)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("productNameSnapshot", productNameSnapshot)
                .param("startDate", startDate)
                .param("endDate", startDate.plusDays(30))
                .query(Long.class)
                .single();
    }

    private void insertPayment(
            long memberId,
            long membershipId,
            String paymentType,
            String paymentMethod,
            BigDecimal amount,
            OffsetDateTime paidAt
    ) {
        jdbcClient.sql("""
                INSERT INTO payments (
                    center_id, member_id, membership_id, payment_type, payment_status, payment_method,
                    amount, paid_at, created_by, updated_by
                )
                VALUES (
                    1, :memberId, :membershipId, :paymentType, 'COMPLETED', :paymentMethod,
                    :amount, :paidAt, 0, 0
                )
                """)
                .param("memberId", memberId)
                .param("membershipId", membershipId)
                .param("paymentType", paymentType)
                .param("paymentMethod", paymentMethod)
                .param("amount", amount)
                .param("paidAt", paidAt)
                .update();
    }
}
