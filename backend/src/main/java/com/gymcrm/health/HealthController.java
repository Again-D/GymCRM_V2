package com.gymcrm.health;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.config.PrototypeModeSettings;
import com.gymcrm.common.config.RedisRuntimeProperties;
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
    private final RedisRuntimeProperties redisRuntimeProperties;
    private final SecurityModeSettings securityModeSettings;
    private final CurrentUserProvider currentUserProvider;

    public HealthController(
            PrototypeModeSettings prototypeModeSettings,
            RedisRuntimeProperties redisRuntimeProperties,
            SecurityModeSettings securityModeSettings,
            CurrentUserProvider currentUserProvider
    ) {
        this.prototypeModeSettings = prototypeModeSettings;
        this.redisRuntimeProperties = redisRuntimeProperties;
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
        payload.put("redis", redisStatus());

        return ApiResponse.success(payload, "서비스가 정상 동작 중입니다.");
    }

    private Long resolveCurrentUserIdSafely() {
        try {
            return currentUserProvider.currentUserId();
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private Map<String, Object> redisStatus() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("enabled", redisRuntimeProperties.enabled());
        payload.put("startupRequired", redisRuntimeProperties.startupRequired());
        payload.put("qrTokenStoreEnabled", redisRuntimeProperties.qrTokenStore().enabled());
        payload.put("reservationLockEnabled", redisRuntimeProperties.reservationLock().enabled());
        payload.put("crmDispatchClaimEnabled", redisRuntimeProperties.crmDispatchClaim().enabled());
        payload.put("authDenylistEnabled", redisRuntimeProperties.authDenylist().enabled());
        return payload;
    }
}
