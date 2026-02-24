package com.gymcrm.auth;

import com.fasterxml.jackson.databind.JsonNode;
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

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
        "app.security.dev-admin.initial-password=dev-admin-1234!"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class RbacAuthorizationIntegrationTest {
    private static final long CENTER_ID = 1L;
    private static final String DESK_LOGIN_ID = "desk-user";
    private static final String DESK_PASSWORD = "desk-user-1234!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void deskRoleCanManageMembersAndMembershipButCannotMutateProducts() throws Exception {
        ensureDeskUser();
        long productId = insertDurationProductFixture("RBAC상품-" + shortId(), true);

        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        mockMvc.perform(get("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/v1/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(post("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "productName": "DESK금지상품-%s",
                                  "productCategory": "MEMBERSHIP",
                                  "productType": "DURATION",
                                  "priceAmount": 10000,
                                  "validityDays": 30,
                                  "allowHold": false,
                                  "allowTransfer": false,
                                  "productStatus": "ACTIVE"
                                }
                                """.formatted(shortId())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        mockMvc.perform(patch("/api/v1/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                { "description": "desk should be forbidden" }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        mockMvc.perform(patch("/api/v1/products/{productId}/status", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                { "productStatus": "INACTIVE" }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        String memberName = "RBAC회원-" + shortId();
        String phone = "010" + randomDigits(8);
        MvcResult createMemberResult = mockMvc.perform(post("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberName": "%s",
                                  "phone": "%s",
                                  "memberStatus": "ACTIVE",
                                  "joinDate": "%s",
                                  "consentSms": true,
                                  "consentMarketing": false
                                }
                                """.formatted(memberName, phone, LocalDate.now())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberName").value(memberName))
                .andReturn();
        long memberId = jsonLong(createMemberResult, "/data/memberId");

        mockMvc.perform(patch("/api/v1/members/{memberId}", memberId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                { "memo": "desk update allowed" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memo").value("desk update allowed"));

        MvcResult purchaseResult = mockMvc.perform(post("/api/v1/members/{memberId}/memberships", memberId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "productId": %d,
                                  "startDate": "%s",
                                  "paidAmount": 120000,
                                  "paymentMethod": "CARD"
                                }
                                """.formatted(productId, LocalDate.now())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.membership.membershipStatus").value("ACTIVE"))
                .andReturn();
        long membershipId = jsonLong(purchaseResult, "/data/membership/membershipId");

        LocalDate holdStart = LocalDate.now().plusDays(1);
        LocalDate holdEnd = LocalDate.now().plusDays(2);
        mockMvc.perform(post("/api/v1/members/{memberId}/memberships/{membershipId}/hold", memberId, membershipId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "holdStartDate": "%s",
                                  "holdEndDate": "%s",
                                  "reason": "RBAC hold test"
                                }
                                """.formatted(holdStart, holdEnd)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.membership.membershipStatus").value("HOLDING"));

        mockMvc.perform(post("/api/v1/members/{memberId}/memberships/{membershipId}/resume", memberId, membershipId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "resumeDate": "%s"
                                }
                                """.formatted(holdEnd)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.membership.membershipStatus").value("ACTIVE"));

        mockMvc.perform(post("/api/v1/members/{memberId}/memberships/{membershipId}/refund/preview", memberId, membershipId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "refundDate": "%s"
                                }
                                """.formatted(LocalDate.now().plusDays(3))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.calculation.refundAmount").exists());

        mockMvc.perform(post("/api/v1/members/{memberId}/memberships/{membershipId}/refund", memberId, membershipId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "refundDate": "%s",
                                  "refundPaymentMethod": "CASH",
                                  "refundReason": "RBAC refund test"
                                }
                                """.formatted(LocalDate.now().plusDays(3))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.membership.membershipStatus").value("REFUNDED"));
    }

    @Test
    void centerAdminCanMutateProducts() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        String productName = "ADMIN상품-" + shortId();

        mockMvc.perform(post("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "productName": "%s",
                                  "productCategory": "MEMBERSHIP",
                                  "productType": "DURATION",
                                  "priceAmount": 55000,
                                  "validityDays": 30,
                                  "allowHold": true,
                                  "maxHoldDays": 10,
                                  "maxHoldCount": 2,
                                  "allowTransfer": false,
                                  "productStatus": "ACTIVE"
                                }
                                """.formatted(productName)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productName").value(productName));
    }

    @Test
    void deskRoleGets403Not401ForForbiddenProductMutation() throws Exception {
        ensureDeskUser();
        long productId = insertDurationProductFixture("RBAC403상품-" + shortId(), false);
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        mockMvc.perform(patch("/api/v1/products/{productId}/status", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                { "productStatus": "INACTIVE" }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.error.detail", containsString("권한")));
    }

    private void ensureDeskUser() {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", DESK_LOGIN_ID)
                .query(Integer.class)
                .single();
        if (count != null && count > 0) {
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

    private long insertDurationProductFixture(String productName, boolean allowHold) {
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, max_hold_days, max_hold_count,
                    allow_transfer, product_status, description, created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, 'MEMBERSHIP', 'DURATION', :priceAmount,
                    30, NULL, :allowHold, :maxHoldDays, :maxHoldCount,
                    FALSE, 'ACTIVE', 'RBAC fixture', 0, 0
                )
                RETURNING product_id
                """)
                .param("centerId", CENTER_ID)
                .param("productName", productName)
                .param("priceAmount", BigDecimal.valueOf(120000))
                .param("allowHold", allowHold)
                .param("maxHoldDays", allowHold ? 10 : null)
                .param("maxHoldCount", allowHold ? 3 : null)
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
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("accessToken")
                .asText();
    }

    private long jsonLong(MvcResult result, String pointer) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString()).at(pointer);
        return node.asLong();
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private static String randomDigits(int n) {
        String raw = Long.toUnsignedString(Double.doubleToLongBits(Math.random()));
        if (raw.length() >= n) {
            return raw.substring(0, n);
        }
        return (raw + "0000000000").substring(0, n);
    }
}
