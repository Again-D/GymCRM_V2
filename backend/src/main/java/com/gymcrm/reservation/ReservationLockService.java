package com.gymcrm.reservation;

import java.util.function.Supplier;

public interface ReservationLockService {
    <T> T execute(Long centerId, Long scheduleId, Supplier<T> action);
}
