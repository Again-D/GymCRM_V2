package com.gymcrm.common.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OpenApiExposureIntegrationTest {

    @Nested
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
    class DevProfile {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        @Test
        void swaggerUiAndApiDocsAreAvailableInDev() throws Exception {
            mockMvc.perform(get("/swagger-ui/index.html"))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/v3/api-docs"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(org.hamcrest.Matchers.containsString("\"openapi\"")));
        }

        @Test
        void apiDocsExposeBearerSecurityPublicOverridesRoleMatrixAndCommonErrorResponses() throws Exception {
            String json = mockMvc.perform(get("/v3/api-docs"))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString();

            JsonNode root = objectMapper.readTree(json);

            JsonNode login = root.path("paths").path("/api/v1/auth/login").path("post");
            org.junit.jupiter.api.Assertions.assertTrue(login.path("security").isArray());
            org.junit.jupiter.api.Assertions.assertEquals(0, login.path("security").size());
            org.junit.jupiter.api.Assertions.assertEquals("PUBLIC", login.path("x-role-policy").asText());

            JsonNode auditLogs = root.path("paths").path("/api/v1/audit-logs").path("get");
            org.junit.jupiter.api.Assertions.assertTrue(auditLogs.path("security").isArray());
            org.junit.jupiter.api.Assertions.assertEquals("hasAnyRole('SUPER_ADMIN','CENTER_ADMIN','MANAGER')", auditLogs.path("x-role-policy").asText().replace("@securityModeSettings.isPrototypeMode() or ", ""));
            org.junit.jupiter.api.Assertions.assertTrue(auditLogs.path("x-role-matrix").toString().contains("ROLE_SUPER_ADMIN"));
            org.junit.jupiter.api.Assertions.assertTrue(auditLogs.path("x-role-matrix").toString().contains("ROLE_CENTER_ADMIN"));
            org.junit.jupiter.api.Assertions.assertTrue(auditLogs.path("responses").has("401"));
            org.junit.jupiter.api.Assertions.assertTrue(auditLogs.path("responses").has("403"));
            org.junit.jupiter.api.Assertions.assertTrue(auditLogs.path("responses").has("422"));

            JsonNode schemas = root.path("components").path("schemas");
            org.junit.jupiter.api.Assertions.assertTrue(schemas.has("ErrorResponse"));
            org.junit.jupiter.api.Assertions.assertTrue(schemas.has("ApiError"));
        }
    }

    @Nested
    @SpringBootTest(properties = {
            "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
            "DB_USERNAME=gymcrm",
            "DB_PASSWORD=gymcrm",
            "app.security.mode=jwt",
            "app.security.dev-admin.seed-enabled=true",
            "app.security.dev-admin.login-id=center-admin",
            "app.security.dev-admin.initial-password=dev-admin-1234!"
    })
    @ActiveProfiles("prod")
    @AutoConfigureMockMvc
    class ProdProfile {

        @Autowired
        private MockMvc mockMvc;

        @Test
        void swaggerUiAndApiDocsAreNotExposedOutsideDev() throws Exception {
            mockMvc.perform(get("/swagger-ui/index.html"))
                    .andExpect(status().isNotFound());

            mockMvc.perform(get("/v3/api-docs"))
                    .andExpect(status().isNotFound());
        }
    }
}
