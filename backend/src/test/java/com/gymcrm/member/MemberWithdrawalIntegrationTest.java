package com.gymcrm.member;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.member.dto.response.MemberWithdrawResponse;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.service.MembershipHoldService;
import com.gymcrm.membership.service.MembershipRefundService;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
@Transactional
class MemberWithdrawalIntegrationTest {

    private static final long CENTER_ID = 1L;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MemberMembershipRepository memberMembershipRepository;

    @Autowired
    private MemberService memberService;

    @SpyBean
    private MembershipHoldService membershipHoldService;

    @SpyBean
    private MembershipRefundService membershipRefundService;

    @AfterEach
    void tearDown() {
        reset(membershipHoldService, membershipRefundService);
    }

    @Test
    void withdrawResumesHoldingThenRefundsThenWithdrawsMember() {
        LocalDate businessDate = LocalDate.now();
        long memberId = insertMemberFixture("출금오케스트레이션-" + shortId());
        long productId = insertProductFixture("출금흐름기간상품-" + shortId(), "MEMBERSHIP", "DURATION");
        long membershipId = insertMembershipFixture(
                CENTER_ID,
                memberId,
                productId,
                "HOLDING",
                "MEMBERSHIP",
                "DURATION",
                businessDate.plusDays(14),
                null,
                null,
                false
        );
        insertActiveHoldFixture(membershipId, businessDate.minusDays(2), businessDate.plusDays(2));
        insertPurchasePaymentFixture(memberId, membershipId, BigDecimal.valueOf(120000));

        MemberWithdrawResponse response = memberService.withdraw(memberId);

        assertTrue(response.withdrawn());
        assertEquals(memberId, response.memberId());
        assertEquals(1, response.resumedHoldingCount());
        assertEquals(1, response.refundedMembershipCount());
        assertTrue(response.refundAmount().compareTo(BigDecimal.ZERO) > 0);

        String memberStatus = jdbcClient.sql("SELECT member_status FROM members WHERE member_id = :memberId")
                .param("memberId", memberId)
                .query(String.class)
                .single();
        assertEquals("WITHDRAWN", memberStatus);

        String membershipStatus = jdbcClient.sql("SELECT membership_status FROM member_memberships WHERE membership_id = :membershipId")
                .param("membershipId", membershipId)
                .query(String.class)
                .single();
        assertEquals("REFUNDED", membershipStatus);

        String holdStatus = jdbcClient.sql("SELECT hold_status FROM membership_holds WHERE membership_id = :membershipId")
                .param("membershipId", membershipId)
                .query(String.class)
                .single();
        assertEquals("RESUMED", holdStatus);

        long refundCount = jdbcClient.sql("SELECT COUNT(*) FROM membership_refunds WHERE membership_id = :membershipId")
                .param("membershipId", membershipId)
                .query(Long.class)
                .single();
        assertEquals(1L, refundCount);

        long auditCount = jdbcClient.sql("SELECT COUNT(*) FROM audit_logs WHERE event_type = 'MEMBER_WITHDRAWN' AND resource_id = :resourceId")
                .param("resourceId", String.valueOf(memberId))
                .query(Long.class)
                .single();
        assertEquals(1L, auditCount);
    }

    @Test
    void whenResumeFailsMemberIsNotWithdrawnAndMemberWithdrawnAuditIsAbsent() {
        LocalDate businessDate = LocalDate.now();
        long memberId = insertMemberFixture("출금재개실패-" + shortId());
        long productId = insertProductFixture("출금재개실패상품-" + shortId(), "MEMBERSHIP", "DURATION");
        long membershipId = insertMembershipFixture(
                CENTER_ID,
                memberId,
                productId,
                "HOLDING",
                "MEMBERSHIP",
                "DURATION",
                businessDate.plusDays(7),
                null,
                null,
                false
        );
        insertActiveHoldFixture(membershipId, businessDate.minusDays(1), businessDate.plusDays(1));
        insertPurchasePaymentFixture(memberId, membershipId, BigDecimal.valueOf(100000));

        doThrow(new ApiException(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, "resume failure"))
                .when(membershipHoldService)
                .resume(any());

        assertThrows(ApiException.class, () -> memberService.withdraw(memberId));

        String memberStatus = jdbcClient.sql("SELECT member_status FROM members WHERE member_id = :memberId")
                .param("memberId", memberId)
                .query(String.class)
                .single();
        assertEquals("ACTIVE", memberStatus);

        long auditCount = jdbcClient.sql("SELECT COUNT(*) FROM audit_logs WHERE event_type = 'MEMBER_WITHDRAWN' AND resource_id = :resourceId")
                .param("resourceId", String.valueOf(memberId))
                .query(Long.class)
                .single();
        assertEquals(0L, auditCount);
    }

