package com.gymcrm.settlement.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.settlement.service.NoOpSalesSettlementReportCacheService;
import com.gymcrm.settlement.service.RedisSalesSettlementReportCacheService;
import com.gymcrm.settlement.service.SalesSettlementReportCacheService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class SalesSettlementReportCacheConfig {

    @Bean
    @ConditionalOnExpression(
            "'${app.redis.enabled:false}'.equalsIgnoreCase('true') and " +
                    "'${app.redis.settlement-report-cache.enabled:false}'.equalsIgnoreCase('true')"
    )
    public SalesSettlementReportCacheService redisSalesSettlementReportCacheService(
            StringRedisTemplate stringRedisTemplate,
            ObjectMapper objectMapper,
            RedisRuntimeProperties redisRuntimeProperties
    ) {
        return new RedisSalesSettlementReportCacheService(stringRedisTemplate, objectMapper, redisRuntimeProperties);
    }

    @Bean
    @ConditionalOnMissingBean(SalesSettlementReportCacheService.class)
    public SalesSettlementReportCacheService noOpSalesSettlementReportCacheService() {
        return new NoOpSalesSettlementReportCacheService();
    }
}
