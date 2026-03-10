package com.gymcrm.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.mode=prototype",
        "app.prototype.no-auth-enabled=true",
        "app.prototype.default-admin-user-id=1",
        "app.prototype.default-center-id=1",
        "app.prototype.default-admin-username=prototype-admin"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class PrototypeModeStartupIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthEndpointLoadsPrototypeModeWithoutJwt() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.securityMode").value("prototype"))
                .andExpect(jsonPath("$.data.prototypeNoAuth").value(true))
                .andExpect(jsonPath("$.data.currentUserId").value(1));
    }

    @Test
    void prototypeModePermitsProtectedRoutesWithoutJwtFilterBlocking() throws Exception {
        mockMvc.perform(get("/api/v1/samples/business-error"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("BUSINESS_RULE"));
    }
}
