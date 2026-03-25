package com.gymcrm.auth;

import com.gymcrm.common.auth.AuthCookieSupport;
import com.gymcrm.common.auth.service.AccessTokenDenylistService;
import com.gymcrm.common.auth.service.RedisAccessTokenDenylistService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.IOException;
import java.net.Socket;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
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
        "app.security.dev-admin.initial-password=dev-admin-1234!",
        "app.redis.enabled=true",
        "app.redis.auth-denylist.enabled=true"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class AuthAccessDenylistIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private AccessTokenDenylistService accessTokenDenylistService;

    @BeforeEach
    void ensurePrerequisites() {
        assumeTrue(isRedisReachable(), "local redis is not running on localhost:6379");
        assertThat(accessTokenDenylistService).isInstanceOf(RedisAccessTokenDenylistService.class);
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM users
                WHERE login_id = 'center-admin'
                  AND is_deleted = FALSE
                """).query(Integer.class).single();
        assertNotNull(count);
    }

    @Test
    void logoutAddsAccessTokenToDenylistAndBlocksReuse() throws Exception {
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
                .andExpect(cookie().exists(AuthCookieSupport.REFRESH_COOKIE_NAME))
                .andReturn();

        String accessToken = AuthControllerIntegrationTest.JsonExtractors.readString(
                loginResult.getResponse().getContentAsString(),
                "$.data.accessToken"
        );
        String refreshToken = AuthControllerIntegrationTest.CookieExtractors.extractCookieValue(
                loginResult.getResponse().getHeader(HttpHeaders.SET_COOKIE),
                AuthCookieSupport.REFRESH_COOKIE_NAME
        );

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .cookie(new MockCookie(AuthCookieSupport.REFRESH_COOKIE_NAME, refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("TOKEN_REVOKED"));
    }

    private boolean isRedisReachable() {
        try (Socket socket = new Socket("localhost", 6379)) {
            return socket.isConnected();
        } catch (IOException ex) {
            return false;
        }
    }
}
