package com.gymcrm.product;

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

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
class ProductApiIntegrationTest {
    private static final long CENTER_ID = 1L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void productCreateListDetailAndStatusUpdateRemainConsistent() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        String productName = "JPA상품-" + shortId();

        MvcResult createResult = mockMvc.perform(post("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "productName": "%s",
                                  "productCategory": "MEMBERSHIP",
                                  "productType": "DURATION",
                                  "priceAmount": 150000,
                                  "validityDays": 30,
                                  "allowHold": true,
                                  "maxHoldDays": 7,
                                  "maxHoldCount": 2,
                                  "allowTransfer": false,
                                  "productStatus": "ACTIVE",
                                  "description": "phase3 jpa product"
                                }
                                """.formatted(productName)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productName").value(productName))
                .andExpect(jsonPath("$.data.productStatus").value("ACTIVE"))
                .andReturn();

        long productId = jsonLong(createResult, "/data/productId");

        mockMvc.perform(get("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("category", "membership")
                        .param("status", "active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].productId").value(productId))
                .andExpect(jsonPath("$.data[0].productName").value(productName));

        mockMvc.perform(get("/api/v1/products/{productId}", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productId").value(productId))
                .andExpect(jsonPath("$.data.validityDays").value(30))
                .andExpect(jsonPath("$.data.maxHoldDays").value(7));

        mockMvc.perform(patch("/api/v1/products/{productId}/status", productId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                { "productStatus": "INACTIVE" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productStatus").value("INACTIVE"));

        mockMvc.perform(get("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("status", "INACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].productId").value(productId))
                .andExpect(jsonPath("$.data[0].productStatus").value("INACTIVE"));
    }

    @Test
    void duplicateActiveProductNameStillReturnsConflict() throws Exception {
        String existingName = "중복상품-" + shortId();
        insertProductFixture(existingName);
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");

        mockMvc.perform(post("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "productName": "%s",
                                  "productCategory": "MEMBERSHIP",
                                  "productType": "DURATION",
                                  "priceAmount": 100000,
                                  "validityDays": 30,
                                  "allowHold": false,
                                  "allowTransfer": false,
                                  "productStatus": "ACTIVE"
                                }
                                """.formatted(existingName)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"))
                .andExpect(jsonPath("$.error.detail").value("동일 상품명이 이미 존재합니다."));
    }

    private long insertProductFixture(String productName) {
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, allow_transfer, product_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, 'MEMBERSHIP', 'DURATION', :priceAmount,
                    30, NULL, FALSE, FALSE, 'ACTIVE',
                    0, 0
                )
                RETURNING product_id
                """)
                .param("centerId", CENTER_ID)
                .param("productName", productName)
                .param("priceAmount", BigDecimal.valueOf(100000))
                .query(Long.class)
                .single();
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

    private long jsonLong(MvcResult result, String pointer) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.at(pointer).asLong();
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
