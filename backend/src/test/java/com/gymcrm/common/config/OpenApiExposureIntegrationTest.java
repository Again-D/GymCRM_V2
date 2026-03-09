package com.gymcrm.common.config;

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

        @Test
        void swaggerUiAndApiDocsAreAvailableInDev() throws Exception {
            mockMvc.perform(get("/swagger-ui/index.html"))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/v3/api-docs"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(org.hamcrest.Matchers.containsString("\"openapi\"")));
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
