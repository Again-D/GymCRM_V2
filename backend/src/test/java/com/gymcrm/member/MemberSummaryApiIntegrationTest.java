package com.gymcrm.member;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
class MemberSummaryApiIntegrationTest {
    private static final long CENTER_ID = 1L;
    private static final String DESK_LOGIN_ID = "desk-user";
    private static final String DESK_PASSWORD = "desk-user-1234!";
    private static final String TRAINER_LOGIN_ID = "trainer-user";
    private static final String TRAINER_PASSWORD = "trainer-user-1234!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void memberCreateReturnsBusinessIdAndListCanFilterByMemberCode() throws Exception {
        ensureDeskUser();
        String token = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        String memberName = "비즈니스ID회원-" + shortId();
        String phone = "010" + randomDigits(8);

        MvcResult createResult = mockMvc.perform(post("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberName": "%s",
                                  "phone": "%s",
                                  "memberStatus": "ACTIVE",
                                  "joinDate": "%s",
                                  "consentSms": true,
                                  "consentMarketing": false
                                }
                                """.formatted(memberName, phone, LocalDate.now())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberCode").exists())
                .andReturn();

        String memberCode = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data")
                .path("memberCode")
                .asText();
        assertEquals(true, memberCode.matches("^MBR-\\d{4}-\\d{6}$"));

        mockMvc.perform(get("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("memberCode", memberCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].memberCode").value(memberCode));
    }

    @Test
    void memberListReturnsMembershipSummaryColumns() throws Exception {
        LocalDate today = LocalDate.now();

        ensureDeskUser();
        String token = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        long durationProductId = insertProductFixture("SUMMARY-DURATION-" + shortId(), "MEMBERSHIP", "DURATION");
        long ptProductId = insertProductFixture("SUMMARY-PT-" + shortId(), "PT", "COUNT");

        long noMembershipMemberId = insertMemberFixture("요약없음-" + shortId());

        long expiringMemberId = insertMemberFixture("요약만료임박-" + shortId());
        insertMembershipFixture(expiringMemberId, durationProductId, "ACTIVE", "MEMBERSHIP", "DURATION",
                today.plusDays(5), null, null);

        long expiringBoundaryMemberId = insertMemberFixture("요약만료임박경계-" + shortId());
        insertMembershipFixture(expiringBoundaryMemberId, durationProductId, "ACTIVE", "MEMBERSHIP", "DURATION",
                today.plusDays(7), null, null);

        long expiredActiveMemberId = insertMemberFixture("요약만료-" + shortId());
        insertMembershipFixture(expiredActiveMemberId, durationProductId, "ACTIVE", "MEMBERSHIP", "DURATION",
                today.minusDays(1), null, null);

        long normalMemberId = insertMemberFixture("요약정상-" + shortId());
        insertMembershipFixture(normalMemberId, durationProductId, "ACTIVE", "MEMBERSHIP", "DURATION",
                today.plusDays(8), null, null);

        long holdingMemberId = insertMemberFixture("요약홀딩-" + shortId());
        insertMembershipFixture(holdingMemberId, durationProductId, "HOLDING", "MEMBERSHIP", "DURATION",
                today.plusDays(12), null, null);

        long holdingPriorityMemberId = insertMemberFixture("요약홀딩우선-" + shortId());
        insertMembershipFixture(holdingPriorityMemberId, durationProductId, "ACTIVE", "MEMBERSHIP", "DURATION",
                today.plusDays(3), null, null);
        insertMembershipFixture(holdingPriorityMemberId, durationProductId, "HOLDING", "MEMBERSHIP", "DURATION",
                today.plusDays(20), null, null);

        long tieBreakMemberId = insertMemberFixture("요약대표선정-" + shortId());
        insertMembershipFixture(tieBreakMemberId, durationProductId, "ACTIVE", "MEMBERSHIP", "DURATION",
                today.plusDays(20), null, null);
        insertMembershipFixture(tieBreakMemberId, durationProductId, "ACTIVE", "MEMBERSHIP", "DURATION",
                today.plusDays(4), null, null);

        long ptMemberId = insertMemberFixture("요약PT-" + shortId());
        insertMembershipFixture(ptMemberId, durationProductId, "ACTIVE", "MEMBERSHIP", "DURATION",
                today.plusDays(5), null, null);
        insertMembershipFixture(ptMemberId, ptProductId, "ACTIVE", "PT", "COUNT",
                null, 5, 2);
        insertMembershipFixture(ptMemberId, ptProductId, "ACTIVE", "PT", "COUNT",
                null, 5, 1);

        long ptNoEndMemberId = insertMemberFixture("요약PT무기한-" + shortId());
        insertMembershipFixture(ptNoEndMemberId, ptProductId, "ACTIVE", "PT", "COUNT",
                null, 10, 2);

        long ptZeroMemberId = insertMemberFixture("요약PT0-" + shortId());
        insertMembershipFixture(ptZeroMemberId, ptProductId, "ACTIVE", "PT", "COUNT",
                null, 10, 0);

        long noActiveMemberId = insertMemberFixture("요약비활성만-" + shortId());
        insertMembershipFixture(noActiveMemberId, durationProductId, "EXPIRED", "MEMBERSHIP", "DURATION",
                today.minusDays(3), null, null);

        MvcResult result = mockMvc.perform(get("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");

        JsonNode noMembership = findMember(data, noMembershipMemberId);
        assertEquals("없음", noMembership.path("membershipOperationalStatus").asText());
        assertEquals(true, noMembership.path("membershipExpiryDate").isNull());
        assertEquals(true, noMembership.path("remainingPtCount").isNull());

        JsonNode expiring = findMember(data, expiringMemberId);
        assertEquals("만료임박", expiring.path("membershipOperationalStatus").asText());
        assertEquals(today.plusDays(5).toString(), expiring.path("membershipExpiryDate").asText());

        JsonNode expiringBoundary = findMember(data, expiringBoundaryMemberId);
        assertEquals("만료임박", expiringBoundary.path("membershipOperationalStatus").asText());
        assertEquals(today.plusDays(7).toString(), expiringBoundary.path("membershipExpiryDate").asText());

        JsonNode expired = findMember(data, expiredActiveMemberId);
        assertEquals("만료", expired.path("membershipOperationalStatus").asText());

        JsonNode normal = findMember(data, normalMemberId);
        assertEquals("정상", normal.path("membershipOperationalStatus").asText());
        assertEquals(today.plusDays(8).toString(), normal.path("membershipExpiryDate").asText());

        JsonNode holding = findMember(data, holdingMemberId);
        assertEquals("홀딩중", holding.path("membershipOperationalStatus").asText());
        assertEquals(today.plusDays(12).toString(), holding.path("membershipExpiryDate").asText());

        JsonNode holdingPriority = findMember(data, holdingPriorityMemberId);
        assertEquals("홀딩중", holdingPriority.path("membershipOperationalStatus").asText());
        assertEquals(today.plusDays(20).toString(), holdingPriority.path("membershipExpiryDate").asText());

        JsonNode tieBreak = findMember(data, tieBreakMemberId);
        assertEquals("만료임박", tieBreak.path("membershipOperationalStatus").asText());
        assertEquals(today.plusDays(4).toString(), tieBreak.path("membershipExpiryDate").asText());

        JsonNode pt = findMember(data, ptMemberId);
        assertEquals("만료임박", pt.path("membershipOperationalStatus").asText());
        assertEquals(today.plusDays(5).toString(), pt.path("membershipExpiryDate").asText());
        assertEquals(3, pt.path("remainingPtCount").asInt());

        JsonNode ptNoEnd = findMember(data, ptNoEndMemberId);
        assertEquals("정상", ptNoEnd.path("membershipOperationalStatus").asText());
        assertEquals(true, ptNoEnd.path("membershipExpiryDate").isNull());
        assertEquals(2, ptNoEnd.path("remainingPtCount").asInt());

        JsonNode ptZero = findMember(data, ptZeroMemberId);
        assertEquals("정상", ptZero.path("membershipOperationalStatus").asText());
        assertEquals(true, ptZero.path("remainingPtCount").isNull());

        JsonNode noActive = findMember(data, noActiveMemberId);
        assertEquals("없음", noActive.path("membershipOperationalStatus").asText());
    }

    @Test
    void memberListKeywordSearchMatchesMemberIdNameAndStatus() throws Exception {
        ensureDeskUser();
        String token = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        long activeMemberId = insertMemberFixture("키워드활성-" + shortId());
        long inactiveMemberId = insertInactiveMemberFixture("키워드비활성-" + shortId());

        mockMvc.perform(get("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("keyword", String.valueOf(activeMemberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].memberId").value(activeMemberId));

        mockMvc.perform(get("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("keyword", "키워드활성"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].memberId").value(activeMemberId));

        mockMvc.perform(get("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("keyword", "INACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].memberId").isArray())
                .andExpect(jsonPath("$.data[0].memberId").value(inactiveMemberId))
                .andExpect(jsonPath("$.data[0].memberStatus").value("INACTIVE"));
    }

    @Test
    void memberListCanFilterByTrainerProductAndMembershipDateWindow() throws Exception {
        ensureDeskUser();
        long trainerUserId = ensureTrainerUser();
        String token = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        LocalDate today = LocalDate.now();

        long ptProductId = insertProductFixture("FILTER-PT-" + shortId(), "PT", "COUNT");
        long gxProductId = insertProductFixture("FILTER-GX-" + shortId(), "GX", "DURATION");

        long matchingMemberId = insertMemberFixture("필터매칭-" + shortId());
        insertMembershipFixture(matchingMemberId, ptProductId, trainerUserId, "ACTIVE", "PT", "COUNT", today.plusDays(20), 10, 4);
        insertMembershipFixture(matchingMemberId, gxProductId, trainerUserId, "HOLDING", "GX", "DURATION", today.plusDays(40), null, null);

        long otherTrainerMemberId = insertMemberFixture("필터타트레이너-" + shortId());
        insertMembershipFixture(otherTrainerMemberId, ptProductId, null, "ACTIVE", "PT", "COUNT", today.plusDays(20), 10, 4);

        long otherProductMemberId = insertMemberFixture("필터타상품-" + shortId());
        insertMembershipFixture(otherProductMemberId, gxProductId, trainerUserId, "ACTIVE", "GX", "DURATION", today.plusDays(20), null, null);

        long outOfRangeMemberId = insertMemberFixture("필터기간밖-" + shortId());
        insertMembershipFixture(outOfRangeMemberId, ptProductId, trainerUserId, "ACTIVE", "PT", "COUNT", today.plusDays(2), 10, 2);

        mockMvc.perform(get("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("trainerId", String.valueOf(trainerUserId))
                        .param("productId", String.valueOf(ptProductId))
                        .param("dateFrom", today.plusDays(10).toString())
                        .param("dateTo", today.plusDays(30).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].memberId").value(matchingMemberId))
                .andExpect(jsonPath("$.data[0].membershipOperationalStatus").value("홀딩중"));
    }

    @Test
    void trainerListAndDetailAreRestrictedToAssignedMembers() throws Exception {
        long trainerUserId = ensureTrainerUser();
        String trainerToken = loginAndGetAccessToken(TRAINER_LOGIN_ID, TRAINER_PASSWORD);
        LocalDate today = LocalDate.now();

        long productId = insertProductFixture("TRAINER-SCOPE-" + shortId(), "PT", "COUNT");
        long visibleMemberId = insertMemberFixture("트레이너가보는회원-" + shortId());
        insertMembershipFixture(visibleMemberId, productId, trainerUserId, "ACTIVE", "PT", "COUNT", today.plusDays(15), 10, 5);

        long hiddenMemberId = insertMemberFixture("트레이너가못보는회원-" + shortId());
        insertMembershipFixture(hiddenMemberId, productId, null, "ACTIVE", "PT", "COUNT", today.plusDays(15), 10, 5);

        MvcResult trainerListResult = mockMvc.perform(get("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode trainerList = objectMapper.readTree(trainerListResult.getResponse().getContentAsString()).path("data");
        findMember(trainerList, visibleMemberId);
        assertMemberMissing(trainerList, hiddenMemberId);

        MvcResult explicitTrainerFilterResult = mockMvc.perform(get("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("trainerId", String.valueOf(trainerUserId)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode explicitTrainerList = objectMapper.readTree(explicitTrainerFilterResult.getResponse().getContentAsString()).path("data");
        findMember(explicitTrainerList, visibleMemberId);
        assertMemberMissing(explicitTrainerList, hiddenMemberId);

        mockMvc.perform(get("/api/v1/members")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("trainerId", String.valueOf(trainerUserId + 999)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        mockMvc.perform(get("/api/v1/members/{memberId}", visibleMemberId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memberId").value(visibleMemberId));

        mockMvc.perform(get("/api/v1/members/{memberId}", hiddenMemberId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void representativeMembershipUsesMembershipIdTieBreakWhenExpiryDatesEqual() {
        LocalDate targetEndDate = LocalDate.now().plusDays(12);
        long durationProductId = insertProductFixture("SUMMARY-TIE-" + shortId(), "MEMBERSHIP", "DURATION");
        long memberId = insertMemberFixture("요약동일만료일대표선정-" + shortId());

        long firstMembershipId = insertMembershipFixture(
                memberId,
                durationProductId,
                "ACTIVE",
                "MEMBERSHIP",
                "DURATION",
                targetEndDate,
                null,
                null
        );
        long secondMembershipId = insertMembershipFixture(
                memberId,
                durationProductId,
                "ACTIVE",
                "MEMBERSHIP",
                "DURATION",
                targetEndDate,
                null,
                null
        );

        Long representativeMembershipId = jdbcClient.sql("""
                SELECT DISTINCT ON (mm.member_id)
                    mm.membership_id
                FROM member_memberships mm
                WHERE mm.center_id = :centerId
                  AND mm.member_id = :memberId
                  AND mm.is_deleted = FALSE
                  AND mm.membership_status = 'ACTIVE'
                ORDER BY mm.member_id, mm.end_date NULLS LAST, mm.membership_id ASC
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .query(Long.class)
                .single();

        assertEquals(true, firstMembershipId < secondMembershipId);
        assertEquals(firstMembershipId, representativeMembershipId);
    }

