package com.gymcrm.auth;

import com.gymcrm.common.auth.AuthCookieSupport;
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

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
class AuthPasswordLifecycleIntegrationTest {
    private static final long CENTER_ID = 1L;
    private static final long OTHER_CENTER_ID = 2L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final List<Long> createdUserIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM users
                WHERE login_id = 'center-admin'
                  AND is_deleted = FALSE
                """)
                .query(Integer.class)
                .single();
        assertNotNull(count);
        setPasswordChangeRequired("center-admin", false);
    }

    @AfterEach
    void tearDown() {
        for (Long userId : createdUserIds) {
            deleteUser(userId);
        }
        createdUserIds.clear();
        setPasswordChangeRequired("center-admin", false);
    }

    @Test
    void superAdminCanCreateAdminAccountInCurrentCenter() throws Exception {
        String superAdminLoginId = uniqueLoginId("super-admin-create");
        Long superAdminUserId = ensureUser(CENTER_ID, superAdminLoginId, "super-admin-1234!", "Super Admin", "ROLE_SUPER_ADMIN");
        String superAdminToken = loginAndGetAccessToken(superAdminLoginId, "super-admin-1234!");

        String createdLoginId = uniqueLoginId("admin-create");
        String temporaryPassword = "Admin-temp-1234!";

        MvcResult createResult = createAccount(superAdminToken, createdLoginId, "신규 관리자", "ROLE_ADMIN", temporaryPassword);
        createResult.getResponse().getContentAsString();

        Long createdUserId = queryUserId(CENTER_ID, createdLoginId);
        createdUserIds.add(createdUserId);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(createdLoginId, temporaryPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.passwordChangeRequired").value(true));

        assertPasswordChangeRequired(createdUserId, true);
        assertUserStatus(createdUserId, "ACTIVE");
        createdUserIds.add(superAdminUserId);
    }

    @Test
    void adminCanCreateOperationalAccountsAndRejectAdminRole() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        for (String roleCode : new String[] {"ROLE_MANAGER", "ROLE_DESK", "ROLE_TRAINER"}) {
            String loginId = uniqueLoginId(roleCode.toLowerCase());
            createAccount(adminToken, loginId, roleCode + " 사용자", roleCode, roleCode.toLowerCase() + "-temp-1234!");
            Long createdUserId = queryUserId(CENTER_ID, loginId);
            createdUserIds.add(createdUserId);
            assertPasswordChangeRequired(createdUserId, true);
        }

        mockMvc.perform(post("/api/v1/auth/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "userName": "금지 관리자",
                                  "roleCode": "ROLE_ADMIN",
                                  "temporaryPassword": "Admin-temp-1234!"
                                }
                                """.formatted(uniqueLoginId("blocked-admin"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void createRejectsDuplicateLoginId() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        String loginId = uniqueLoginId("duplicate-login");

        createAccount(adminToken, loginId, "중복 사용자", "ROLE_MANAGER", "Dup-temp-1234!");
        Long userId = queryUserId(CENTER_ID, loginId);
        createdUserIds.add(userId);

        mockMvc.perform(post("/api/v1/auth/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "userName": "중복 사용자 2",
                                  "roleCode": "ROLE_DESK",
                                  "temporaryPassword": "Dup2-temp-1234!"
                                }
                                """.formatted(loginId)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    void normalPasswordChangeRequiresCurrentPassword() throws Exception {
        String loginId = uniqueLoginId("self-change");
        Long userId = ensureUser(CENTER_ID, loginId, "self-change-1234!", "자기 변경", "ROLE_DESK");
        createdUserIds.add(userId);

        String accessToken = loginAndGetAccessToken(loginId, "self-change-1234!");
        String newPassword = "self-change-new-1234!";

        mockMvc.perform(patch("/api/v1/auth/password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "currentPassword": "self-change-1234!",
                                  "newPassword": "%s",
                                  "newPasswordConfirmation": "%s"
                                }
                                """.formatted(newPassword, newPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordChangeRequired").value(false));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(loginId, newPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.passwordChangeRequired").value(false));
    }

    @Test
    void forcedChangePasswordChangeSkipsCurrentPassword() throws Exception {
        String loginId = uniqueLoginId("forced-change");
        String temporaryPassword = "forced-temp-1234!";
        createAccount(loginAndGetAccessToken("center-admin", "dev-admin-1234!"), loginId, "강제 변경", "ROLE_TRAINER", temporaryPassword);
        Long userId = queryUserId(CENTER_ID, loginId);
        createdUserIds.add(userId);

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(loginId, temporaryPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.passwordChangeRequired").value(true))
                .andReturn();

        String accessToken = AuthControllerIntegrationTest.JsonExtractors.readString(
                loginResult.getResponse().getContentAsString(),
                "$.data.accessToken"
        );
        String newPassword = "forced-change-new-1234!";

        mockMvc.perform(patch("/api/v1/auth/password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "currentPassword": null,
                                  "newPassword": "%s",
                                  "newPasswordConfirmation": "%s"
                                }
                                """.formatted(newPassword, newPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordChangeRequired").value(false));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(loginId, newPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.passwordChangeRequired").value(false));
    }

    @Test
    void adminPasswordResetReappliesForcedChangeAndRevokesExistingSessions() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        String targetLoginId = uniqueLoginId("reset-target");
        String originalPassword = "reset-target-1234!";
        Long targetUserId = ensureUser(CENTER_ID, targetLoginId, originalPassword, "리셋 대상", "ROLE_DESK");
        createdUserIds.add(targetUserId);

        MvcResult targetLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(targetLoginId, originalPassword)))
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

        String resetPassword = "reset-temp-1234!";
        mockMvc.perform(post("/api/v1/auth/users/{userId}/password-reset", targetUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "temporaryPassword": "%s"
                                }
                                """.formatted(resetPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordChangeRequired").value(true))
                .andExpect(jsonPath("$.data.userStatus").value("ACTIVE"));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + targetAccessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, targetRefreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));

        MvcResult forcedLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(targetLoginId, resetPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.passwordChangeRequired").value(true))
                .andReturn();

        String forcedAccessToken = AuthControllerIntegrationTest.JsonExtractors.readString(
                forcedLoginResult.getResponse().getContentAsString(),
                "$.data.accessToken"
        );
        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + forcedAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordChangeRequired").value(true));

        ensureCenter(OTHER_CENTER_ID, "Secondary Center");
        Long otherCenterUserId = ensureUser(OTHER_CENTER_ID, uniqueLoginId("cross-center"), "cross-center-1234!", "다른 센터", "ROLE_DESK");
        createdUserIds.add(otherCenterUserId);

        mockMvc.perform(post("/api/v1/auth/users/{userId}/password-reset", otherCenterUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "temporaryPassword": "cross-center-temp-1234!"
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void selfServiceRejectsWeakPasswordPolicyValues() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        mockMvc.perform(post("/api/v1/auth/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "userName": "약한 비밀번호",
                                  "roleCode": "ROLE_DESK",
                                  "temporaryPassword": "weak"
                                }
                                """.formatted(uniqueLoginId("weak-create"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        String loginId = uniqueLoginId("weak-change");
        Long userId = ensureUser(CENTER_ID, loginId, "weak-change-1234!", "약한 변경 대상", "ROLE_DESK");
        createdUserIds.add(userId);
        String accessToken = loginAndGetAccessToken(loginId, "weak-change-1234!");

        mockMvc.perform(patch("/api/v1/auth/password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "currentPassword": "weak-change-1234!",
                                  "newPassword": "weak",
                                  "newPasswordConfirmation": "weak"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void adminCannotResetOwnPasswordWithTheAdminResetEndpoint() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        Long adminUserId = queryUserId(CENTER_ID, "center-admin");

        mockMvc.perform(post("/api/v1/auth/users/{userId}/password-reset", adminUserId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "temporaryPassword": "admin-reset-1234!"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.error.detail", containsString("/my-account")));
    }

    private MvcResult createAccount(String accessToken, String loginId, String userName, String roleCode, String temporaryPassword) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "userName": "%s",
                                  "roleCode": "%s",
                                  "temporaryPassword": "%s"
                                }
                                """.formatted(loginId, userName, roleCode, temporaryPassword)))
                .andExpect(status().isOk())
                .andReturn();
        Long userId = queryUserId(CENTER_ID, loginId);
        createdUserIds.add(userId);
        return result;
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

    private Long ensureUser(long centerId, String loginId, String password, String userName, String roleCode) {
        int updated = jdbcClient.sql("""
                UPDATE users
                SET password_hash = :passwordHash,
                    user_name = :userName,
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
                .param("userName", userName)
                .update();

        Long userId;
        if (updated == 0) {
            userId = jdbcClient.sql("""
                    INSERT INTO users (
                        center_id, login_id, password_hash, user_name, user_status,
                        created_by, updated_by
                    )
                    VALUES (
                        :centerId, :loginId, :passwordHash, :userName, 'ACTIVE',
                        0, 0
                    )
                    RETURNING user_id
                    """)
                    .param("centerId", centerId)
                    .param("loginId", loginId)
                    .param("passwordHash", passwordEncoder.encode(password))
                    .param("userName", userName)
                    .query(Long.class)
                    .single();
        } else {
            userId = queryUserId(centerId, loginId);
        }

        replaceUserRole(userId, roleCode);
        return userId;
    }

    private Long queryUserId(long centerId, String loginId) {
        return jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .param("loginId", loginId)
                .query(Long.class)
                .single();
    }

    private void deleteUser(Long userId) {
        if (userId == null) {
            return;
        }
        jdbcClient.sql("DELETE FROM auth_refresh_tokens WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("DELETE FROM users WHERE user_id = :userId")
                .param("userId", userId)
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

    private void assertPasswordChangeRequired(Long userId, boolean expected) {
        Boolean actual = jdbcClient.sql("""
                SELECT password_change_required
                FROM users
                WHERE user_id = :userId
                """)
                .param("userId", userId)
                .query(Boolean.class)
                .single();
        assertNotNull(actual);
        assertTrue(actual == expected, "expected password_change_required=" + expected + " but was " + actual);
    }

    private void assertUserStatus(Long userId, String expected) {
        String actual = jdbcClient.sql("""
                SELECT user_status
                FROM users
                WHERE user_id = :userId
                """)
                .param("userId", userId)
                .query(String.class)
                .single();
        assertNotNull(actual);
        assertTrue(expected.equals(actual), "expected user_status=" + expected + " but was " + actual);
    }

    private void setPasswordChangeRequired(String loginId, boolean passwordChangeRequired) {
        jdbcClient.sql("""
                UPDATE users
                SET password_change_required = :passwordChangeRequired,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                  AND login_id = :loginId
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", loginId)
                .param("passwordChangeRequired", passwordChangeRequired)
                .update();
    }

    private String loginAndGetAccessToken(String loginId, String password) throws Exception {
        MvcResult result = performLogin(loginId, password);
        return AuthControllerIntegrationTest.JsonExtractors.readString(result.getResponse().getContentAsString(), "$.data.accessToken");
    }

    private MvcResult performLogin(String loginId, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(loginId, password)))
                .andExpect(status().isOk())
                .andReturn();
    }

    private String uniqueLoginId(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
