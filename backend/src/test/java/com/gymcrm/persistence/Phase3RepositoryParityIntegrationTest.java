package com.gymcrm.persistence;

import com.gymcrm.locker.LockerAssignment;
import com.gymcrm.locker.LockerAssignmentRepository;
import com.gymcrm.locker.LockerSlot;
import com.gymcrm.locker.LockerSlotRepository;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.mode=jwt"
})
@ActiveProfiles("dev")
@Transactional
class Phase3RepositoryParityIntegrationTest {
    private static final long CENTER_ID = 1L;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private LockerSlotRepository lockerSlotRepository;

    @Autowired
    private LockerAssignmentRepository lockerAssignmentRepository;

    @Test
    void memberSummaryRepositoryMatchesDirectSqlForSeededFixtures() {
        LocalDate today = LocalDate.now();
        String suffix = shortId();

        long durationProductId = insertProduct("PARITY-MEMBER-DURATION-" + suffix, "MEMBERSHIP", "DURATION", "ACTIVE");
        long ptProductId = insertProduct("PARITY-MEMBER-PT-" + suffix, "PT", "COUNT", "ACTIVE");

        long activeMemberId = insertMember("PARITY회원활성-" + suffix, "ACTIVE");
        long inactiveMemberId = insertMember("PARITY회원비활성-" + suffix, "INACTIVE");

        insertMembership(activeMemberId, durationProductId, "ACTIVE", "MEMBERSHIP", "DURATION", today.plusDays(3), null);
        insertMembership(activeMemberId, ptProductId, "ACTIVE", "PT", "COUNT", null, 4);

        List<MemberParityRow> expected = jdbcClient.sql("""
                WITH base_members AS (
                    SELECT
                        m.member_id,
                        m.center_id,
                        m.member_code,
                        m.member_name,
                        m.phone,
                        m.member_status,
                        m.join_date
                    FROM members m
                    WHERE m.center_id = :centerId
                      AND m.is_deleted = FALSE
                      AND m.member_id IN (:activeMemberId, :inactiveMemberId)
                ),
                representative_memberships AS (
                    SELECT DISTINCT ON (mm.member_id)
                        mm.member_id,
                        mm.end_date
                    FROM member_memberships mm
                    JOIN base_members bm ON bm.member_id = mm.member_id
                    WHERE mm.center_id = :centerId
                      AND mm.is_deleted = FALSE
                      AND mm.membership_status = 'ACTIVE'
                    ORDER BY mm.member_id, mm.end_date NULLS LAST, mm.membership_id ASC
                ),
                pt_remaining_summary AS (
                    SELECT
                        mm.member_id,
                        NULLIF(SUM(
                            CASE
                                WHEN mm.remaining_count IS NOT NULL AND mm.remaining_count > 0 THEN mm.remaining_count
                                ELSE 0
                            END
                        ), 0) AS remaining_pt_count
                    FROM member_memberships mm
                    JOIN base_members bm ON bm.member_id = mm.member_id
                    WHERE mm.center_id = :centerId
                      AND mm.is_deleted = FALSE
                      AND mm.membership_status = 'ACTIVE'
                      AND mm.product_category_snapshot = 'PT'
                      AND mm.product_type_snapshot = 'COUNT'
                    GROUP BY mm.member_id
                )
                SELECT
                    bm.member_id,
                    bm.member_code,
                    bm.member_status,
                    CASE
                        WHEN rm.member_id IS NULL THEN '없음'
                        WHEN rm.end_date IS NULL THEN '정상'
                        WHEN rm.end_date < :referenceDate THEN '만료'
                        WHEN rm.end_date <= :expiringThresholdDate THEN '만료임박'
                        ELSE '정상'
                    END AS membership_operational_status,
                    pts.remaining_pt_count
                FROM base_members bm
                LEFT JOIN representative_memberships rm ON rm.member_id = bm.member_id
                LEFT JOIN pt_remaining_summary pts ON pts.member_id = bm.member_id
                ORDER BY bm.member_id DESC
                """)
                .param("centerId", CENTER_ID)
                .param("activeMemberId", activeMemberId)
                .param("inactiveMemberId", inactiveMemberId)
                .param("referenceDate", today)
                .param("expiringThresholdDate", today.plusDays(7))
                .query((rs, rowNum) -> new MemberParityRow(
                        rs.getLong("member_id"),
                        rs.getString("member_code"),
                        rs.getString("member_status"),
                        rs.getString("membership_operational_status"),
                        toInteger(rs.getObject("remaining_pt_count"))
                ))
                .list();

        List<MemberParityRow> actual = memberRepository.findAllSummaries(CENTER_ID, null, null, null, null, null, null, null, null, null, null, today).stream()
                .filter(row -> row.memberId().equals(activeMemberId) || row.memberId().equals(inactiveMemberId))
                .map(row -> new MemberParityRow(
                        row.memberId(),
                        row.memberCode(),
                        row.memberStatus(),
                        row.membershipOperationalStatus(),
                        row.remainingPtCount()
                ))
                .sorted(Comparator.comparing(MemberParityRow::memberId).reversed())
                .toList();

        assertEquals(expected, actual);
    }

