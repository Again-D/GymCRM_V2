package com.gymcrm.settlement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PreviewTrainerSettlementRequest(
        @NotBlank(message = "trainerId is required")
        String trainerId,
        @Pattern(regexp = "^$|^\\d{4}-\\d{2}$", message = "settlementMonth must be YYYY-MM")
        String settlementMonth,
        @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "periodStart must be yyyy-MM-dd")
        String periodStart,
        @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "periodEnd must be yyyy-MM-dd")
        String periodEnd
) {
}
