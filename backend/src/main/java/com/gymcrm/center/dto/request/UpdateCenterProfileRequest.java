package com.gymcrm.center.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateCenterProfileRequest(
        @NotBlank(message = "centerName is required")
        String centerName,
        String phone,
        String address
) {}
