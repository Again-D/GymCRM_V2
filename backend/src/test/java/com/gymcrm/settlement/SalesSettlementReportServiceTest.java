package com.gymcrm.settlement;

import com.gymcrm.common.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class SalesSettlementReportServiceTest {

    @Test
    void returnsCachedReportWithoutHittingRepository() {
        SalesSettlementReportRepository repository = mock(SalesSettlementReportRepository.class);
        SalesSettlementReportCacheService cacheService = mock(SalesSettlementReportCacheService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        SalesSettlementReportService service = new SalesSettlementReportService(repository, cacheService, currentUserProvider);
        SalesSettlementReportService.SalesReportResult cached = sampleResult();

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(cacheService.get(1L, cached.startDate(), cached.endDate(), cached.paymentMethod(), cached.productKeyword()))
                .willReturn(Optional.of(cached));

        SalesSettlementReportService.SalesReportResult result = service.getReport(
                new SalesSettlementReportService.ReportQuery(cached.startDate(), cached.endDate(), cached.paymentMethod(), cached.productKeyword())
        );

        assertThat(result).isEqualTo(cached);
        verify(repository, never()).findSalesRows(any());
        verify(cacheService, never()).put(any(), any());
    }

    @Test
    void loadsFromRepositoryAndPopulatesCacheOnMiss() {
        SalesSettlementReportRepository repository = mock(SalesSettlementReportRepository.class);
        SalesSettlementReportCacheService cacheService = mock(SalesSettlementReportCacheService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        SalesSettlementReportService service = new SalesSettlementReportService(repository, cacheService, currentUserProvider);
        LocalDate startDate = LocalDate.of(2099, 7, 1);
        LocalDate endDate = LocalDate.of(2099, 7, 31);
        List<SalesSettlementReportRepository.SalesAggregateRow> rows = List.of(
                new SalesSettlementReportRepository.SalesAggregateRow(
                        "PT-30",
                        "CARD",
                        new BigDecimal("100000"),
                        new BigDecimal("20000"),
                        new BigDecimal("80000"),
                        2L
                )
        );

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(cacheService.get(1L, startDate, endDate, "CARD", "PT")).willReturn(Optional.empty());
        given(repository.findSalesRows(any())).willReturn(rows);

        SalesSettlementReportService.SalesReportResult result = service.getReport(
                new SalesSettlementReportService.ReportQuery(startDate, endDate, "CARD", "PT")
        );

        assertThat(result.totalGrossSales()).isEqualByComparingTo("100000");
        assertThat(result.totalRefundAmount()).isEqualByComparingTo("20000");
        assertThat(result.totalNetSales()).isEqualByComparingTo("80000");
        verify(repository).findSalesRows(any());
        verify(cacheService).put(1L, result);
    }

    private SalesSettlementReportService.SalesReportResult sampleResult() {
        return new SalesSettlementReportService.SalesReportResult(
                LocalDate.of(2099, 7, 1),
                LocalDate.of(2099, 7, 31),
                "CARD",
                "PT",
                new BigDecimal("100000"),
                new BigDecimal("20000"),
                new BigDecimal("80000"),
                List.of(new SalesSettlementReportService.SalesReportRow(
                        "PT-30",
                        "CARD",
                        new BigDecimal("100000"),
                        new BigDecimal("20000"),
                        new BigDecimal("80000"),
                        2L
                ))
        );
    }
}
