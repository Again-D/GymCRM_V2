package com.gymcrm.reservation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.reservation.entity.TrainerSchedule;
import com.gymcrm.reservation.repository.TrainerScheduleRepository;
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
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
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
class ReservationApiIntegrationTest {
    private static final long CENTER_ID = 1L;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final String DESK_LOGIN_ID = "desk-user";
    private static final String DESK_PASSWORD = "desk-user-1234!";
    private static final String TRAINER_LOGIN_ID = "trainer-user";
    private static final String TRAINER_PASSWORD = "trainer-user-1234!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TrainerScheduleRepository trainerScheduleRepository;

    @Test
    void deskRoleCanCreateListDetailCancelAndCompleteReservations() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        long countMemberId = insertMemberFixture("P7API카운트회원");
        long countProductId = insertProductFixture("PT", "COUNT");
        long countMembershipId = insertMembershipFixture(countMemberId, countProductId, "PT", "COUNT", 5, 5, 0);
        TrainerSchedule countSchedule = createFutureSchedule("PT", 1);

        MvcResult createResult = mockMvc.perform(post("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "scheduleId": %d,
                                  "memo": "desk reservation"
                                }
                                """.formatted(countMemberId, countMembershipId, countSchedule.scheduleId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reservationStatus").value("CONFIRMED"))
                .andReturn();
        long reservationId = jsonLong(createResult, "/data/reservationId");

        mockMvc.perform(get("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("memberId", String.valueOf(countMemberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].reservationId").value(reservationId));

        mockMvc.perform(get("/api/v1/reservations/{reservationId}", reservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservationStatus").value("CONFIRMED"));

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/complete", reservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservation.reservationStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.data.countDeducted").value(true))
                .andExpect(jsonPath("$.data.remainingCount").value(4));

        long durationMemberId = insertMemberFixture("P7API기간회원");
        long durationProductId = insertProductFixture("GX", "DURATION");
        long durationMembershipId = insertMembershipFixture(durationMemberId, durationProductId, "GX", "DURATION", null, null, 0);
        TrainerSchedule durationSchedule = createFutureSchedule("GX", 10);

        MvcResult createForCancel = mockMvc.perform(post("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "scheduleId": %d
                                }
                                """.formatted(durationMemberId, durationMembershipId, durationSchedule.scheduleId())))
                .andExpect(status().isOk())
                .andReturn();
        long cancelReservationId = jsonLong(createForCancel, "/data/reservationId");

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/cancel", cancelReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                { "cancelReason": "desk cancel test" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservationStatus").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelReason").value("desk cancel test"));
    }

    @Test
    void deskRoleCanCheckInAndNoShowWithPhase8Policies() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        long memberId = insertMemberFixture("P8API회원");
        long productId = insertProductFixture("PT", "COUNT");
        long membershipId = insertMembershipFixture(memberId, productId, "PT", "COUNT", 5, 5, 0);

        TrainerSchedule checkInSchedule = createFutureSchedule("PT", 2);
        long checkInReservationId = jsonLong(mockMvc.perform(post("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d, "membershipId": %d, "scheduleId": %d}
                                """.formatted(memberId, membershipId, checkInSchedule.scheduleId())))
                .andExpect(status().isOk())
                .andReturn(), "/data/reservationId");

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/check-in", checkInReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservationStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.checkedInAt").exists());

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/check-in", checkInReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));

        TrainerSchedule noShowSchedule = createFutureSchedule("GX", 10);
        long noShowReservationId = jsonLong(mockMvc.perform(post("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d, "membershipId": %d, "scheduleId": %d}
                                """.formatted(memberId, membershipId, noShowSchedule.scheduleId())))
                .andExpect(status().isOk())
                .andReturn(), "/data/reservationId");

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/no-show", noShowReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("BUSINESS_RULE"));

        forceScheduleEnded(noShowSchedule.scheduleId());

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/no-show", noShowReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservationStatus").value("NO_SHOW"))
                .andExpect(jsonPath("$.data.noShowAt").exists());

        Integer currentCount = jdbcClient.sql("""
                SELECT current_count FROM trainer_schedules WHERE schedule_id = :scheduleId
                """)
                .param("scheduleId", noShowSchedule.scheduleId())
                .query(Integer.class)
                .single();
        org.junit.jupiter.api.Assertions.assertEquals(0, currentCount);
    }

    @Test
    void unauthenticatedReservationMutationReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/reservations")
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": 1,
                                  "membershipId": 1,
                                  "scheduleId": 1
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void centerAdminCanUseReservationEndpoints() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        mockMvc.perform(get("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void reservationSchedulesOnlyIncludeFutureSlots() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        TrainerSchedule futureSchedule = createFutureSchedule("PT", 2);
        TrainerSchedule pastSchedule = createPastSchedule("GX", 10);

        mockMvc.perform(get("/api/v1/reservations/schedules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].scheduleId", hasItem(futureSchedule.scheduleId().intValue())))
                .andExpect(jsonPath("$.data[*].scheduleId", not(hasItem(pastSchedule.scheduleId().intValue()))));
    }

    @Test
    void reservationSchedulesCanIncludeRequestedPastScheduleIds() throws Exception {
        String adminToken = loginAndGetAccessToken("center-admin", "dev-admin-1234!");
        TrainerSchedule futureSchedule = createFutureSchedule("PT", 2);
        TrainerSchedule pastSchedule = createPastSchedule("GX", 10);

        mockMvc.perform(get("/api/v1/reservations/schedules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .param("scheduleIds", String.valueOf(pastSchedule.scheduleId()))
                        .param("scheduleIds", String.valueOf(futureSchedule.scheduleId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].scheduleId", hasItem(futureSchedule.scheduleId().intValue())))
                .andExpect(jsonPath("$.data[*].scheduleId", hasItem(pastSchedule.scheduleId().intValue())));
    }

    @Test
    void trainerRoleOnlySeesAssignedReservationTargetsAndCannotCreateForOthers() throws Exception {
        ensureTrainerUser();
        String trainerToken = loginAndGetAccessToken(TRAINER_LOGIN_ID, TRAINER_PASSWORD);

        long trainerUserId = jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", TRAINER_LOGIN_ID)
                .query(Long.class)
                .single();

        long assignedMemberId = insertMemberFixture("P10트레이너회원");
        long assignedProductId = insertProductFixture("PT", "COUNT");
        long assignedMembershipId = insertMembershipFixture(
                CENTER_ID,
                assignedMemberId,
                assignedProductId,
                "PT",
                "COUNT",
                5,
                5,
                0,
                trainerUserId
        );
        TrainerSchedule assignedSchedule = createFutureSchedule("PT", 2);
        long assignedReservationId = jsonLong(mockMvc.perform(post("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d, "membershipId": %d, "scheduleId": %d}
                                """.formatted(assignedMemberId, assignedMembershipId, assignedSchedule.scheduleId())))
                .andExpect(status().isOk())
                .andReturn(), "/data/reservationId");

        long otherMemberId = insertMemberFixture("P10비담당회원");
        long otherProductId = insertProductFixture("PT", "COUNT");
        long otherMembershipId = insertMembershipFixture(
                CENTER_ID,
                otherMemberId,
                otherProductId,
                "PT",
                "COUNT",
                5,
                5,
                0,
                null
        );
        TrainerSchedule otherSchedule = createFutureSchedule("PT", 4);

        mockMvc.perform(get("/api/v1/reservations/targets")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].memberId", hasItem((int) assignedMemberId)))
                .andExpect(jsonPath("$.data[*].memberId", not(hasItem((int) otherMemberId))));

        mockMvc.perform(get("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("memberId", String.valueOf(assignedMemberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].reservationId").value(assignedReservationId));

        mockMvc.perform(get("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("memberId", String.valueOf(otherMemberId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        mockMvc.perform(post("/api/v1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .contentType("application/json")
                        .content("""
                                {"memberId": %d, "membershipId": %d, "scheduleId": %d}
                                """.formatted(otherMemberId, otherMembershipId, otherSchedule.scheduleId())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void deskRoleCanListPtCandidatesAndCreatePtReservation() throws Exception {
        ensureDeskUser();
        ensureTrainerUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        long trainerUserId = findUserIdByLoginId(TRAINER_LOGIN_ID);

        LocalDate targetDate = LocalDate.now(BUSINESS_ZONE).plusDays(2);
        clearTrainerSchedulesForDate(CENTER_ID, trainerUserId, targetDate);
        insertWeeklyAvailabilityRule(CENTER_ID, trainerUserId, targetDate.getDayOfWeek().getValue(), "10:00", "12:00");

        long memberId = insertMemberFixture("PT후보회원");
        long productId = insertProductFixture("PT", "COUNT");
        long membershipId = insertMembershipFixture(CENTER_ID, memberId, productId, "PT", "COUNT", 2, 2, 0, trainerUserId);

        TrainerSchedule gxSchedule = createScheduleAt(CENTER_ID, null, "GX", 10, targetDate, 10, 0, 60);
        insertReservationFixture(CENTER_ID, memberId, membershipId, gxSchedule.scheduleId());

        mockMvc.perform(get("/api/v1/reservations/pt-candidates")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .param("membershipId", String.valueOf(membershipId))
                        .param("trainerUserId", String.valueOf(trainerUserId))
                        .param("date", targetDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].startAt").value(targetDate + "T02:00:00Z"));

        mockMvc.perform(post("/api/v1/reservations/pt")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "trainerUserId": %d,
                                  "startAt": "%sT11:00:00+09:00",
                                  "memo": "  pt create  "
                                }
                                """.formatted(memberId, membershipId, trainerUserId, targetDate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reservationStatus").value("CONFIRMED"));

        Integer currentCount = jdbcClient.sql("""
                SELECT current_count
                FROM trainer_schedules
                WHERE center_id = :centerId
                  AND trainer_user_id = :trainerUserId
                  AND schedule_type = 'PT'
                  AND start_at = :startAt
                """)
                .param("centerId", CENTER_ID)
                .param("trainerUserId", trainerUserId)
                .param("startAt", OffsetDateTime.parse(targetDate + "T11:00:00+09:00"))
                .query(Integer.class)
                .single();
        org.junit.jupiter.api.Assertions.assertEquals(1, currentCount);
    }

    @Test
    void ptCreateRejectsWhenOutstandingConfirmedPtAlreadyUsesRemainingCount() throws Exception {
        ensureDeskUser();
        ensureTrainerUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        long trainerUserId = findUserIdByLoginId(TRAINER_LOGIN_ID);

        LocalDate targetDate = LocalDate.now(BUSINESS_ZONE).plusDays(3);
        clearTrainerSchedulesForDate(CENTER_ID, trainerUserId, targetDate);
        insertWeeklyAvailabilityRule(CENTER_ID, trainerUserId, targetDate.getDayOfWeek().getValue(), "09:00", "13:00");

        long memberId = insertMemberFixture("PT잔여회원");
        long productId = insertProductFixture("PT", "COUNT");
        long membershipId = insertMembershipFixture(CENTER_ID, memberId, productId, "PT", "COUNT", 1, 1, 0, trainerUserId);

        mockMvc.perform(post("/api/v1/reservations/pt")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "trainerUserId": %d,
                                  "startAt": "%sT09:00:00+09:00"
                                }
                                """.formatted(memberId, membershipId, trainerUserId, targetDate)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/reservations/pt")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "trainerUserId": %d,
                                  "startAt": "%sT10:00:00+09:00"
                                }
                                """.formatted(memberId, membershipId, trainerUserId, targetDate)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("BUSINESS_RULE"));
    }

    @Test
    void trainerRoleCannotQueryPtCandidatesForUnassignedMembership() throws Exception {
        ensureTrainerUser();
        String trainerToken = loginAndGetAccessToken(TRAINER_LOGIN_ID, TRAINER_PASSWORD);
        long trainerUserId = findUserIdByLoginId(TRAINER_LOGIN_ID);

        LocalDate targetDate = LocalDate.now(BUSINESS_ZONE).plusDays(4);
        clearTrainerSchedulesForDate(CENTER_ID, trainerUserId, targetDate);
        insertWeeklyAvailabilityRule(CENTER_ID, trainerUserId, targetDate.getDayOfWeek().getValue(), "09:00", "12:00");

        long memberId = insertMemberFixture("PT비담당회원");
        long productId = insertProductFixture("PT", "COUNT");
        long membershipId = insertMembershipFixture(CENTER_ID, memberId, productId, "PT", "COUNT", 3, 3, 0, null);

        mockMvc.perform(get("/api/v1/reservations/pt-candidates")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + trainerToken)
                        .param("membershipId", String.valueOf(membershipId))
                        .param("trainerUserId", String.valueOf(trainerUserId))
                        .param("date", targetDate.toString()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void ptCandidateAndCreateRejectMalformedInputs() throws Exception {
        ensureDeskUser();
        ensureTrainerUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        long trainerUserId = findUserIdByLoginId(TRAINER_LOGIN_ID);

        LocalDate targetDate = LocalDate.now(BUSINESS_ZONE).plusDays(5);
        clearTrainerSchedulesForDate(CENTER_ID, trainerUserId, targetDate);
        insertWeeklyAvailabilityRule(CENTER_ID, trainerUserId, targetDate.getDayOfWeek().getValue(), "09:00", "12:00");

        long memberId = insertMemberFixture("PT검증회원");
        long productId = insertProductFixture("PT", "COUNT");
        long membershipId = insertMembershipFixture(CENTER_ID, memberId, productId, "PT", "COUNT", 3, 3, 0, trainerUserId);

        mockMvc.perform(get("/api/v1/reservations/pt-candidates")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                .param("membershipId", String.valueOf(membershipId))
                .param("trainerUserId", String.valueOf(trainerUserId))
                .param("date", "2026/03/27"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/v1/reservations/pt")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "trainerUserId": %d,
                                  "startAt": "%sT09:15:00+09:00"
                                }
                                """.formatted(memberId, membershipId, trainerUserId, targetDate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/v1/reservations/pt")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": 0,
                                  "trainerUserId": %d,
                                  "startAt": "%sT09:00:00+09:00"
                                }
                                """.formatted(memberId, trainerUserId, targetDate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/v1/reservations/pt")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "trainerUserId": %d,
                                  "startAt": "%sT09:00:00"
                                }
                                """.formatted(memberId, membershipId, trainerUserId, targetDate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void ptCreateNormalizesMemoAndTimezone() throws Exception {
        ensureDeskUser();
        ensureTrainerUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        long trainerUserId = findUserIdByLoginId(TRAINER_LOGIN_ID);

        LocalDate targetDate = LocalDate.now(BUSINESS_ZONE).plusDays(6);
        clearTrainerSchedulesForDate(CENTER_ID, trainerUserId, targetDate);
        insertWeeklyAvailabilityRule(CENTER_ID, trainerUserId, targetDate.getDayOfWeek().getValue(), "09:00", "13:00");

        long memberId = insertMemberFixture("PT정규화회원");
        long productId = insertProductFixture("PT", "COUNT");
        long membershipId = insertMembershipFixture(CENTER_ID, memberId, productId, "PT", "COUNT", 3, 3, 0, trainerUserId);

        MvcResult createResult = mockMvc.perform(post("/api/v1/reservations/pt")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "trainerUserId": %d,
                                  "startAt": "%sT00:00:00Z",
                                  "memo": "   현장 조율 메모   "
                                }
                                """.formatted(memberId, membershipId, trainerUserId, targetDate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.memo").value("현장 조율 메모"))
                .andReturn();

        long reservationId = jsonLong(createResult, "/data/reservationId");
        long scheduleId = jsonLong(createResult, "/data/scheduleId");

        OffsetDateTime storedScheduleStartAt = jdbcClient.sql("""
                SELECT start_at
                FROM trainer_schedules
                WHERE schedule_id = :scheduleId
                """)
                .param("scheduleId", scheduleId)
                .query(OffsetDateTime.class)
                .single();
        OffsetDateTime storedScheduleCreatedAt = jdbcClient.sql("""
                SELECT created_at
                FROM trainer_schedules
                WHERE schedule_id = :scheduleId
                """)
                .param("scheduleId", scheduleId)
                .query(OffsetDateTime.class)
                .single();
        String storedMemo = jdbcClient.sql("""
                SELECT memo
                FROM reservations
                WHERE reservation_id = :reservationId
                """)
                .param("reservationId", reservationId)
                .query(String.class)
                .single();

        org.junit.jupiter.api.Assertions.assertEquals(
                OffsetDateTime.parse(targetDate + "T09:00:00+09:00").toInstant(),
                storedScheduleStartAt.toInstant()
        );
        org.junit.jupiter.api.Assertions.assertTrue(storedScheduleCreatedAt.isBefore(storedScheduleStartAt));
        org.junit.jupiter.api.Assertions.assertEquals("현장 조율 메모", storedMemo);
    }

    @Test
    void ptCreateRejectsMemoLongerThan500Characters() throws Exception {
        ensureDeskUser();
        ensureTrainerUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);
        long trainerUserId = findUserIdByLoginId(TRAINER_LOGIN_ID);

        LocalDate targetDate = LocalDate.now(BUSINESS_ZONE).plusDays(7);
        clearTrainerSchedulesForDate(CENTER_ID, trainerUserId, targetDate);
        insertWeeklyAvailabilityRule(CENTER_ID, trainerUserId, targetDate.getDayOfWeek().getValue(), "09:00", "12:00");

        long memberId = insertMemberFixture("PT메모회원");
        long productId = insertProductFixture("PT", "COUNT");
        long membershipId = insertMembershipFixture(CENTER_ID, memberId, productId, "PT", "COUNT", 3, 3, 0, trainerUserId);
        String longMemo = "x".repeat(501);

        mockMvc.perform(post("/api/v1/reservations/pt")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": %d,
                                  "membershipId": %d,
                                  "trainerUserId": %d,
                                  "startAt": "%sT09:00:00+09:00",
                                  "memo": "%s"
                                }
                                """.formatted(memberId, membershipId, trainerUserId, targetDate, longMemo)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void deskRoleCannotReadOrMutateReservationFromAnotherCenter() throws Exception {
        ensureDeskUser();
        String deskToken = loginAndGetAccessToken(DESK_LOGIN_ID, DESK_PASSWORD);

        long otherCenterId = insertCenterFixture();
        long otherMemberId = insertMemberFixture(otherCenterId, "P7API타센터회원");
        long otherProductId = insertProductFixture(otherCenterId, "PT", "COUNT");
        long otherMembershipId = insertMembershipFixture(otherCenterId, otherMemberId, otherProductId, "PT", "COUNT", 5, 5, 0);
        TrainerSchedule otherSchedule = createFutureSchedule(otherCenterId, "PT", 2);
        long otherReservationId = insertReservationFixture(otherCenterId, otherMemberId, otherMembershipId, otherSchedule.scheduleId());

        mockMvc.perform(get("/api/v1/reservations/{reservationId}", otherReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/cancel", otherReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken)
                        .contentType("application/json")
                        .content("{\"cancelReason\":\"cross center\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/complete", otherReservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deskToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    private void ensureDeskUser() {
        int updated = jdbcClient.sql("""
                UPDATE users
                SET password_hash = :passwordHash,
                    user_name = :displayName,
                    user_status = 'ACTIVE',
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                  AND login_id = :loginId
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", DESK_LOGIN_ID)
                .param("passwordHash", passwordEncoder.encode(DESK_PASSWORD))
                .param("displayName", "Desk User")
                .update();
        if (updated > 0) {
            Long userId = jdbcClient.sql("""
                    SELECT user_id
                    FROM users
                    WHERE center_id = :centerId
                      AND login_id = :loginId
                    """)
                    .param("centerId", CENTER_ID)
                    .param("loginId", DESK_LOGIN_ID)
                    .query(Long.class)
                    .single();
            replaceUserRole(userId, "ROLE_DESK");
            return;
        }

        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, user_name, user_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :loginId, :passwordHash, :displayName, 'ACTIVE',
                    0, 0
                )
                RETURNING user_id
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", DESK_LOGIN_ID)
                .param("passwordHash", passwordEncoder.encode(DESK_PASSWORD))
                .param("displayName", "Desk User")
                .query(Long.class)
                .single();
        replaceUserRole(userId, "ROLE_DESK");
    }

    private void ensureTrainerUser() {
        int updated = jdbcClient.sql("""
                UPDATE users
                SET password_hash = :passwordHash,
                    user_name = :displayName,
                    user_status = 'ACTIVE',
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE center_id = :centerId
                  AND login_id = :loginId
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", TRAINER_LOGIN_ID)
                .param("passwordHash", passwordEncoder.encode(TRAINER_PASSWORD))
                .param("displayName", "Trainer User")
                .update();
        if (updated > 0) {
            Long userId = jdbcClient.sql("""
                    SELECT user_id
                    FROM users
                    WHERE center_id = :centerId
                      AND login_id = :loginId
                    """)
                    .param("centerId", CENTER_ID)
                    .param("loginId", TRAINER_LOGIN_ID)
                    .query(Long.class)
                    .single();
            replaceUserRole(userId, "ROLE_TRAINER");
            return;
        }

        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, user_name, user_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :loginId, :passwordHash, :displayName, 'ACTIVE',
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
        replaceUserRole(userId, "ROLE_TRAINER");
    }

    private void replaceUserRole(Long userId, String roleCode) {
        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_by)
                SELECT :userId, role_id, 0
                FROM roles
                WHERE role_code = :roleCode
                """)
                .param("userId", userId)
                .param("roleCode", roleCode)
                .update();
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
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("accessToken")
                .asText();
    }

    private long jsonLong(MvcResult result, String pointer) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString()).at(pointer);
        return node.asLong();
    }

    private long findUserIdByLoginId(String loginId) {
        return jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", loginId)
                .query(Long.class)
                .single();
    }

    private TrainerSchedule createFutureSchedule(String type, int capacity) {
        return createFutureSchedule(CENTER_ID, type, capacity);
    }

    private TrainerSchedule createFutureSchedule(long centerId, String type, int capacity) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        OffsetDateTime startAt = OffsetDateTime.now().plusDays(1).withNano(0);
        OffsetDateTime endAt = startAt.plusMinutes("PT".equals(type) ? 50 : 60);
        return trainerScheduleRepository.insert(new TrainerScheduleRepository.TrainerScheduleCreateCommand(
                centerId,
                null,
                type,
                "P7API트레이너-" + suffix,
                "P7API슬롯-" + suffix,
                startAt,
                endAt,
                capacity,
                0,
                "api fixture",
                1L,
                null,
                null
        ));
    }

    private TrainerSchedule createScheduleAt(
            long centerId,
            Long trainerUserId,
            String type,
            int capacity,
            LocalDate date,
            int startHour,
            int startMinute,
            int durationMinutes
    ) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        OffsetDateTime startAt = date.atTime(startHour, startMinute).atZone(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime endAt = startAt.plusMinutes(durationMinutes);
        return trainerScheduleRepository.insert(new TrainerScheduleRepository.TrainerScheduleCreateCommand(
                centerId,
                trainerUserId,
                type,
                "고정트레이너-" + suffix,
                "고정슬롯-" + suffix,
                startAt,
                endAt,
                capacity,
                0,
                "fixed fixture",
                1L,
                null,
                null
        ));
    }

    private TrainerSchedule createPastSchedule(String type, int capacity) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        OffsetDateTime endAt = OffsetDateTime.now().minusHours(1).withNano(0);
        OffsetDateTime startAt = endAt.minusMinutes("PT".equals(type) ? 50 : 60);
        return trainerScheduleRepository.insert(new TrainerScheduleRepository.TrainerScheduleCreateCommand(
                CENTER_ID,
                null,
                type,
                "P7API과거트레이너-" + suffix,
                "P7API과거슬롯-" + suffix,
                startAt,
                endAt,
                capacity,
                0,
                "past api fixture",
                1L,
                null,
                null
        ));
    }

    private long insertMemberFixture(String prefix) {
        return insertMemberFixture(CENTER_ID, prefix);
    }

    private long insertMemberFixture(long centerId, String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO members (
                    center_id, member_name, phone, member_status, join_date,
                    consent_sms, consent_marketing, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberName, :phone, 'ACTIVE', CURRENT_DATE,
                    TRUE, FALSE, 1, 1
                )
                RETURNING member_id
                """)
                .param("centerId", centerId)
                .param("memberName", prefix + "-" + suffix)
                .param("phone", "0105" + suffix.substring(0, 6))
                .query(Long.class)
                .single();
    }

    private void insertWeeklyAvailabilityRule(
            long centerId,
            long trainerUserId,
            int dayOfWeek,
            String startTime,
            String endTime
    ) {
        jdbcClient.sql("""
                DELETE FROM trainer_availability_rules
                WHERE center_id = :centerId
                  AND trainer_user_id = :trainerUserId
                  AND day_of_week = :dayOfWeek
                """)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .param("dayOfWeek", dayOfWeek)
                .update();
        jdbcClient.sql("""
                INSERT INTO trainer_availability_rules (
                    center_id, trainer_user_id, day_of_week, start_time, end_time,
                    created_at, created_by, updated_at, updated_by
                )
                VALUES (
                    :centerId, :trainerUserId, :dayOfWeek, :startTime, :endTime,
                    CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 1
                )
                """)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .param("dayOfWeek", dayOfWeek)
                .param("startTime", LocalTime.parse(startTime))
                .param("endTime", LocalTime.parse(endTime))
                .update();
    }

    private void clearTrainerSchedulesForDate(long centerId, long trainerUserId, LocalDate date) {
        OffsetDateTime dayStart = date.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime dayEnd = dayStart.plusDays(1);
        jdbcClient.sql("""
                DELETE FROM reservations
                WHERE schedule_id IN (
                    SELECT schedule_id
                    FROM trainer_schedules
                    WHERE center_id = :centerId
                      AND trainer_user_id = :trainerUserId
                      AND start_at >= :dayStart
                      AND start_at < :dayEnd
                )
                """)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .param("dayStart", dayStart)
                .param("dayEnd", dayEnd)
                .update();
        jdbcClient.sql("""
                DELETE FROM trainer_schedules
                WHERE center_id = :centerId
                  AND trainer_user_id = :trainerUserId
                  AND start_at >= :dayStart
                  AND start_at < :dayEnd
                """)
                .param("centerId", centerId)
                .param("trainerUserId", trainerUserId)
                .param("dayStart", dayStart)
                .param("dayEnd", dayEnd)
                .update();
    }

    private long insertProductFixture(String productCategory, String productType) {
        return insertProductFixture(CENTER_ID, productCategory, productType);
    }

    private long insertProductFixture(long centerId, String productCategory, String productType) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO products (
                    center_id, product_name, product_category, product_type, price_amount,
                    validity_days, total_count, allow_hold, allow_transfer, product_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :productName, :productCategory, :productType, :priceAmount,
                    :validityDays, :totalCount, FALSE, FALSE, 'ACTIVE',
                    1, 1
                )
                RETURNING product_id
                """)
                .param("centerId", centerId)
                .param("productName", "P7API상품-" + suffix)
                .param("productCategory", productCategory)
                .param("productType", productType)
                .param("priceAmount", new BigDecimal("50000"))
                .param("validityDays", "DURATION".equals(productType) ? 30 : null)
                .param("totalCount", "COUNT".equals(productType) ? 5 : null)
                .query(Long.class)
                .single();
    }

    private long insertMembershipFixture(
            long centerId,
            long memberId,
            long productId,
            String productCategory,
            String productType,
            Integer totalCount,
            Integer remainingCount,
            int usedCount,
            Long assignedTrainerId
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
                    :centerId, :memberId, :productId, :assignedTrainerId, 'ACTIVE',
                    :productNameSnapshot, :productCategorySnapshot, :productTypeSnapshot,
                    :priceAmountSnapshot, CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
                    :totalCount, :remainingCount, :usedCount,
                    0, 0, NULL,
                    1, 1
                )
                RETURNING membership_id
                """)
                .param("centerId", centerId)
                .param("memberId", memberId)
                .param("productId", productId)
                .param("assignedTrainerId", assignedTrainerId)
                .param("productNameSnapshot", "P7API회원권")
                .param("productCategorySnapshot", productCategory)
                .param("productTypeSnapshot", productType)
                .param("priceAmountSnapshot", new BigDecimal("50000"))
                .param("totalCount", totalCount)
                .param("remainingCount", remainingCount)
                .param("usedCount", usedCount)
                .query(Long.class)
                .single();
    }

    private long insertMembershipFixture(
            long centerId,
            long memberId,
            long productId,
            String productCategory,
            String productType,
            Integer totalCount,
            Integer remainingCount,
            int usedCount
    ) {
        return insertMembershipFixture(
                centerId,
                memberId,
                productId,
                productCategory,
                productType,
                totalCount,
                remainingCount,
                usedCount,
                null
        );
    }

    private long insertMembershipFixture(
            long memberId,
            long productId,
            String productCategory,
            String productType,
            Integer totalCount,
            Integer remainingCount,
            int usedCount
    ) {
        return insertMembershipFixture(CENTER_ID, memberId, productId, productCategory, productType, totalCount, remainingCount, usedCount, null);
    }

    private long insertCenterFixture() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return jdbcClient.sql("""
                INSERT INTO centers (
                    center_name, is_active, created_by, updated_by
                )
                VALUES (
                    :centerName, TRUE, 1, 1
                )
                RETURNING center_id
                """)
                .param("centerName", "P7API타센터-" + suffix)
                .query(Long.class)
                .single();
    }

    private long insertReservationFixture(long centerId, long memberId, long membershipId, long scheduleId) {
        return jdbcClient.sql("""
                INSERT INTO reservations (
                    center_id, member_id, membership_id, schedule_id,
                    reservation_status, reserved_at, created_by, updated_by
                )
                VALUES (
                    :centerId, :memberId, :membershipId, :scheduleId,
                    'CONFIRMED', CURRENT_TIMESTAMP, 1, 1
                )
                RETURNING reservation_id
                """)
                .param("centerId", centerId)
                .param("memberId", memberId)
                .param("membershipId", membershipId)
                .param("scheduleId", scheduleId)
                .query(Long.class)
                .single();
    }

    private void forceScheduleEnded(Long scheduleId) {
        OffsetDateTime now = OffsetDateTime.now();
        jdbcClient.sql("""
                UPDATE trainer_schedules
                SET start_at = :startAt,
                    end_at = :endAt,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 1
                WHERE schedule_id = :scheduleId
                """)
                .param("scheduleId", scheduleId)
                .param("startAt", now.minusHours(2))
                .param("endAt", now.minusMinutes(10))
                .update();
    }
}
