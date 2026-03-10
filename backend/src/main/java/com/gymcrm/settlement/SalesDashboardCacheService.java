package com.gymcrm.settlement;

import java.time.LocalDate;
import java.util.Optional;

public interface SalesDashboardCacheService {
    Optional<SalesDashboardService.SalesDashboardResult> get(Long centerId, LocalDate baseDate, int expiringWithinDays);

    void put(Long centerId, SalesDashboardService.SalesDashboardResult result);
}
