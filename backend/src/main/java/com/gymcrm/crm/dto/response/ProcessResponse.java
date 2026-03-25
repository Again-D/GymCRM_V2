package com.gymcrm.crm.dto.response;

import com.gymcrm.crm.service.CrmMessageService;

public record ProcessResponse(
            int pickedCount,
            int sentCount,
            int retryWaitCount,
            int deadCount,
            int maxAttempts
    ) {
        public static ProcessResponse from(CrmMessageService.ProcessResult result) {
            return new ProcessResponse(
                    result.pickedCount(),
                    result.sentCount(),
                    result.retryWaitCount(),
                    result.deadCount(),
                    result.maxAttempts()
            );
        }
    }