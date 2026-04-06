package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.repository.SalesDashboardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class SalesDashboardService {
    private static final int DEFAULT_EXPIRING_WITHIN_DAYS = 7;
    private static final int MAX_EXPIRING_WITHIN_DAYS = 60;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final SalesDashboardRepository repository;
    private final SalesDashboardCacheService salesDashboardCacheService;
    private final CurrentUserProvider currentUserProvider;

    public SalesDashboardService(
            SalesDashboardRepository repository,
            SalesDashboardCacheService salesDashboardCacheService,
            CurrentUserProvider currentUserProvider
    ) {
        this.repository = repository;
        this.salesDashboardCacheService = salesDashboardCacheService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public SalesDashboardResult getDashboard(DashboardQuery query) {
        LocalDate baseDate = query.baseDate() == null ? LocalDate.now(BUSINESS_ZONE) : query.baseDate();
        int expiringWithinDays = query.expiringWithinDays() == null ? DEFAULT_EXPIRING_WITHIN_DAYS : query.expiringWithinDays();
        if (expiringWithinDays < 0 || expiringWithinDays > MAX_EXPIRING_WITHIN_DAYS) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "expiringWithinDays must be between 0 and " + MAX_EXPIRING_WITHIN_DAYS);
        }
        Long centerId = currentUserProvider.currentCenterId();

        return salesDashboardCacheService.get(centerId, baseDate, expiringWithinDays)
                .orElseGet(() -> loadAndCache(centerId, baseDate, expiringWithinDays));
    }

    private SalesDashboardResult loadAndCache(Long centerId, LocalDate baseDate, int expiringWithinDays) {
        SalesDashboardRepository.SalesDashboardAggregateRow row = repository.aggregate(
                new SalesDashboardRepository.DashboardQueryCommand(
                        centerId,
                        baseDate,
                        baseDate.withDayOfMonth(1),
                        baseDate.withDayOfMonth(1).plusMonths(1),
                        baseDate.plusDays(expiringWithinDays)
                )
        );

        SalesDashboardResult result = new SalesDashboardResult(
                baseDate,
                expiringWithinDays,
                nullSafe(row.todayNetSales()),
                nullSafe(row.monthNetSales()),
                row.newMemberCount() == null ? 0L : row.newMemberCount(),
                row.expiringMemberCount() == null ? 0L : row.expiringMemberCount(),
                row.refundCount() == null ? 0L : row.refundCount()
        );
        salesDashboardCacheService.put(centerId, result);
        return result;
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    public record DashboardQuery(
            LocalDate baseDate,
            Integer expiringWithinDays
    ) {
    }

    public record SalesDashboardResult(
            LocalDate baseDate,
            int expiringWithinDays,
            BigDecimal todayNetSales,
            BigDecimal monthNetSales,
            long newMemberCount,
            long expiringMemberCount,
            long refundCount
    ) {
    }
}
