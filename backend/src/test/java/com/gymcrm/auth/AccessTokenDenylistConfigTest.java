package com.gymcrm.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AccessTokenDenylistConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(StringRedisTemplate.class, () -> mock(StringRedisTemplate.class))
            .withUserConfiguration(AccessTokenDenylistConfig.class);

    @Test
    void fallsBackToNoOpWhenDenylistFlagIsDisabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.auth-denylist.enabled=false"
                )
                .run(context -> assertThat(context.getBean(AccessTokenDenylistService.class)).isInstanceOf(NoOpAccessTokenDenylistService.class));
    }

    @Test
    void usesRedisDenylistWhenFlagIsEnabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.auth-denylist.enabled=true"
                )
                .run(context -> assertThat(context.getBean(AccessTokenDenylistService.class)).isInstanceOf(RedisAccessTokenDenylistService.class));
    }
}
