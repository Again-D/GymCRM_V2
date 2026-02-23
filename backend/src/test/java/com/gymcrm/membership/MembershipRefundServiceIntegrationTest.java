package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.member.Member;
import com.gymcrm.member.MemberService;
import com.gymcrm.product.Product;
import com.gymcrm.product.ProductService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class MembershipRefundServiceIntegrationTest {

    @Autowired
    private MembershipPurchaseService purchaseService;

    @Autowired
    private MembershipRefundService refundService;

    @Autowired
    private MembershipHoldService holdService;

    @Autowired
    private MemberMembershipRepository memberMembershipRepository;

    @Autowired
    private MemberService memberService;

    @Autowired
    private ProductService productService;

    @Autowired
    private JdbcClient jdbcClient;

    @SpyBean
    private MembershipRefundRepository membershipRefundRepository;

    @AfterEach
    void tearDown() {
        reset(membershipRefundRepository);
    }

    @Test
    void previewAndConfirmRefundAmountsMatchAndCreateRecords() {
        Member member = createActiveMember();
        Product product = createDurationProduct();
        MembershipPurchaseService.PurchaseResult purchase = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                LocalDate.of(2026, 2, 1),
                new BigDecimal("100000"),
                "CARD",
                null,
                null
        ));

        long refundPaymentCountBefore = countRowsByType("payments", "REFUND");
        long refundCountBefore = countRows("membership_refunds");

        MembershipRefundService.RefundCalculation preview = refundService.preview(
                new MembershipRefundService.RefundPreviewRequest(purchase.membership().membershipId(), LocalDate.of(2026, 2, 10))
        );

        MembershipRefundService.RefundResult result = refundService.refund(new MembershipRefundService.RefundRequest(
                purchase.membership().membershipId(),
                LocalDate.of(2026, 2, 10),
                "CARD",
                "단순 환불 테스트",
                "refund memo",
                "refund payment memo"
        ));

        assertEquals(preview.originalAmount(), result.calculation().originalAmount());
        assertEquals(preview.usedAmount(), result.calculation().usedAmount());
        assertEquals(preview.penaltyAmount(), result.calculation().penaltyAmount());
        assertEquals(preview.refundAmount(), result.calculation().refundAmount());

        assertEquals("REFUNDED", result.membership().membershipStatus());
        assertEquals("REFUND", result.refundPayment().paymentType());
        assertEquals("COMPLETED", result.refundPayment().paymentStatus());
        assertEquals(preview.refundAmount(), result.refundPayment().amount());
        assertNotNull(result.refund().membershipRefundId());
        assertEquals(result.refundPayment().paymentId(), result.refund().refundPaymentId());
        assertEquals(refundPaymentCountBefore + 1, countRowsByType("payments", "REFUND"));
        assertEquals(refundCountBefore + 1, countRows("membership_refunds"));
    }

    @Test
    void duplicateRefundRequestIsBlocked() {
        Member member = createActiveMember();
        Product product = createDurationProduct();
        MembershipPurchaseService.PurchaseResult purchase = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                LocalDate.of(2026, 2, 1),
                new BigDecimal("100000"),
                "CASH",
                null,
                null
        ));

        refundService.refund(new MembershipRefundService.RefundRequest(
                purchase.membership().membershipId(),
                LocalDate.of(2026, 2, 10),
                "CASH",
                null,
                null,
                null
        ));

        assertThrows(ApiException.class, () -> refundService.refund(new MembershipRefundService.RefundRequest(
                purchase.membership().membershipId(),
                LocalDate.of(2026, 2, 10),
                "CASH",
                null,
                null,
                null
        )));
    }

    @Test
    void refundHistoryInsertFailureRollsBackRefundPaymentAndStatusChange() {
        Member member = createActiveMember();
        Product product = createDurationProduct();
        MembershipPurchaseService.PurchaseResult purchase = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                LocalDate.of(2026, 2, 1),
                new BigDecimal("100000"),
                "CASH",
                null,
                null
        ));

        long refundPaymentCountBefore = countRowsByType("payments", "REFUND");
        long refundRowsBefore = countRows("membership_refunds");

        doThrow(new org.springframework.dao.DataIntegrityViolationException("simulated refund history failure"))
                .when(membershipRefundRepository)
                .insert(any());

        assertThrows(ApiException.class, () -> refundService.refund(new MembershipRefundService.RefundRequest(
                purchase.membership().membershipId(),
                LocalDate.of(2026, 2, 10),
                "CASH",
                null,
                null,
                null
        )));

        MemberMembership membership = memberMembershipRepository.findById(purchase.membership().membershipId()).orElseThrow();
        assertEquals("ACTIVE", membership.membershipStatus());
        assertEquals(refundPaymentCountBefore, countRowsByType("payments", "REFUND"));
        assertEquals(refundRowsBefore, countRows("membership_refunds"));
    }

    @Test
    void refundIsBlockedWhileMembershipIsHolding() {
        Member member = createActiveMember();
        Product product = createDurationProduct();
        MembershipPurchaseService.PurchaseResult purchase = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                LocalDate.of(2026, 2, 1),
                new BigDecimal("100000"),
                "CASH",
                null,
                null
        ));

        holdService.hold(new MembershipHoldService.HoldRequest(
                purchase.membership().membershipId(),
                LocalDate.of(2026, 2, 5),
                LocalDate.of(2026, 2, 6),
                "테스트 홀딩",
                null
        ));

        long refundRowsBefore = countRows("membership_refunds");

        ApiException exception = assertThrows(ApiException.class, () -> refundService.refund(new MembershipRefundService.RefundRequest(
                purchase.membership().membershipId(),
                LocalDate.of(2026, 2, 6),
                "CASH",
                null,
                null,
                null
        )));

        assertEquals("홀딩/종료/환불 상태 회원권은 환불할 수 없습니다. 홀딩 상태는 먼저 해제 후 환불해주세요.", exception.getMessage());
        assertEquals(refundRowsBefore, countRows("membership_refunds"));

        MemberMembership membership = memberMembershipRepository.findById(purchase.membership().membershipId()).orElseThrow();
        assertEquals("HOLDING", membership.membershipStatus());
    }

    private long countRows(String tableName) {
        return jdbcClient.sql("SELECT COUNT(*) FROM " + tableName)
                .query(Long.class)
                .single();
    }

    private long countRowsByType(String tableName, String paymentType) {
        return jdbcClient.sql("SELECT COUNT(*) FROM " + tableName + " WHERE payment_type = :paymentType")
                .param("paymentType", paymentType)
                .query(Long.class)
                .single();
    }

    private Member createActiveMember() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberService.MemberCreateRequest(
                "P3환불테스트회원-" + suffix,
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

    private Product createDurationProduct() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return productService.create(new ProductService.ProductCreateRequest(
                "P3환불기간제-" + suffix,
                "MEMBERSHIP",
                "DURATION",
                new BigDecimal("100000"),
                30,
                null,
                true,
                30,
                2,
                false,
                "ACTIVE",
                null
        ));
    }
}
