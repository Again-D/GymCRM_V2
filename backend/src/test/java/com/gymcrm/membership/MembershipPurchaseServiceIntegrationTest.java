package com.gymcrm.membership;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.service.MembershipPurchaseService;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.settlement.repository.PaymentRepository;
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
import static org.junit.jupiter.api.Assertions.assertNull;
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
        long trainerUserId = createTrainerUser();
        long membershipCountBefore = countRows("member_memberships");
        long paymentCountBefore = countRows("payments");

        MembershipPurchaseService.PurchaseResult result = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                trainerUserId,
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
        assertEquals(trainerUserId, result.membership().assignedTrainerId());
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
                null,
                LocalDate.of(2026, 3, 2),
                new BigDecimal("50000"),
                "CASH",
                null,
                null
        )));

        assertEquals(membershipCountBefore, countRows("member_memberships"));
        assertEquals(paymentCountBefore, countRows("payments"));
    }

    @Test
    void rejectsAssignedTrainerWhenUserIsNotTrainerRole() {
        Member member = createActiveMember();
        Product product = createDurationProduct();
        long deskUserId = createDeskUser();

        ApiException exception = assertThrows(ApiException.class, () -> purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                deskUserId,
                LocalDate.of(2026, 3, 4),
                null,
                "CARD",
                null,
                null
        )));

        assertEquals("담당 트레이너는 ROLE_TRAINER 사용자여야 합니다.", exception.getMessage());
    }

    @Test
    void rejectsPtPurchaseWithoutAssignedTrainer() {
        Member member = createActiveMember();
        Product product = createCountProduct();

        ApiException exception = assertThrows(ApiException.class, () -> purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                null,
                LocalDate.of(2026, 3, 5),
                null,
                "CARD",
                null,
                null
        )));

        assertEquals("PT 상품 구매 시 담당 트레이너를 선택해야 합니다.", exception.getMessage());
    }

    @Test
    void rejectsPtPurchaseWhenActivePtMembershipAlreadyExists() {
        Member member = createActiveMember();
        Product product = createCountProduct();
        createExistingMembership(member.memberId(), product.productId(), "ACTIVE");
        long trainerUserId = createTrainerUser();

        ApiException exception = assertThrows(ApiException.class, () -> purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                trainerUserId,
                LocalDate.of(2026, 3, 6),
                null,
                "CARD",
                null,
                null
        )));

        assertEquals("회원은 활성 또는 홀딩 중인 PT 회원권을 동시에 두 개 가질 수 없습니다.", exception.getMessage());
    }

    @Test
    void rejectsPtPurchaseWhenHoldingPtMembershipAlreadyExists() {
        Member member = createActiveMember();
        Product product = createCountProduct();
        createExistingMembership(member.memberId(), product.productId(), "HOLDING");
        long trainerUserId = createTrainerUser();

        ApiException exception = assertThrows(ApiException.class, () -> purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                trainerUserId,
                LocalDate.of(2026, 3, 7),
                null,
                "CARD",
                null,
                null
        )));

        assertEquals("회원은 활성 또는 홀딩 중인 PT 회원권을 동시에 두 개 가질 수 없습니다.", exception.getMessage());
    }

    @Test
    @Transactional
    void allowsNonPtPurchaseWithoutAssignedTrainer() {
        Member member = createActiveMember();
        Product product = createDurationProduct();

        MembershipPurchaseService.PurchaseResult result = purchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                null,
                LocalDate.of(2026, 3, 8),
                null,
                "CARD",
                null,
                null
        ));

        assertNotNull(result.membership().membershipId());
        assertNull(result.membership().assignedTrainerId());
    }

    @Test
    @Transactional
    void uniqueIndexBlocksSecondNonTerminalPtMembership() {
        Member member = createActiveMember();
        Product firstProduct = createCountProduct();
        Product secondProduct = createCountProduct();
        createExistingMembership(member.memberId(), firstProduct.productId(), "ACTIVE");

        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                createExistingMembership(member.memberId(), secondProduct.productId(), "HOLDING"));
    }

    private long countRows(String tableName) {
        return jdbcClient.sql("SELECT COUNT(*) FROM " + tableName)
                .query(Long.class)
                .single();
    }

    private void createExistingMembership(Long memberId, Long productId, String membershipStatus) {
        jdbcClient.sql("""
                INSERT INTO member_memberships (
                    center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count, hold_days_used, hold_count_used,
                    memo, is_deleted, created_at, created_by, updated_at, updated_by
                ) VALUES (
                    1, :memberId, :productId, :membershipStatus,
                    '테스트 PT 10회권', 'PT', 'COUNT',
                    550000, CURRENT_TIMESTAMP, DATE '2026-03-01', NULL,
                    10, 10, 0, 0, 0,
                    NULL, FALSE, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 1
                )
                """)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("membershipStatus", membershipStatus)
                .update();
    }

    private Member createActiveMember() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberCreateRequest(
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
                false,
                "ACTIVE",
                null
        ));
    }

    private long createTrainerUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, display_name, user_status,
                    is_deleted, created_at, created_by, updated_at, updated_by
                ) VALUES (
                    1, :loginId, :passwordHash, :displayName, 'ACTIVE',
                    FALSE, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 1
                )
                RETURNING user_id
                """)
                .param("loginId", "trainer-" + suffix)
                .param("passwordHash", "noop")
                .param("displayName", "Trainer " + suffix)
                .query(Long.class)
                .single();
        replaceUserRole(userId, "ROLE_TRAINER");
        return userId;
    }

    private long createDeskUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, display_name, user_status,
                    is_deleted, created_at, created_by, updated_at, updated_by
                ) VALUES (
                    1, :loginId, :passwordHash, :displayName, 'ACTIVE',
                    FALSE, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 1
                )
                RETURNING user_id
                """)
                .param("loginId", "desk-" + suffix)
                .param("passwordHash", "noop")
                .param("displayName", "Desk " + suffix)
                .query(Long.class)
                .single();
        replaceUserRole(userId, "ROLE_DESK");
        return userId;
    }

    private void replaceUserRole(Long userId, String roleCode) {
        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_by)
                SELECT :userId, role_id, 1
                FROM roles
                WHERE role_code = :roleCode
                """)
                .param("userId", userId)
                .param("roleCode", roleCode)
                .update();
    }
}
