package com.gymcrm.trainer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
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
class TrainerManagementApiIntegrationTest {
    private static final long CENTER_ID = 1L;
    private static final long OTHER_CENTER_ID = 2L;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUpUsers() {
        ensureCenter(OTHER_CENTER_ID, "Secondary Center");
        ensureUser(CENTER_ID, "super-admin", "super-admin-1234!", "Super Admin", "ROLE_SUPER_ADMIN");
        ensureUser(CENTER_ID, "desk-trainer-mgmt", "desk-pass-1234!", "Desk Trainer", "ROLE_DESK");
        ensureUser(CENTER_ID, "trainer-trainer-mgmt", "trainer-pass-1234!", "Live Trainer", "ROLE_TRAINER");
        ensureUser(OTHER_CENTER_ID, "other-center-trainer", "other-pass-1234!", "Other Center Trainer", "ROLE_TRAINER");
    }

    @Test
    void centerAdminGetsTrainerAggregatesAndDeskGetsMaskedDetail() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        String trainerLoginId = "trainer-agg-" + shortId();
        long trainerUserId = createTrainer(adminToken, trainerLoginId, "집계 트레이너");
        long memberId = createMember(adminToken, "트레이너집계회원-" + shortId());
        long productId = insertDurationProductFixture("트레이너회원권-" + shortId());
        long membershipId = purchaseMembership(adminToken, memberId, productId, trainerUserId);

        long confirmedScheduleId = insertSchedule(CENTER_ID, "확정 슬롯");
        long cancelledScheduleId = insertSchedule(CENTER_ID, "취소 슬롯");
        long completedScheduleId = insertSchedule(CENTER_ID, "완료 슬롯");
        long noShowScheduleId = insertSchedule(CENTER_ID, "노쇼 슬롯");

