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
        "app.security.dev-admin.initial-password=dev-admin-1234!"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class AccessApiIntegrationTest {
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
    void deskRoleCanEnterExitAndReadPresence() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        long memberId = insertMemberFixture("P9API회원");
        long productId = insertProductFixture("PT", "COUNT");
        long membershipId = insertMembershipFixture(memberId, productId, "PT", "COUNT", 5, 5);

        mockMvc.perform(post("/api/v1/access/entry")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d, "membershipId": %d}
                                """.formatted(memberId, membershipId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.traceId").exists())
                .andExpect(jsonPath("$.data.eventType").value("ENTRY_GRANTED"));

        mockMvc.perform(get("/api/v1/access/presence")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.openSessionCount").value(1));

        mockMvc.perform(post("/api/v1/access/exit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d}
                                """.formatted(memberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eventType").value("EXIT"));

        mockMvc.perform(get("/api/v1/access/events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("memberId", String.valueOf(memberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].eventType").value("EXIT"));
    }

    @Test
    void inactiveMemberEntryReturnsBusinessRuleAndRecordsDeniedEvent() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        long memberId = insertMemberFixture("P9비활성회원", "INACTIVE");
        long productId = insertProductFixture("GX", "DURATION");
        insertMembershipFixture(memberId, productId, "GX", "DURATION", null, null);

        mockMvc.perform(post("/api/v1/access/entry")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d}
                                """.formatted(memberId)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("BUSINESS_RULE"));

        mockMvc.perform(get("/api/v1/access/events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("memberId", String.valueOf(memberId))
                        .param("eventType", "ENTRY_DENIED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].denyReason").value("MEMBER_INACTIVE"));
    }

    @Test
    void unauthenticatedAccessMutationReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/access/entry")
                        .contentType("application/json")
                        .content("""
                                {"memberId": 1}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void deskRoleCannotMutateOtherCenterMemberAccess() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        long otherCenterId = insertCenterFixture();
        long otherMemberId = insertMemberFixture(otherCenterId, "P9타센터회원", "ACTIVE");
        long otherProductId = insertProductFixture(otherCenterId, "PT", "COUNT");
        long otherMembershipId = insertMembershipFixture(otherCenterId, otherMemberId, otherProductId, "PT", "COUNT", 5, 5);

        mockMvc.perform(post("/api/v1/access/entry")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d, "membershipId": %d}
                                """.formatted(otherMemberId, otherMembershipId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
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

    private long insertMemberFixture(String namePrefix) {
        return insertMemberFixture(namePrefix, "ACTIVE");
    }

    private long insertMemberFixture(String namePrefix, String memberStatus) {
        return insertMemberFixture(CENTER_ID, namePrefix, memberStatus);
    }

    private long insertMemberFixture(long centerId, String namePrefix, String memberStatus) {
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
                .param("centerId", centerId)
                .param("memberName", namePrefix + "-" + suffix)
                .param("phone", "010-7" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7))
                .param("memberStatus", memberStatus)
                .param("joinDate", LocalDate.now())
                .query(Long.class)
                .single();
    }

    private long insertProductFixture(String category, String type) {
        return insertProductFixture(CENTER_ID, category, type);
    }

    private long insertProductFixture(long centerId, String category, String type) {
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
                .param("centerId", centerId)
                .param("productName", "P9API상품-" + suffix)
                .param("productCategory", category)
                .param("productType", type)
                .param("priceAmount", new BigDecimal("100000"))
                .param("validityDays", "DURATION".equals(type) ? 30 : null)
                .param("totalCount", "COUNT".equals(type) ? 5 : null)
                .query(Long.class)
                .single();
    }

    private long insertMembershipFixture(
            long centerId,
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
                .param("centerId", centerId)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("productNameSnapshot", "P9API멤버십")
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

    private long insertMembershipFixture(
            long memberId,
            long productId,
            String productCategory,
            String productType,
            Integer totalCount,
            Integer remainingCount
    ) {
        return insertMembershipFixture(CENTER_ID, memberId, productId, productCategory, productType, totalCount, remainingCount);
    }

    private long insertCenterFixture() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO centers (
                    center_name, is_active, created_by, updated_by
                )
                VALUES (
                    :centerName, TRUE, 1, 1
                )
                RETURNING center_id
                """)
                .param("centerName", "P9타센터-" + suffix)
                .query(Long.class)
                .single();
    }
}
