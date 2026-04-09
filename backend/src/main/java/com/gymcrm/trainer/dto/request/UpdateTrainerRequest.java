package com.gymcrm.trainer.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record UpdateTrainerRequest(
        @NotBlank(message = "loginId is required") String loginId,
        @NotBlank(message = "userName is required") String userName,
        String phone,
        BigDecimal ptSessionUnitPrice,
        BigDecimal gxSessionUnitPrice
) {
}
