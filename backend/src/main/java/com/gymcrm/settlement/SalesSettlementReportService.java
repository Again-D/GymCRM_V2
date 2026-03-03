package com.gymcrm.settlement;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class SalesSettlementReportService {
    private final SalesSettlementReportRepository reportRepository;
    private final CurrentUserProvider currentUserProvider;

    public SalesSettlementReportService(
            SalesSettlementReportRepository reportRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.reportRepository = reportRepository;
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

        OffsetDateTime startAt = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime endExclusiveAt = endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<SalesSettlementReportRepository.SalesAggregateRow> rows = reportRepository.findSalesRows(
                new SalesSettlementReportRepository.QueryCommand(
                        currentUserProvider.currentCenterId(),
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

        return new SalesReportResult(
                startDate,
                endDate,
                paymentMethod,
                productKeyword,
                totalGrossSales,
                totalRefundAmount,
                totalNetSales,
                reportRows
        );
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
