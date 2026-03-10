package com.gymcrm.access;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class QrTokenStoreConfig {

    @Bean
    @ConditionalOnExpression(
            "'${app.redis.enabled:false}'.equalsIgnoreCase('true') and " +
                    "'${app.redis.qr-token-store.enabled:false}'.equalsIgnoreCase('true')"
    )
    public QrTokenStore redisQrTokenStore(StringRedisTemplate stringRedisTemplate) {
        return new RedisQrTokenStore(stringRedisTemplate);
    }

    @Bean
    @ConditionalOnMissingBean(QrTokenStore.class)
    public QrTokenStore inMemoryQrTokenStore() {
        return new InMemoryQrTokenStore();
    }
}
