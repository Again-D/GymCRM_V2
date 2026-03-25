package com.gymcrm.reservation.service;

import java.util.function.Supplier;

public class NoOpReservationLockService implements ReservationLockService {
    @Override
    public <T> T execute(Long centerId, Long scheduleId, Supplier<T> action) {
        return action.get();
    }
}
