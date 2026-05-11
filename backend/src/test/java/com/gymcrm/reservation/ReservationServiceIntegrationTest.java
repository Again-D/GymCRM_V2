package com.gymcrm.reservation;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
import com.gymcrm.membership.repository.MembershipUsageEventRepository;
import com.gymcrm.membership.service.MembershipPurchaseService;
import com.gymcrm.crm.repository.CrmMessageEventRepository;
import com.gymcrm.product.entity.Product;
import com.gymcrm.product.service.ProductService;
import com.gymcrm.reservation.entity.Reservation;
import com.gymcrm.reservation.entity.ReservationWaitlist;
import com.gymcrm.reservation.entity.TrainerSchedule;
import com.gymcrm.reservation.repository.ReservationRepository;
import com.gymcrm.reservation.repository.ReservationWaitlistRepository;
import com.gymcrm.reservation.repository.TrainerScheduleRepository;
import com.gymcrm.reservation.service.ReservationService;
import com.gymcrm.reservation.service.ReservationWaitlistService;
import com.gymcrm.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class ReservationServiceIntegrationTest {
    private static final long CENTER_ID = 1L;
    private static final String TRAINER_LOGIN_ID = "reservation-trainer";

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private ReservationWaitlistService reservationWaitlistService;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private ReservationWaitlistRepository reservationWaitlistRepository;

    @Autowired
    private TrainerScheduleRepository trainerScheduleRepository;

    @Autowired
    private MemberMembershipRepository memberMembershipRepository;

    @Autowired
    private MembershipPurchaseService membershipPurchaseService;

    @Autowired
    private MembershipUsageEventRepository membershipUsageEventRepository;

    @Autowired
    private CrmMessageEventRepository crmMessageEventRepository;

    @Autowired
    private MemberService memberService;

    @Autowired
    private ProductService productService;

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    @Transactional
    void createReservationIncrementsCurrentCount() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        TrainerSchedule schedule = createFutureSchedule("PT", 1);
        int currentCountBefore = schedule.currentCount();

        Reservation reservation = reservationService.create(new ReservationService.CreateRequest(
                member.memberId(),
                membership.membershipId(),
                schedule.scheduleId(),
                "예약 메모"
        ));

        assertEquals("CONFIRMED", reservation.reservationStatus());
        TrainerSchedule reloadedSchedule = trainerScheduleRepository.findById(schedule.scheduleId()).orElseThrow();
        assertEquals(currentCountBefore + 1, reloadedSchedule.currentCount());
    }

    @Test
    @Transactional
    void createReservationEnqueuesConfirmationAndReminderNotifications() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        TrainerSchedule schedule = createFutureSchedule("GX", 5);

        Reservation reservation = reservationService.create(new ReservationService.CreateRequest(
                member.memberId(),
                membership.membershipId(),
                schedule.scheduleId(),
                "예약 메모"
        ));

        assertTrue(crmMessageEventRepository.findRecent(CENTER_ID, null, 10).stream()
                .anyMatch(event -> "RESERVATION_CONFIRMED".equals(event.eventType())
                        && event.memberId() != null
                        && event.memberId().equals(member.memberId())
                        && event.dedupeKey() != null
                        && event.dedupeKey().contains(String.valueOf(reservation.reservationId()))));
        assertTrue(crmMessageEventRepository.findRecent(CENTER_ID, null, 10).stream()
                .anyMatch(event -> "RESERVATION_REMINDER".equals(event.eventType())
                        && event.memberId() != null
                        && event.memberId().equals(member.memberId())
                        && event.nextAttemptAt() != null
                        && event.nextAttemptAt().equals(schedule.startAt().minusMinutes(120))));

        MemberMembership reloadedMembership = memberMembershipRepository.findById(membership.membershipId()).orElseThrow();
        assertEquals(membership.remainingCount(), reloadedMembership.remainingCount());
    }

    @Test
    @Transactional
    void duplicateConfirmedReservationIsBlockedAndDoesNotIncreaseCountTwice() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        TrainerSchedule schedule = createFutureSchedule("GX", 5);

        reservationService.create(new ReservationService.CreateRequest(
                member.memberId(),
                membership.membershipId(),
                schedule.scheduleId(),
                null
        ));

        ApiException exception = assertThrows(ApiException.class, () -> reservationService.create(new ReservationService.CreateRequest(
                member.memberId(),
                membership.membershipId(),
                schedule.scheduleId(),
                null
        )));
        assertEquals(com.gymcrm.common.error.ErrorCode.CONFLICT, exception.getErrorCode());

        TrainerSchedule reloadedSchedule = trainerScheduleRepository.findById(schedule.scheduleId()).orElseThrow();
        assertEquals(1, reloadedSchedule.currentCount());
    }

    @Test
    @Transactional
    void cancelReservationDecrementsCurrentCount() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        TrainerSchedule schedule = createFutureSchedule("PT", 1);
        Reservation created = reservationService.create(new ReservationService.CreateRequest(
                member.memberId(),
                membership.membershipId(),
                schedule.scheduleId(),
                null
        ));

        Reservation cancelled = reservationService.cancel(new ReservationService.CancelRequest(
                created.reservationId(),
                "테스트 취소"
        ));

        assertEquals("CANCELLED", cancelled.reservationStatus());
        assertTrue(cancelled.cancelledAt() != null);
        TrainerSchedule reloadedSchedule = trainerScheduleRepository.findById(schedule.scheduleId()).orElseThrow();
        assertEquals(0, reloadedSchedule.currentCount());
    }

    @Test
    @Transactional
    void completeReservationDeductsCountMembershipAndPreventsDoubleDeduction() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        Integer remainingBefore = membership.remainingCount();
        TrainerSchedule schedule = createFutureSchedule("PT", 1);
        Reservation created = reservationService.create(new ReservationService.CreateRequest(
                member.memberId(),
                membership.membershipId(),
                schedule.scheduleId(),
                null
        ));

        MemberMembership beforeComplete = memberMembershipRepository.findById(membership.membershipId()).orElseThrow();
        assertEquals(remainingBefore, beforeComplete.remainingCount());

        ReservationService.CompleteResult completeResult = reservationService.complete(
                new ReservationService.CompleteRequest(created.reservationId())
        );

        assertEquals("COMPLETED", completeResult.reservation().reservationStatus());
        assertTrue(completeResult.countDeducted());
        assertEquals(remainingBefore - 1, completeResult.membership().remainingCount());
        assertEquals(1, completeResult.membership().usedCount());
        assertEquals(1, membershipUsageEventRepository.findByReservationId(created.reservationId()).size());
        assertEquals("RESERVATION_COMPLETE",
                membershipUsageEventRepository.findByReservationId(created.reservationId()).getFirst().usageEventType());
        assertEquals(-1,
                membershipUsageEventRepository.findByReservationId(created.reservationId()).getFirst().deltaCount());

        TrainerSchedule reloadedSchedule = trainerScheduleRepository.findById(schedule.scheduleId()).orElseThrow();
        assertEquals(0, reloadedSchedule.currentCount());

        ApiException exception = assertThrows(ApiException.class, () -> reservationService.complete(
                new ReservationService.CompleteRequest(created.reservationId())
        ));
        assertEquals(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, exception.getErrorCode());

        MemberMembership reloadedMembership = memberMembershipRepository.findById(membership.membershipId()).orElseThrow();
        assertEquals(remainingBefore - 1, reloadedMembership.remainingCount());
        assertEquals(1, reloadedMembership.usedCount());
    }

    @Test
    @Transactional
    void completeDurationReservationDoesNotDeductCount() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseDurationMembership(member);
        TrainerSchedule schedule = createFutureSchedule("GX", 10);
        Reservation created = reservationService.create(new ReservationService.CreateRequest(
                member.memberId(),
                membership.membershipId(),
                schedule.scheduleId(),
                null
        ));

        ReservationService.CompleteResult completeResult = reservationService.complete(
                new ReservationService.CompleteRequest(created.reservationId())
        );

        assertFalse(completeResult.countDeducted());
        assertEquals(membership.remainingCount(), completeResult.membership().remainingCount());
        assertTrue(membershipUsageEventRepository.findByReservationId(created.reservationId()).isEmpty());
    }

    @Test
    @Transactional
    void checkInRecordsTimestampAndRejectsRepeatCheckIn() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        TrainerSchedule schedule = createFutureSchedule("PT", 2);
        Reservation created = reservationService.create(new ReservationService.CreateRequest(
                member.memberId(), membership.membershipId(), schedule.scheduleId(), null
        ));

        Reservation checkedIn = reservationService.checkIn(new ReservationService.CheckInRequest(created.reservationId()));
        assertEquals("CONFIRMED", checkedIn.reservationStatus());
        assertTrue(checkedIn.checkedInAt() != null);

        ApiException exception = assertThrows(ApiException.class,
                () -> reservationService.checkIn(new ReservationService.CheckInRequest(created.reservationId())));
        assertEquals(com.gymcrm.common.error.ErrorCode.CONFLICT, exception.getErrorCode());
    }

    @Test
    @Transactional
    void noShowIsBlockedBeforeScheduleEndAndAllowedAfterEndWithoutCountDeduction() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        Integer remainingBefore = membership.remainingCount();
        TrainerSchedule schedule = createFutureSchedule("GX", 5);
        Reservation created = reservationService.create(new ReservationService.CreateRequest(
                member.memberId(), membership.membershipId(), schedule.scheduleId(), null
        ));

        ApiException beforeEnd = assertThrows(ApiException.class,
                () -> reservationService.noShow(new ReservationService.NoShowRequest(created.reservationId())));
        assertEquals(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, beforeEnd.getErrorCode());

        forceScheduleEnded(schedule.scheduleId());
        Reservation noShow = reservationService.noShow(new ReservationService.NoShowRequest(created.reservationId()));
        assertEquals("NO_SHOW", noShow.reservationStatus());
        assertTrue(noShow.noShowAt() != null);
        assertTrue(noShow.checkedInAt() == null);

        TrainerSchedule reloadedSchedule = trainerScheduleRepository.findById(schedule.scheduleId()).orElseThrow();
        assertEquals(0, reloadedSchedule.currentCount());
        MemberMembership reloadedMembership = memberMembershipRepository.findById(membership.membershipId()).orElseThrow();
        assertEquals(remainingBefore, reloadedMembership.remainingCount());
        assertTrue(membershipUsageEventRepository.findByReservationId(created.reservationId()).isEmpty());
    }

    @Test
    @Transactional
    void noShowIsRejectedAfterCheckIn() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        TrainerSchedule schedule = createFutureSchedule("PT", 2);
        Reservation created = reservationService.create(new ReservationService.CreateRequest(
                member.memberId(), membership.membershipId(), schedule.scheduleId(), null
        ));
        reservationService.checkIn(new ReservationService.CheckInRequest(created.reservationId()));
        forceScheduleEnded(schedule.scheduleId());

        ApiException exception = assertThrows(ApiException.class,
                () -> reservationService.noShow(new ReservationService.NoShowRequest(created.reservationId())));
        assertEquals(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, exception.getErrorCode());
    }

    @Test
    @Transactional
    void createReservationRejectsCountMembershipWithNoRemainingCount() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        TrainerSchedule schedule = createFutureSchedule("PT", 2);

        MemberMembership exhausted = jdbcClient.sql("""
                UPDATE member_memberships
                SET remaining_count = 0,
                    used_count = COALESCE(total_count, 0),
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 1
                WHERE membership_id = :membershipId
                RETURNING
                    membership_id, center_id, member_id, product_id, assigned_trainer_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .param("membershipId", membership.membershipId())
                .query(MemberMembership.class)
                .single();
        assertEquals(0, exhausted.remainingCount());

        ApiException exception = assertThrows(ApiException.class, () -> reservationService.create(
                new ReservationService.CreateRequest(
                        member.memberId(),
                        exhausted.membershipId(),
                        schedule.scheduleId(),
                        null
                )
        ));
        assertEquals(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, exception.getErrorCode());

        TrainerSchedule reloadedSchedule = trainerScheduleRepository.findById(schedule.scheduleId()).orElseThrow();
        assertEquals(0, reloadedSchedule.currentCount());
    }

    @Test
    @Transactional
    void createReservationRejectsExpiredActiveMembership() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseCountMembership(member);
        TrainerSchedule schedule = createFutureSchedule("PT", 2);

        MemberMembership expired = jdbcClient.sql("""
                UPDATE member_memberships
                SET end_date = CURRENT_DATE - 1,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 1
                WHERE membership_id = :membershipId
                RETURNING
                    membership_id, center_id, member_id, product_id, assigned_trainer_id, membership_status,
                    product_name_snapshot, product_category_snapshot, product_type_snapshot,
                    price_amount_snapshot, purchased_at, start_date, end_date,
                    total_count, remaining_count, used_count,
                    hold_days_used, hold_count_used, memo,
                    created_at, created_by, updated_at, updated_by
                """)
                .param("membershipId", membership.membershipId())
                .query(MemberMembership.class)
                .single();
        assertTrue(expired.endDate() != null && expired.endDate().isBefore(LocalDate.now()));

        ApiException exception = assertThrows(ApiException.class, () -> reservationService.create(
                new ReservationService.CreateRequest(
                        member.memberId(),
                        expired.membershipId(),
                        schedule.scheduleId(),
                        null
                )
        ));
        assertEquals(com.gymcrm.common.error.ErrorCode.BUSINESS_RULE, exception.getErrorCode());

        TrainerSchedule reloadedSchedule = trainerScheduleRepository.findById(schedule.scheduleId()).orElseThrow();
        assertEquals(0, reloadedSchedule.currentCount());
    }

    @Test
    @Transactional
    void gxWaitlistPromotesNextMemberAndEnqueuesNotificationOnCancellation() {
        Member firstMember = createActiveMember();
        Member secondMember = createActiveMember();
        MemberMembership firstMembership = purchaseDurationMembership(firstMember);
        MemberMembership secondMembership = purchaseDurationMembership(secondMember);
        TrainerSchedule schedule = createFutureSchedule("GX", 1);

        Reservation created = reservationService.create(new ReservationService.CreateRequest(
                firstMember.memberId(),
                firstMembership.membershipId(),
                schedule.scheduleId(),
                null
        ));

        ReservationWaitlist waitlist = reservationWaitlistService.create(new ReservationWaitlistService.CreateRequest(
                secondMember.memberId(),
                secondMembership.membershipId(),
                schedule.scheduleId()
        ));
        assertEquals("WAITING", waitlist.status());

        Reservation cancelled = reservationService.cancel(new ReservationService.CancelRequest(
                created.reservationId(),
                "테스트 취소"
        ));
        assertEquals("CANCELLED", cancelled.reservationStatus());

        TrainerSchedule reloadedSchedule = trainerScheduleRepository.findById(schedule.scheduleId()).orElseThrow();
        assertEquals(1, reloadedSchedule.currentCount());

        ReservationWaitlist promotedWaitlist = reservationWaitlistRepository.findById(waitlist.waitingId(), CENTER_ID).orElseThrow();
        assertEquals("PROMOTED", promotedWaitlist.status());
        assertTrue(promotedWaitlist.promotedAt() != null);
        assertTrue(promotedWaitlist.reservationId() != null);

        assertEquals(1, reservationRepository.findAll(CENTER_ID, secondMember.memberId(), schedule.scheduleId(), "CONFIRMED", null).size());
        assertTrue(crmMessageEventRepository.findRecent(CENTER_ID, null, 10).stream()
                .anyMatch(event -> "RESERVATION_WAITLIST_PROMOTED".equals(event.eventType())
                        && event.dedupeKey() != null
                        && event.dedupeKey().contains(String.valueOf(waitlist.waitingId()))));
    }

    @Test
    @Transactional
    void gxCancellationIsRejectedAfterCutoffWindow() {
        Member member = createActiveMember();
        MemberMembership membership = purchaseDurationMembership(member);
        TrainerSchedule schedule = createFutureSchedule("GX", 1);
        forceScheduleStartAt(schedule.scheduleId(), OffsetDateTime.now().plusMinutes(60), OffsetDateTime.now().plusMinutes(120));
        Reservation created = reservationService.create(new ReservationService.CreateRequest(
                member.memberId(),
                membership.membershipId(),
                schedule.scheduleId(),
                null
        ));

        ApiException exception = assertThrows(ApiException.class, () -> reservationService.cancel(
                new ReservationService.CancelRequest(created.reservationId(), "늦은 취소")
        ));
        assertEquals(ErrorCode.RESERVATION_CANCEL_TOO_LATE, exception.getErrorCode());
    }

    private TrainerSchedule createFutureSchedule(String type, int capacity) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        OffsetDateTime startAt = OffsetDateTime.now().plusDays(1).withNano(0);
        OffsetDateTime endAt = startAt.plusMinutes("PT".equals(type) ? 50 : 60);
        return trainerScheduleRepository.insert(new TrainerScheduleRepository.TrainerScheduleCreateCommand(
                CENTER_ID,
                null,
                type,
                "P7트레이너-" + suffix,
                "P7슬롯-" + suffix,
                startAt,
                endAt,
                capacity,
                0,
                "test fixture",
                1L,
                null,
                null
        ));
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

    private void forceScheduleStartAt(Long scheduleId, OffsetDateTime startAt, OffsetDateTime endAt) {
        jdbcClient.sql("""
                UPDATE trainer_schedules
                SET start_at = :startAt,
                    end_at = :endAt,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 1
                WHERE schedule_id = :scheduleId
                """)
                .param("scheduleId", scheduleId)
                .param("startAt", startAt)
                .param("endAt", endAt)
                .update();
    }

    private Member createActiveMember() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return memberService.create(new MemberCreateRequest(
                "P7예약회원-" + suffix,
                "010-6" + suffix.substring(0, 3) + "-" + suffix.substring(3, 7),
                null,
                null,
                null,
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                null
        ));
    }

    private MemberMembership purchaseCountMembership(Member member) {
        Product product = productService.create(new ProductService.ProductCreateRequest(
                "P7PT횟수-" + UUID.randomUUID().toString().substring(0, 8),
                "PT",
                "COUNT",
                new BigDecimal("100000"),
                null,
                10,
                false,
                null,
                null,
                false,
                false,
                41L,
                null,
                "ACTIVE",
                null
        ));
        return membershipPurchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                ensureTrainerUser(),
                LocalDate.now(),
                product.priceAmount(),
                "CARD",
                null,
                null
        )).membership();
    }

    private MemberMembership purchaseDurationMembership(Member member) {
        Product product = productService.create(new ProductService.ProductCreateRequest(
                "P7GX기간-" + UUID.randomUUID().toString().substring(0, 8),
                "GX",
                "DURATION",
                new BigDecimal("70000"),
                30,
                null,
                false,
                null,
                null,
                false,
                false,
                null,
                null,
                "ACTIVE",
                null
        ));
        return membershipPurchaseService.purchase(new MembershipPurchaseService.PurchaseRequest(
                member.memberId(),
                product.productId(),
                null,
                LocalDate.now(),
                product.priceAmount(),
                "CASH",
                null,
                null
        )).membership();
    }

    private Long ensureTrainerUser() {
        Long existingUserId = jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", TRAINER_LOGIN_ID)
                .query(Long.class)
                .optional()
                .orElse(null);

        if (existingUserId != null) {
            ensureTrainerRole(existingUserId);
            return existingUserId;
        }

        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, user_name, user_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :loginId, :passwordHash, :userName, 'ACTIVE',
                    0, 0
                )
                RETURNING user_id
                """)
                .param("centerId", CENTER_ID)
                .param("loginId", TRAINER_LOGIN_ID)
                .param("passwordHash", "{noop}unused")
                .param("userName", "Reservation Trainer")
                .query(Long.class)
                .single();
        ensureTrainerRole(userId);
        return userId;
    }

    private void ensureTrainerRole(Long userId) {
        jdbcClient.sql("""
                UPDATE users
                SET user_status = 'ACTIVE',
                    user_name = :userName,
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = 0
                WHERE user_id = :userId
                """)
                .param("userId", userId)
                .param("userName", "Reservation Trainer")
                .update();
        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_by)
                SELECT :userId, role_id, 0
                FROM roles
                WHERE role_code = 'ROLE_TRAINER'
                """)
                .param("userId", userId)
                .update();
    }
}
