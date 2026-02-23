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
import org.springframework.transaction.annotation.Transactional;

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
class MembershipPurchaseServiceIntegrationTest {

    @Autowired
    private MembershipPurchaseService purchaseService;

    @Autowired
    private MemberService memberService;

    @Autowired
    private ProductService productService;

    @Autowired
    private JdbcClient jdbcClient;

    @SpyBean
    private PaymentRepository paymentRepository;

    @AfterEach
    void tearDown() {
        reset(paymentRepository);
    }

    @Test
    @Transactional
    void purchaseCreatesMembershipAndPaymentAtomically() {
        Member member = createActiveMember();
        Product product = createDurationProduct();
        long membershipCountBefore = countRows("member_memberships");
        long paymentCountBefore = countRows("payments");

        MembershipPurchaseService.PurchaseResult result = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                LocalDate.of(2026, 3, 1),
                null,
                "CARD",
                "membership memo",
                "payment memo"
        ));

        assertNotNull(result.membership().membershipId());
        assertNotNull(result.payment().paymentId());
        assertEquals(result.membership().membershipId(), result.payment().membershipId());
        assertEquals("PURCHASE", result.payment().paymentType());
        assertEquals("COMPLETED", result.payment().paymentStatus());
        assertEquals("CARD", result.payment().paymentMethod());
        assertEquals(product.priceAmount(), result.payment().amount());
        assertEquals(membershipCountBefore + 1, countRows("member_memberships"));
        assertEquals(paymentCountBefore + 1, countRows("payments"));
    }

    @Test
    void paymentInsertFailureRollsBackMembershipInsert() {
        Member member = createActiveMember();
        Product product = createCountProduct();
        long membershipCountBefore = countRows("member_memberships");
        long paymentCountBefore = countRows("payments");

        doThrow(new org.springframework.dao.DataIntegrityViolationException("simulated payment failure"))
                .when(paymentRepository)
                .insert(any());

        assertThrows(ApiException.class, () -> purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                LocalDate.of(2026, 3, 2),
                new BigDecimal("50000"),
                "CASH",
                null,
                null
        )));

        assertEquals(membershipCountBefore, countRows("member_memberships"));
        assertEquals(paymentCountBefore, countRows("payments"));
    }

    private long countRows(String tableName) {
        return jdbcClient.sql("SELECT COUNT(*) FROM " + tableName)
                .query(Long.class)
                .single();
    }

    private Member createActiveMember() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberService.MemberCreateRequest(
                "P3구매테스트회원-" + suffix,
                "010-8" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
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
                "P3기간제-" + suffix,
                "MEMBERSHIP",
                "DURATION",
                new BigDecimal("99000"),
                30,
                null,
                true,
                30,
                1,
                false,
                "ACTIVE",
                null
        ));
    }

    private Product createCountProduct() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return productService.create(new ProductService.ProductCreateRequest(
                "P3횟수제-" + suffix,
                "PT",
                "COUNT",
                new BigDecimal("50000"),
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
}