        createReservation(adminToken, memberId, membershipId, confirmedScheduleId);
        long cancelledReservationId = createReservation(adminToken, memberId, membershipId, cancelledScheduleId);
        long completedReservationId = createReservation(adminToken, memberId, membershipId, completedScheduleId);
        long noShowReservationId = createReservation(adminToken, memberId, membershipId, noShowScheduleId);
        moveScheduleToPast(noShowScheduleId);

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/cancel", cancelledReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {"cancelReason":"aggregate exclusion"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/complete", completedReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/no-show", noShowReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/trainers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].displayName", hasItem("집계 트레이너")))
                .andExpect(jsonPath("$.data[?(@.displayName=='집계 트레이너')].assignedMemberCount").value(hasItem(1)))
                .andExpect(jsonPath("$.data[?(@.displayName=='집계 트레이너')].todayConfirmedReservationCount").value(hasItem(1)));

        String deskToken = loginAndGetAccessToken("desk-trainer-mgmt", "desk-pass-1234!");
        mockMvc.perform(get("/api/v1/trainers/{userId}", trainerUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.displayName").value("집계 트레이너"))
                .andExpect(jsonPath("$.data.loginId").doesNotExist())
                .andExpect(jsonPath("$.data.assignedMembers[0].memberId").value(memberId));
    }

    @Test
    void deskCannotMutateTrainerAndTrainerCannotAccessTrainerManagement() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        long trainerUserId = createTrainer(adminToken, "trainer-mutate-" + shortId(), "상태 변경 대상");
        String deskToken = loginAndGetAccessToken("desk-trainer-mgmt", "desk-pass-1234!");

        mockMvc.perform(patch("/api/v1/trainers/{userId}/status", trainerUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"userStatus":"INACTIVE"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        String trainerToken = loginAndGetAccessToken("trainer-trainer-mgmt", "trainer-pass-1234!");
        mockMvc.perform(get("/api/v1/trainers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void centerAdminCannotReadOrCreateAcrossAnotherCenter() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        Long otherCenterTrainerId = jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE center_id = :centerId
                  AND login_id = 'other-center-trainer'
                  AND is_deleted = FALSE
                """)
                .param("centerId", OTHER_CENTER_ID)
                .query(Long.class)
                .single();

        mockMvc.perform(get("/api/v1/trainers/{userId}", otherCenterTrainerId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/v1/trainers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "centerId": 2,
                                  "loginId": "cross-center-create",
                                  "password": "cross-center-1234!",
                                  "displayName": "Cross Center",
                                  "phone": "010-5555-6666"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void superAdminCanManageTrainersAcrossCenters() throws Exception {
        String superAdminToken = loginAndGetAccessToken("super-admin", "super-admin-1234!");

        MvcResult createResult = mockMvc.perform(post("/api/v1/trainers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + superAdminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "centerId": 2,
                                  "loginId": "super-cross-trainer",
                                  "password": "super-cross-1234!",
                                  "displayName": "Super Cross Trainer",
                                  "phone": "010-4444-5555"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.centerId").value(2))
                .andReturn();

        long trainerUserId = jsonLong(createResult, "/data/userId");

        mockMvc.perform(get("/api/v1/trainers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + superAdminToken)
                        .param("centerId", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].displayName", hasItem("Super Cross Trainer")));

        mockMvc.perform(get("/api/v1/trainers/{userId}", trainerUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.loginId").value("super-cross-trainer"));

        mockMvc.perform(patch("/api/v1/trainers/{userId}", trainerUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + superAdminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "super-cross-trainer-updated",
                                  "displayName": "Super Cross Trainer Updated",
                                  "phone": "010-6666-7777"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.displayName").value("Super Cross Trainer Updated"))
                .andExpect(jsonPath("$.data.phone").value("010-6666-7777"));

        mockMvc.perform(patch("/api/v1/trainers/{userId}/status", trainerUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + superAdminToken)
                        .contentType("application/json")
                        .content("""
                                {"userStatus":"INACTIVE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userStatus").value("INACTIVE"));
    }

    private long createTrainer(String adminToken, String loginId, String displayName) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trainers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "centerId": 1,
                                  "loginId": "%s",
                                  "password": "trainer-create-1234!",
                                  "displayName": "%s",
                                  "phone": "010-1234-5678"
                                }
                                """.formatted(loginId, displayName)))
                .andExpect(status().isOk())
                .andReturn();
        return jsonLong(result, "/data/userId");
    }

    private long createMember(String adminToken, String memberName) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberName": "%s",
                                  "phone": "010%s",
                                  "memberStatus": "ACTIVE",
                                  "joinDate": "%s",
                                  "consentSms": true,
                                  "consentMarketing": false
                                }
                                """.formatted(memberName, randomDigits(8), LocalDate.now(BUSINESS_ZONE))))
                .andExpect(status().isOk())
                .andReturn();
        return jsonLong(result, "/data/memberId");
    }

    private long purchaseMembership(String adminToken, long memberId, long productId, long trainerUserId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/members/{memberId}/memberships", memberId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "productId": %d,
                                  "assignedTrainerId": %d,
                                  "startDate": "%s",
                                  "paidAmount": 120000,
                                  "paymentMethod": "CARD"
                                }
                                """.formatted(productId, trainerUserId, LocalDate.now(BUSINESS_ZONE))))
                .andExpect(status().isOk())
                .andReturn();
        return jsonLong(result, "/data/membership/membershipId");
    }

    private long createReservation(String adminToken, long memberId, long membershipId, long scheduleId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "scheduleId": %d
                                }
                                """.formatted(memberId, membershipId, scheduleId)))
                .andExpect(status().isOk())
                .andReturn();
        return jsonLong(result, "/data/reservationId");
    }

    private long insertDurationProductFixture(String productName) {
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, allow_hold, allow_transfer, product_status, created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, 'MEMBERSHIP', 'DURATION', 120000,
                    30, FALSE, FALSE, 'ACTIVE', 0, 0
                )
                RETURNING product_id
                """)
                .param("centerId", CENTER_ID)
                .param("productName", productName)
                .query(Long.class)
                .single();
    }

    private long insertSchedule(long centerId, String slotTitle) {
        OffsetDateTime startAt = LocalDate.now(BUSINESS_ZONE).plusDays(1)
                .atTime(9 + (int) (Math.random() * 8), 0)
                .atZone(BUSINESS_ZONE)
                .toOffsetDateTime();
        OffsetDateTime endAt = startAt.plusMinutes(50);
        return jdbcClient.sql("""
                INSERT INTO trainer_schedules (
                    center_id, schedule_type, trainer_name, slot_title, start_at, end_at,
                    capacity, current_count, created_by, updated_by
                )
                VALUES (
                    :centerId, 'PT', '자동 트레이너', :slotTitle, :startAt, :endAt,
                    10, 0, 0, 0
                )
                RETURNING schedule_id
                """)
                .param("centerId", centerId)
                .param("slotTitle", slotTitle + "-" + shortId())
                .param("startAt", startAt)
                .param("endAt", endAt)
                .query(Long.class)
                .single();
    }

    private void moveScheduleToPast(long scheduleId) {
        OffsetDateTime endAt = OffsetDateTime.now(BUSINESS_ZONE).minusMinutes(10);
        OffsetDateTime startAt = endAt.minusMinutes(50);
        jdbcClient.sql("""
                UPDATE trainer_schedules
                SET start_at = :startAt,
                    end_at = :endAt,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE schedule_id = :scheduleId
                """)
                .param("scheduleId", scheduleId)
                .param("startAt", startAt)
                .param("endAt", endAt)
                .update();
    }

    private void ensureCenter(long centerId, String centerName) {
        Integer existing = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM centers
                WHERE center_id = :centerId
                """)
                .param("centerId", centerId)
                .query(Integer.class)
                .single();
        if (existing != null && existing > 0) {
            return;
        }
        jdbcClient.sql("""
                INSERT INTO centers (
                    center_id, center_name, phone, created_by, updated_by
                )
                VALUES (
                    :centerId, :centerName, '010-0000-0000', 0, 0
                )
                """)
                .param("centerId", centerId)
                .param("centerName", centerName)
                .update();
    }

    private void ensureUser(long centerId, String loginId, String password, String displayName, String roleCode) {
        int updated = jdbcClient.sql("""
                UPDATE users
                SET password_hash = :passwordHash,
                    display_name = :displayName,
                    phone = '010-1111-2222',
                    role_code = :roleCode,
                    user_status = 'ACTIVE',
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                  AND login_id = :loginId
                """)
                .param("centerId", centerId)
                .param("loginId", loginId)
                .param("passwordHash", passwordEncoder.encode(password))
                .param("displayName", displayName)
                .param("roleCode", roleCode)
                .update();

        if (updated == 0) {
            jdbcClient.sql("""
                    INSERT INTO users (
                        center_id, login_id, password_hash, display_name, phone, role_code, user_status,
                        created_by, updated_by
                    )
                    VALUES (
                        :centerId, :loginId, :passwordHash, :displayName, '010-1111-2222', :roleCode, 'ACTIVE',
                        0, 0
                    )
                    """)
                    .param("centerId", centerId)
                    .param("loginId", loginId)
                    .param("passwordHash", passwordEncoder.encode(password))
                    .param("displayName", displayName)
                    .param("roleCode", roleCode)
                    .update();
        }
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

    private long jsonLong(MvcResult result, String pointer) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.at(pointer).asLong();
    }

    private String randomDigits(int length) {
        StringBuilder builder = new StringBuilder(length);
        while (builder.length() < length) {
            builder.append(Math.abs(UUID.randomUUID().getMostSignificantBits()));
        }
        return builder.substring(0, length);
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
