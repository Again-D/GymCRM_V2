package com.gymcrm.audit;

import com.fasterxml.jackson.databind.JsonNode;
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

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
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
class AuditLogApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void memberDetailReadCreatesPiiReadAuditLog() throws Exception {
        String token = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        long memberId = insertMemberFixture();

        mockMvc.perform(get("/api/v1/members/{memberId}", memberId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberId").value((int) memberId));

        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM audit_logs
                WHERE center_id = 1
                  AND event_type = 'PII_READ'
                  AND resource_type = 'MEMBER'
                  AND resource_id = :resourceId
                """)
                .param("resourceId", String.valueOf(memberId))
                .query(Integer.class)
                .single();
        assertTrue(count != null && count >= 1);
    }

    @Test
    void adminCanRecordAndReadRetentionJobRuns() throws Exception {
        String token = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        String details = "{\"deletedRows\":120,\"oldest\":\"2025-03-01\"}";

        mockMvc.perform(post("/api/v1/audit-logs/retention-runs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "jobName": "audit_log_retention",
                                  "status": "SUCCESS",
                                  "detailsJson": %s
                                }
                                """.formatted(objectMapper.writeValueAsString(details))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.jobName").value("audit_log_retention"))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));

        MvcResult result = mockMvc.perform(get("/api/v1/audit-logs/retention-runs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("jobName", "audit_log_retention")
                        .param("limit", "20"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode rows = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("rows");
        boolean found = false;
        for (JsonNode row : rows) {
            if ("audit_log_retention".equals(row.path("jobName").asText())
                    && "SUCCESS".equals(row.path("status").asText())) {
                found = true;
                break;
            }
        }
        assertTrue(found);
    }

    private String loginAndGetAccessToken(String loginId, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"loginId":"%s","password":"%s"}
                                """.formatted(loginId, password)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("accessToken")
                .asText();
    }

    private long insertMemberFixture() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    1, :memberName, :phone, 'ACTIVE', :joinDate,
                    TRUE, FALSE, 0, 0
                )
                RETURNING member_id
                """)
                .param("memberName", "AUDIT회원-" + suffix)
                .param("phone", "010-4" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7))
                .param("joinDate", LocalDate.now())
                .query(Long.class)
                .single();
    }
}
