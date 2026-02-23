package com.gymcrm.health;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/samples")
public class Phase1SampleController {

    @GetMapping("/business-error")
    public ApiResponse<Void> businessError() {
        throw new ApiException(ErrorCode.BUSINESS_RULE, "샘플 비즈니스 오류");
    }

    @PostMapping("/validate")
    public ApiResponse<Map<String, String>> validate(@Valid @RequestBody ValidateSampleRequest request) {
        return ApiResponse.success(Map.of("name", request.name()), "검증 성공");
    }

    public record ValidateSampleRequest(
            @NotBlank(message = "name is required") String name
    ) {}
}
