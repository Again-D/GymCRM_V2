package com.gymcrm.settlement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.settlement.config.SalesSettlementReportCacheConfig;
import com.gymcrm.settlement.service.NoOpSalesSettlementReportCacheService;
import com.gymcrm.settlement.service.RedisSalesSettlementReportCacheService;
import com.gymcrm.settlement.service.SalesSettlementReportCacheService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class SalesSettlementReportCacheConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(RedisAutoConfiguration.class))
            .withUserConfiguration(SalesSettlementReportCacheConfig.class)
            .withBean(ObjectMapper.class, ObjectMapper::new);

    @Test
    void fallsBackToNoOpWhenSettlementReportCacheFlagIsDisabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=false",
                        "app.redis.settlement-report-cache.enabled=false"
                )
                .run(context -> assertThat(context.getBean(SalesSettlementReportCacheService.class))
                        .isInstanceOf(NoOpSalesSettlementReportCacheService.class));
    }

    @Test
    void selectsRedisCacheServiceWhenRedisAndSettlementReportFlagsAreEnabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.settlement-report-cache.enabled=true",
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
                        new RedisRuntimeProperties.SettlementDashboardCache(false, Duration.ofSeconds(30)),
                        new RedisRuntimeProperties.SettlementReportCache(true, Duration.ofSeconds(60)),
                        new RedisRuntimeProperties.Toggle(false)
                ))
                .run(context -> assertThat(context.getBean(SalesSettlementReportCacheService.class))
                        .isInstanceOf(RedisSalesSettlementReportCacheService.class));
    }
}
