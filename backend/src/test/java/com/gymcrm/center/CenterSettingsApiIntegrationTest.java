package com.gymcrm.center;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

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
class CenterSettingsApiIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void adminCanReadAndUpdateCurrentCenterProfile() throws Exception {
        CenterSnapshot original = readCurrentCenter();
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        try {
            mockMvc.perform(get("/api/v1/centers/me")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.centerId").value(original.centerId()))
                    .andExpect(jsonPath("$.data.centerName").value(original.centerName()));

            mockMvc.perform(patch("/api/v1/centers/me")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                            .contentType("application/json")
                            .content("""
                                    {
                                      "centerName": "  Updated Center Name  ",
                                      "phone": " 010-2222-3333 ",
                                      "address": "  Seoul, Gangnam "
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.centerName").value("Updated Center Name"))
                    .andExpect(jsonPath("$.data.phone").value("010-2222-3333"))
                    .andExpect(jsonPath("$.data.address").value("Seoul, Gangnam"));

            mockMvc.perform(get("/api/v1/centers/me")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.centerName").value("Updated Center Name"))
                    .andExpect(jsonPath("$.data.phone").value("010-2222-3333"))
                    .andExpect(jsonPath("$.data.address").value("Seoul, Gangnam"));
        } finally {
            restoreCenterProfile(original);
        }
    }

    @Test
    void managerCannotAccessCenterSettingsEndpoints() throws Exception {
        ensureUserByRole("center-settings-manager", "center-settings-manager-1234!", "ROLE_MANAGER", "Center Settings Manager");
        String managerToken = loginAndGetAccessToken("center-settings-manager", "center-settings-manager-1234!");

        mockMvc.perform(get("/api/v1/centers/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    private CenterSnapshot readCurrentCenter() {
        return jdbcClient.sql("""
                SELECT center_id, center_name, phone, address
                FROM centers
                WHERE center_id = 1
                """)
                .query((rs, rowNum) -> new CenterSnapshot(
                        rs.getLong("center_id"),
                        rs.getString("center_name"),
                        rs.getString("phone"),
                        rs.getString("address")
                ))
                .single();
    }

    private void restoreCenterProfile(CenterSnapshot center) {
        jdbcClient.sql("""
                UPDATE centers
                SET center_name = :centerName,
                    phone = :phone,
                    address = :address,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                """)
                .param("centerId", center.centerId())
                .param("centerName", center.centerName())
                .param("phone", center.phone())
                .param("address", center.address())
                .update();
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
        var result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "loginId": "%s",
                                  "password": "%s"
                                }
                                """.formatted(loginId, password)))
                .andExpect(status().isOk())
                .andReturn();
        return readAccessToken(result.getResponse().getContentAsString());
    }

    private String readAccessToken(String json) {
        String marker = "\"accessToken\":\"";
        int start = json.indexOf(marker);
        if (start < 0) {
            throw new IllegalStateException("accessToken not found in json");
        }
        int valueStart = start + marker.length();
        int end = json.indexOf('"', valueStart);
        return json.substring(valueStart, end);
    }

    private record CenterSnapshot(Long centerId, String centerName, String phone, String address) {}
}
