package com.gymcrm.common.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.SingleServerConfig;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(prefix = "app.redis", name = "enabled", havingValue = "true")
public class RedisFoundationConfig {

    @Bean(destroyMethod = "shutdown")
    @ConditionalOnProperty(prefix = "app.redis.reservation-lock", name = "enabled", havingValue = "true")
    public RedissonClient redissonClient(RedisProperties redisProperties) {
        Config config = new Config();
        SingleServerConfig singleServer = config.useSingleServer()
                .setAddress(buildAddress(redisProperties))
                .setDatabase(redisProperties.getDatabase());

        if (redisProperties.getConnectTimeout() != null) {
            singleServer.setConnectTimeout((int) redisProperties.getConnectTimeout().toMillis());
        }
        if (redisProperties.getTimeout() != null) {
            singleServer.setTimeout((int) redisProperties.getTimeout().toMillis());
        }
        if (redisProperties.getUsername() != null && !redisProperties.getUsername().isBlank()) {
            singleServer.setUsername(redisProperties.getUsername());
        }
        if (redisProperties.getPassword() != null) {
            singleServer.setPassword(redisProperties.getPassword());
        }
        if (redisProperties.getClientName() != null && !redisProperties.getClientName().isBlank()) {
            singleServer.setClientName(redisProperties.getClientName());
        }
        return Redisson.create(config);
    }

    private String buildAddress(RedisProperties redisProperties) {
        String scheme = redisProperties.getSsl().isEnabled() ? "rediss://" : "redis://";
        return scheme + redisProperties.getHost() + ":" + redisProperties.getPort();
    }
}
