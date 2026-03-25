package com.gymcrm.settlement;

import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.repository.SalesDashboardRepository;
import com.gymcrm.settlement.service.SalesDashboardCacheService;
import com.gymcrm.settlement.service.SalesDashboardService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class SalesDashboardServiceTest {

    @Test
    void returnsCachedResultWithoutHittingRepository() {
        SalesDashboardRepository repository = mock(SalesDashboardRepository.class);
        SalesDashboardCacheService cacheService = mock(SalesDashboardCacheService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        SalesDashboardService service = new SalesDashboardService(repository, cacheService, currentUserProvider);
        SalesDashboardService.SalesDashboardResult cached = sampleResult();

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(cacheService.get(1L, LocalDate.of(2099, 7, 15), 7)).willReturn(Optional.of(cached));

        SalesDashboardService.SalesDashboardResult result = service.getDashboard(
                new SalesDashboardService.DashboardQuery(LocalDate.of(2099, 7, 15), 7)
        );

        assertThat(result).isEqualTo(cached);
        verify(repository, never()).aggregate(any());
        verify(cacheService, never()).put(any(), any());
    }

    @Test
    void loadsFromRepositoryAndPopulatesCacheOnMiss() {
        SalesDashboardRepository repository = mock(SalesDashboardRepository.class);
        SalesDashboardCacheService cacheService = mock(SalesDashboardCacheService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        SalesDashboardService service = new SalesDashboardService(repository, cacheService, currentUserProvider);
        LocalDate baseDate = LocalDate.of(2099, 7, 15);
        SalesDashboardRepository.SalesDashboardAggregateRow row =
                new SalesDashboardRepository.SalesDashboardAggregateRow(
                        new BigDecimal("80000"),
                        new BigDecimal("130000"),
                        1L,
                        1L
                );

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(cacheService.get(1L, baseDate, 7)).willReturn(Optional.empty());
        given(repository.aggregate(any())).willReturn(row);

        SalesDashboardService.SalesDashboardResult result = service.getDashboard(
                new SalesDashboardService.DashboardQuery(baseDate, 7)
        );

        assertThat(result.todayNetSales()).isEqualByComparingTo("80000");
        assertThat(result.monthNetSales()).isEqualByComparingTo("130000");
        verify(repository).aggregate(any());
        verify(cacheService).put(1L, result);
    }

    private SalesDashboardService.SalesDashboardResult sampleResult() {
        return new SalesDashboardService.SalesDashboardResult(
                LocalDate.of(2099, 7, 15),
                7,
                new BigDecimal("80000"),
                new BigDecimal("130000"),
                1L,
                1L
        );
    }
}
