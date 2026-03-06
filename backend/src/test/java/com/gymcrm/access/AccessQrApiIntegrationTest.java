package com.gymcrm.access;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.mode=jwt",
        "app.security.dev-admin.seed-enabled=true",
        "app.security.dev-admin.login-id=center-admin",
        "app.security.dev-admin.initial-password=dev-admin-1234!",
        "app.access.qr.ttl-seconds=1"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class AccessQrApiIntegrationTest {
    private static final long CENTER_ID = 1L;
    private static final String DESK_LOGIN_ID = "desk-user";
    private static final String DESK_PASSWORD = "desk-user-1234!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void verifyRejectsReusedQrTokenAndRecordsDeniedReason() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        long memberId = createActiveMemberWithMembership();
        String qrToken = issueQrToken(deskToken, memberId);

        mockMvc.perform(post("/api/v1/access/qr/verify")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"qrToken":"%s","deviceId":"gate-01","gateMode":"ONLINE"}
                                """.formatted(qrToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allowed").value(true))
                .andExpect(jsonPath("$.data.code").value("OK"))
                .andExpect(jsonPath("$.data.accessEvent.eventType").value("ENTRY_GRANTED"));

        mockMvc.perform(post("/api/v1/access/qr/verify")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"qrToken":"%s","deviceId":"gate-01","gateMode":"ONLINE"}
                                """.formatted(qrToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allowed").value(false))
                .andExpect(jsonPath("$.data.code").value("A004"))
                .andExpect(jsonPath("$.data.gateAction").value("KEEP_LOCKED"));

        exitMember(deskToken, memberId);

        mockMvc.perform(get("/api/v1/access/events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("memberId", String.valueOf(memberId))
                        .param("eventType", "ENTRY_DENIED")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].denyReason").value("QR_REUSED"));
    }

    @Test
    void verifyRejectsExpiredQrTokenAndRecordsDeniedReason() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        long memberId = createActiveMemberWithMembership();
        String qrToken = issueQrToken(deskToken, memberId);
        Thread.sleep(1200L);

        mockMvc.perform(post("/api/v1/access/qr/verify")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"qrToken":"%s","deviceId":"gate-02","gateMode":"ONLINE"}
                                """.formatted(qrToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allowed").value(false))
                .andExpect(jsonPath("$.data.code").value("A003"))
                .andExpect(jsonPath("$.data.reason").value(org.hamcrest.Matchers.containsString("QR_EXPIRED")));

        mockMvc.perform(get("/api/v1/access/events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("memberId", String.valueOf(memberId))
                        .param("eventType", "ENTRY_DENIED")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].denyReason").value("QR_EXPIRED"));
    }

    @Test
    void offlineModeReturnsFallbackWithoutConsumingToken() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        long memberId = createActiveMemberWithMembership();
        String qrToken = issueQrToken(deskToken, memberId);

        mockMvc.perform(post("/api/v1/access/qr/verify")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"qrToken":"%s","deviceId":"gate-03","gateMode":"OFFLINE"}
                                """.formatted(qrToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allowed").value(false))
                .andExpect(jsonPath("$.data.code").value("A099"))
                .andExpect(jsonPath("$.data.gateAction").value("USE_OFFLINE_CACHE"));

        mockMvc.perform(post("/api/v1/access/qr/verify")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"qrToken":"%s","deviceId":"gate-03","gateMode":"ONLINE"}
                                """.formatted(qrToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allowed").value(true))
                .andExpect(jsonPath("$.data.code").value("OK"));

        exitMember(deskToken, memberId);
    }

    @Test
    void timeoutInjectionReturnsGateTimeoutCodeAndDeniedEvent() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        long memberId = createActiveMemberWithMembership();
        String qrToken = issueQrToken(deskToken, memberId);

        mockMvc.perform(post("/api/v1/access/qr/verify")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"qrToken":"%s","deviceId":"gate-04","gateMode":"ONLINE","simulateFailure":"TIMEOUT"}
                                """.formatted(qrToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allowed").value(false))
                .andExpect(jsonPath("$.data.code").value("A101"))
                .andExpect(jsonPath("$.data.reason").value(org.hamcrest.Matchers.containsString("GATE_TIMEOUT")))
                .andExpect(jsonPath("$.data.gateAction").value("KEEP_LOCKED"));

        mockMvc.perform(get("/api/v1/access/events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("memberId", String.valueOf(memberId))
                        .param("eventType", "ENTRY_DENIED")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].denyReason").value("GATE_TIMEOUT"));
    }

    private String issueQrToken(String accessToken, long memberId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/access/qr/issue")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d}
                                """.formatted(memberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.qrToken").isString())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("qrToken")
                .asText();
    }

    private void exitMember(String accessToken, long memberId) throws Exception {
        mockMvc.perform(post("/api/v1/access/exit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d}
                                """.formatted(memberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eventType").value("EXIT"));
    }

    private long createActiveMemberWithMembership() {
        long memberId = insertMemberFixture("P12A회원", "ACTIVE");
        long productId = insertProductFixture("PT", "COUNT");
        insertMembershipFixture(memberId, productId, "PT", "COUNT", 10, 10);
        return memberId;
    }

    private void ensureDeskUser() {
        int updated = jdbcClient.sql("""
                UPDATE users
                SET password_hash = :passwordHash,
                    display_name = :displayName,
                    role_code = 'ROLE_DESK',
                    user_status = 'ACTIVE',
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                  AND login_id = :loginId
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", DESK_LOGIN_ID)
                .param("passwordHash", passwordEncoder.encode(DESK_PASSWORD))
                .param("displayName", "Desk User")
                .update();
        if (updated > 0) {
            return;
        }

        jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, display_name, role_code, user_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :loginId, :passwordHash, :displayName, 'ROLE_DESK', 'ACTIVE',
                    0, 0
                )
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", DESK_LOGIN_ID)
                .param("passwordHash", passwordEncoder.encode(DESK_PASSWORD))
                .param("displayName", "Desk User")
                .update();
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
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("accessToken")
                .asText();
    }

    private long insertMemberFixture(String namePrefix, String memberStatus) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, :memberStatus, :joinDate,
                    TRUE, FALSE, 0, 0
                )
                RETURNING member_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberName", namePrefix + "-" + suffix)
                .param("phone", "010-7" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7))
                .param("memberStatus", memberStatus)
                .param("joinDate", LocalDate.now())
                .query(Long.class)
                .single();
    }

    private long insertProductFixture(String category, String type) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type,
                    price_amount, validity_days, total_count,
                    allow_hold, allow_transfer, product_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, :productCategory, :productType,
                    :priceAmount, :validityDays, :totalCount,
                    FALSE, FALSE, 'ACTIVE',
                    0, 0
                )
                RETURNING product_id
                """)
                .param("centerId", CENTER_ID)
                .param("productName", "P12A상품-" + suffix)
                .param("productCategory", category)
                .param("productType", type)
                .param("priceAmount", new BigDecimal("100000"))
                .param("validityDays", "DURATION".equals(type) ? 30 : null)
                .param("totalCount", "COUNT".equals(type) ? 10 : null)
                .query(Long.class)
                .single();
    }

    private long insertMembershipFixture(
            long memberId,
            long productId,
            String productCategory,
            String productType,
            Integer totalCount,
            Integer remainingCount
    ) {
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
                    :productNameSnapshot, :productCategorySnapshot, :productTypeSnapshot,
                    :priceAmountSnapshot, CURRENT_TIMESTAMP, :startDate, :endDate,
                    :totalCount, :remainingCount, 0,
                    0, 0,
                    0, 0
                )
                RETURNING membership_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("productNameSnapshot", "P12A멤버십")
                .param("productCategorySnapshot", productCategory)
                .param("productTypeSnapshot", productType)
                .param("priceAmountSnapshot", new BigDecimal("100000"))
                .param("startDate", LocalDate.now())
                .param("endDate", "DURATION".equals(productType) ? LocalDate.now().plusDays(30) : null)
                .param("totalCount", totalCount)
                .param("remainingCount", remainingCount)
                .query(Long.class)
                .single();
    }
}
