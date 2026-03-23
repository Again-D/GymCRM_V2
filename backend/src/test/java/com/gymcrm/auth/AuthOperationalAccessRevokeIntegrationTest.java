package com.gymcrm.auth;

import org.junit.jupiter.api.AfterEach;
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

import java.io.IOException;
import java.net.Socket;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
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
        "app.redis.enabled=true",
        "app.redis.auth-denylist.enabled=true"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class AuthOperationalAccessRevokeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AccessRevocationMarkerService accessRevocationMarkerService;

    private Long targetUserId;
    private String targetLoginId;
    private String targetPassword;

    @BeforeEach
    void setUp() {
        assumeTrue(isRedisReachable(), "local redis is not running on localhost:6379");
        targetLoginId = "revoke-target-" + UUID.randomUUID().toString().substring(0, 8);
        targetPassword = "target-pass-1234!";
        targetUserId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, display_name, user_status,
                    created_at, created_by, updated_at, updated_by
                )
                VALUES (
                    1, :loginId, :passwordHash, :displayName, 'ACTIVE',
                    NOW(), 1, NOW(), 1
                )
                RETURNING user_id
                """)
                .param("loginId", targetLoginId)
                .param("passwordHash", passwordEncoder.encode(targetPassword))
                .param("displayName", "Revoke Target")
                .query(Long.class)
                .single();
        replaceUserRole(targetUserId, "ROLE_DESK");
    }

    @AfterEach
    void tearDown() {
        if (targetUserId != null) {
            accessRevocationMarkerService.clear(targetUserId);
            jdbcClient.sql("DELETE FROM auth_refresh_tokens WHERE user_id = :userId")
                    .param("userId", targetUserId)
                    .update();
            jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                    .param("userId", targetUserId)
                    .update();
            jdbcClient.sql("DELETE FROM users WHERE user_id = :userId")
                    .param("userId", targetUserId)
                    .update();
        }
    }

    @Test
    void centerAdminForcedRevokeInvalidatesExistingAccessAndRefreshTokens() throws Exception {
        String adminAccessToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        MvcResult targetLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"loginId":"%s","password":"%s"}
                                """.formatted(targetLoginId, targetPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        String targetAccessToken = AuthControllerIntegrationTest.JsonExtractors.readString(
                targetLoginResult.getResponse().getContentAsString(),
                "$.data.accessToken"
        );
        String targetRefreshToken = AuthControllerIntegrationTest.CookieExtractors.extractCookieValue(
                targetLoginResult.getResponse().getHeader(HttpHeaders.SET_COOKIE),
                AuthCookieSupport.REFRESH_COOKIE_NAME
        );

        mockMvc.perform(post("/api/v1/auth/users/{userId}/revoke-access", targetUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(targetUserId.intValue()))
                .andExpect(jsonPath("$.data.revokedRefreshTokenCount").value(1));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + targetAccessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, targetRefreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));

        OffsetDateTime accessRevokedAfter = jdbcClient.sql("""
                SELECT access_revoked_after
                FROM users
                WHERE user_id = :userId
                """)
                .param("userId", targetUserId)
                .query(OffsetDateTime.class)
                .single();
        assertThat(accessRevokedAfter).isNotNull();

        Integer revokedRefreshCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM auth_refresh_tokens
                WHERE user_id = :userId
                  AND revoked_at IS NOT NULL
                  AND revoke_reason = 'FORCED_REVOKE'
                """)
                .param("userId", targetUserId)
                .query(Integer.class)
                .single();
        assertThat(revokedRefreshCount).isEqualTo(1);

        assertAuditEventExists("ACCOUNT_ACCESS_REVOKE");
    }

    @Test
    void roleDowngradeRevokesExistingAccessAndRefreshTokens() throws Exception {
        String adminAccessToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        jdbcClient.sql("""
                UPDATE users
                SET updated_at = NOW(),
                    updated_by = 1
                WHERE user_id = :userId
                """)
                .param("userId", targetUserId)
                .update();
        replaceUserRole(targetUserId, "ROLE_MANAGER");

        MvcResult targetLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"loginId":"%s","password":"%s"}
                                """.formatted(targetLoginId, targetPassword)))
                .andExpect(status().isOk())
                .andReturn();

        String targetAccessToken = AuthControllerIntegrationTest.JsonExtractors.readString(
                targetLoginResult.getResponse().getContentAsString(),
                "$.data.accessToken"
        );
        String targetRefreshToken = AuthControllerIntegrationTest.CookieExtractors.extractCookieValue(
                targetLoginResult.getResponse().getHeader(HttpHeaders.SET_COOKIE),
                AuthCookieSupport.REFRESH_COOKIE_NAME
        );

        mockMvc.perform(post("/api/v1/auth/users/{userId}/role", targetUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminAccessToken)
                        .contentType("application/json")
                        .content("""
                                {"roleCode":"ROLE_DESK"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(targetUserId.intValue()))
                .andExpect(jsonPath("$.data.roleCode").value("ROLE_DESK"))
                .andExpect(jsonPath("$.data.revokedRefreshTokenCount").value(1));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + targetAccessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, targetRefreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));

        String roleCode = jdbcClient.sql("""
                SELECT r.role_code
                FROM user_roles ur
                JOIN roles r ON r.role_id = ur.role_id
                WHERE ur.user_id = :userId
                """)
                .param("userId", targetUserId)
                .query(String.class)
                .single();
        assertThat(roleCode).isEqualTo("ROLE_DESK");
        assertAuditEventExists("ACCOUNT_ROLE_CHANGE");
    }

    @Test
    void centerAdminCannotPromoteUserToSuperAdmin() throws Exception {
        String adminAccessToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(post("/api/v1/auth/users/{userId}/role", targetUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminAccessToken)
                        .contentType("application/json")
                        .content("""
                                {"roleCode":"ROLE_SUPER_ADMIN"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        String roleCode = jdbcClient.sql("""
                SELECT r.role_code
                FROM user_roles ur
                JOIN roles r ON r.role_id = ur.role_id
                WHERE ur.user_id = :userId
                """)
                .param("userId", targetUserId)
                .query(String.class)
                .single();
        assertThat(roleCode).isEqualTo("ROLE_DESK");
    }

    @Test
    void deactivationRevokesExistingAccessAndRefreshTokens() throws Exception {
        String adminAccessToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        MvcResult targetLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"loginId":"%s","password":"%s"}
                                """.formatted(targetLoginId, targetPassword)))
                .andExpect(status().isOk())
                .andReturn();

        String targetAccessToken = AuthControllerIntegrationTest.JsonExtractors.readString(
                targetLoginResult.getResponse().getContentAsString(),
                "$.data.accessToken"
        );
        String targetRefreshToken = AuthControllerIntegrationTest.CookieExtractors.extractCookieValue(
                targetLoginResult.getResponse().getHeader(HttpHeaders.SET_COOKIE),
                AuthCookieSupport.REFRESH_COOKIE_NAME
        );

        mockMvc.perform(post("/api/v1/auth/users/{userId}/status", targetUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminAccessToken)
                        .contentType("application/json")
                        .content("""
                                {"userStatus":"INACTIVE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(targetUserId.intValue()))
                .andExpect(jsonPath("$.data.userStatus").value("INACTIVE"))
                .andExpect(jsonPath("$.data.revokedRefreshTokenCount").value(1));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + targetAccessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, targetRefreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));

        String userStatus = jdbcClient.sql("""
                SELECT user_status
                FROM users
                WHERE user_id = :userId
                """)
                .param("userId", targetUserId)
                .query(String.class)
                .single();
        assertThat(userStatus).isEqualTo("INACTIVE");
        assertAuditEventExists("ACCOUNT_STATUS_CHANGE");
    }

    private String loginAndGetAccessToken(String loginId, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"loginId":"%s","password":"%s"}
                                """.formatted(loginId, password)))
                .andExpect(status().isOk())
                .andReturn();
        return AuthControllerIntegrationTest.JsonExtractors.readString(
                result.getResponse().getContentAsString(),
                "$.data.accessToken"
        );
    }

    private boolean isRedisReachable() {
        try (Socket socket = new Socket("localhost", 6379)) {
            return socket.isConnected();
        } catch (IOException ex) {
            return false;
        }
    }

    private void replaceUserRole(Long userId, String roleCode) {
        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_by)
                SELECT :userId, role_id, 1
                FROM roles
                WHERE role_code = :roleCode
                """)
                .param("userId", userId)
                .param("roleCode", roleCode)
                .update();
    }

    private void assertAuditEventExists(String eventType) {
        Integer auditCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM audit_logs
                WHERE center_id = 1
                  AND event_type = :eventType
                  AND resource_type = 'USER'
                  AND resource_id = :resourceId
                """)
                .param("eventType", eventType)
                .param("resourceId", String.valueOf(targetUserId))
                .query(Integer.class)
                .single();
        assertThat(auditCount).isNotNull();
        assertThat(auditCount).isGreaterThanOrEqualTo(1);
    }
}
