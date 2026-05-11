package com.gymcrm.crm.dto.request;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.springframework.format.annotation.DateTimeFormat;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record LongTermInactiveCampaignRequest(
        @NotNull Long templateId,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDate,
        @Min(1) @Max(3650) Integer inactiveDays,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime scheduledAt
) {
}
