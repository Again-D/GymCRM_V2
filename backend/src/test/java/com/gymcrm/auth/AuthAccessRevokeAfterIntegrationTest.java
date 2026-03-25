package com.gymcrm.auth;

import com.gymcrm.common.auth.service.AccessRevocationMarkerService;
import com.gymcrm.common.auth.service.AuthAccessRevocationService;
import com.gymcrm.common.auth.service.JwtTokenService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.IOException;
import java.net.Socket;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
class AuthAccessRevokeAfterIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private JwtTokenService jwtTokenService;

    @Autowired
    private AuthAccessRevocationService authAccessRevocationService;

    @Autowired
    private AccessRevocationMarkerService accessRevocationMarkerService;

    @BeforeEach
    void ensurePrerequisites() {
        assumeTrue(isRedisReachable(), "local redis is not running on localhost:6379");
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM users
                WHERE login_id = 'center-admin'
                  AND is_deleted = FALSE
                """).query(Integer.class).single();
        assertNotNull(count);
        resetUserRevokeState();
    }

    @AfterEach
    void cleanup() {
        resetUserRevokeState();
    }

    @Test
    void accessTokenIsRejectedAfterUserRevokeAfterIsAdvanced() throws Exception {
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
                .andReturn();

        String accessToken = AuthControllerIntegrationTest.JsonExtractors.readString(
                loginResult.getResponse().getContentAsString(),
                "$.data.accessToken"
        );
        JwtTokenService.AccessTokenClaims claims = jwtTokenService.parseAccessToken(accessToken);
        OffsetDateTime revokedAfter = claims.issuedAt().plusSeconds(1);

        assertThat(authAccessRevocationService.revokeAccessAfter(claims.userId(), revokedAfter, claims.userId())).isEqualTo(1);
        assertThat(accessRevocationMarkerService.resolveRevokeAfter(claims.userId(), null)).isEqualTo(revokedAfter);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));
    }


    private void resetUserRevokeState() {
        Long userId = jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE login_id = 'center-admin'
                  AND is_deleted = FALSE
                """).query(Long.class).single();
        jdbcClient.sql("""
                UPDATE users
                SET access_revoked_after = NULL,
                    updated_at = NOW(),
                    updated_by = user_id
                WHERE user_id = :userId
                """).param("userId", userId).update();
        accessRevocationMarkerService.clear(userId);
    }

    private boolean isRedisReachable() {
        try (Socket socket = new Socket("localhost", 6379)) {
            return socket.isConnected();
        } catch (IOException ex) {
            return false;
        }
    }
}
