package com.gymcrm.crm;

import com.gymcrm.member.Member;
import com.gymcrm.member.MemberService;
import com.gymcrm.membership.MembershipPurchaseService;
import com.gymcrm.product.Product;
import com.gymcrm.product.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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
        assertEquals(first.totalTargets(), first.createdCount());
        assertEquals(0, first.duplicatedCount());

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
}