    @Test
    void productRepositoryMatchesDirectSqlForListAndDetail() {
        String suffix = shortId();
        long activeId = insertProduct("PARITY-PRODUCT-ACTIVE-" + suffix, "GX", "COUNT", "ACTIVE");
        long inactiveId = insertProduct("PARITY-PRODUCT-INACTIVE-" + suffix, "GX", "COUNT", "INACTIVE");

        List<ProductParityRow> expected = jdbcClient.sql("""
                SELECT
                    product_id,
                    product_name,
                    product_category,
                    product_type,
                    price_amount,
                    product_status
                FROM products
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                  AND product_id IN (:activeId, :inactiveId)
                ORDER BY product_id DESC
                """)
                .param("centerId", CENTER_ID)
                .param("activeId", activeId)
                .param("inactiveId", inactiveId)
                .query((rs, rowNum) -> new ProductParityRow(
                        rs.getLong("product_id"),
                        rs.getString("product_name"),
                        rs.getString("product_category"),
                        rs.getString("product_type"),
                        rs.getBigDecimal("price_amount"),
                        rs.getString("product_status")
                ))
                .list();

        List<ProductParityRow> actual = productRepository.findAll(CENTER_ID, "GX", null).stream()
                .filter(product -> product.productId().equals(activeId) || product.productId().equals(inactiveId))
                .map(product -> new ProductParityRow(
                        product.productId(),
                        product.productName(),
                        product.productCategory(),
                        product.productType(),
                        product.priceAmount(),
                        product.productStatus()
                ))
                .sorted(Comparator.comparing(ProductParityRow::productId).reversed())
                .toList();

        Product activeDetail = productRepository.findById(activeId).orElseThrow();
        assertEquals(expected, actual);
        assertEquals(activeId, activeDetail.productId());
        assertEquals(new BigDecimal("100000.00"), activeDetail.priceAmount());
    }

    @Test
    void lockerRepositoriesMatchDirectSqlForFilteredListResults() {
        String zone = "PARITY-ZONE-" + shortId();
        long slotId = insertLockerSlot("PARITY-LKR-" + shortId(), zone, "STANDARD", "ASSIGNED");
        long memberId = insertMember("PARITY라커회원-" + shortId(), "ACTIVE");
        long assignmentId = insertLockerAssignment(slotId, memberId, "ACTIVE");

        List<LockerSlotParityRow> expectedSlots = jdbcClient.sql("""
                SELECT
                    locker_slot_id,
                    locker_code,
                    locker_zone,
                    locker_status
                FROM locker_slots
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                  AND locker_zone = :lockerZone
                ORDER BY locker_code ASC
                """)
                .param("centerId", CENTER_ID)
                .param("lockerZone", zone)
                .query((rs, rowNum) -> new LockerSlotParityRow(
                        rs.getLong("locker_slot_id"),
                        rs.getString("locker_code"),
                        rs.getString("locker_zone"),
                        rs.getString("locker_status")
                ))
                .list();

        List<LockerSlotParityRow> actualSlots = lockerSlotRepository.findAll(CENTER_ID, null, zone).stream()
                .map(slot -> new LockerSlotParityRow(
                        slot.lockerSlotId(),
                        slot.lockerCode(),
                        slot.lockerZone(),
                        slot.lockerStatus()
                ))
                .toList();

        List<LockerAssignmentParityRow> expectedAssignments = jdbcClient.sql("""
                SELECT
                    locker_assignment_id,
                    locker_slot_id,
                    member_id,
                    assignment_status
                FROM locker_assignments
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                  AND locker_assignment_id = :assignmentId
                ORDER BY assigned_at DESC, locker_assignment_id DESC
                """)
                .param("centerId", CENTER_ID)
                .param("assignmentId", assignmentId)
                .query((rs, rowNum) -> new LockerAssignmentParityRow(
                        rs.getLong("locker_assignment_id"),
                        rs.getLong("locker_slot_id"),
                        rs.getLong("member_id"),
                        rs.getString("assignment_status")
                ))
                .list();

        List<LockerAssignmentParityRow> actualAssignments = lockerAssignmentRepository.findAll(CENTER_ID, true).stream()
                .filter(assignment -> assignment.lockerAssignmentId().equals(assignmentId))
                .map(assignment -> new LockerAssignmentParityRow(
                        assignment.lockerAssignmentId(),
                        assignment.lockerSlotId(),
                        assignment.memberId(),
                        assignment.assignmentStatus()
                ))
                .toList();

        assertEquals(expectedSlots, actualSlots);
        assertEquals(expectedAssignments, actualAssignments);
    }

