package com.gymcrm.reservation.dto.response;

import com.gymcrm.reservation.service.PtReservationService;

import java.time.OffsetDateTime;

public record PtReservationCandidateResponse(
        OffsetDateTime startAt,
        OffsetDateTime endAt,
        String source
) {
    public static PtReservationCandidateResponse from(PtReservationService.PtReservationCandidate candidate) {
        return new PtReservationCandidateResponse(
                candidate.startAt(),
                candidate.endAt(),
                candidate.source()
        );
    }
}
