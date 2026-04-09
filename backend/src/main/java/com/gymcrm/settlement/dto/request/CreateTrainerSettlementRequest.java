package com.gymcrm.settlement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateTrainerSettlementRequest(
        @NotBlank(message = "trainerId is required")
        String trainerId,
        @NotBlank(message = "periodStart is required")
        @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "periodStart must be yyyy-MM-dd")
        String periodStart,
        @NotBlank(message = "periodEnd is required")
        @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "periodEnd must be yyyy-MM-dd")
        String periodEnd
) {
}
