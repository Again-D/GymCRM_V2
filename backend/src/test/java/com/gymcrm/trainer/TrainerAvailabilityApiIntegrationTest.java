package com.gymcrm.trainer;

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
class TrainerAvailabilityApiIntegrationTest {
    private static final long CENTER_ID = 1L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUpUsers() {
        ensureUser(CENTER_ID, "desk-availability", "desk-pass-1234!", "Desk Availability", "ROLE_DESK");
        ensureUser(CENTER_ID, "trainer-availability", "trainer-pass-1234!", "Trainer Availability", "ROLE_TRAINER");
        ensureUser(CENTER_ID, "trainer-availability-other", "trainer-other-pass-1234!", "Other Trainer Availability", "ROLE_TRAINER");
    }

    @Test
    void trainerCanManageOwnAvailabilityAndDeskCanReadReadonly() throws Exception {
        String trainerToken = loginAndGetAccessToken("trainer-availability", "trainer-pass-1234!");
        Long trainerUserId = userIdByLogin("trainer-availability");
        String deskToken = loginAndGetAccessToken("desk-availability", "desk-pass-1234!");

        mockMvc.perform(put("/api/v1/trainers/me/availability/weekly")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("month", "2026-04")
                        .contentType("application/json")
                        .content("""
                                {
                                  "rules": [
                                    {"dayOfWeek": 1, "startTime": "09:00", "endTime": "18:00"},
                                    {"dayOfWeek": 3, "startTime": "10:00", "endTime": "16:00"}
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weeklyRules[*].dayOfWeek", hasItem(1)))
                .andExpect(jsonPath("$.data.weeklyRules[*].dayOfWeek", hasItem(3)))
                .andExpect(jsonPath("$.data.effectiveDays[?(@.date=='2026-04-01')].availabilityStatus").value(hasItem("AVAILABLE")));

        mockMvc.perform(put("/api/v1/trainers/me/availability/exceptions/{date}", "2026-04-07")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("month", "2026-04")
                        .contentType("application/json")
                        .content("""
                                {
                                  "exceptionType": "OFF",
                                  "memo": "세미나"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exceptions[?(@.exceptionDate=='2026-04-07')].exceptionType").value(hasItem("OFF")))
                .andExpect(jsonPath("$.data.effectiveDays[?(@.date=='2026-04-07')].availabilityStatus").value(hasItem("OFF")));

        mockMvc.perform(get("/api/v1/trainers/{trainerUserId}/availability", trainerUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("month", "2026-04"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exceptions[?(@.exceptionDate=='2026-04-07')].memo").value(hasItem("세미나")));

        mockMvc.perform(delete("/api/v1/trainers/me/availability/exceptions/{date}", "2026-04-07")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("month", "2026-04"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exceptions[?(@.exceptionDate=='2026-04-07')]").doesNotExist());
    }

    @Test
    void deskCannotMutateAndTrainerCannotReadOtherTrainerAvailability() throws Exception {
        String deskToken = loginAndGetAccessToken("desk-availability", "desk-pass-1234!");
        String trainerToken = loginAndGetAccessToken("trainer-availability", "trainer-pass-1234!");
        Long otherTrainerUserId = userIdByLogin("trainer-availability-other");

        mockMvc.perform(put("/api/v1/trainers/me/availability/weekly")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("month", "2026-04")
                        .contentType("application/json")
                        .content("""
                                {
                                  "rules": [
                                    {"dayOfWeek": 2, "startTime": "09:00", "endTime": "18:00"}
                                  ]
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        mockMvc.perform(get("/api/v1/trainers/{trainerUserId}/availability", otherTrainerUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("month", "2026-04"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void invalidOverrideTimesReturnValidationError() throws Exception {
        String trainerToken = loginAndGetAccessToken("trainer-availability", "trainer-pass-1234!");

        mockMvc.perform(put("/api/v1/trainers/me/availability/exceptions/{date}", "2026-04-08")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("month", "2026-04")
                        .contentType("application/json")
                        .content("""
                                {
                                  "exceptionType": "OVERRIDE",
                                  "overrideStartTime": "18:00",
                                  "overrideEndTime": "09:00"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
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
                        display_name = :displayName,
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
                    center_id, login_id, password_hash, display_name, user_status,
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
                SET display_name = :displayName
                WHERE user_id = :userId
                """)
                .param("displayName", displayName)
                .param("userId", userId)
                .update();
        replaceUserRole(userId, roleCode);
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
        return new com.fasterxml.jackson.databind.ObjectMapper().readTree(response)
                .path("data")
                .path("accessToken")
                .asText();
    }
}
