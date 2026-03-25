package com.gymcrm.auth;

import com.gymcrm.common.auth.AccessRevocationMarkerConfig;
import com.gymcrm.common.auth.service.AccessRevocationMarkerService;
import com.gymcrm.common.auth.service.NoOpAccessRevocationMarkerService;
import com.gymcrm.common.auth.service.RedisAccessRevocationMarkerService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AccessRevocationMarkerConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(StringRedisTemplate.class, () -> mock(StringRedisTemplate.class))
            .withUserConfiguration(AccessRevocationMarkerConfig.class);

    @Test
    void fallsBackToNoOpWhenFlagIsDisabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.auth-denylist.enabled=false"
                )
                .run(context -> assertThat(context.getBean(AccessRevocationMarkerService.class))
                        .isInstanceOf(NoOpAccessRevocationMarkerService.class));
    }

    @Test
    void usesRedisMarkerServiceWhenFlagIsEnabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.auth-denylist.enabled=true"
                )
                .run(context -> assertThat(context.getBean(AccessRevocationMarkerService.class))
                        .isInstanceOf(RedisAccessRevocationMarkerService.class));
    }
}
