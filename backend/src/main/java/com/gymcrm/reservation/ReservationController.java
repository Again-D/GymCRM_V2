package com.gymcrm.reservation;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/reservations")
public class ReservationController {
    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<ReservationResponse> create(@Valid @RequestBody CreateReservationRequest request) {
        Reservation reservation = reservationService.create(new ReservationService.CreateRequest(
                request.memberId(),
                request.membershipId(),
                request.scheduleId(),
                request.memo()
        ));
        return ApiResponse.success(ReservationResponse.from(reservation), "예약이 생성되었습니다.");
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<List<ReservationResponse>> list(
            @RequestParam(required = false) Long memberId,
            @RequestParam(required = false) Long scheduleId,
            @RequestParam(required = false) String status
    ) {
        List<ReservationResponse> items = reservationService.list(memberId, scheduleId, status).stream()
                .map(ReservationResponse::from)
                .toList();
        return ApiResponse.success(items, "예약 목록 조회 성공");
    }

    @GetMapping("/schedules")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<List<ReservationScheduleResponse>> listSchedules() {
        List<ReservationScheduleResponse> items = reservationService.listSchedules().stream()
                .map(ReservationScheduleResponse::from)
                .toList();
        return ApiResponse.success(items, "예약 스케줄 목록 조회 성공");
    }

    @GetMapping("/{reservationId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<ReservationResponse> detail(@PathVariable Long reservationId) {
        return ApiResponse.success(ReservationResponse.from(reservationService.get(reservationId)), "예약 상세 조회 성공");
    }

    @PostMapping("/{reservationId}/cancel")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<ReservationResponse> cancel(
            @PathVariable Long reservationId,
            @Valid @RequestBody CancelReservationRequest request
    ) {
        Reservation reservation = reservationService.cancel(new ReservationService.CancelRequest(
                reservationId,
                request.cancelReason()
        ));
        return ApiResponse.success(ReservationResponse.from(reservation), "예약이 취소되었습니다.");
    }

    @PostMapping("/{reservationId}/complete")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<CompleteReservationResponse> complete(@PathVariable Long reservationId) {
        ReservationService.CompleteResult result = reservationService.complete(new ReservationService.CompleteRequest(reservationId));
        return ApiResponse.success(CompleteReservationResponse.from(result), "예약 완료 처리되었습니다.");
    }

    public record CreateReservationRequest(
            @NotNull(message = "memberId is required") Long memberId,
            @NotNull(message = "membershipId is required") Long membershipId,
            @NotNull(message = "scheduleId is required") Long scheduleId,
            String memo
    ) {}

    public record CancelReservationRequest(String cancelReason) {}

    public record ReservationResponse(
            Long reservationId,
            Long centerId,
            Long memberId,
            Long membershipId,
            Long scheduleId,
            String reservationStatus,
            OffsetDateTime reservedAt,
            OffsetDateTime cancelledAt,
            OffsetDateTime completedAt,
            String cancelReason,
            String memo
    ) {
        static ReservationResponse from(Reservation reservation) {
            return new ReservationResponse(
                    reservation.reservationId(),
                    reservation.centerId(),
                    reservation.memberId(),
                    reservation.membershipId(),
                    reservation.scheduleId(),
                    reservation.reservationStatus(),
                    reservation.reservedAt(),
                    reservation.cancelledAt(),
                    reservation.completedAt(),
                    reservation.cancelReason(),
                    reservation.memo()
            );
        }
    }

    public record ReservationScheduleResponse(
            Long scheduleId,
            Long centerId,
            String scheduleType,
            String trainerName,
            String slotTitle,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            Integer capacity,
            Integer currentCount,
            String memo
    ) {
        static ReservationScheduleResponse from(TrainerSchedule schedule) {
            return new ReservationScheduleResponse(
                    schedule.scheduleId(),
                    schedule.centerId(),
                    schedule.scheduleType(),
                    schedule.trainerName(),
                    schedule.slotTitle(),
                    schedule.startAt(),
                    schedule.endAt(),
                    schedule.capacity(),
                    schedule.currentCount(),
                    schedule.memo()
            );
        }
    }

    public record CompleteReservationResponse(
            ReservationResponse reservation,
            Long membershipId,
            String membershipStatus,
            Integer remainingCount,
            Integer usedCount,
            boolean countDeducted
    ) {
        static CompleteReservationResponse from(ReservationService.CompleteResult result) {
            return new CompleteReservationResponse(
                    ReservationResponse.from(result.reservation()),
                    result.membership().membershipId(),
                    result.membership().membershipStatus(),
                    result.membership().remainingCount(),
                    result.membership().usedCount(),
                    result.countDeducted()
            );
        }
    }
}
