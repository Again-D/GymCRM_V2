package com.gymcrm.reservation.dto.response;

import com.gymcrm.reservation.service.PtReservationService;

import java.time.LocalDate;
import java.util.List;

public record PtReservationCandidatesResponse(
        LocalDate date,
        Long trainerUserId,
        Long membershipId,
        int slotDurationMinutes,
        int slotStepMinutes,
        List<PtReservationCandidateResponse> items
) {
    public static PtReservationCandidatesResponse from(PtReservationService.PtReservationCandidates candidates) {
        return new PtReservationCandidatesResponse(
                candidates.date(),
                candidates.trainerUserId(),
                candidates.membershipId(),
                candidates.slotDurationMinutes(),
                candidates.slotStepMinutes(),
                candidates.items().stream()
                        .map(PtReservationCandidateResponse::from)
                        .toList()
        );
    }
}
