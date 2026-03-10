package com.gymcrm.crm;

import com.gymcrm.common.config.RedisRuntimeProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.concurrent.TimeUnit;

public class RedisCrmDispatchClaimService implements CrmDispatchClaimService {
    private static final Logger log = LoggerFactory.getLogger(RedisCrmDispatchClaimService.class);
    private static final String KEY_PREFIX = "crm:dispatch:claim:";

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisRuntimeProperties redisRuntimeProperties;

    public RedisCrmDispatchClaimService(
            StringRedisTemplate stringRedisTemplate,
            RedisRuntimeProperties redisRuntimeProperties
    ) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.redisRuntimeProperties = redisRuntimeProperties;
    }

    @Override
    public boolean tryClaim(Long centerId, Long crmMessageEventId) {
        try {
            Boolean claimed = stringRedisTemplate.opsForValue().setIfAbsent(
                    key(crmMessageEventId),
                    String.valueOf(centerId),
                    redisRuntimeProperties.crmDispatchClaim().leaseTime()
            );
            return Boolean.TRUE.equals(claimed);
        } catch (RuntimeException ex) {
            log.warn("CRM dispatch claim unavailable. Falling back to fail-open. centerId={}, crmMessageEventId={}",
                    centerId, crmMessageEventId, ex);
            return true;
        }
    }

    long ttlSeconds(Long crmMessageEventId) {
        Long ttl = stringRedisTemplate.getExpire(key(crmMessageEventId), TimeUnit.SECONDS);
        return ttl == null ? -2L : ttl;
    }

    private String key(Long crmMessageEventId) {
        return KEY_PREFIX + crmMessageEventId;
    }
}
