package com.gymcrm.crm.dto.request;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.springframework.format.annotation.DateTimeFormat;

import jakarta.validation.constraints.Pattern;

public record EventCampaignTriggerRequest(
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDate,
            @Pattern(regexp = "^[A-Z0-9_\\-]{2,40}$", message = "eventCode is invalid")
            String eventCode,
            @Pattern(regexp = "^(?i)(MEMBERSHIP|PT|GX|ETC)?$", message = "productCategory is invalid")
            String productCategory,
            Boolean forceFail,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime scheduledAt
    ) {
    }
