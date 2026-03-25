package com.gymcrm.reservation.service;

import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

public class RedissonReservationLockService implements ReservationLockService {
    private final RedissonClient redissonClient;
    private final RedisRuntimeProperties redisRuntimeProperties;

    public RedissonReservationLockService(
            RedissonClient redissonClient,
            RedisRuntimeProperties redisRuntimeProperties
    ) {
        this.redissonClient = redissonClient;
        this.redisRuntimeProperties = redisRuntimeProperties;
    }

    @Override
    public <T> T execute(Long centerId, Long scheduleId, Supplier<T> action) {
        RLock lock = redissonClient.getLock(lockKey(centerId, scheduleId));
        boolean locked;
        try {
            locked = lock.tryLock(
                    redisRuntimeProperties.reservationLock().waitTime().toMillis(),
                    redisRuntimeProperties.reservationLock().leaseTime().toMillis(),
                    TimeUnit.MILLISECONDS
            );
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(ErrorCode.CONFLICT, "예약 락 대기 중 인터럽트가 발생했습니다.");
        } catch (RuntimeException ex) {
            throw new ApiException(ErrorCode.CONFLICT, "예약 락 저장소를 사용할 수 없습니다.");
        }

        if (!locked) {
            throw new ApiException(ErrorCode.CONFLICT, "동일 스케줄 예약 처리 중입니다. 잠시 후 다시 시도해주세요.");
        }

        try {
            return action.get();
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    private String lockKey(Long centerId, Long scheduleId) {
        return "reservation:" + centerId + ":" + scheduleId;
    }
}