    @Test
    void whenRefundFailsMemberIsNotWithdrawnAndMemberWithdrawnAuditIsAbsent() {
        LocalDate businessDate = LocalDate.now();
        long memberId = insertMemberFixture("출금환불실패-" + shortId());
        long productId = insertProductFixture("출금환불실패상품-" + shortId(), "MEMBERSHIP", "DURATION");
        long membershipId = insertMembershipFixture(
                CENTER_ID,
                memberId,
                productId,
                "ACTIVE",
                "MEMBERSHIP",
                "DURATION",
                businessDate.plusDays(10),
                null,
                null,
                false
        );
        insertPurchasePaymentFixture(memberId, membershipId, BigDecimal.valueOf(110000));

        doThrow(new ApiException(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, "refund failure"))
                .when(membershipRefundService)
                .refund(any());

        assertThrows(ApiException.class, () -> memberService.withdraw(memberId));

        String memberStatus = jdbcClient.sql("SELECT member_status FROM members WHERE member_id = :memberId")
                .param("memberId", memberId)
                .query(String.class)
                .single();
        assertEquals("ACTIVE", memberStatus);

        long auditCount = jdbcClient.sql("SELECT COUNT(*) FROM audit_logs WHERE event_type = 'MEMBER_WITHDRAWN' AND resource_id = :resourceId")
                .param("resourceId", String.valueOf(memberId))
                .query(Long.class)
                .single();
        assertEquals(0L, auditCount);
    }

    @Test
    void returnsActiveDurationMembershipWithFutureEndDateAsWithdrawalRelevant() {
        LocalDate referenceDate = LocalDate.of(2026, 5, 8);
        long memberId = insertMemberFixture("출금기간제-" + shortId());
        long productId = insertProductFixture("출금기간상품-" + shortId(), "MEMBERSHIP", "DURATION");

        long membershipId = insertMembershipFixture(
                CENTER_ID,
                memberId,
                productId,
                "ACTIVE",
                "MEMBERSHIP",
                "DURATION",
                referenceDate.plusDays(5),
                null,
                null,
                false
        );

        List<MemberMembershipRepository.WithdrawalRelevantMembershipProjection> rows =
                memberMembershipRepository.findWithdrawalRelevantMemberships(CENTER_ID, memberId, referenceDate);

        assertEquals(1, rows.size());
        MemberMembershipRepository.WithdrawalRelevantMembershipProjection row = rows.get(0);
        assertEquals(membershipId, row.membershipId());
        assertEquals("ACTIVE", row.membershipStatus());
        assertEquals("MEMBERSHIP", row.productCategorySnapshot());
        assertEquals("DURATION", row.productTypeSnapshot());
        assertEquals(referenceDate.plusDays(5), row.endDate());
        assertEquals(memberId, row.memberId());
        assertEquals(CENTER_ID, row.centerId());
        assertTrue(row.directlyRefundable());
        assertFalse(row.requiresResumeBeforeRefund());
    }

    @Test
    void returnsActiveCountMembershipWithPositiveRemainingCountAsWithdrawalRelevant() {
        LocalDate referenceDate = LocalDate.of(2026, 5, 8);
        long memberId = insertMemberFixture("출금횟수제-" + shortId());
        long productId = insertProductFixture("출금횟수상품-" + shortId(), "PT", "COUNT");

        long membershipId = insertMembershipFixture(
                CENTER_ID,
                memberId,
                productId,
                "ACTIVE",
                "PT",
                "COUNT",
                null,
                20,
                7,
                false
        );

        List<MemberMembershipRepository.WithdrawalRelevantMembershipProjection> rows =
                memberMembershipRepository.findWithdrawalRelevantMemberships(CENTER_ID, memberId, referenceDate);

        assertEquals(1, rows.size());
        MemberMembershipRepository.WithdrawalRelevantMembershipProjection row = rows.get(0);
        assertEquals(membershipId, row.membershipId());
        assertEquals("ACTIVE", row.membershipStatus());
        assertEquals("PT", row.productCategorySnapshot());
        assertEquals("COUNT", row.productTypeSnapshot());
        assertEquals(7, row.remainingCount());
        assertTrue(row.directlyRefundable());
    }

