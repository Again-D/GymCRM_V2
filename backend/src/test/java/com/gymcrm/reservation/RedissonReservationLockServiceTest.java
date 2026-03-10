package com.gymcrm.reservation;

import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RedissonReservationLockServiceTest {

    @Test
    void executesCriticalSectionAndUnlocksWhenLockIsHeld() throws Exception {
        RedissonClient redissonClient = mock(RedissonClient.class);
        RLock lock = mock(RLock.class);
        given(redissonClient.getLock("reservation:1:10")).willReturn(lock);
        given(lock.tryLock(250L, 3000L, java.util.concurrent.TimeUnit.MILLISECONDS)).willReturn(true);
        given(lock.isHeldByCurrentThread()).willReturn(true);

        RedissonReservationLockService service = new RedissonReservationLockService(redissonClient, redisProps());

        String result = service.execute(1L, 10L, () -> "ok");

        assertThat(result).isEqualTo("ok");
        verify(lock).unlock();
    }

    @Test
    void returnsConflictWhenLockCannotBeAcquired() throws Exception {
        RedissonClient redissonClient = mock(RedissonClient.class);
        RLock lock = mock(RLock.class);
        given(redissonClient.getLock("reservation:1:10")).willReturn(lock);
        given(lock.tryLock(250L, 3000L, java.util.concurrent.TimeUnit.MILLISECONDS)).willReturn(false);

        RedissonReservationLockService service = new RedissonReservationLockService(redissonClient, redisProps());

        ApiException exception = assertThrows(ApiException.class, () -> service.execute(1L, 10L, () -> "nope"));

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
        assertThat(exception.getMessage()).contains("동일 스케줄 예약 처리 중");
    }

    @Test
    void returnsConflictWhenRedisLockStoreIsUnavailable() throws Exception {
        RedissonClient redissonClient = mock(RedissonClient.class);
        RLock lock = mock(RLock.class);
        given(redissonClient.getLock("reservation:1:10")).willReturn(lock);
        given(lock.tryLock(250L, 3000L, java.util.concurrent.TimeUnit.MILLISECONDS)).willThrow(new RuntimeException("redis down"));

        RedissonReservationLockService service = new RedissonReservationLockService(redissonClient, redisProps());

        ApiException exception = assertThrows(ApiException.class, () -> service.execute(1L, 10L, () -> "nope"));

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
        assertThat(exception.getMessage()).contains("예약 락 저장소");
    }

    private RedisRuntimeProperties redisProps() {
        return new RedisRuntimeProperties(
                true,
                false,
                new RedisRuntimeProperties.Toggle(false),
                new RedisRuntimeProperties.ReservationLock(true, Duration.ofMillis(250), Duration.ofSeconds(3)),
                new RedisRuntimeProperties.CrmDispatchClaim(false, Duration.ofSeconds(30)),
                new RedisRuntimeProperties.CrmRetryWheel(false),
                new RedisRuntimeProperties.SettlementDashboardCache(false, Duration.ofSeconds(30)),
                new RedisRuntimeProperties.SettlementReportCache(false, Duration.ofSeconds(60)),
                new RedisRuntimeProperties.Toggle(false)
        );
    }
}
