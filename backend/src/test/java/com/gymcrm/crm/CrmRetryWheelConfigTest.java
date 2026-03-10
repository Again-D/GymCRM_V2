package com.gymcrm.crm;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class CrmRetryWheelConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(RedisAutoConfiguration.class))
            .withUserConfiguration(CrmRetryWheelConfig.class);

    @Test
    void fallsBackToNoOpWhenRetryWheelFlagIsDisabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=false",
                        "app.redis.crm-retry-wheel.enabled=false"
                )
                .run(context -> assertThat(context.getBean(CrmRetryWheelService.class))
                        .isInstanceOf(NoOpCrmRetryWheelService.class));
    }

    @Test
    void selectsRedisRetryWheelServiceWhenFlagsAreEnabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.crm-retry-wheel.enabled=true",
                        "spring.data.redis.host=localhost",
                        "spring.data.redis.port=6379"
                )
                .run(context -> assertThat(context.getBean(CrmRetryWheelService.class))
                        .isInstanceOf(RedisCrmRetryWheelService.class));
    }
}
