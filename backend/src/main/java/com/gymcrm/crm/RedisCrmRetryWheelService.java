package com.gymcrm.crm;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

public class RedisCrmRetryWheelService implements CrmRetryWheelService {
    private static final Logger log = LoggerFactory.getLogger(RedisCrmRetryWheelService.class);
    private static final String KEY_PREFIX = "crm:retry-wheel:";

    private final StringRedisTemplate stringRedisTemplate;

    public RedisCrmRetryWheelService(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    @Override
    public List<Long> pollDue(Long centerId, OffsetDateTime now, int limit) {
        try {
            Set<String> members = stringRedisTemplate.opsForZSet()
                    .rangeByScore(key(centerId), Double.NEGATIVE_INFINITY, toScore(now), 0, limit);
            if (members == null || members.isEmpty()) {
                return List.of();
            }
            stringRedisTemplate.opsForZSet().remove(key(centerId), members.toArray());
            return members.stream()
                    .map(Long::valueOf)
                    .sorted(Comparator.naturalOrder())
                    .toList();
        } catch (RuntimeException ex) {
            log.warn("CRM retry wheel read unavailable. Falling back to DB scan. centerId={}", centerId, ex);
            return List.of();
        }
    }

    @Override
    public void schedule(Long centerId, Long crmMessageEventId, OffsetDateTime nextAttemptAt) {
        try {
            stringRedisTemplate.opsForZSet().add(key(centerId), String.valueOf(crmMessageEventId), toScore(nextAttemptAt));
        } catch (RuntimeException ex) {
            log.warn("CRM retry wheel write unavailable. Continuing without schedule hint. centerId={}, crmMessageEventId={}",
                    centerId, crmMessageEventId, ex);
        }
    }

    @Override
    public void remove(Long centerId, Long crmMessageEventId) {
        try {
            stringRedisTemplate.opsForZSet().remove(key(centerId), String.valueOf(crmMessageEventId));
        } catch (RuntimeException ex) {
            log.warn("CRM retry wheel remove unavailable. centerId={}, crmMessageEventId={}", centerId, crmMessageEventId, ex);
        }
    }

    private String key(Long centerId) {
        return KEY_PREFIX + centerId;
    }

    private double toScore(OffsetDateTime value) {
        return value.toInstant().toEpochMilli();
    }
}