    private long insertMember(String memberName, String memberStatus) {
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, :memberStatus, CURRENT_DATE,
                    FALSE, FALSE, 0, 0
                )
                RETURNING member_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberName", memberName)
                .param("phone", "010" + randomDigits(8))
                .param("memberStatus", memberStatus)
                .query(Long.class)
                .single();
    }

    private long insertProduct(String productName, String category, String type, String status) {
        Integer validityDays = "DURATION".equals(type) ? 30 : null;
        Integer totalCount = "COUNT".equals(type) ? 20 : null;
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, max_hold_days, max_hold_count,
                    allow_transfer, product_status, description, created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, :category, :type, :priceAmount,
                    :validityDays, :totalCount, FALSE, NULL, NULL,
                    FALSE, :status, 'parity fixture', 0, 0
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
                .param("status", status)
                .query(Long.class)
                .single();
    }

    private long insertMembership(
            long memberId,
            long productId,
            String membershipStatus,
            String category,
            String type,
            LocalDate endDate,
            Integer remainingCount
    ) {
        return jdbcClient.sql("""
                INSERT INTO member_memberships (
                    center_id, member_id, product_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :productId, :membershipStatus,
                    :productNameSnapshot, :category, :type,
                    :priceAmountSnapshot, CURRENT_TIMESTAMP, CURRENT_DATE, :endDate,
                    :totalCount, :remainingCount, 0,
                    0, 0, 'parity fixture',
                    0, 0
                )
                RETURNING membership_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("membershipStatus", membershipStatus)
                .param("productNameSnapshot", "PARITY-SNAPSHOT-" + shortId())
                .param("category", category)
                .param("type", type)
                .param("priceAmountSnapshot", BigDecimal.valueOf(100000))
                .param("endDate", endDate)
                .param("totalCount", remainingCount == null ? null : 10)
                .param("remainingCount", remainingCount)
                .query(Long.class)
                .single();
    }

    private long insertLockerSlot(String lockerCode, String lockerZone, String lockerGrade, String lockerStatus) {
        return jdbcClient.sql("""
                INSERT INTO locker_slots (
                    center_id, locker_code, locker_zone, locker_grade, locker_status,
                    memo, created_by, updated_by
                )
                VALUES (
                    :centerId, :lockerCode, :lockerZone, :lockerGrade, :lockerStatus,
                    'parity fixture', 0, 0
                )
                RETURNING locker_slot_id
                """)
                .param("centerId", CENTER_ID)
                .param("lockerCode", lockerCode)
                .param("lockerZone", lockerZone)
                .param("lockerGrade", lockerGrade)
                .param("lockerStatus", lockerStatus)
                .query(Long.class)
                .single();
    }

    private long insertLockerAssignment(long lockerSlotId, long memberId, String assignmentStatus) {
        return jdbcClient.sql("""
                INSERT INTO locker_assignments (
                    center_id, locker_slot_id, member_id, assignment_status,
                    assigned_at, start_date, end_date, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :lockerSlotId, :memberId, :assignmentStatus,
                    CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_DATE + 30, 'parity fixture',
                    0, 0
                )
                RETURNING locker_assignment_id
                """)
                .param("centerId", CENTER_ID)
                .param("lockerSlotId", lockerSlotId)
                .param("memberId", memberId)
                .param("assignmentStatus", assignmentStatus)
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

    private Integer toInteger(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }

    private record MemberParityRow(
            Long memberId,
            String memberCode,
            String memberStatus,
            String membershipOperationalStatus,
            Integer remainingPtCount
    ) {
    }

    private record ProductParityRow(
            Long productId,
            String productName,
            String productCategory,
            String productType,
            BigDecimal priceAmount,
            String productStatus
    ) {
    }

    private record LockerSlotParityRow(
            Long lockerSlotId,
            String lockerCode,
            String lockerZone,
            String lockerStatus
    ) {
    }

    private record LockerAssignmentParityRow(
            Long lockerAssignmentId,
            Long lockerSlotId,
            Long memberId,
            String assignmentStatus
    ) {
    }
}
