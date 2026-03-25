package com.gymcrm.settlement;

import java.time.LocalDate;
import java.util.Optional;

public interface SalesSettlementReportCacheService {
    Optional<SalesSettlementReportService.SalesReportResult> get(
            Long centerId,
            LocalDate startDate,
            LocalDate endDate,
            String paymentMethod,
            String productKeyword
    );

    void put(Long centerId, SalesSettlementReportService.SalesReportResult result);
}
