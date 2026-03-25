package com.gymcrm.common.auth;

import com.gymcrm.common.auth.service.AccessTokenDenylistService;
import com.gymcrm.common.auth.service.NoOpAccessTokenDenylistService;
import com.gymcrm.common.auth.service.RedisAccessTokenDenylistService;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class AccessTokenDenylistConfig {

    @Bean
    @ConditionalOnExpression(
            "'${app.redis.enabled:false}'.equalsIgnoreCase('true') and " +
                    "'${app.redis.auth-denylist.enabled:false}'.equalsIgnoreCase('true')"
    )
    public AccessTokenDenylistService redisAccessTokenDenylistService(StringRedisTemplate stringRedisTemplate) {
        return new RedisAccessTokenDenylistService(stringRedisTemplate);
    }

    @Bean
    @ConditionalOnMissingBean(AccessTokenDenylistService.class)
    public AccessTokenDenylistService noOpAccessTokenDenylistService() {
        return new NoOpAccessTokenDenylistService();
    }
}
