package com.gymcrm.reservation;

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
import java.time.ZoneId;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class GxScheduleApiIntegrationTest {
    private static final long CENTER_ID = 1L;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUpUsers() {
        clearGxScheduleData();
        ensureUser(CENTER_ID, "manager-gx", "manager-pass-1234!", "Manager GX", "ROLE_MANAGER");
        ensureUser(CENTER_ID, "desk-gx", "desk-pass-1234!", "Desk GX", "ROLE_DESK");
        ensureUser(CENTER_ID, "trainer-gx", "trainer-pass-1234!", "Trainer GX", "ROLE_TRAINER");
        ensureUser(CENTER_ID, "trainer-gx-other", "trainer-other-pass-1234!", "Other Trainer GX", "ROLE_TRAINER");
    }

    @Test
    void managerCanCreateRuleAndSnapshotContainsGeneratedSchedules() throws Exception {
        String managerToken = loginAndGetAccessToken("manager-gx", "manager-pass-1234!");
        long trainerUserId = userIdByLogin("trainer-gx");
        String month = currentMonth();
        int dayOfWeek = LocalDate.now(BUSINESS_ZONE).getDayOfWeek().getValue();

        mockMvc.perform(post("/api/v1/reservations/gx/rules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("month", month)
                        .contentType("application/json")
                        .content("""
                                {
                                  "className": "저녁 필라테스",
                                  "trainerUserId": %d,
                                  "dayOfWeek": %d,
                                  "startTime": "19:00",
                                  "endTime": "20:00",
                                  "capacity": 20,
                                  "effectiveStartDate": "%s"
                                }
                                """.formatted(trainerUserId, dayOfWeek, LocalDate.now(BUSINESS_ZONE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rules[*].className", hasItem("저녁 필라테스")))
                .andExpect(jsonPath("$.data.generatedSchedules[*].className", hasItem("저녁 필라테스")));

        mockMvc.perform(get("/api/v1/reservations/gx/snapshot")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("month", month))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rules[*].trainerUserId", hasItem((int) trainerUserId)))
                .andExpect(jsonPath("$.data.generatedSchedules[*].trainerUserId", hasItem((int) trainerUserId)));
    }

    @Test
    void trainerCannotCreateRuleButCanManageOwnRuleException() throws Exception {
        String managerToken = loginAndGetAccessToken("manager-gx", "manager-pass-1234!");
        String trainerToken = loginAndGetAccessToken("trainer-gx", "trainer-pass-1234!");
        long trainerUserId = userIdByLogin("trainer-gx");
        String month = currentMonth();
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate exceptionDate = today;

        MvcResult createResult = mockMvc.perform(post("/api/v1/reservations/gx/rules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("month", month)
                        .contentType("application/json")
                        .content("""
                                {
                                  "className": "아침 요가",
                                  "trainerUserId": %d,
                                  "dayOfWeek": %d,
                                  "startTime": "07:00",
                                  "endTime": "08:00",
                                  "capacity": 15,
                                  "effectiveStartDate": "%s"
                                }
                                """.formatted(trainerUserId, today.getDayOfWeek().getValue(), today)))
                .andExpect(status().isOk())
                .andReturn();
        long ruleId = jsonLong(createResult, "/data/rules/0/ruleId");

        mockMvc.perform(post("/api/v1/reservations/gx/rules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("month", month)
                        .contentType("application/json")
                        .content("""
                                {
                                  "className": "무단 생성",
                                  "trainerUserId": %d,
                                  "dayOfWeek": %d,
                                  "startTime": "09:00",
                                  "endTime": "10:00",
                                  "capacity": 10,
                                  "effectiveStartDate": "%s"
                                }
                                """.formatted(trainerUserId, today.getDayOfWeek().getValue(), today)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        mockMvc.perform(put("/api/v1/reservations/gx/rules/{ruleId}/exceptions/{date}", ruleId, exceptionDate)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("month", month)
                        .contentType("application/json")
                        .content("""
                                {
                                  "exceptionType": "OFF",
                                  "memo": "개인 사정"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exceptions[*].exceptionType", hasItem("OFF")))
                .andExpect(jsonPath("$.data.exceptions[*].memo", hasItem("개인 사정")));

        mockMvc.perform(put("/api/v1/reservations/gx/rules/{ruleId}/exceptions/{date}", ruleId, exceptionDate)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("month", month)
                        .contentType("application/json")
                        .content("""
                                {
                                  "exceptionType": "OVERRIDE",
                                  "overrideStartTime": "07:30",
                                  "overrideEndTime": "08:30",
                                  "overrideCapacity": 20,
                                  "memo": "임의 변경"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void occupiedGeneratedScheduleBlocksAutomaticRuleChange() throws Exception {
        String managerToken = loginAndGetAccessToken("manager-gx", "manager-pass-1234!");
        long trainerUserId = userIdByLogin("trainer-gx");
        String month = currentMonth();
        LocalDate today = LocalDate.now(BUSINESS_ZONE);

        MvcResult createResult = mockMvc.perform(post("/api/v1/reservations/gx/rules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("month", month)
                        .contentType("application/json")
                        .content("""
                                {
                                  "className": "점심 GX",
                                  "trainerUserId": %d,
                                  "dayOfWeek": %d,
                                  "startTime": "12:00",
                                  "endTime": "13:00",
                                  "capacity": 12,
                                  "effectiveStartDate": "%s"
                                }
                                """.formatted(trainerUserId, today.getDayOfWeek().getValue(), today)))
                .andExpect(status().isOk())
                .andReturn();
        long ruleId = jsonLong(createResult, "/data/rules/0/ruleId");
        long scheduleId = jsonLong(createResult, "/data/generatedSchedules/0/scheduleId");

        jdbcClient.sql("""
                UPDATE trainer_schedules
                SET current_count = 1,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE schedule_id = :scheduleId
                """)
                .param("scheduleId", scheduleId)
                .update();

        mockMvc.perform(put("/api/v1/reservations/gx/rules/{ruleId}", ruleId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("month", month)
                        .contentType("application/json")
                        .content("""
                                {
                                  "className": "점심 GX",
                                  "trainerUserId": %d,
                                  "dayOfWeek": %d,
                                  "startTime": "12:30",
                                  "endTime": "13:30",
                                  "capacity": 12,
                                  "effectiveStartDate": "%s",
                                  "active": true
                                }
                                """.formatted(trainerUserId, today.getDayOfWeek().getValue(), today)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    void snapshotAndCreateRuleIgnoreUnrelatedOccupiedRuleConflicts() throws Exception {
        String managerToken = loginAndGetAccessToken("manager-gx", "manager-pass-1234!");
        long trainerUserId = userIdByLogin("trainer-gx");
        long otherTrainerUserId = userIdByLogin("trainer-gx-other");
        String month = currentMonth();
        LocalDate today = LocalDate.now(BUSINESS_ZONE);

        MvcResult conflictingRuleResult = mockMvc.perform(post("/api/v1/reservations/gx/rules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("month", month)
                        .contentType("application/json")
                        .content("""
                                {
                                  "className": "충돌 규칙",
                                  "trainerUserId": %d,
                                  "dayOfWeek": %d,
                                  "startTime": "18:00",
                                  "endTime": "19:00",
                                  "capacity": 10,
                                  "effectiveStartDate": "%s"
                                }
                                """.formatted(trainerUserId, today.getDayOfWeek().getValue(), today)))
                .andExpect(status().isOk())
                .andReturn();
        long conflictingRuleId = jsonLong(conflictingRuleResult, "/data/rules/0/ruleId");
        long occupiedScheduleId = jsonLong(conflictingRuleResult, "/data/generatedSchedules/0/scheduleId");

        jdbcClient.sql("""
                UPDATE trainer_schedules
                SET current_count = 1,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE schedule_id = :scheduleId
                """)
                .param("scheduleId", occupiedScheduleId)
                .update();
        jdbcClient.sql("""
                UPDATE gx_schedule_rules
                SET start_time = '18:30',
                    end_time = '19:30',
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE rule_id = :ruleId
                """)
                .param("ruleId", conflictingRuleId)
                .update();

        mockMvc.perform(get("/api/v1/reservations/gx/snapshot")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("month", month))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rules[*].className", hasItem("충돌 규칙")));

        mockMvc.perform(post("/api/v1/reservations/gx/rules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("month", month)
                        .contentType("application/json")
                        .content("""
                                {
                                  "className": "정상 규칙",
                                  "trainerUserId": %d,
                                  "dayOfWeek": %d,
                                  "startTime": "20:00",
                                  "endTime": "21:00",
                                  "capacity": 12,
                                  "effectiveStartDate": "%s"
                                }
                                """.formatted(otherTrainerUserId, today.getDayOfWeek().getValue(), today)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rules[*].className", hasItem("정상 규칙")));
    }

    private long jsonLong(MvcResult result, String pointer) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .at(pointer)
                .asLong();
    }

    private String currentMonth() {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        return "%d-%02d".formatted(today.getYear(), today.getMonthValue());
    }

    private void ensureUser(long centerId, String loginId, String password, String displayName, String roleCode) {
        Integer existingUserId = jdbcClient.sql("""
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

        if (existingUserId != null) {
            jdbcClient.sql("""
                    UPDATE users
                    SET password_hash = :passwordHash,
                        user_name = :displayName,
                        user_status = 'ACTIVE',
                        is_deleted = FALSE,
                        deleted_at = NULL,
                        deleted_by = NULL,
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = 0
                    WHERE user_id = :userId
                    """)
                    .param("passwordHash", passwordEncoder.encode(password))
                    .param("displayName", displayName)
                    .param("userId", existingUserId.longValue())
                    .update();
            replaceUserRole(existingUserId.longValue(), roleCode);
            return;
        }

        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, user_name, user_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :loginId, :passwordHash, :displayName, 'ACTIVE',
                    0, 0
                )
                RETURNING user_id
                """)
                .param("centerId", centerId)
                .param("loginId", loginId)
                .param("passwordHash", passwordEncoder.encode(password))
                .param("displayName", displayName + "-" + UUID.randomUUID().toString().substring(0, 6))
                .query(Long.class)
                .single();
        jdbcClient.sql("""
                UPDATE users
                SET user_name = :displayName
                WHERE user_id = :userId
                """)
                .param("displayName", displayName)
                .param("userId", userId)
                .update();
        replaceUserRole(userId, roleCode);
    }

    private void clearGxScheduleData() {
        jdbcClient.sql("""
                UPDATE trainer_schedules
                SET is_deleted = TRUE,
                    deleted_at = CURRENT_TIMESTAMP,
                    deleted_by = 0,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                  AND source_rule_id IS NOT NULL
                  AND is_deleted = FALSE
                """)
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("""
                UPDATE gx_schedule_exceptions
                SET is_deleted = TRUE,
                    deleted_at = CURRENT_TIMESTAMP,
                    deleted_by = 0,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                """)
                .param("centerId", CENTER_ID)
                .update();
        jdbcClient.sql("""
                UPDATE gx_schedule_rules
                SET is_active = FALSE,
                    is_deleted = TRUE,
                    deleted_at = CURRENT_TIMESTAMP,
                    deleted_by = 0,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                """)
                .param("centerId", CENTER_ID)
                .update();
    }

    private void replaceUserRole(Long userId, String roleCode) {
        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_by)
                SELECT :userId, role_id, 0
                FROM roles
                WHERE role_code = :roleCode
                """)
                .param("userId", userId)
                .param("roleCode", roleCode)
                .update();
    }

    private Long userIdByLogin(String loginId) {
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
        String response = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(loginId, password)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response)
                .path("data")
                .path("accessToken")
                .asText();
    }
}
