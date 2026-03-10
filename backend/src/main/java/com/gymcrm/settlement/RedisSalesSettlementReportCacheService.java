package com.gymcrm.settlement;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.common.config.RedisRuntimeProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Optional;

public class RedisSalesSettlementReportCacheService implements SalesSettlementReportCacheService {
    private static final Logger log = LoggerFactory.getLogger(RedisSalesSettlementReportCacheService.class);
    private static final String KEY_PREFIX = "settlement:sales-report:";

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final RedisRuntimeProperties redisRuntimeProperties;

    public RedisSalesSettlementReportCacheService(
            StringRedisTemplate stringRedisTemplate,
            ObjectMapper objectMapper,
            RedisRuntimeProperties redisRuntimeProperties
    ) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.objectMapper = objectMapper;
        this.redisRuntimeProperties = redisRuntimeProperties;
    }

    @Override
    public Optional<SalesSettlementReportService.SalesReportResult> get(
            Long centerId,
            LocalDate startDate,
            LocalDate endDate,
            String paymentMethod,
            String productKeyword
    ) {
        try {
            String payload = stringRedisTemplate.opsForValue().get(key(centerId, startDate, endDate, paymentMethod, productKeyword));
            if (payload == null || payload.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(payload, SalesSettlementReportService.SalesReportResult.class));
        } catch (JsonProcessingException ex) {
            log.warn("Invalid sales settlement report cache payload. Evicting key. centerId={}, startDate={}, endDate={}",
                    centerId, startDate, endDate, ex);
            stringRedisTemplate.delete(key(centerId, startDate, endDate, paymentMethod, productKeyword));
            return Optional.empty();
        } catch (RuntimeException ex) {
            log.warn("Sales settlement report cache read unavailable. Falling back to DB. centerId={}, startDate={}, endDate={}",
                    centerId, startDate, endDate, ex);
            return Optional.empty();
        }
    }

    @Override
    public void put(Long centerId, SalesSettlementReportService.SalesReportResult result) {
        try {
            stringRedisTemplate.opsForValue().set(
                    key(centerId, result.startDate(), result.endDate(), result.paymentMethod(), result.productKeyword()),
                    objectMapper.writeValueAsString(result),
                    redisRuntimeProperties.settlementReportCache().ttl()
            );
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize sales settlement report cache payload. centerId={}, startDate={}, endDate={}",
                    centerId, result.startDate(), result.endDate(), ex);
        } catch (RuntimeException ex) {
            log.warn("Sales settlement report cache write unavailable. Continuing without cache. centerId={}, startDate={}, endDate={}",
                    centerId, result.startDate(), result.endDate(), ex);
        }
    }

    private String key(Long centerId, LocalDate startDate, LocalDate endDate, String paymentMethod, String productKeyword) {
        return KEY_PREFIX + centerId
                + ":" + startDate
                + ":" + endDate
                + ":" + encode(paymentMethod)
                + ":" + encode(productKeyword);
    }

    private String encode(String value) {
        if (value == null || value.isBlank()) {
            return "_";
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
}
