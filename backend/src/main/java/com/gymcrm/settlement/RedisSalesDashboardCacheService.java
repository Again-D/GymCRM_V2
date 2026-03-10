package com.gymcrm.settlement;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.common.config.RedisRuntimeProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.LocalDate;
import java.util.Optional;

public class RedisSalesDashboardCacheService implements SalesDashboardCacheService {
    private static final Logger log = LoggerFactory.getLogger(RedisSalesDashboardCacheService.class);
    private static final String KEY_PREFIX = "settlement:sales-dashboard:";

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final RedisRuntimeProperties redisRuntimeProperties;

    public RedisSalesDashboardCacheService(
            StringRedisTemplate stringRedisTemplate,
            ObjectMapper objectMapper,
            RedisRuntimeProperties redisRuntimeProperties
    ) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.objectMapper = objectMapper;
        this.redisRuntimeProperties = redisRuntimeProperties;
    }

    @Override
    public Optional<SalesDashboardService.SalesDashboardResult> get(Long centerId, LocalDate baseDate, int expiringWithinDays) {
        try {
            String payload = stringRedisTemplate.opsForValue().get(key(centerId, baseDate, expiringWithinDays));
            if (payload == null || payload.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(payload, SalesDashboardService.SalesDashboardResult.class));
        } catch (JsonProcessingException ex) {
            log.warn("Invalid sales dashboard cache payload. Evicting key. centerId={}, baseDate={}, expiringWithinDays={}",
                    centerId, baseDate, expiringWithinDays, ex);
            stringRedisTemplate.delete(key(centerId, baseDate, expiringWithinDays));
            return Optional.empty();
        } catch (RuntimeException ex) {
            log.warn("Sales dashboard cache read unavailable. Falling back to DB. centerId={}, baseDate={}, expiringWithinDays={}",
                    centerId, baseDate, expiringWithinDays, ex);
            return Optional.empty();
        }
    }

    @Override
    public void put(Long centerId, SalesDashboardService.SalesDashboardResult result) {
        try {
            stringRedisTemplate.opsForValue().set(
                    key(centerId, result.baseDate(), result.expiringWithinDays()),
                    objectMapper.writeValueAsString(result),
                    redisRuntimeProperties.settlementDashboardCache().ttl()
            );
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize sales dashboard cache payload. centerId={}, baseDate={}, expiringWithinDays={}",
                    centerId, result.baseDate(), result.expiringWithinDays(), ex);
        } catch (RuntimeException ex) {
            log.warn("Sales dashboard cache write unavailable. Continuing without cache. centerId={}, baseDate={}, expiringWithinDays={}",
                    centerId, result.baseDate(), result.expiringWithinDays(), ex);
        }
    }

    private String key(Long centerId, LocalDate baseDate, int expiringWithinDays) {
        return KEY_PREFIX + centerId + ":" + baseDate + ":" + expiringWithinDays;
    }
}
