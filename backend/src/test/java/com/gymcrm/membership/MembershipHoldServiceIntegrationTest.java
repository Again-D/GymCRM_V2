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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class MembershipHoldServiceIntegrationTest {

    @Autowired
    private MembershipPurchaseService purchaseService;

    @Autowired
    private MembershipHoldService holdService;

    @Autowired
    private MemberMembershipRepository memberMembershipRepository;

    @Autowired
    private MembershipHoldRepository membershipHoldRepository;

    @Autowired
    private MemberService memberService;

    @Autowired
    private ProductService productService;

    @Autowired
    private JdbcClient jdbcClient;

    @SpyBean
    private MembershipHoldRepository membershipHoldRepositorySpy;

    @AfterEach
    void tearDown() {
        reset(membershipHoldRepositorySpy);
    }

    @Test
    @Transactional
    void holdThenResumeChangesStatusAndExtendsEndDate() {
        Member member = createActiveMember();
        Product product = createHoldableDurationProduct();
        MembershipPurchaseService.PurchaseResult purchase = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                LocalDate.of(2026, 3, 1),
                null,
                "CASH",
                null,
                null
        ));

        LocalDate originalEndDate = purchase.membership().endDate();
        MembershipHoldService.HoldResult holdResult = holdService.hold(new MembershipHoldService.HoldRequest(
                purchase.membership().membershipId(),
                LocalDate.of(2026, 3, 5),
                LocalDate.of(2026, 3, 7),
                "출장",
                "테스트 홀딩"
        ));

        assertEquals("HOLDING", holdResult.membership().membershipStatus());
        assertEquals("ACTIVE", holdResult.hold().holdStatus());
        assertEquals(LocalDate.of(2026, 3, 5), holdResult.hold().holdStartDate());
        assertEquals(LocalDate.of(2026, 3, 7), holdResult.hold().holdEndDate());

        MembershipHoldService.ResumeResult resumeResult = holdService.resume(new MembershipHoldService.ResumeRequest(
                purchase.membership().membershipId(),
                LocalDate.of(2026, 3, 7)
        ));

        assertEquals("ACTIVE", resumeResult.membership().membershipStatus());
        assertEquals("RESUMED", resumeResult.hold().holdStatus());
        assertEquals(3, resumeResult.actualHoldDays());
        assertEquals(originalEndDate.plusDays(3), resumeResult.membership().endDate());
        assertEquals(originalEndDate.plusDays(3), resumeResult.recalculatedEndDate());
        assertEquals(3, resumeResult.membership().holdDaysUsed());
        assertEquals(1, resumeResult.membership().holdCountUsed());
        assertNotNull(resumeResult.hold().resumedAt());
        assertEquals(3, resumeResult.hold().actualHoldDays());
    }

    @Test
    void holdInsertFailureRollsBackMembershipStatusUpdate() {
        Member member = createActiveMember();
        Product product = createHoldableDurationProduct();
        MembershipPurchaseService.PurchaseResult purchase = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                LocalDate.of(2026, 3, 1),
                null,
                "CASH",
                null,
                null
        ));

        long holdCountBefore = countRows("membership_holds");

        doThrow(new org.springframework.dao.DataIntegrityViolationException("simulated hold insert failure"))
                .when(membershipHoldRepositorySpy)
                .insert(any());

        assertThrows(ApiException.class, () -> holdService.hold(new MembershipHoldService.HoldRequest(
                purchase.membership().membershipId(),
                LocalDate.of(2026, 3, 5),
                LocalDate.of(2026, 3, 6),
                null,
                null
        )));

        MemberMembership reloadedMembership = memberMembershipRepository.findById(purchase.membership().membershipId()).orElseThrow();
        assertEquals("ACTIVE", reloadedMembership.membershipStatus());
        assertEquals(holdCountBefore, countRows("membership_holds"));
    }

    @Test
    void activeHoldUniqueIndexBlocksDuplicateActiveRowsForSameMembership() {
        Member member = createActiveMember();
        Product product = createHoldableDurationProduct();
        MembershipPurchaseService.PurchaseResult purchase = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                LocalDate.of(2026, 3, 1),
                null,
                "CASH",
                null,
                null
        ));

        membershipHoldRepository.insert(new MembershipHoldRepository.MembershipHoldCreateCommand(
                purchase.membership().centerId(),
                purchase.membership().membershipId(),
                "ACTIVE",
                LocalDate.of(2026, 3, 5),
                LocalDate.of(2026, 3, 6),
                null,
                null,
                1L
        ));

        org.springframework.dao.DataAccessException exception = assertThrows(
                org.springframework.dao.DataAccessException.class,
                () -> membershipHoldRepository.insert(new MembershipHoldRepository.MembershipHoldCreateCommand(
                        purchase.membership().centerId(),
                        purchase.membership().membershipId(),
                        "ACTIVE",
                        LocalDate.of(2026, 3, 7),
                        LocalDate.of(2026, 3, 8),
                        null,
                        null,
                        1L
                ))
        );

        String message = exception.getMostSpecificCause() != null
                ? exception.getMostSpecificCause().getMessage()
                : exception.getMessage();
        assertTrue(message != null && message.contains("uk_membership_holds_membership_active"));
    }

    private long countRows(String tableName) {
        return jdbcClient.sql("SELECT COUNT(*) FROM " + tableName)
                .query(Long.class)
                .single();
    }

    private Member createActiveMember() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberService.MemberCreateRequest(
                "P3홀딩테스트회원-" + suffix,
                "010-7" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
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

    private Product createHoldableDurationProduct() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return productService.create(new ProductService.ProductCreateRequest(
                "P3홀딩기간제-" + suffix,
                "MEMBERSHIP",
                "DURATION",
                new BigDecimal("120000"),
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
