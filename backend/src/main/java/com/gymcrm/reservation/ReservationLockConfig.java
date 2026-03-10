package com.gymcrm.reservation;

import com.gymcrm.common.config.RedisRuntimeProperties;
import org.redisson.api.RedissonClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ReservationLockConfig {

    @Bean
    @ConditionalOnBean(RedissonClient.class)
    @ConditionalOnProperty(prefix = "app.redis.reservation-lock", name = "enabled", havingValue = "true")
    public ReservationLockService redissonReservationLockService(
            RedissonClient redissonClient,
            RedisRuntimeProperties redisRuntimeProperties
    ) {
        return new RedissonReservationLockService(redissonClient, redisRuntimeProperties);
    }

    @Bean
    @ConditionalOnMissingBean(ReservationLockService.class)
    public ReservationLockService noOpReservationLockService() {
        return new NoOpReservationLockService();
    }
}
