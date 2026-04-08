package com.gymcrm.settlement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.mode=jwt",
        "app.security.dev-admin.seed-enabled=true",
        "app.security.dev-admin.login-id=center-admin",
        "app.security.dev-admin.initial-password=dev-admin-1234!"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class SalesSettlementApiIntegrationTest {
    private static final long CENTER_ID = 1L;
    private static final String TRAINER_LOGIN_ID = "trainer-settlement-self";
    private static final String TRAINER_PASSWORD = "trainer-pass-1234!";
    private static final String OTHER_TRAINER_LOGIN_ID = "trainer-settlement-other";
    private static final String OTHER_TRAINER_PASSWORD = "trainer-other-pass-1234!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @org.junit.jupiter.api.BeforeEach
    void setUpUsers() {
        ensureUser(CENTER_ID, TRAINER_LOGIN_ID, TRAINER_PASSWORD, "Trainer Settlement Self", "ROLE_TRAINER");
        ensureUser(CENTER_ID, OTHER_TRAINER_LOGIN_ID, OTHER_TRAINER_PASSWORD, "Trainer Settlement Other", "ROLE_TRAINER");
    }

    @Test
    @Transactional
    void settlementsEndpointsExposeCurrentResponseContract() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        LocalDate baseDate = LocalDate.of(2099, 7, 15);
        String keyword = "API-SAL-" + UUID.randomUUID().toString().substring(0, 6);
        long productId = insertProduct(keyword);
        long memberId = insertMember(baseDate);
        long membershipId = insertMembership(memberId, productId, keyword + "-PT", baseDate, baseDate.plusDays(3));

        insertPayment(memberId, membershipId, "PURCHASE", new BigDecimal("100000"), baseDate.atTime(1, 0).atOffset(ZoneOffset.UTC));
        insertPayment(memberId, membershipId, "REFUND", new BigDecimal("20000"), baseDate.atTime(2, 0).atOffset(ZoneOffset.UTC));

        mockMvc.perform(get("/api/v1/settlements/sales-dashboard")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("baseDate", baseDate.toString())
                        .param("expiringWithinDays", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.baseDate").value(baseDate.toString()))
                .andExpect(jsonPath("$.data.expiringWithinDays").value(7))
                .andExpect(jsonPath("$.data.refundCount").value(1))
                .andExpect(jsonPath("$.data.expiringMemberCount").value(1));

        mockMvc.perform(get("/api/v1/settlements/sales-report")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("startDate", baseDate.toString())
                        .param("endDate", baseDate.toString())
                        .param("paymentMethod", "CARD")
                        .param("productKeyword", keyword)
                        .param("trendGranularity", "DAILY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.trendGranularity").value("DAILY"))
                .andExpect(jsonPath("$.data.totalGrossSales").value(100000))
                .andExpect(jsonPath("$.data.totalRefundAmount").value(20000))
                .andExpect(jsonPath("$.data.totalNetSales").value(80000))
                .andExpect(jsonPath("$.data.trend[0].bucketStartDate").value(baseDate.toString()))
                .andExpect(jsonPath("$.data.rows[0].productName", containsString(keyword)));

        mockMvc.perform(get("/api/v1/settlements/sales-report/recent-adjustments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("startDate", baseDate.toString())
                        .param("endDate", baseDate.toString())
                        .param("paymentMethod", "CARD")
                        .param("productKeyword", keyword)
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].adjustmentType").value("REFUND"))
                .andExpect(jsonPath("$.data[0].productName", containsString(keyword)));

        MvcResult exportResult = mockMvc.perform(get("/api/v1/settlements/sales-report/export")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("startDate", baseDate.toString())
                        .param("endDate", baseDate.toString())
                        .param("paymentMethod", "CARD")
                        .param("productKeyword", keyword)
                        .param("trendGranularity", "DAILY"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("sales-report-%s-to-%s.xlsx".formatted(baseDate, baseDate))))
                .andReturn();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(exportResult.getResponse().getContentAsByteArray()))) {
            assertEquals("매출 정산 리포트", workbook.getSheet("Summary").getRow(0).getCell(0).getStringCellValue());
            assertEquals(keyword, workbook.getSheet("Summary").getRow(5).getCell(1).getStringCellValue());
            assertEquals(baseDate.toString(), workbook.getSheet("Trend").getRow(1).getCell(0).getStringCellValue());
            assertTrue(workbook.getSheet("Details").getRow(1).getCell(0).getStringCellValue().contains(keyword));
        }
    }

    @Test
    void salesReportRejectsInvalidTrendGranularityAtHttpBoundary() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(get("/api/v1/settlements/sales-report")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("startDate", "2026-03-01")
                        .param("endDate", "2026-03-31")
                        .param("trendGranularity", "HOURLY"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.detail", containsString("trendGranularity")));
    }

    @Test
    void recentAdjustmentsRejectsOutOfRangeLimitAtHttpBoundary() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(get("/api/v1/settlements/sales-report/recent-adjustments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("startDate", "2026-03-01")
                        .param("endDate", "2026-03-31")
                        .param("limit", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.detail", containsString("limit")));
    }

    @Test
    void salesDashboardRejectsOutOfRangeExpiringWindowAtHttpBoundary() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(get("/api/v1/settlements/sales-dashboard")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("baseDate", "2026-03-31")
                        .param("expiringWithinDays", "61"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.detail", containsString("expiringWithinDays")));
    }

    @Test
    void trainerPayrollEndpointsRejectCalendarInvalidSettlementMonthAtHttpBoundary() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(get("/api/v1/settlements/trainer-payroll")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("settlementMonth", "2026-13")
                        .param("sessionUnitPrice", "50000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.detail", containsString("settlementMonth")));

        mockMvc.perform(post("/api/v1/settlements/trainer-payroll/confirm")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "settlementMonth": "2026-13",
                                  "sessionUnitPrice": 50000
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.detail", containsString("settlementMonth")));

        mockMvc.perform(get("/api/v1/settlements/trainer-payroll/document")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("settlementMonth", "2026-13"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.detail", containsString("settlementMonth")));
    }

    @Test
    @Transactional
    void adminCanViewMonthlyTrainerPayrollAggregates() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        YearMonth targetMonth = YearMonth.of(2099, 8);

        long trainerUserId = userIdByLogin(TRAINER_LOGIN_ID);
        long otherTrainerUserId = userIdByLogin(OTHER_TRAINER_LOGIN_ID);
        long memberId = insertMember(targetMonth.atDay(1));
        long productId = insertProduct("TRAINER-AGG-" + UUID.randomUUID().toString().substring(0, 6));
        long membershipId = insertMembership(memberId, productId, "Trainer Agg PT", targetMonth.atDay(1), targetMonth.atEndOfMonth());

        long trainerSchedule = insertTrainerSchedule("Trainer Settlement Self", trainerUserId, targetMonth.atDay(5));
        long otherTrainerSchedule = insertTrainerSchedule("Trainer Settlement Other", otherTrainerUserId, targetMonth.atDay(7));

        insertCompletedReservation(membershipId, memberId, trainerSchedule, targetMonth.atDay(5));
        insertCompletedReservation(membershipId, memberId, otherTrainerSchedule, targetMonth.atDay(7));

        mockMvc.perform(get("/api/v1/settlements/trainer-payroll")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("settlementMonth", targetMonth.toString())
                        .param("sessionUnitPrice", "50000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rows.length()").value(2))
                .andExpect(jsonPath("$.data.totalCompletedClassCount").value(2));
    }

    @Test
    @Transactional
    void trainerCanAccessOnlyOwnMonthlyPtSummary() throws Exception {
        String trainerToken = loginAndGetAccessToken(TRAINER_LOGIN_ID, TRAINER_PASSWORD);
        YearMonth targetMonth = YearMonth.of(2099, 8);

        long trainerUserId = userIdByLogin(TRAINER_LOGIN_ID);
        long otherTrainerUserId = userIdByLogin(OTHER_TRAINER_LOGIN_ID);
        long memberId = insertMember(targetMonth.atDay(1));
        long productId = insertProduct("TRAINER-MINI-" + UUID.randomUUID().toString().substring(0, 6));
        long membershipId = insertMembership(memberId, productId, "Trainer Mini PT", targetMonth.atDay(1), targetMonth.atEndOfMonth());

        long trainerSchedule = insertTrainerSchedule("Trainer Settlement Self", trainerUserId, targetMonth.atDay(5));
        long otherTrainerSchedule = insertTrainerSchedule("Trainer Settlement Other", otherTrainerUserId, targetMonth.atDay(7));

        insertCompletedReservation(membershipId, memberId, trainerSchedule, targetMonth.atDay(5));
        insertCompletedReservation(membershipId, memberId, otherTrainerSchedule, targetMonth.atDay(7));

        mockMvc.perform(get("/api/v1/settlements/trainer-payroll/my-summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("settlementMonth", targetMonth.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.trainerUserId").value(trainerUserId))
                .andExpect(jsonPath("$.data.trainerName").value("Trainer Settlement Self"))
                .andExpect(jsonPath("$.data.completedClassCount").value(1));
    }

    @Test
    void trainerCannotAccessTrainerPayrollQuery() throws Exception {
        String trainerToken = loginAndGetAccessToken(TRAINER_LOGIN_ID, TRAINER_PASSWORD);

        mockMvc.perform(get("/api/v1/settlements/trainer-payroll")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("settlementMonth", "2099-08")
                        .param("sessionUnitPrice", "50000"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCannotAccessTrainerOnlyMonthlyPtSummary() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(get("/api/v1/settlements/trainer-payroll/my-summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("settlementMonth", "2099-08"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void trainerCannotAccessTrainerPayrollConfirmOrDocument() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        String trainerToken = loginAndGetAccessToken(TRAINER_LOGIN_ID, TRAINER_PASSWORD);
        YearMonth targetMonth = YearMonth.of(2099, 9);

        long trainerUserId = userIdByLogin(TRAINER_LOGIN_ID);
        long otherTrainerUserId = userIdByLogin(OTHER_TRAINER_LOGIN_ID);
        long memberId = insertMember(targetMonth.atDay(1));
        long productId = insertProduct("TRAINER-DOC-" + UUID.randomUUID().toString().substring(0, 6));
        long membershipId = insertMembership(memberId, productId, "Trainer Doc PT", targetMonth.atDay(1), targetMonth.atEndOfMonth());

        long trainerSchedule = insertTrainerSchedule("Trainer Settlement Self", trainerUserId, targetMonth.atDay(6));
        long otherTrainerSchedule = insertTrainerSchedule("Trainer Settlement Other", otherTrainerUserId, targetMonth.atDay(8));

        insertCompletedReservation(membershipId, memberId, trainerSchedule, targetMonth.atDay(6));
        insertCompletedReservation(membershipId, memberId, otherTrainerSchedule, targetMonth.atDay(8));

        mockMvc.perform(post("/api/v1/settlements/trainer-payroll/confirm")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "settlementMonth": "%s",
                                  "sessionUnitPrice": 50000
                                }
                                """.formatted(targetMonth)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/settlements/trainer-payroll/confirm")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "settlementMonth": "%s",
                                  "sessionUnitPrice": 50000
                                }
                                """.formatted(targetMonth)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/settlements/trainer-payroll/document")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("settlementMonth", targetMonth.toString()))
                .andExpect(status().isForbidden());
    }

    private long insertMember(LocalDate joinDate) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, 'ACTIVE', :joinDate,
                    TRUE, FALSE, 0, 0
                )
                RETURNING member_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberName", "API-SAL-MEMBER-" + suffix)
                .param("phone", "010-5" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7))
                .param("joinDate", joinDate)
                .query(Long.class)
                .single();
    }

    private long insertProduct(String keyword) {
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type,
                    price_amount, validity_days, total_count,
                    allow_hold, allow_transfer, product_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, 'MEMBERSHIP', 'COUNT',
                    100000, NULL, 10,
                    TRUE, FALSE, 'ACTIVE',
                    0, 0
                )
                RETURNING product_id
                """)
                .param("centerId", CENTER_ID)
                .param("productName", keyword + "-PT")
                .query(Long.class)
                .single();
    }

    private long insertMembership(long memberId, long productId, String productName, LocalDate startDate, LocalDate endDate) {
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
                    :centerId, :memberId, :productId, 'ACTIVE',
                    :productName, 'MEMBERSHIP', 'COUNT',
                    100000, CURRENT_TIMESTAMP, :startDate, :endDate,
                    10, 10, 0,
                    0, 0,
                    0, 0
                )
                RETURNING membership_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("productName", productName)
                .param("startDate", startDate)
                .param("endDate", endDate)
                .query(Long.class)
                .single();
    }

    private void insertPayment(
            long memberId,
            long membershipId,
            String paymentType,
            BigDecimal amount,
            OffsetDateTime paidAt
    ) {
        jdbcClient.sql("""
                INSERT INTO payments (
                    center_id, member_id, membership_id, payment_type, payment_status, payment_method,
                    amount, paid_at, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :membershipId, :paymentType, 'COMPLETED', 'CARD',
                    :amount, :paidAt, 0, 0
                )
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .param("membershipId", membershipId)
                .param("paymentType", paymentType)
                .param("amount", amount)
                .param("paidAt", paidAt)
                .update();
    }

    private long insertTrainerSchedule(String trainerName, long trainerUserId, LocalDate date) {
        return jdbcClient.sql("""
                INSERT INTO trainer_schedules (
                    center_id, schedule_type, trainer_user_id, trainer_name, slot_title,
                    start_at, end_at, capacity, current_count, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, 'PT', :trainerUserId, :trainerName, 'PT slot',
                    :startAt, :endAt, 10, 0, NULL,
                    0, 0
                )
                RETURNING schedule_id
                """)
                .param("centerId", CENTER_ID)
                .param("trainerUserId", trainerUserId)
                .param("trainerName", trainerName)
                .param("startAt", date.atTime(10, 0).atOffset(ZoneOffset.UTC))
                .param("endAt", date.atTime(11, 0).atOffset(ZoneOffset.UTC))
                .query(Long.class)
                .single();
    }

    private void insertCompletedReservation(long membershipId, long memberId, long scheduleId, LocalDate date) {
        jdbcClient.sql("""
                INSERT INTO reservations (
                    center_id, member_id, membership_id, schedule_id,
                    reservation_status, reserved_at, cancelled_at, completed_at,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :membershipId, :scheduleId,
                    'COMPLETED', :reservedAt, NULL, :completedAt,
                    0, 0
                )
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .param("membershipId", membershipId)
                .param("scheduleId", scheduleId)
                .param("reservedAt", date.atTime(9, 0).atOffset(ZoneOffset.UTC))
                .param("completedAt", date.atTime(11, 0).atOffset(ZoneOffset.UTC))
                .update();
    }

    private void ensureUser(long centerId, String loginId, String password, String displayName, String roleCode) {
        Integer existing = jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .param("loginId", loginId)
                .query(Integer.class)
                .optional()
                .orElse(null);
        if (existing != null) {
            replaceUserRole(existing.longValue(), roleCode);
            jdbcClient.sql("""
                    UPDATE users
                    SET password_hash = :passwordHash,
                        display_name = :displayName,
                        user_status = 'ACTIVE',
                        access_revoked_after = NULL,
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = 1
                    WHERE user_id = :userId
                    """)
                    .param("passwordHash", passwordEncoder.encode(password))
                    .param("displayName", displayName)
                    .param("userId", existing.longValue())
                    .update();
            return;
        }

        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, display_name, user_status,
                    is_deleted, created_at, created_by, updated_at, updated_by
                ) VALUES (
                    :centerId, :loginId, :passwordHash, :displayName, 'ACTIVE',
                    FALSE, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 1
                )
                RETURNING user_id
                """)
                .param("centerId", centerId)
                .param("loginId", loginId)
                .param("passwordHash", passwordEncoder.encode(password))
                .param("displayName", displayName)
                .query(Long.class)
                .single();
        replaceUserRole(userId, roleCode);
    }

    private void replaceUserRole(Long userId, String roleCode) {
        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_at, created_by)
                SELECT :userId, role_id, CURRENT_TIMESTAMP, 1
                FROM roles
                WHERE role_code = :roleCode
                """)
                .param("userId", userId)
                .param("roleCode", roleCode)
                .update();
    }

    private long userIdByLogin(String loginId) {
        return jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", loginId)
                .query(Long.class)
                .single();
    }

    private String loginAndGetAccessToken(String loginId, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(loginId, password)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asText();
    }

}
