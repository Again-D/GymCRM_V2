package com.gymcrm.crm.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.gymcrm.crm.service.CrmRetryWheelService;
import com.gymcrm.crm.service.NoOpCrmRetryWheelService;
import com.gymcrm.crm.service.RedisCrmRetryWheelService;

@Configuration
public class CrmRetryWheelConfig {

    @Bean
    @ConditionalOnExpression(
            "'${app.redis.enabled:false}'.equalsIgnoreCase('true') and " +
                    "'${app.redis.crm-retry-wheel.enabled:false}'.equalsIgnoreCase('true')"
    )
    public CrmRetryWheelService redisCrmRetryWheelService(StringRedisTemplate stringRedisTemplate) {
        return new RedisCrmRetryWheelService(stringRedisTemplate);
    }

    @Bean
    @ConditionalOnMissingBean(CrmRetryWheelService.class)
    public CrmRetryWheelService noOpCrmRetryWheelService() {
        return new NoOpCrmRetryWheelService();
    }
}
