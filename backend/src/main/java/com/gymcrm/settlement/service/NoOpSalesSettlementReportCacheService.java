package com.gymcrm.settlement.service;

import java.time.LocalDate;
import java.util.Optional;

public class NoOpSalesSettlementReportCacheService implements SalesSettlementReportCacheService {
    @Override
    public Optional<SalesSettlementReportService.SalesReportResult> get(
            Long centerId,
            LocalDate startDate,
            LocalDate endDate,
            String paymentMethod,
            String productKeyword
    ) {
        return Optional.empty();
    }

    @Override
    public void put(Long centerId, SalesSettlementReportService.SalesReportResult result) {
        // no-op when Redis report cache is disabled
    }
}