    private JsonNode findMember(JsonNode data, long memberId) {
        for (JsonNode item : data) {
            if (item.path("memberId").asLong() == memberId) {
                return item;
            }
        }
        throw new AssertionError("Member not found in response. memberId=" + memberId);
    }

    private void assertMemberMissing(JsonNode data, long memberId) {
        for (JsonNode item : data) {
            if (item.path("memberId").asLong() == memberId) {
                throw new AssertionError("Member should not be visible in response. memberId=" + memberId);
            }
        }
    }

    private void ensureDeskUser() {
        int updated = jdbcClient.sql("""
                UPDATE users
                SET password_hash = :passwordHash,
                    display_name = :displayName,
                    role_code = 'ROLE_DESK',
                    user_status = 'ACTIVE',
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                  AND login_id = :loginId
                """)
                .param("passwordHash", passwordEncoder.encode(DESK_PASSWORD))
                .param("displayName", "Desk User")
                .param("centerId", CENTER_ID)
                .param("loginId", DESK_LOGIN_ID)
                .update();

        if (updated == 0) {
            jdbcClient.sql("""
                    INSERT INTO users (
                        center_id, login_id, password_hash, display_name, role_code, user_status,
                        created_by, updated_by
                    )
                    VALUES (
                        :centerId, :loginId, :passwordHash, :displayName, 'ROLE_DESK', 'ACTIVE',
                        0, 0
                    )
                    """)
                    .param("centerId", CENTER_ID)
                    .param("loginId", DESK_LOGIN_ID)
                    .param("passwordHash", passwordEncoder.encode(DESK_PASSWORD))
                    .param("displayName", "Desk User")
                    .update();
        }
    }

