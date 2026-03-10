package com.gymcrm.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

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
        "app.security.dev-admin.initial-password=dev-admin-1234!"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class JwtModeStartupIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void jwtModeStartsWithPublicHealthAndProtectedApiUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.securityMode").value("jwt"))
                .andExpect(jsonPath("$.data.prototypeNoAuth").value(false))
                .andExpect(jsonPath("$.data.currentUserId").doesNotExist());

        mockMvc.perform(get("/api/v1/samples/business-error"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void jwtModeLoginAndMeFlowWorksAfterStartup() throws Exception {
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
                .andReturn();

        String accessToken = AuthControllerIntegrationTest.JsonExtractors.readString(
                loginResult.getResponse().getContentAsString(),
                "$.data.accessToken"
        );

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.loginId").value("center-admin"));
    }
}
