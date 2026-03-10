package com.gymcrm.health;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.config.PrototypeModeSettings;
import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.common.config.SecurityModeSettings;
import com.gymcrm.common.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

class HealthControllerRedisStatusTest {

    @Test
    void healthPayloadIncludesRedisFeatureFlags() {
        PrototypeModeSettings prototypeModeSettings = Mockito.mock(PrototypeModeSettings.class);
        SecurityModeSettings securityModeSettings = Mockito.mock(SecurityModeSettings.class);
        CurrentUserProvider currentUserProvider = Mockito.mock(CurrentUserProvider.class);
        RedisRuntimeProperties redisRuntimeProperties = new RedisRuntimeProperties(
                true,
                false,
                new RedisRuntimeProperties.Toggle(true),
                new RedisRuntimeProperties.ReservationLock(false, Duration.ofMillis(250), Duration.ofSeconds(3)),
                new RedisRuntimeProperties.CrmDispatchClaim(true, Duration.ofSeconds(30)),
                new RedisRuntimeProperties.Toggle(true)
        );

        given(securityModeSettings.mode()).willReturn("jwt");
        given(securityModeSettings.isPrototypeMode()).willReturn(false);
        given(currentUserProvider.currentUserId()).willReturn(7L);

        HealthController controller = new HealthController(
                prototypeModeSettings,
                redisRuntimeProperties,
                securityModeSettings,
                currentUserProvider
        );

        ApiResponse<Map<String, Object>> response = controller.health();

        assertThat(response.success()).isTrue();
        assertThat(response.data()).containsEntry("securityMode", "jwt");
        assertThat(response.data()).containsEntry("currentUserId", 7L);
        assertThat(response.data()).containsKey("redis");

        @SuppressWarnings("unchecked")
        Map<String, Object> redis = (Map<String, Object>) response.data().get("redis");
        assertThat(redis)
                .containsEntry("enabled", true)
                .containsEntry("startupRequired", false)
                .containsEntry("qrTokenStoreEnabled", true)
                .containsEntry("reservationLockEnabled", false)
                .containsEntry("crmDispatchClaimEnabled", true)
                .containsEntry("authDenylistEnabled", true);
    }
}
