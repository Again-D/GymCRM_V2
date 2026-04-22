package com.gymcrm.locker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

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
class LockerApiIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void lockerListAndCreateApisAreServedFromRootPath() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        String lockerZoneOne = "qa-" + UUID.randomUUID().toString().substring(0, 8);
        String lockerZoneTwo = "qb-" + UUID.randomUUID().toString().substring(0, 8);

        mockMvc.perform(post("/api/v1/lockers/batch")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "items": [
                                    {
                                      "lockerZone": "%s",
                                      "lockerNumber": 11,
                                      "lockerGrade": "STANDARD",
                                      "lockerStatus": "AVAILABLE",
                                      "memo": "root path create"
                                    },
                                    {
                                      "lockerZone": "%s",
                                      "lockerNumber": 2,
                                      "lockerGrade": "PREMIUM",
                                      "lockerStatus": "AVAILABLE",
                                      "memo": "second slot"
                                    }
                                  ]
                                }
                                """.formatted(lockerZoneOne, lockerZoneTwo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].lockerCode").value(lockerZoneOne.toUpperCase() + "-11"))
                .andExpect(jsonPath("$.data[0].lockerZone").value(lockerZoneOne.toUpperCase()))
                .andExpect(jsonPath("$.data[1].lockerCode").value(lockerZoneTwo.toUpperCase() + "-02"))
                .andExpect(jsonPath("$.data[1].lockerZone").value(lockerZoneTwo.toUpperCase()));

        mockMvc.perform(get("/api/v1/lockers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("lockerZone", lockerZoneOne))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].lockerCode").value(lockerZoneOne.toUpperCase() + "-11"))
                .andExpect(jsonPath("$.data[0].lockerZone").value(lockerZoneOne.toUpperCase()));
    }

    @Test
    void lockerBatchCreateRejectsNullItems() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(post("/api/v1/lockers/batch")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "items": [null]
                                }
                                """))
                .andExpect(status().isBadRequest());
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

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asText();
    }
}
