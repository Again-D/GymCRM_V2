package com.gymcrm.settlement;

import java.time.LocalDate;
import java.util.Optional;

public class NoOpSalesDashboardCacheService implements SalesDashboardCacheService {
    @Override
    public Optional<SalesDashboardService.SalesDashboardResult> get(Long centerId, LocalDate baseDate, int expiringWithinDays) {
        return Optional.empty();
    }

    @Override
    public void put(Long centerId, SalesDashboardService.SalesDashboardResult result) {
        // no-op when Redis cache is disabled
    }
}