    private long ensureTrainerUser() {
        Integer existingUserId = jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", TRAINER_LOGIN_ID)
                .query(Integer.class)
                .optional()
                .orElse(null);

        if (existingUserId != null) {
            jdbcClient.sql("""
                    UPDATE users
                    SET password_hash = :passwordHash,
                        display_name = :displayName,
                        role_code = 'ROLE_TRAINER',
                        user_status = 'ACTIVE',
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = 0
                    WHERE user_id = :userId
                    """)
                    .param("passwordHash", passwordEncoder.encode(TRAINER_PASSWORD))
                    .param("displayName", "Trainer User")
                    .param("userId", existingUserId.longValue())
                    .update();
            return existingUserId.longValue();
        }

        return jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, display_name, role_code, user_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :loginId, :passwordHash, :displayName, 'ROLE_TRAINER', 'ACTIVE',
                    0, 0
                )
                RETURNING user_id
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", TRAINER_LOGIN_ID)
                .param("passwordHash", passwordEncoder.encode(TRAINER_PASSWORD))
                .param("displayName", "Trainer User")
                .query(Long.class)
                .single();
    }

    private String loginAndGetAccessToken(String loginId, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"loginId":"%s","password":"%s"}
                                """.formatted(loginId, password)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.path("data").path("accessToken").asText();
    }

    private long insertMemberFixture(String memberName) {
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, 'ACTIVE', CURRENT_DATE,
                    FALSE, FALSE, 0, 0
                )
                RETURNING member_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberName", memberName)
                .param("phone", "010" + randomDigits(8))
                .query(Long.class)
                .single();
    }

    private long insertInactiveMemberFixture(String memberName) {
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, 'INACTIVE', CURRENT_DATE,
                    FALSE, FALSE, 0, 0
                )
                RETURNING member_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberName", memberName)
                .param("phone", "010" + randomDigits(8))
                .query(Long.class)
                .single();
    }

    private long insertProductFixture(String productName, String category, String type) {
        Integer validityDays = "DURATION".equals(type) ? 30 : null;
        Integer totalCount = "COUNT".equals(type) ? 10 : null;

        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, allow_transfer, product_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, :category, :type, :priceAmount,
                    :validityDays, :totalCount, FALSE, FALSE, 'ACTIVE',
                    0, 0
                )
                RETURNING product_id
                """)
                .param("centerId", CENTER_ID)
                .param("productName", productName)
                .param("category", category)
                .param("type", type)
                .param("priceAmount", BigDecimal.valueOf(100000))
                .param("validityDays", validityDays)
                .param("totalCount", totalCount)
                .query(Long.class)
                .single();
    }

    private long insertMembershipFixture(
            long memberId,
            long productId,
            Long assignedTrainerId,
            String membershipStatus,
            String category,
            String type,
            LocalDate endDate,
            Integer totalCount,
            Integer remainingCount
    ) {
        return jdbcClient.sql("""
                INSERT INTO member_memberships (
                    center_id, member_id, product_id, assigned_trainer_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :productId, :assignedTrainerId, :membershipStatus,
                    :productNameSnapshot, :category, :type,
                    :priceAmountSnapshot, CURRENT_TIMESTAMP, CURRENT_DATE, :endDate,
                    :totalCount, :remainingCount, 0,
                    0, 0, :memo,
                    0, 0
                )
                RETURNING membership_id
                """)
                .param("centerId", CENTER_ID)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("assignedTrainerId", assignedTrainerId)
                .param("membershipStatus", membershipStatus)
                .param("productNameSnapshot", "SNAP-" + shortId())
                .param("category", category)
                .param("type", type)
                .param("priceAmountSnapshot", BigDecimal.valueOf(100000))
                .param("endDate", endDate)
                .param("totalCount", totalCount)
                .param("remainingCount", remainingCount)
                .param("memo", "fixture")
                .query(Long.class)
                .single();
    }

    private long insertMembershipFixture(
            long memberId,
            long productId,
            String membershipStatus,
            String category,
            String type,
            LocalDate endDate,
            Integer totalCount,
            Integer remainingCount
    ) {
        return insertMembershipFixture(memberId, productId, null, membershipStatus, category, type, endDate, totalCount, remainingCount);
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private String randomDigits(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append((int) (Math.random() * 10));
        }
        return builder.toString();
    }
}
