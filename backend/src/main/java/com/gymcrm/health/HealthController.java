package com.gymcrm.health;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.config.PrototypeModeSettings;
import com.gymcrm.common.config.SecurityModeSettings;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/v1")
public class HealthController {
    private final PrototypeModeSettings prototypeModeSettings;
    private final SecurityModeSettings securityModeSettings;
    private final CurrentUserProvider currentUserProvider;

    public HealthController(
            PrototypeModeSettings prototypeModeSettings,
            SecurityModeSettings securityModeSettings,
            CurrentUserProvider currentUserProvider
    ) {
        this.prototypeModeSettings = prototypeModeSettings;
        this.securityModeSettings = securityModeSettings;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", "UP");
        payload.put("securityMode", securityModeSettings.mode());
        payload.put("prototypeNoAuth", securityModeSettings.isPrototypeMode() && prototypeModeSettings.isNoAuthEnabled());
        payload.put("currentUserId", resolveCurrentUserIdSafely());

        return ApiResponse.success(payload, "서비스가 정상 동작 중입니다.");
    }

    private Long resolveCurrentUserIdSafely() {
        try {
            return currentUserProvider.currentUserId();
        } catch (RuntimeException ignored) {
            return null;
        }
    }
}
