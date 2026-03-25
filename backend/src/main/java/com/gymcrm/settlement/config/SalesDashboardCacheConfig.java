package com.gymcrm.settlement.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.settlement.service.NoOpSalesDashboardCacheService;
import com.gymcrm.settlement.service.RedisSalesDashboardCacheService;
import com.gymcrm.settlement.service.SalesDashboardCacheService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class SalesDashboardCacheConfig {

    @Bean
    @ConditionalOnExpression(
            "'${app.redis.enabled:false}'.equalsIgnoreCase('true') and " +
                    "'${app.redis.settlement-dashboard-cache.enabled:false}'.equalsIgnoreCase('true')"
    )
    public SalesDashboardCacheService redisSalesDashboardCacheService(
            StringRedisTemplate stringRedisTemplate,
            ObjectMapper objectMapper,
            RedisRuntimeProperties redisRuntimeProperties
    ) {
        return new RedisSalesDashboardCacheService(stringRedisTemplate, objectMapper, redisRuntimeProperties);
    }

    @Bean
    @ConditionalOnMissingBean(SalesDashboardCacheService.class)
    public SalesDashboardCacheService noOpSalesDashboardCacheService() {
        return new NoOpSalesDashboardCacheService();
    }
}
