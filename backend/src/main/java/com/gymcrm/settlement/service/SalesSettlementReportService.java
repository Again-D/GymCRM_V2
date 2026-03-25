package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.repository.SalesSettlementReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class SalesSettlementReportService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final SalesSettlementReportRepository reportRepository;
    private final SalesSettlementReportCacheService reportCacheService;
    private final CurrentUserProvider currentUserProvider;

    public SalesSettlementReportService(
            SalesSettlementReportRepository reportRepository,
            SalesSettlementReportCacheService reportCacheService,
            CurrentUserProvider currentUserProvider
    ) {
        this.reportRepository = reportRepository;
        this.reportCacheService = reportCacheService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public SalesReportResult getReport(ReportQuery query) {
        LocalDate startDate = query.startDate();
        LocalDate endDate = query.endDate();
        if (startDate == null || endDate == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "startDate and endDate are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "endDate must not be before startDate");
        }

        String paymentMethod = normalizePaymentMethod(query.paymentMethod());
        String productKeyword = normalizeKeyword(query.productKeyword());
        Long centerId = currentUserProvider.currentCenterId();

        return reportCacheService.get(centerId, startDate, endDate, paymentMethod, productKeyword)
                .orElseGet(() -> loadAndCache(centerId, startDate, endDate, paymentMethod, productKeyword));
    }

    private SalesReportResult loadAndCache(
            Long centerId,
            LocalDate startDate,
            LocalDate endDate,
            String paymentMethod,
            String productKeyword
    ) {
        OffsetDateTime startAt = startDate.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime endExclusiveAt = endDate.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();

        List<SalesSettlementReportRepository.SalesAggregateRow> rows = reportRepository.findSalesRows(
                new SalesSettlementReportRepository.QueryCommand(
                        centerId,
                        startAt,
                        endExclusiveAt,
                        paymentMethod,
                        productKeyword
                )
        );

        BigDecimal totalGrossSales = sum(rows, SalesSettlementReportRepository.SalesAggregateRow::grossSales);
        BigDecimal totalRefundAmount = sum(rows, SalesSettlementReportRepository.SalesAggregateRow::refundAmount);
        BigDecimal totalNetSales = sum(rows, SalesSettlementReportRepository.SalesAggregateRow::netSales);

        List<SalesReportRow> reportRows = rows.stream()
                .map(row -> new SalesReportRow(
                        row.productName(),
                        row.paymentMethod(),
                        row.grossSales(),
                        row.refundAmount(),
                        row.netSales(),
                        row.transactionCount()
                ))
                .toList();

        SalesReportResult result = new SalesReportResult(
                startDate,
                endDate,
                paymentMethod,
                productKeyword,
                totalGrossSales,
                totalRefundAmount,
                totalNetSales,
                reportRows
        );
        reportCacheService.put(centerId, result);
        return result;
    }

    private BigDecimal sum(
            List<SalesSettlementReportRepository.SalesAggregateRow> rows,
            java.util.function.Function<SalesSettlementReportRepository.SalesAggregateRow, BigDecimal> getter
    ) {
        return rows.stream()
                .map(getter)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String trimmed = keyword.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return null;
        }
        String normalized = paymentMethod.trim().toUpperCase();
        if (!normalized.equals("CASH") && !normalized.equals("CARD") && !normalized.equals("TRANSFER") && !normalized.equals("ETC")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "paymentMethod is invalid");
        }
        return normalized;
    }

    public record ReportQuery(
            LocalDate startDate,
            LocalDate endDate,
            String paymentMethod,
            String productKeyword
    ) {
    }

    public record SalesReportResult(
            LocalDate startDate,
            LocalDate endDate,
            String paymentMethod,
            String productKeyword,
            BigDecimal totalGrossSales,
            BigDecimal totalRefundAmount,
            BigDecimal totalNetSales,
            List<SalesReportRow> rows
    ) {
    }

    public record SalesReportRow(
            String productName,
            String paymentMethod,
            BigDecimal grossSales,
            BigDecimal refundAmount,
            BigDecimal netSales,
            Long transactionCount
    ) {
    }
}