    @Test
    void includesHoldingMembershipAndMarksItAsResumeRequiredInsteadOfDirectRefund() {
        LocalDate referenceDate = LocalDate.of(2026, 5, 8);
        long memberId = insertMemberFixture("출금홀딩-" + shortId());
        long durationProductId = insertProductFixture("출금홀딩기간상품-" + shortId(), "MEMBERSHIP", "DURATION");
        long countProductId = insertProductFixture("출금홀딩횟수상품-" + shortId(), "PT", "COUNT");

        long holdingDurationMembershipId = insertMembershipFixture(
                CENTER_ID,
                memberId,
                durationProductId,
                "HOLDING",
                "MEMBERSHIP",
                "DURATION",
                referenceDate.plusDays(9),
                null,
                null,
                false
        );
        long holdingCountMembershipId = insertMembershipFixture(
                CENTER_ID,
                memberId,
                countProductId,
                "HOLDING",
                "PT",
                "COUNT",
                null,
                30,
                10,
                false
        );

        Map<Long, MemberMembershipRepository.WithdrawalRelevantMembershipProjection> rowsByMembershipId =
                memberMembershipRepository.findWithdrawalRelevantMemberships(CENTER_ID, memberId, referenceDate)
                        .stream()
                        .collect(Collectors.toMap(
                                MemberMembershipRepository.WithdrawalRelevantMembershipProjection::membershipId,
                                Function.identity()
                        ));

        assertEquals(2, rowsByMembershipId.size());
        assertTrue(rowsByMembershipId.containsKey(holdingDurationMembershipId));
        assertTrue(rowsByMembershipId.containsKey(holdingCountMembershipId));
        assertTrue(rowsByMembershipId.get(holdingDurationMembershipId).requiresResumeBeforeRefund());
        assertFalse(rowsByMembershipId.get(holdingDurationMembershipId).directlyRefundable());
        assertTrue(rowsByMembershipId.get(holdingCountMembershipId).requiresResumeBeforeRefund());
        assertFalse(rowsByMembershipId.get(holdingCountMembershipId).directlyRefundable());
    }

    @Test
    void excludesCountMembershipWhenRemainingCountIsZero() {
        LocalDate referenceDate = LocalDate.of(2026, 5, 8);
        long memberId = insertMemberFixture("출금잔여0-" + shortId());
        long countProductId = insertProductFixture("출금잔여0상품-" + shortId(), "PT", "COUNT");

        insertMembershipFixture(
                CENTER_ID,
                memberId,
                countProductId,
                "ACTIVE",
                "PT",
                "COUNT",
                null,
                10,
                0,
                false
        );

        List<MemberMembershipRepository.WithdrawalRelevantMembershipProjection> rows =
                memberMembershipRepository.findWithdrawalRelevantMemberships(CENTER_ID, memberId, referenceDate);

        assertTrue(rows.isEmpty());
    }

    @Test
    void excludesTerminalMembershipStatesFromWithdrawalRelevantResult() {
        LocalDate referenceDate = LocalDate.of(2026, 5, 8);
        long memberId = insertMemberFixture("출금종료상태-" + shortId());
        long durationProductId = insertProductFixture("출금종료기간상품-" + shortId(), "MEMBERSHIP", "DURATION");
        long countProductId = insertProductFixture("출금종료횟수상품-" + shortId(), "PT", "COUNT");

        insertMembershipFixture(CENTER_ID, memberId, durationProductId, "REFUNDED", "MEMBERSHIP", "DURATION", referenceDate.plusDays(5), null, null, false);
        insertMembershipFixture(CENTER_ID, memberId, durationProductId, "TRANSFERRED", "MEMBERSHIP", "DURATION", referenceDate.plusDays(5), null, null, false);
        insertMembershipFixture(CENTER_ID, memberId, durationProductId, "EXPIRED", "MEMBERSHIP", "DURATION", referenceDate.plusDays(5), null, null, false);
        insertMembershipFixture(CENTER_ID, memberId, countProductId, "REFUNDED", "PT", "COUNT", null, 20, 5, false);

        List<MemberMembershipRepository.WithdrawalRelevantMembershipProjection> rows =
                memberMembershipRepository.findWithdrawalRelevantMemberships(CENTER_ID, memberId, referenceDate);

        assertTrue(rows.isEmpty());
    }

