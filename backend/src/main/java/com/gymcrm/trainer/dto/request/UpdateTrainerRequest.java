package com.gymcrm.trainer.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateTrainerRequest(
        @NotBlank(message = "loginId is required") String loginId,
        @NotBlank(message = "displayName is required") String displayName,
        String phone
) {
}
