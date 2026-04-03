package com.gymcrm.settlement;

import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.repository.SalesSettlementReportRepository;
import com.gymcrm.settlement.service.SalesSettlementReportCacheService;
import com.gymcrm.settlement.service.SalesSettlementReportService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentCaptor.forClass;
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
        given(cacheService.get(1L, cached.startDate(), cached.endDate(), cached.paymentMethod(), cached.productKeyword(), cached.trendGranularity()))
                .willReturn(Optional.of(cached));

        SalesSettlementReportService.SalesReportResult result = service.getReport(
                new SalesSettlementReportService.ReportQuery(cached.startDate(), cached.endDate(), cached.paymentMethod(), cached.productKeyword(), cached.trendGranularity())
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
        given(cacheService.get(1L, startDate, endDate, "CARD", "PT", "DAILY")).willReturn(Optional.empty());
        given(repository.findSalesRows(any())).willReturn(rows);
        given(repository.findTrendRows(any(), any())).willReturn(List.of(
                new SalesSettlementReportRepository.SalesTrendRow(
                        OffsetDateTime.parse("2099-07-01T00:00:00+09:00"),
                        new BigDecimal("100000"),
                        new BigDecimal("20000"),
                        new BigDecimal("80000"),
                        2L
                )
        ));

        SalesSettlementReportService.SalesReportResult result = service.getReport(
                new SalesSettlementReportService.ReportQuery(startDate, endDate, "CARD", "PT", "DAILY")
        );

        assertThat(result.totalGrossSales()).isEqualByComparingTo("100000");
        assertThat(result.totalRefundAmount()).isEqualByComparingTo("20000");
        assertThat(result.totalNetSales()).isEqualByComparingTo("80000");
        assertThat(result.trend()).hasSize(1);
        verify(repository).findSalesRows(any());
        verify(repository).findTrendRows(any(), any());
        verify(cacheService).put(1L, result);
    }

    @Test
    void usesBusinessTimezoneBoundariesWhenLoadingReport() {
        SalesSettlementReportRepository repository = mock(SalesSettlementReportRepository.class);
        SalesSettlementReportCacheService cacheService = mock(SalesSettlementReportCacheService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        SalesSettlementReportService service = new SalesSettlementReportService(repository, cacheService, currentUserProvider);
        LocalDate startDate = LocalDate.of(2026, 3, 1);
        LocalDate endDate = LocalDate.of(2026, 3, 31);

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(cacheService.get(1L, startDate, endDate, null, null, "DAILY")).willReturn(Optional.empty());
        given(repository.findSalesRows(any())).willReturn(List.of());
        given(repository.findTrendRows(any(), any())).willReturn(List.of());

        service.getReport(new SalesSettlementReportService.ReportQuery(startDate, endDate, null, null, "DAILY"));

        var commandCaptor = forClass(SalesSettlementReportRepository.QueryCommand.class);
        verify(repository).findSalesRows(commandCaptor.capture());
        assertThat(commandCaptor.getValue().startAt()).isEqualTo(OffsetDateTime.parse("2026-03-01T00:00:00+09:00"));
        assertThat(commandCaptor.getValue().endExclusiveAt()).isEqualTo(OffsetDateTime.parse("2026-04-01T00:00:00+09:00"));
    }

    private SalesSettlementReportService.SalesReportResult sampleResult() {
        return new SalesSettlementReportService.SalesReportResult(
                LocalDate.of(2099, 7, 1),
                LocalDate.of(2099, 7, 31),
                "CARD",
                "PT",
                "DAILY",
                new BigDecimal("100000"),
                new BigDecimal("20000"),
                new BigDecimal("80000"),
                List.of(new SalesSettlementReportService.SalesTrendPoint(
                        LocalDate.of(2099, 7, 1),
                        "2099-07-01",
                        new BigDecimal("100000"),
                        new BigDecimal("20000"),
                        new BigDecimal("80000"),
                        2L
                )),
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
