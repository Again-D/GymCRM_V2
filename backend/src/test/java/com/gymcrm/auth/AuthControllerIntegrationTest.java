package com.gymcrm.auth;

import com.gymcrm.common.auth.AuthCookieSupport;
import com.gymcrm.common.auth.service.JwtTokenService;
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
import static org.junit.jupiter.api.Assertions.assertEquals;
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

    @Autowired
    private JwtTokenService jwtTokenService;

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
                .andExpect(jsonPath("$.data.user.roleCode").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.data.user.primaryRole").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.data.user.roles[0]").value("ROLE_ADMIN"))
                .andExpect(cookie().exists(AuthCookieSupport.REFRESH_COOKIE_NAME))
                .andReturn();

        String accessToken = JsonExtractors.readString(loginResult.getResponse().getContentAsString(), "$.data.accessToken");
        JwtTokenService.AccessTokenClaims accessTokenClaims = jwtTokenService.parseAccessToken(accessToken);
        assertEquals("ROLE_ADMIN", accessTokenClaims.roleCode());
        assertEquals("ROLE_ADMIN", accessTokenClaims.primaryRole());
        assertEquals(java.util.List.of("ROLE_ADMIN"), accessTokenClaims.roles());
        String refreshCookieHeader = loginResult.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String refreshToken = CookieExtractors.extractCookieValue(refreshCookieHeader, AuthCookieSupport.REFRESH_COOKIE_NAME);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.loginId").value("center-admin"))
                .andExpect(jsonPath("$.data.roleCode").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.data.primaryRole").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.data.roles[0]").value("ROLE_ADMIN"));

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
                .andExpect(jsonPath("$.data[*].userName", hasItem("Trainer User")))
                .andExpect(jsonPath("$.data[*].loginId").doesNotExist())
                .andExpect(jsonPath("$.data[*].userName").value(org.hamcrest.Matchers.not(hasItem("Desk User"))));
    }

    @Test
    void userListEndpointSupportsFiltersAndPaging() throws Exception {
        ensureManagerUser("manager-list-a", "Manager List A");
        ensureManagerUser("manager-list-b", "Manager List B");
        ensureDeskUser("desk-list-user", "Desk List User");

        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(get("/api/v1/auth/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("q", "Manager List")
                        .param("roleCode", "ROLE_MANAGER")
                        .param("userStatus", "ACTIVE")
                        .param("page", "2")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.page.page").value(2))
                .andExpect(jsonPath("$.data.page.size").value(1))
                .andExpect(jsonPath("$.data.page.totalItems").value(4))
                .andExpect(jsonPath("$.data.page.totalPages").value(4))
                .andExpect(jsonPath("$.data.items[0].loginId").value("manager-list-b"))
                .andExpect(jsonPath("$.data.items[0].roleCode").value("ROLE_MANAGER"))
                .andExpect(jsonPath("$.data.items[0].userStatus").value("ACTIVE"));
    }

    @Test
    void userListEndpointSupportsDefaultBlankSearch() throws Exception {
        ensureManagerUser("manager-list-default", "Manager List Default");

        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(get("/api/v1/auth/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("page", "1")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.items[*].loginId").exists())
                .andExpect(jsonPath("$.data.page.page").value(1));
    }

    @Test
    void managerCannotAccessUserListEndpoint() throws Exception {
        ensureManagerUser("manager-list-denied", "Manager List Denied");
        String managerToken = loginAndGetAccessToken("manager-list-denied", "manager-list-denied-1234!");

        mockMvc.perform(get("/api/v1/auth/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    private void ensureTrainerUser() {
        ensureUserByRole("trainer-user", "trainer-user-1234!", "ROLE_TRAINER", "Trainer User");
    }

    private void ensureDeskUser() {
        ensureUserByRole("desk-user", "desk-user-1234!", "ROLE_DESK", "Desk User");
    }

    private void ensureDeskUser(String loginId, String displayName) {
        ensureUserByRole(loginId, loginId + "-1234!", "ROLE_DESK", displayName);
    }

    private void ensureManagerUser(String loginId, String displayName) {
        ensureUserByRole(loginId, loginId + "-1234!", "ROLE_MANAGER", displayName);
    }

    private void ensureUserByRole(String loginId, String password, String roleCode, String displayName) {
        int updated = jdbcClient.sql("""
                UPDATE users
                SET password_hash = :passwordHash,
                    user_name = :displayName,
                    user_status = 'ACTIVE',
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = 1
                  AND login_id = :loginId
                """)
                .param("loginId", loginId)
                .param("passwordHash", passwordEncoder.encode(password))
                .param("displayName", displayName)
                .update();

        Long userId;
        if (updated == 0) {
            userId = jdbcClient.sql("""
                    INSERT INTO users (
                        center_id, login_id, password_hash, user_name, user_status,
                        created_by, updated_by
                    )
                    VALUES (
                        1, :loginId, :passwordHash, :displayName, 'ACTIVE',
                        0, 0
                    )
                    RETURNING user_id
                    """)
                    .param("loginId", loginId)
                    .param("passwordHash", passwordEncoder.encode(password))
                    .param("displayName", displayName)
                    .query(Long.class)
                    .single();
        } else {
            userId = jdbcClient.sql("""
                    SELECT user_id
                    FROM users
                    WHERE center_id = 1
                      AND login_id = :loginId
                    """)
                    .param("loginId", loginId)
                    .query(Long.class)
                    .single();
        }

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
        return JsonExtractors.readString(result.getResponse().getContentAsString(), "$.data.accessToken");
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
