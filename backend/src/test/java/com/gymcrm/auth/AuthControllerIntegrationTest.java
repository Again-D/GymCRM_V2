package com.gymcrm.auth;

import com.gymcrm.common.auth.AuthCookieSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
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
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void ensureSeedUserIsActive() {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM users
                WHERE login_id = 'center-admin'
                  AND is_deleted = FALSE
                """).query(Integer.class).single();
        assertNotNull(count);
    }

    @Test
    void loginThenMeThenRefreshThenLogoutFlowWorks() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "center-admin",
                                  "password": "dev-admin-1234!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.user.loginId").value("center-admin"))
                .andExpect(cookie().exists(AuthCookieSupport.REFRESH_COOKIE_NAME))
                .andReturn();

        String accessToken = JsonExtractors.readString(loginResult.getResponse().getContentAsString(), "$.data.accessToken");
        String refreshCookieHeader = loginResult.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String refreshToken = CookieExtractors.extractCookieValue(refreshCookieHeader, AuthCookieSupport.REFRESH_COOKIE_NAME);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.loginId").value("center-admin"))
                .andExpect(jsonPath("$.data.roleCode").value("ROLE_CENTER_ADMIN"));

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(cookie().exists(AuthCookieSupport.REFRESH_COOKIE_NAME))
                .andReturn();

        String newRefreshCookieHeader = refreshResult.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String nextRefreshToken = CookieExtractors.extractCookieValue(newRefreshCookieHeader, AuthCookieSupport.REFRESH_COOKIE_NAME);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, nextRefreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(cookie().maxAge(AuthCookieSupport.REFRESH_COOKIE_NAME, 0));
    }

    @Test
    void reusedRefreshTokenIsRejectedAfterRotation() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "center-admin",
                                  "password": "dev-admin-1234!"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        String refreshCookieHeader = loginResult.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String refreshToken = CookieExtractors.extractCookieValue(refreshCookieHeader, AuthCookieSupport.REFRESH_COOKIE_NAME);

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, refreshToken)))
                .andExpect(status().isOk())
                .andReturn();

        String newRefreshCookieHeader = refreshResult.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String nextRefreshToken = CookieExtractors.extractCookieValue(newRefreshCookieHeader, AuthCookieSupport.REFRESH_COOKIE_NAME);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, refreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"))
                .andExpect(jsonPath("$.error.status").value(401))
                .andExpect(jsonPath("$.error.detail", containsString("무효화")));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, nextRefreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));
    }

    @Test
    void trainersEndpointReturnsActiveTrainerRows() throws Exception {
        ensureTrainerUser();
        ensureDeskUser();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "center-admin",
                                  "password": "dev-admin-1234!"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = JsonExtractors.readString(loginResult.getResponse().getContentAsString(), "$.data.accessToken");

        mockMvc.perform(get("/api/v1/auth/trainers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].loginId", hasItem("trainer-user")))
                .andExpect(jsonPath("$.data[*].loginId").value(org.hamcrest.Matchers.not(hasItem("desk-user"))));
    }

    private void ensureTrainerUser() {
        int updated = jdbcClient.sql("""
                UPDATE users
                SET password_hash = :passwordHash,
                    display_name = :displayName,
                    user_status = 'ACTIVE',
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = 1
                  AND login_id = 'trainer-user'
                """)
                .param("passwordHash", passwordEncoder.encode("trainer-user-1234!"))
                .param("displayName", "Trainer User")
                .update();

        Long trainerUserId;
        if (updated == 0) {
            trainerUserId = jdbcClient.sql("""
                    INSERT INTO users (
                        center_id, login_id, password_hash, display_name, user_status,
                        created_by, updated_by
                    )
                    VALUES (
                        1, 'trainer-user', :passwordHash, 'Trainer User', 'ACTIVE',
                        0, 0
                    )
                    RETURNING user_id
                    """)
                    .param("passwordHash", passwordEncoder.encode("trainer-user-1234!"))
                    .query(Long.class)
                    .single();
        } else {
            trainerUserId = jdbcClient.sql("""
                    SELECT user_id
                    FROM users
                    WHERE center_id = 1
                      AND login_id = 'trainer-user'
                    """)
                    .query(Long.class)
                    .single();
        }

        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", trainerUserId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_by)
                SELECT :userId, role_id, 0
                FROM roles
                WHERE role_code = 'ROLE_TRAINER'
                """)
                .param("userId", trainerUserId)
                .update();
    }

    private void ensureDeskUser() {
        int updated = jdbcClient.sql("""
                UPDATE users
                SET password_hash = :passwordHash,
                    display_name = :displayName,
                    user_status = 'ACTIVE',
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = 1
                  AND login_id = 'desk-user'
                """)
                .param("passwordHash", passwordEncoder.encode("desk-user-1234!"))
                .param("displayName", "Desk User")
                .update();

        Long deskUserId;
        if (updated == 0) {
            deskUserId = jdbcClient.sql("""
                    INSERT INTO users (
                        center_id, login_id, password_hash, display_name, user_status,
                        created_by, updated_by
                    )
                    VALUES (
                        1, 'desk-user', :passwordHash, 'Desk User', 'ACTIVE',
                        0, 0
                    )
                    RETURNING user_id
                    """)
                    .param("passwordHash", passwordEncoder.encode("desk-user-1234!"))
                    .query(Long.class)
                    .single();
        } else {
            deskUserId = jdbcClient.sql("""
                    SELECT user_id
                    FROM users
                    WHERE center_id = 1
                      AND login_id = 'desk-user'
                    """)
                    .query(Long.class)
                    .single();
        }

        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", deskUserId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_by)
                SELECT :userId, role_id, 0
                FROM roles
                WHERE role_code = 'ROLE_DESK'
                """)
                .param("userId", deskUserId)
                .update();
    }

    static final class CookieExtractors {
        private CookieExtractors() {}

        static String extractCookieValue(String setCookieHeader, String cookieName) {
            if (setCookieHeader == null) {
                throw new IllegalStateException("Missing Set-Cookie header");
            }
            String prefix = cookieName + "=";
            if (!setCookieHeader.startsWith(prefix)) {
                throw new IllegalStateException("Unexpected cookie header: " + setCookieHeader);
            }
            int end = setCookieHeader.indexOf(';');
            return end < 0 ? setCookieHeader.substring(prefix.length()) : setCookieHeader.substring(prefix.length(), end);
        }
    }

    static final class JsonExtractors {
        private JsonExtractors() {}

        static String readString(String json, String jsonPath) {
            // Minimal extraction for tests without adding a new JSONPath dependency.
            if ("$.data.accessToken".equals(jsonPath)) {
                String marker = "\"accessToken\":\"";
                int start = json.indexOf(marker);
                if (start < 0) {
                    throw new IllegalStateException("accessToken not found in json");
                }
                int valueStart = start + marker.length();
                int end = json.indexOf('"', valueStart);
                return json.substring(valueStart, end);
            }
            throw new IllegalArgumentException("Unsupported jsonPath for test extractor: " + jsonPath);
        }
    }
}
