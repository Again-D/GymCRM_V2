package com.gymcrm.access;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class QrTokenStoreConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(RedisAutoConfiguration.class))
            .withUserConfiguration(QrTokenStoreConfig.class);

    @Test
    void fallsBackToInMemoryWhenRedisQrStoreFlagIsDisabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=false",
                        "app.redis.qr-token-store.enabled=false"
                )
                .run(context -> assertThat(context.getBean(QrTokenStore.class)).isInstanceOf(InMemoryQrTokenStore.class));
    }

    @Test
    void selectsRedisStoreWhenRedisAndQrFlagsAreEnabled() {
        contextRunner
                .withPropertyValues(
                        "app.redis.enabled=true",
                        "app.redis.qr-token-store.enabled=true",
                        "spring.data.redis.host=localhost",
                        "spring.data.redis.port=6379"
                )
                .run(context -> assertThat(context.getBean(QrTokenStore.class)).isInstanceOf(RedisQrTokenStore.class));
    }
}
