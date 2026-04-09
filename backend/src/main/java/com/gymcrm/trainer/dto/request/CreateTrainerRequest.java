package com.gymcrm.trainer.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateTrainerRequest(
        @NotNull(message = "centerId is required") Long centerId,
        @NotBlank(message = "loginId is required") String loginId,
        @NotBlank(message = "password is required") String password,
        @NotBlank(message = "userName is required") String userName,
        String phone,
        BigDecimal ptSessionUnitPrice,
        BigDecimal gxSessionUnitPrice
) {
}
