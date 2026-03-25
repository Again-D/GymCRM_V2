package com.gymcrm.settlement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.settlement.config.SalesDashboardCacheConfig;
import com.gymcrm.settlement.service.NoOpSalesDashboardCacheService;
import com.gymcrm.settlement.service.RedisSalesDashboardCacheService;
import com.gymcrm.settlement.service.SalesDashboardCacheService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class SalesDashboardCacheConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(RedisAutoConfiguration.class))
            .withUserConfiguration(SalesDashboardCacheConfig.class)
            .withBean(ObjectMapper.class, ObjectMapper::new);

    @Test
    void fallsBackToNoOpWhenSettlementDashboardCacheFlagIsDisabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=false",
                        "app.redis.settlement-dashboard-cache.enabled=false"
                )
                .run(context -> assertThat(context.getBean(SalesDashboardCacheService.class))
                        .isInstanceOf(NoOpSalesDashboardCacheService.class));
    }

    @Test
    void selectsRedisCacheServiceWhenRedisAndSettlementDashboardFlagsAreEnabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.settlement-dashboard-cache.enabled=true",
                        "spring.data.redis.host=localhost",
                        "spring.data.redis.port=6379"
                )
                .withBean(RedisRuntimeProperties.class, () -> new RedisRuntimeProperties(
                        true,
                        false,
                        new RedisRuntimeProperties.Toggle(false),
                        new RedisRuntimeProperties.ReservationLock(false, Duration.ofMillis(250), Duration.ofSeconds(3)),
                        new RedisRuntimeProperties.CrmDispatchClaim(false, Duration.ofSeconds(30)),
                        new RedisRuntimeProperties.CrmRetryWheel(false),
                        new RedisRuntimeProperties.SettlementDashboardCache(true, Duration.ofSeconds(30)),
                        new RedisRuntimeProperties.SettlementReportCache(false, Duration.ofSeconds(60)),
                        new RedisRuntimeProperties.Toggle(false)
                ))
                .run(context -> assertThat(context.getBean(SalesDashboardCacheService.class))
                        .isInstanceOf(RedisSalesDashboardCacheService.class));
    }
}