    @Test
    void queryIsScopedByCenterAndMemberAndExcludesDeletedMemberships() {
        LocalDate referenceDate = LocalDate.of(2026, 5, 8);
        long targetMemberId = insertMemberFixture("출금스코프대상-" + shortId());
        long otherMemberId = insertMemberFixture("출금스코프타겟외-" + shortId());
        long durationProductId = insertProductFixture("출금스코프기간상품-" + shortId(), "MEMBERSHIP", "DURATION");
        long countProductId = insertProductFixture("출금스코프횟수상품-" + shortId(), "PT", "COUNT");

        long targetMembershipId = insertMembershipFixture(
                CENTER_ID,
                targetMemberId,
                durationProductId,
                "ACTIVE",
                "MEMBERSHIP",
                "DURATION",
                referenceDate.plusDays(7),
                null,
                null,
                false
        );
        insertMembershipFixture(
                CENTER_ID,
                otherMemberId,
                durationProductId,
                "ACTIVE",
                "MEMBERSHIP",
                "DURATION",
                referenceDate.plusDays(10),
                null,
                null,
                false
        );
        insertMembershipFixture(
                CENTER_ID,
                targetMemberId,
                countProductId,
                "ACTIVE",
                "PT",
                "COUNT",
                null,
                20,
                8,
                true
        );

        List<MemberMembershipRepository.WithdrawalRelevantMembershipProjection> targetRows =
                memberMembershipRepository.findWithdrawalRelevantMemberships(CENTER_ID, targetMemberId, referenceDate);

        assertEquals(1, targetRows.size());
        assertEquals(targetMembershipId, targetRows.get(0).membershipId());

        List<MemberMembershipRepository.WithdrawalRelevantMembershipProjection> wrongCenterRows =
                memberMembershipRepository.findWithdrawalRelevantMemberships(9999L, targetMemberId, referenceDate);

        assertTrue(wrongCenterRows.isEmpty());
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
        Integer validityDays = "DURATION".equals(type) ? 30 : null;
        Integer totalCount = "COUNT".equals(type) ? 30 : null;
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, max_hold_days, max_hold_count,
                    allow_transfer, product_status, created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, :category, :type, :priceAmount,
                    :validityDays, :totalCount, TRUE, 30, 3,
                    FALSE, 'ACTIVE', 0, 0
                )
                RETURNING product_id
                """)
                .param("centerId", CENTER_ID)
                .param("productName", productName)
                .param("category", category)
                .param("type", type)
                .param("priceAmount", BigDecimal.valueOf(100000))
                .param("validityDays", validityDays)
                .param("totalCount", totalCount)
                .query(Long.class)
                .single();
    }

    private long insertMembershipFixture(
            long centerId,
            long memberId,
            long productId,
            String membershipStatus,
            String category,
            String type,
            LocalDate endDate,
            Integer totalCount,
            Integer remainingCount,
            boolean deleted
    ) {
        return jdbcClient.sql("""
                INSERT INTO member_memberships (
                    center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    is_deleted, deleted_at, deleted_by,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :productId, :membershipStatus,
                    :productNameSnapshot, :category, :type,
                    :priceAmountSnapshot, CURRENT_TIMESTAMP, CURRENT_DATE, :endDate,
                    :totalCount, :remainingCount, 0,
                    0, 0, 'withdrawal-u1-fixture',
                    :isDeleted, :deletedAt, :deletedBy,
                    0, 0
                )
                RETURNING membership_id
                """)
                .param("centerId", centerId)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("membershipStatus", membershipStatus)
                .param("productNameSnapshot", "WD-U1-SNAPSHOT-" + shortId())
                .param("category", category)
                .param("type", type)
                .param("priceAmountSnapshot", BigDecimal.valueOf(100000))
                .param("endDate", endDate)
                .param("totalCount", totalCount)
                .param("remainingCount", remainingCount)
                .param("isDeleted", deleted)
                .param("deletedAt", deleted ? java.time.OffsetDateTime.now() : null)
                .param("deletedBy", deleted ? 0L : null)
                .query(Long.class)
                .single();
    }

    private void insertActiveHoldFixture(long membershipId, LocalDate holdStartDate, LocalDate holdEndDate) {
        jdbcClient.sql("""
                INSERT INTO membership_holds (
                    center_id, membership_id, hold_status, hold_start_date, hold_end_date,
                    is_deleted, created_by, updated_by
                )
                VALUES (
                    :centerId, :membershipId, 'ACTIVE', :holdStartDate, :holdEndDate,
                    FALSE, 0, 0
                )
                """)
                .param("centerId", CENTER_ID)
                .param("membershipId", membershipId)
                .param("holdStartDate", holdStartDate)
                .param("holdEndDate", holdEndDate)
                .update();
    }

    private long insertPurchasePaymentFixture(long memberId, long membershipId, BigDecimal amount) {
        return jdbcClient.sql("""
                INSERT INTO payments (
                    center_id, member_id, membership_id, payment_type, payment_status,
                    payment_method, amount, paid_at, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :membershipId, 'PURCHASE', 'COMPLETED',
                    'CARD', :amount, CURRENT_TIMESTAMP, 0, 0
                )
                RETURNING payment_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .param("membershipId", membershipId)
                .param("amount", amount)
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
