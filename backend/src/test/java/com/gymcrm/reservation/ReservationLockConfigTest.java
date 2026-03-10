package com.gymcrm.reservation;

import org.junit.jupiter.api.Test;
import org.redisson.api.RedissonClient;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class ReservationLockConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(ReservationLockConfig.class);

    @Test
    void fallsBackToNoOpWhenReservationLockFlagIsDisabled() {
        contextRunner
                .withPropertyValues("app.redis.reservation-lock.enabled=false")
                .run(context -> assertThat(context.getBean(ReservationLockService.class)).isInstanceOf(NoOpReservationLockService.class));
    }

    @Test
    void usesRedissonServiceWhenRedissonBeanAndFlagArePresent() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.reservation-lock.enabled=true",
                        "app.redis.reservation-lock.wait-time=250ms",
                        "app.redis.reservation-lock.lease-time=3s"
                )
                .withBean(RedissonClient.class, () -> mock(RedissonClient.class))
                .withBean(com.gymcrm.common.config.RedisRuntimeProperties.class, () -> new com.gymcrm.common.config.RedisRuntimeProperties(
                        true,
                        false,
                        new com.gymcrm.common.config.RedisRuntimeProperties.Toggle(false),
                        new com.gymcrm.common.config.RedisRuntimeProperties.ReservationLock(true, java.time.Duration.ofMillis(250), java.time.Duration.ofSeconds(3)),
                        new com.gymcrm.common.config.RedisRuntimeProperties.CrmDispatchClaim(false, java.time.Duration.ofSeconds(30)),
                        new com.gymcrm.common.config.RedisRuntimeProperties.SettlementDashboardCache(false, java.time.Duration.ofSeconds(30)),
                        new com.gymcrm.common.config.RedisRuntimeProperties.SettlementReportCache(false, java.time.Duration.ofSeconds(60)),
                        new com.gymcrm.common.config.RedisRuntimeProperties.Toggle(false)
                ))
                .run(context -> assertThat(context.getBean(ReservationLockService.class)).isInstanceOf(RedissonReservationLockService.class));
    }
}
