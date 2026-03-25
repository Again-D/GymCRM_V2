package com.gymcrm.trainer.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateTrainerStatusRequest(
        @NotBlank(message = "userStatus is required") String userStatus
) {
}
