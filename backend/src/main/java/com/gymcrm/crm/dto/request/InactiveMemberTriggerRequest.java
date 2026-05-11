package com.gymcrm.crm.dto.request;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.springframework.format.annotation.DateTimeFormat;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record InactiveMemberTriggerRequest(
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDate,
        @Min(0) @Max(365) Integer inactiveDays,
        Boolean forceFail,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime scheduledAt
) {
}
