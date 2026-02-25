package com.gymcrm.reservation;

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
import java.time.OffsetDateTime;
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
class ReservationApiIntegrationTest {
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

    @Autowired
    private TrainerScheduleRepository trainerScheduleRepository;

    @Test
    void deskRoleCanCreateListDetailCancelAndCompleteReservations() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        long countMemberId = insertMemberFixture("P7API카운트회원");
        long countProductId = insertProductFixture("PT", "COUNT");
        long countMembershipId = insertMembershipFixture(countMemberId, countProductId, "PT", "COUNT", 5, 5, 0);
        TrainerSchedule countSchedule = createFutureSchedule("PT", 1);

        MvcResult createResult = mockMvc.perform(post("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "scheduleId": %d,
                                  "memo": "desk reservation"
                                }
                                """.formatted(countMemberId, countMembershipId, countSchedule.scheduleId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reservationStatus").value("CONFIRMED"))
                .andReturn();
        long reservationId = jsonLong(createResult, "/data/reservationId");

        mockMvc.perform(get("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("memberId", String.valueOf(countMemberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].reservationId").value(reservationId));

        mockMvc.perform(get("/api/v1/reservations/{reservationId}", reservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservationStatus").value("CONFIRMED"));

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/complete", reservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservation.reservationStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.data.countDeducted").value(true))
                .andExpect(jsonPath("$.data.remainingCount").value(4));

        long durationMemberId = insertMemberFixture("P7API기간회원");
        long durationProductId = insertProductFixture("GX", "DURATION");
        long durationMembershipId = insertMembershipFixture(durationMemberId, durationProductId, "GX", "DURATION", null, null, 0);
        TrainerSchedule durationSchedule = createFutureSchedule("GX", 10);

        MvcResult createForCancel = mockMvc.perform(post("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "scheduleId": %d
                                }
                                """.formatted(durationMemberId, durationMembershipId, durationSchedule.scheduleId())))
                .andExpect(status().isOk())
                .andReturn();
        long cancelReservationId = jsonLong(createForCancel, "/data/reservationId");

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/cancel", cancelReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                { "cancelReason": "desk cancel test" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservationStatus").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelReason").value("desk cancel test"));
    }

    @Test
    void unauthenticatedReservationMutationReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/reservations")
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": 1,
                                  "membershipId": 1,
                                  "scheduleId": 1
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void centerAdminCanUseReservationEndpoints() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        mockMvc.perform(get("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
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

    private long jsonLong(MvcResult result, String pointer) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString()).at(pointer);
        return node.asLong();
    }

    private TrainerSchedule createFutureSchedule(String type, int capacity) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        OffsetDateTime startAt = OffsetDateTime.now().plusDays(1).withNano(0);
        OffsetDateTime endAt = startAt.plusMinutes("PT".equals(type) ? 50 : 60);
        return trainerScheduleRepository.insert(new TrainerScheduleRepository.TrainerScheduleCreateCommand(
                CENTER_ID,
                type,
                "P7API트레이너-" + suffix,
                "P7API슬롯-" + suffix,
                startAt,
                endAt,
                capacity,
                0,
                "api fixture",
                1L
        ));
    }

    private long insertMemberFixture(String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, 'ACTIVE', CURRENT_DATE,
                    TRUE, FALSE, 1, 1
                )
                RETURNING member_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberName", prefix + "-" + suffix)
                .param("phone", "0105" + suffix.substring(0, 6))
                .query(Long.class)
                .single();
    }

    private long insertProductFixture(String productCategory, String productType) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, allow_transfer, product_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, :productCategory, :productType, :priceAmount,
                    :validityDays, :totalCount, FALSE, FALSE, 'ACTIVE',
                    1, 1
                )
                RETURNING product_id
                """)
                .param("centerId", CENTER_ID)
                .param("productName", "P7API상품-" + suffix)
                .param("productCategory", productCategory)
                .param("productType", productType)
                .param("priceAmount", new BigDecimal("50000"))
                .param("validityDays", "DURATION".equals(productType) ? 30 : null)
                .param("totalCount", "COUNT".equals(productType) ? 5 : null)
                .query(Long.class)
                .single();
    }

    private long insertMembershipFixture(
            long memberId,
            long productId,
            String productCategory,
            String productType,
            Integer totalCount,
            Integer remainingCount,
            int usedCount
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
                    :centerId, :memberId, :productId, 'ACTIVE',
                    :productNameSnapshot, :productCategorySnapshot, :productTypeSnapshot,
                    :priceAmountSnapshot, CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
                    :totalCount, :remainingCount, :usedCount,
                    0, 0, NULL,
                    1, 1
                )
                RETURNING membership_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("productNameSnapshot", "P7API회원권")
                .param("productCategorySnapshot", productCategory)
                .param("productTypeSnapshot", productType)
                .param("priceAmountSnapshot", new BigDecimal("50000"))
                .param("totalCount", totalCount)
                .param("remainingCount", remainingCount)
                .param("usedCount", usedCount)
                .query(Long.class)
                .single();
    }
}
