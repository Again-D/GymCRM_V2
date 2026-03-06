package com.gymcrm.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.junit.jupiter.api.BeforeEach;

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
class ExternalIntegrationActivationApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcClient jdbcClient;

    @BeforeEach
    void resetActivationPolicyFixture() {
        jdbcClient.sql("""
                DELETE FROM external_integration_activation_policies
                WHERE center_id = 1
                """).update();
    }

    @Test
    void centerAdminCanReadDefaultActivationPolicy() throws Exception {
        String token = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(get("/api/v1/integrations/external/activation-policy")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.centerId").value(1))
                .andExpect(jsonPath("$.data.activationStage").value("SANDBOX"))
                .andExpect(jsonPath("$.data.paymentEnabled").value(false))
                .andExpect(jsonPath("$.data.messagingEnabled").value(false))
                .andExpect(jsonPath("$.data.qrEnabled").value(false));
    }

    @Test
    void centerAdminCanUpdateActivationPolicyFlags() throws Exception {
        String token = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(put("/api/v1/integrations/external/activation-policy")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "activationStage": "STAGING",
                                  "paymentEnabled": true,
                                  "messagingEnabled": true,
                                  "qrEnabled": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activationStage").value("STAGING"))
                .andExpect(jsonPath("$.data.paymentEnabled").value(true))
                .andExpect(jsonPath("$.data.messagingEnabled").value(true))
                .andExpect(jsonPath("$.data.qrEnabled").value(false));
    }

    @Test
    void sandboxDrillUpdatesLastDrillOutcomeWhenStageIsSandbox() throws Exception {
        String token = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(put("/api/v1/integrations/external/activation-policy")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "activationStage": "SANDBOX",
                                  "paymentEnabled": false,
                                  "messagingEnabled": false,
                                  "qrEnabled": false
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/integrations/external/sandbox-drill")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": 1,
                                  "paymentApproveFailureMode": "NONE",
                                  "alimtalkFailureMode": "TIMEOUT",
                                  "smsFailureMode": "NONE",
                                  "qrFailureMode": "NONE",
                                  "paymentCancelFailureMode": "NONE"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.outcome").value("SUCCESS_WITH_MESSAGE_FALLBACK"))
                .andExpect(jsonPath("$.data.policy.lastDrillOutcome").value("SUCCESS_WITH_MESSAGE_FALLBACK"))
                .andExpect(jsonPath("$.data.policy.lastDrillAt").exists());
    }

    @Test
    void sandboxDrillIsRejectedWhenStageIsNotSandbox() throws Exception {
        String token = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(put("/api/v1/integrations/external/activation-policy")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "activationStage": "PRODUCTION",
                                  "paymentEnabled": true,
                                  "messagingEnabled": true,
                                  "qrEnabled": true
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/integrations/external/sandbox-drill")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": 1
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("BUSINESS_RULE"));
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

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("accessToken")
                .asText();
    }
}
