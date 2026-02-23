package com.gymcrm.health;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.config.PrototypeModeSettings;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {
    private final PrototypeModeSettings prototypeModeSettings;
    private final CurrentUserProvider currentUserProvider;

    public HealthController(
            PrototypeModeSettings prototypeModeSettings,
            CurrentUserProvider currentUserProvider
    ) {
        this.prototypeModeSettings = prototypeModeSettings;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.success(
                Map.of(
                        "status", "UP",
                        "prototypeNoAuth", prototypeModeSettings.isNoAuthEnabled(),
                        "currentUserId", currentUserProvider.currentUserId()
                ),
                "서비스가 정상 동작 중입니다."
        );
    }
}

