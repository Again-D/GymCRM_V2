package com.gymcrm.crm.config;

import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.crm.service.CrmDispatchClaimService;
import com.gymcrm.crm.service.NoOpCrmDispatchClaimService;
import com.gymcrm.crm.service.RedisCrmDispatchClaimService;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class CrmDispatchClaimConfig {

    @Bean
    @ConditionalOnExpression(
            "'${app.redis.enabled:false}'.equalsIgnoreCase('true') and " +
                    "'${app.redis.crm-dispatch-claim.enabled:false}'.equalsIgnoreCase('true')"
    )
    public CrmDispatchClaimService redisCrmDispatchClaimService(
            StringRedisTemplate stringRedisTemplate,
            RedisRuntimeProperties redisRuntimeProperties
    ) {
        return new RedisCrmDispatchClaimService(stringRedisTemplate, redisRuntimeProperties);
    }

    @Bean
    @ConditionalOnMissingBean(CrmDispatchClaimService.class)
    public CrmDispatchClaimService noOpCrmDispatchClaimService() {
        return new NoOpCrmDispatchClaimService();
    }
}
