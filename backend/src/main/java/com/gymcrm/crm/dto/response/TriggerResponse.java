package com.gymcrm.crm.dto.response;

import java.time.LocalDate;

import com.gymcrm.crm.service.CrmMessageService;

public record TriggerResponse(
            LocalDate baseDate,
            LocalDate targetDate,
            int totalTargets,
            int createdCount,
            int duplicatedCount
    ) {
        public static TriggerResponse from(CrmMessageService.TriggerResult result) {
            return new TriggerResponse(
                    result.baseDate(),
                    result.targetDate(),
                    result.totalTargets(),
                    result.createdCount(),
                    result.duplicatedCount()
            );
        }
    }
