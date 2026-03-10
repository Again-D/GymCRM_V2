package com.gymcrm.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.redis")
public record RedisRuntimeProperties(
        boolean enabled,
        boolean startupRequired,
        Toggle qrTokenStore,
        ReservationLock reservationLock,
        CrmDispatchClaim crmDispatchClaim,
        SettlementDashboardCache settlementDashboardCache,
        Toggle authDenylist
) {
    public record Toggle(boolean enabled) {
    }

    public record ReservationLock(
            boolean enabled,
            Duration waitTime,
            Duration leaseTime
    ) {
    }

    public record CrmDispatchClaim(
            boolean enabled,
            Duration leaseTime
    ) {
    }

    public record SettlementDashboardCache(
            boolean enabled,
            Duration ttl
    ) {
    }
}
