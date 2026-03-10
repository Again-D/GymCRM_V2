package com.gymcrm.auth;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class AccessRevocationMarkerConfig {

    @Bean
    @ConditionalOnExpression(
            "'${app.redis.enabled:false}'.equalsIgnoreCase('true') and " +
                    "'${app.redis.auth-denylist.enabled:false}'.equalsIgnoreCase('true')"
    )
    public AccessRevocationMarkerService redisAccessRevocationMarkerService(StringRedisTemplate stringRedisTemplate) {
        return new RedisAccessRevocationMarkerService(stringRedisTemplate);
    }

    @Bean
    @ConditionalOnMissingBean(AccessRevocationMarkerService.class)
    public AccessRevocationMarkerService noOpAccessRevocationMarkerService() {
        return new NoOpAccessRevocationMarkerService();
    }
}
