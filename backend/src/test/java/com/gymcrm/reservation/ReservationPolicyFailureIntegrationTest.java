package com.gymcrm.reservation;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.crm.service.CrmMessageService;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.membership.entity.MemberMembership;
import com.gymcrm.membership.repository.MemberMembershipRepository;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.reset;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class ReservationPolicyFailureIntegrationTest {
    private static final long CENTER_ID = 1L;

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
    private MemberService memberService;

    @Autowired
    private ProductService productService;

    @Autowired
    private JdbcClient jdbcClient;

    @MockBean
    private CrmMessageService crmMessageService;

    private Long createdMemberId;
    private Long createdSecondMemberId;
    private Long createdProductId;
    private Long createdMembershipId;
    private Long createdSecondMembershipId;
    private Long createdScheduleId;
    private Long createdReservationId;
    private Long createdWaitlistId;

    @AfterEach
    void tearDown() {
        if (createdWaitlistId != null) {
            jdbcClient.sql("DELETE FROM reservation_waitlists WHERE waiting_id = :waitingId")
                    .param("waitingId", createdWaitlistId)
                    .update();
        }
        if (createdReservationId != null) {
            jdbcClient.sql("DELETE FROM reservations WHERE reservation_id = :reservationId")
                    .param("reservationId", createdReservationId)
                    .update();
        }
        if (createdScheduleId != null) {
            jdbcClient.sql("DELETE FROM trainer_schedules WHERE schedule_id = :scheduleId")
                    .param("scheduleId", createdScheduleId)
                    .update();
        }
        if (createdMembershipId != null) {
            jdbcClient.sql("DELETE FROM member_memberships WHERE membership_id = :membershipId")
                    .param("membershipId", createdMembershipId)
                    .update();
        }
        if (createdSecondMembershipId != null) {
            jdbcClient.sql("DELETE FROM member_memberships WHERE membership_id = :membershipId")
                    .param("membershipId", createdSecondMembershipId)
                    .update();
        }
        if (createdProductId != null) {
            jdbcClient.sql("DELETE FROM products WHERE product_id = :productId")
                    .param("productId", createdProductId)
                    .update();
        }
        if (createdSecondMemberId != null) {
            jdbcClient.sql("DELETE FROM members WHERE member_id = :memberId")
                    .param("memberId", createdSecondMemberId)
                    .update();
        }
        if (createdMemberId != null) {
            jdbcClient.sql("DELETE FROM members WHERE member_id = :memberId")
                    .param("memberId", createdMemberId)
                    .update();
        }
        reset(crmMessageService);
    }

    @Test
    void gxWaitlistPromotionNotificationFailureRollsBackReservationChanges() {
        doReturn(true).when(crmMessageService).enqueueReservationConfirmed(any());
        doReturn(true).when(crmMessageService).enqueueReservationReminder(any());
        doReturn(false).when(crmMessageService).enqueueReservationWaitlistPromoted(any());

        Member firstMember = createActiveMember("P4정책회원1");
        Member secondMember = createActiveMember("P4정책회원2");
        Product product = createDurationProduct("P4GX정책상품");
        MemberMembership firstMembership = createDurationMembership(firstMember, product);
        MemberMembership secondMembership = createDurationMembership(secondMember, product);
        TrainerSchedule schedule = createFutureSchedule("GX", 1);

        Reservation createdReservation = reservationService.create(new ReservationService.CreateRequest(
                firstMember.memberId(),
                firstMembership.membershipId(),
                schedule.scheduleId(),
                null
        ));
        createdReservationId = createdReservation.reservationId();

        ReservationWaitlist waitlist = reservationWaitlistService.create(new ReservationWaitlistService.CreateRequest(
                secondMember.memberId(),
                secondMembership.membershipId(),
                schedule.scheduleId()
        ));
        createdWaitlistId = waitlist.waitingId();

        ApiException exception = assertThrows(ApiException.class, () -> reservationService.cancel(
                new ReservationService.CancelRequest(createdReservation.reservationId(), "정책 실패 테스트")
        ));
        assertEquals(ErrorCode.CONFLICT, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("대기 전환 알림을 등록하지 못했습니다."));

        Reservation reloadedReservation = reservationRepository.findById(createdReservation.reservationId(), CENTER_ID).orElseThrow();
        assertEquals("CONFIRMED", reloadedReservation.reservationStatus());

        TrainerSchedule reloadedSchedule = trainerScheduleRepository.findById(schedule.scheduleId()).orElseThrow();
        assertEquals(1, reloadedSchedule.currentCount());

        ReservationWaitlist reloadedWaitlist = reservationWaitlistRepository.findById(waitlist.waitingId(), CENTER_ID).orElseThrow();
        assertEquals("WAITING", reloadedWaitlist.status());
        assertTrue(reloadedWaitlist.reservationId() == null);
    }

    private Member createActiveMember(String prefix) {
        String token = numericToken();
        Member member = memberService.create(new MemberCreateRequest(
                prefix + "-" + token,
                "010-" + token.substring(0, 4) + "-" + token.substring(4, 8),
                prefix.toLowerCase() + "-" + token + "@example.com",
                "FEMALE",
                LocalDate.of(1995, 1, 1),
                "ACTIVE",
                LocalDate.now(),
                true,
                false,
                "policy-failure-test",
                prefix + "-긴급",
                "010-" + token.substring(0, 4) + "-" + token.substring(4, 8),
                "SPOUSE"
        ));
        if (createdMemberId == null) {
            createdMemberId = member.memberId();
        } else if (createdSecondMemberId == null) {
            createdSecondMemberId = member.memberId();
        }
        return member;
    }

    private Product createDurationProduct(String productName) {
        String token = numericToken();
        Product product = productService.create(new ProductService.ProductCreateRequest(
                productName + "-" + token,
                "GX",
                "DURATION",
                new BigDecimal("120000"),
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
                "policy-failure-test"
        ));
        createdProductId = product.productId();
        return product;
    }

    private MemberMembership createDurationMembership(Member member, Product product) {
        MemberMembership membership = memberMembershipRepository.insert(new MemberMembershipRepository.MemberMembershipCreateCommand(
                CENTER_ID,
                member.memberId(),
                product.productId(),
                null,
                "ACTIVE",
                product.productName(),
                product.productCategory(),
                product.productType(),
                product.priceAmount(),
                OffsetDateTime.now(),
                LocalDate.now(),
                LocalDate.now().plusDays(30),
                null,
                null,
                null,
                null,
                null,
                "policy-failure-test",
                1L
        ));
        if (createdMembershipId == null) {
            createdMembershipId = membership.membershipId();
        } else if (createdSecondMembershipId == null) {
            createdSecondMembershipId = membership.membershipId();
        }
        return membership;
    }

    private TrainerSchedule createFutureSchedule(String type, int capacity) {
        OffsetDateTime startAt = OffsetDateTime.now().plusDays(1).withNano(0);
        OffsetDateTime endAt = startAt.plusMinutes("PT".equals(type) ? 50 : 60);
        String token = numericToken();
        TrainerSchedule schedule = trainerScheduleRepository.insert(new TrainerScheduleRepository.TrainerScheduleCreateCommand(
                CENTER_ID,
                null,
                type,
                "정책 트레이너-" + token,
                "정책 슬롯-" + token,
                startAt,
                endAt,
                capacity,
                0,
                "policy-failure-test",
                1L,
                null,
                null
        ));
        createdScheduleId = schedule.scheduleId();
        return schedule;
    }

    private String numericToken() {
        long value = Math.floorMod(UUID.randomUUID().getMostSignificantBits(), 100000000L);
        return String.format("%08d", value);
    }
}
