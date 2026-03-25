package com.gymcrm.crm.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ProcessRequest(
            @Min(1) @Max(200) Integer limit
    ) {
    }