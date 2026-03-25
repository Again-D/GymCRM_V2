package com.gymcrm.crm;

import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.crm.config.CrmDispatchClaimConfig;
import com.gymcrm.crm.service.CrmDispatchClaimService;
import com.gymcrm.crm.service.NoOpCrmDispatchClaimService;
import com.gymcrm.crm.service.RedisCrmDispatchClaimService;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class CrmDispatchClaimConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(RedisAutoConfiguration.class))
            .withUserConfiguration(CrmDispatchClaimConfig.class);

    @Test
    void fallsBackToNoOpWhenDispatchClaimFlagIsDisabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=false",
                        "app.redis.crm-dispatch-claim.enabled=false"
                )
                .run(context -> assertThat(context.getBean(CrmDispatchClaimService.class))
                        .isInstanceOf(NoOpCrmDispatchClaimService.class));
    }

    @Test
    void selectsRedisClaimServiceWhenRedisAndDispatchClaimFlagsAreEnabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.crm-dispatch-claim.enabled=true",
                        "spring.data.redis.host=localhost",
                        "spring.data.redis.port=6379"
                )
                .withBean(RedisRuntimeProperties.class, () -> new RedisRuntimeProperties(
                        true,
                        false,
                        new RedisRuntimeProperties.Toggle(false),
                        new RedisRuntimeProperties.ReservationLock(false, Duration.ofMillis(250), Duration.ofSeconds(3)),
                        new RedisRuntimeProperties.CrmDispatchClaim(true, Duration.ofSeconds(30)),
                        new RedisRuntimeProperties.CrmRetryWheel(false),
                        new RedisRuntimeProperties.SettlementDashboardCache(false, Duration.ofSeconds(30)),
                        new RedisRuntimeProperties.SettlementReportCache(false, Duration.ofSeconds(60)),
                        new RedisRuntimeProperties.Toggle(false)
                ))
                .run(context -> assertThat(context.getBean(CrmDispatchClaimService.class))
                        .isInstanceOf(RedisCrmDispatchClaimService.class));
    }
}
