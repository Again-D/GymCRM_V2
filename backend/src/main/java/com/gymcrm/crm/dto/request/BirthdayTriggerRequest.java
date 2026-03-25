package com.gymcrm.crm.dto.request;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.springframework.format.annotation.DateTimeFormat;

public record BirthdayTriggerRequest(
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDate,
            Boolean forceFail,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime scheduledAt
    ) {
    }
