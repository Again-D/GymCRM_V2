package com.gymcrm.crm;

import com.gymcrm.member.Member;
import com.gymcrm.member.MemberService;
import com.gymcrm.membership.MembershipPurchaseService;
import com.gymcrm.product.Product;
import com.gymcrm.product.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
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
class CrmMessageServiceIntegrationTest {

    @Autowired
    private CrmMessageService crmMessageService;

    @Autowired
    private MemberService memberService;

    @Autowired
    private ProductService productService;

    @Autowired
    private MembershipPurchaseService purchaseService;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    @Transactional
    void triggerIsIdempotentByDedupeKey() {
        LocalDate baseDate = LocalDate.now(ZoneOffset.UTC);
        LocalDate targetDate = baseDate.plusDays(3);
        createExpiringMembership(targetDate);

        CrmMessageService.TriggerResult first = crmMessageService.triggerMembershipExpiryReminder(
                new CrmMessageService.TriggerRequest(baseDate, 3, false)
        );
        CrmMessageService.TriggerResult second = crmMessageService.triggerMembershipExpiryReminder(
                new CrmMessageService.TriggerRequest(baseDate, 3, false)
        );

        assertTrue(first.totalTargets() >= 1);
        assertEquals(first.totalTargets(), first.createdCount() + first.duplicatedCount());

        assertEquals(first.totalTargets(), second.totalTargets());
        assertEquals(0, second.createdCount());
        assertEquals(second.totalTargets(), second.duplicatedCount());
    }

    @Test
    @Transactional
    void processMovesFailuresToDeadAfterMaxAttempts() {
        LocalDate baseDate = LocalDate.now(ZoneOffset.UTC);
        LocalDate targetDate = baseDate.plusDays(1);
        createExpiringMembership(targetDate);

        crmMessageService.triggerMembershipExpiryReminder(
                new CrmMessageService.TriggerRequest(baseDate, 1, true)
        );

        CrmMessageService.ProcessResult first = crmMessageService.processPending(new CrmMessageService.ProcessRequest(50));
        assertTrue(first.pickedCount() >= 1);
        assertTrue(first.retryWaitCount() >= 1);

        CrmMessageService.ProcessResult second = crmMessageService.processPending(new CrmMessageService.ProcessRequest(50));
        assertTrue(second.pickedCount() >= 1);

        CrmMessageService.ProcessResult third = crmMessageService.processPending(new CrmMessageService.ProcessRequest(50));
        assertTrue(third.deadCount() >= 1);

        CrmMessageService.MessageHistoryResult history = crmMessageService.getRecentHistory(
                new CrmMessageService.HistoryRequest("DEAD", 20)
        );
        assertTrue(history.rows().stream().anyMatch(row -> "DEAD".equals(row.sendStatus())));
    }

    @Test
    @Transactional
    void birthdayCampaignExcludesMarketingOptOutMembers() {
        LocalDate baseDate = LocalDate.of(2099, 8, 17);
        Member consented = createMemberWithProfile(baseDate, true);
        Member optedOut = createMemberWithProfile(baseDate, false);

        CrmMessageService.TriggerResult result = crmMessageService.triggerBirthdayCampaign(
                new CrmMessageService.BirthdayTriggerRequest(baseDate, false)
        );

        assertEquals(1, result.createdCount());
        assertTrue(countEvent("BIRTHDAY_CAMPAIGN", consented.memberId()) >= 1);
        assertEquals(0, countEvent("BIRTHDAY_CAMPAIGN", optedOut.memberId()));
    }

    @Test
    @Transactional
    void eventCampaignFiltersByProductCategoryAndMarketingConsent() {
        LocalDate baseDate = LocalDate.of(2099, 9, 1);
        Member ptConsented = createMemberWithProfile(baseDate, true);
        Member gxConsented = createMemberWithProfile(baseDate, true);
        Member ptOptedOut = createMemberWithProfile(baseDate, false);

        Product ptProduct = createProductByCategory("PT");
        Product gxProduct = createProductByCategory("GX");

        purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                ptConsented.memberId(),
                ptProduct.productId(),
                baseDate,
                null,
                "CARD",
                null,
                null
        ));
        purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                gxConsented.memberId(),
                gxProduct.productId(),
                baseDate,
                null,
                "CARD",
                null,
                null
        ));
        purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                ptOptedOut.memberId(),
                ptProduct.productId(),
                baseDate,
                null,
                "CARD",
                null,
                null
        ));

        CrmMessageService.TriggerResult result = crmMessageService.triggerEventCampaign(
                new CrmMessageService.EventCampaignTriggerRequest(baseDate, "SEPT_PT", "PT", false)
        );

        assertEquals(1, result.createdCount());
        assertTrue(countEvent("EVENT_CAMPAIGN", ptConsented.memberId()) >= 1);
        assertEquals(0, countEvent("EVENT_CAMPAIGN", gxConsented.memberId()));
        assertEquals(0, countEvent("EVENT_CAMPAIGN", ptOptedOut.memberId()));
    }

    private void createExpiringMembership(LocalDate targetDate) {
        Member member = createMember();
        Product product = createDurationProduct();
        purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                targetDate,
                null,
                "CARD",
                null,
                null
        ));
    }

    private Member createMember() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberService.MemberCreateRequest(
                "CRM회원-" + suffix,
                "010-5" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
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

    private Member createMemberWithProfile(LocalDate birthDate, boolean consentMarketing) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberService.MemberCreateRequest(
                "CRM회원-" + suffix,
                "010-3" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
                null,
                null,
                birthDate,
                "ACTIVE",
                LocalDate.now(),
                true,
                consentMarketing,
                null
        ));
    }

    private Product createDurationProduct() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return productService.create(new ProductService.ProductCreateRequest(
                "CRM기간제-" + suffix,
                "MEMBERSHIP",
                "DURATION",
                new BigDecimal("10000"),
                1,
                null,
                true,
                30,
                1,
                false,
                "ACTIVE",
                null
        ));
    }

    private Product createProductByCategory(String category) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return productService.create(new ProductService.ProductCreateRequest(
                "CRM-" + category + "-" + suffix,
                category,
                "DURATION",
                new BigDecimal("10000"),
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

    private int countEvent(String eventType, Long memberId) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM crm_message_events
                WHERE center_id = 1
                  AND event_type = :eventType
                  AND member_id = :memberId
                  AND is_deleted = FALSE
                """)
                .param("eventType", eventType)
                .param("memberId", memberId)
                .query(Integer.class)
                .single();
        return count == null ? 0 : count;
    }
}
