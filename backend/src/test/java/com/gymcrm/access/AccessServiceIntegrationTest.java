package com.gymcrm.access;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.member.Member;
import com.gymcrm.member.MemberService;
import com.gymcrm.membership.MemberMembership;
import com.gymcrm.membership.MembershipPurchaseService;
import com.gymcrm.product.Product;
import com.gymcrm.product.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.mode=prototype"
})
@ActiveProfiles("dev")
class AccessServiceIntegrationTest {

    private static final long CENTER_ID = 1L;

    @Autowired
    private AccessService accessService;

    @Autowired
    private MemberService memberService;

    @Autowired
    private MembershipPurchaseService membershipPurchaseService;

    @Autowired
    private ProductService productService;

    @Autowired
    private JdbcClient jdbcClient;

    @BeforeEach
    void resetCenterData() {
        cleanupCenterData();
    }

    @AfterEach
    void cleanupAfterTest() {
        cleanupCenterData();
    }

    @Test
    void activeMemberWithEligibleMembershipCanEnterAndExit() {
        Member member = createMember("ACTIVE");
        MemberMembership membership = purchaseCountMembership(member, 5);

        AccessEvent entry = accessService.enter(new AccessService.EnterRequest(member.memberId(), membership.membershipId(), null));
        assertEquals("ENTRY_GRANTED", entry.eventType());

        AccessService.PresenceSummary afterEntry = accessService.getPresence();
        assertEquals(1, afterEntry.openSessionCount());

        AccessEvent exit = accessService.exit(new AccessService.ExitRequest(member.memberId()));
        assertEquals("EXIT", exit.eventType());

        AccessService.PresenceSummary afterExit = accessService.getPresence();
        assertEquals(0, afterExit.openSessionCount());
    }

    @Test
    void inactiveMemberEntryIsDeniedAndDeniedEventRecorded() {
        Member inactive = createMember("INACTIVE");

        ApiException ex = assertThrows(ApiException.class,
                () -> accessService.enter(new AccessService.EnterRequest(inactive.memberId(), null, null)));
        assertEquals(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, ex.getErrorCode());

        AccessEvent denied = accessService.listEvents(inactive.memberId(), "ENTRY_DENIED", 10).getFirst();
        assertEquals("ENTRY_DENIED", denied.eventType());
        assertEquals("MEMBER_INACTIVE", denied.denyReason());
    }

    @Test
    void exhaustedCountMembershipEntryIsDenied() {
        Member member = createMember("ACTIVE");
        MemberMembership membership = purchaseCountMembership(member, 1);
        jdbcClient.sql("""
                UPDATE member_memberships
                SET remaining_count = 0,
                    used_count = 1,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 1
                WHERE membership_id = :membershipId
                """)
                .param("membershipId", membership.membershipId())
                .update();

        ApiException ex = assertThrows(ApiException.class,
                () -> accessService.enter(new AccessService.EnterRequest(member.memberId(), membership.membershipId(), null)));
        assertEquals(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, ex.getErrorCode());

        AccessEvent denied = accessService.listEvents(member.memberId(), "ENTRY_DENIED", 10).getFirst();
        assertEquals("MEMBERSHIP_INELIGIBLE", denied.denyReason());
    }

    @Test
    void duplicateOpenSessionEntryIsDenied() {
        Member member = createMember("ACTIVE");
        MemberMembership membership = purchaseCountMembership(member, 5);

        accessService.enter(new AccessService.EnterRequest(member.memberId(), membership.membershipId(), null));
        ApiException ex = assertThrows(ApiException.class,
                () -> accessService.enter(new AccessService.EnterRequest(member.memberId(), membership.membershipId(), null)));
        assertEquals(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, ex.getErrorCode());

        AccessEvent denied = accessService.listEvents(member.memberId(), "ENTRY_DENIED", 10).getFirst();
        assertEquals("ALREADY_ENTERED", denied.denyReason());
    }

    @Test
    void exitWithoutOpenSessionIsBlocked() {
        Member member = createMember("ACTIVE");
        purchaseCountMembership(member, 5);

        ApiException ex = assertThrows(ApiException.class,
                () -> accessService.exit(new AccessService.ExitRequest(member.memberId())));
        assertEquals(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, ex.getErrorCode());
    }

    private Member createMember(String status) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberService.MemberCreateRequest(
                "P9출입회원-" + suffix,
                "010-8" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
                null,
                null,
                null,
                status,
                LocalDate.now(),
                true,
                false,
                null
        ));
    }

    private MemberMembership purchaseCountMembership(Member member, int totalCount) {
        Product product = productService.create(new ProductService.ProductCreateRequest(
                "P9출입PT-" + UUID.randomUUID().toString().substring(0, 8),
                "PT",
                "COUNT",
                new BigDecimal("100000"),
                null,
                totalCount,
                false,
                null,
                null,
                false,
                "ACTIVE",
                null
        ));

        MemberMembership membership = membershipPurchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                null,
                LocalDate.now(),
                product.priceAmount(),
                "CARD",
                null,
                null
        )).membership();
        assertNotNull(membership.membershipId());
        return membership;
    }

    private void cleanupCenterData() {
        jdbcClient.sql("DELETE FROM member_access_sessions WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM access_events WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM crm_message_events WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM membership_usage_events WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM membership_holds WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM membership_refunds WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM payment_details WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM payments WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM reservations WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM member_memberships WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM members WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("DELETE FROM products WHERE center_id = :centerId")
                .param("centerId", CENTER_ID)
                .update();
    }
}
