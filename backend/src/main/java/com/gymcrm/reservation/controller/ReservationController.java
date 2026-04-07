package com.gymcrm.reservation.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.reservation.dto.request.CancelReservationRequest;
import com.gymcrm.reservation.dto.request.CreateReservationRequest;
import com.gymcrm.reservation.dto.request.CreatePtReservationRequest;
import com.gymcrm.reservation.dto.response.CompleteReservationResponse;
import com.gymcrm.reservation.dto.response.PtReservationCandidatesResponse;
import com.gymcrm.reservation.dto.response.ReservationResponse;
import com.gymcrm.reservation.dto.response.ReservationScheduleResponse;
import com.gymcrm.reservation.dto.response.ReservationTargetResponse;
import com.gymcrm.reservation.entity.Reservation;
import com.gymcrm.reservation.entity.TrainerSchedule;
import com.gymcrm.reservation.service.ReservationService;
import com.gymcrm.reservation.service.PtReservationService;
import com.gymcrm.reservation.service.ReservationService.CancelRequest;
import com.gymcrm.reservation.service.ReservationService.CheckInRequest;
import com.gymcrm.reservation.service.ReservationService.CompleteRequest;
import com.gymcrm.reservation.service.ReservationService.CompleteResult;
import com.gymcrm.reservation.service.ReservationService.CreateRequest;
import com.gymcrm.reservation.service.ReservationService.NoShowRequest;
import com.gymcrm.reservation.service.ReservationService.ReservationTarget;

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
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/reservations")
public class ReservationController {
    private final ReservationService reservationService;
    private final PtReservationService ptReservationService;

    public ReservationController(ReservationService reservationService, PtReservationService ptReservationService) {
        this.reservationService = reservationService;
        this.ptReservationService = ptReservationService;
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
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
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
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
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<List<ReservationScheduleResponse>> listSchedules(
            @RequestParam(required = false) List<Long> scheduleIds
    ) {
        List<ReservationScheduleResponse> items = reservationService.listSchedules(scheduleIds).stream()
                .map(ReservationScheduleResponse::from)
                .toList();
        return ApiResponse.success(items, "예약 스케줄 목록 조회 성공");
    }

    @GetMapping("/pt-candidates")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<PtReservationCandidatesResponse> listPtCandidates(
            @RequestParam Long membershipId,
            @RequestParam Long trainerUserId,
            @RequestParam String date
    ) {
        return ApiResponse.success(
                PtReservationCandidatesResponse.from(ptReservationService.listCandidates(membershipId, trainerUserId, date)),
                "PT 예약 가능 시각 조회 성공"
        );
    }

    @PostMapping("/pt")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<ReservationResponse> createPt(@Valid @RequestBody CreatePtReservationRequest request) {
        Reservation reservation = ptReservationService.create(new PtReservationService.CreatePtReservationRequest(
                request.memberId(),
                request.membershipId(),
                request.trainerUserId(),
                request.startAt(),
                request.memo()
        ));
        return ApiResponse.success(ReservationResponse.from(reservation), "PT 예약이 생성되었습니다.");
    }

    @GetMapping("/targets")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<List<ReservationTargetResponse>> listTargets(@RequestParam(required = false) String keyword) {
        List<ReservationTargetResponse> items = reservationService.listTargets(keyword).stream()
                .map(ReservationTargetResponse::from)
                .toList();
        return ApiResponse.success(items, "예약 대상 회원 목록 조회 성공");
    }

    @GetMapping("/{reservationId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<ReservationResponse> detail(@PathVariable Long reservationId) {
        return ApiResponse.success(ReservationResponse.from(reservationService.get(reservationId)), "예약 상세 조회 성공");
    }

    @PostMapping("/{reservationId}/cancel")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
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
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<CompleteReservationResponse> complete(@PathVariable Long reservationId) {
        ReservationService.CompleteResult result = reservationService.complete(new ReservationService.CompleteRequest(reservationId));
        return ApiResponse.success(CompleteReservationResponse.from(result), "예약 완료 처리되었습니다.");
    }

    @PostMapping("/{reservationId}/check-in")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<ReservationResponse> checkIn(@PathVariable Long reservationId) {
        Reservation reservation = reservationService.checkIn(new ReservationService.CheckInRequest(reservationId));
        return ApiResponse.success(ReservationResponse.from(reservation), "체크인 처리되었습니다.");
    }

    @PostMapping("/{reservationId}/no-show")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<ReservationResponse> noShow(@PathVariable Long reservationId) {
        Reservation reservation = reservationService.noShow(new ReservationService.NoShowRequest(reservationId));
        return ApiResponse.success(ReservationResponse.from(reservation), "노쇼 처리되었습니다.");
    }
}
