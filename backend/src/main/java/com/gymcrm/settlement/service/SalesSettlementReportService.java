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
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class SalesSettlementReportService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final int DEFAULT_RECENT_ADJUSTMENTS_LIMIT = 5;
    private static final int MAX_RECENT_ADJUSTMENTS_LIMIT = 20;

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
        ValidatedReportQuery validated = validateQuery(query);
        Long centerId = validated.command().centerId();

        return reportCacheService.get(
                        centerId,
                        validated.startDate(),
                        validated.endDate(),
                        validated.paymentMethod(),
                        validated.productKeyword(),
                        validated.trendGranularity().name()
                )
                .orElseGet(() -> loadAndCache(centerId, validated));
    }

    @Transactional(readOnly = true)
    public List<RecentAdjustmentResult> getRecentAdjustments(ReportQuery query, Integer limit) {
        ValidatedReportQuery validated = validateQuery(query);
        int normalizedLimit = normalizeRecentAdjustmentsLimit(limit);

        List<SalesSettlementReportRepository.RecentAdjustmentRow> rows = reportRepository.findRecentAdjustmentRows(
                validated.command(),
                normalizedLimit
        );

        return rows.stream()
                .map(row -> new RecentAdjustmentResult(
                        row.paymentId(),
                        row.adjustmentType(),
                        row.productName(),
                        row.memberName(),
                        row.paymentMethod(),
                        nullSafe(row.amount()),
                        row.paidAt(),
                        row.memo(),
                        row.approvalRef()
                ))
                .toList();
    }

    private SalesReportResult loadAndCache(Long centerId, ValidatedReportQuery validated) {
        List<SalesSettlementReportRepository.SalesAggregateRow> rows = reportRepository.findSalesRows(validated.command());
        List<SalesSettlementReportRepository.SalesTrendRow> trendRows = reportRepository.findTrendRows(
                validated.command(),
                validated.trendGranularity().bucketExpression()
        );

        BigDecimal totalGrossSales = sum(rows, SalesSettlementReportRepository.SalesAggregateRow::grossSales);
        BigDecimal totalRefundAmount = sum(rows, SalesSettlementReportRepository.SalesAggregateRow::refundAmount);
        BigDecimal totalNetSales = sum(rows, SalesSettlementReportRepository.SalesAggregateRow::netSales);

        List<SalesReportRow> reportRows = rows.stream()
                .map(row -> new SalesReportRow(
                        row.productName(),
                        row.paymentMethod(),
                        nullSafe(row.grossSales()),
                        nullSafe(row.refundAmount()),
                        nullSafe(row.netSales()),
                        row.transactionCount() == null ? 0L : row.transactionCount()
                ))
                .toList();

        List<SalesTrendPoint> trend = trendRows.stream()
                .map(row -> new SalesTrendPoint(
                        row.bucketStartAt().toLocalDate(),
                        validated.trendGranularity().labelFor(row.bucketStartAt().toLocalDate()),
                        nullSafe(row.grossSales()),
                        nullSafe(row.refundAmount()),
                        nullSafe(row.netSales()),
                        row.transactionCount() == null ? 0L : row.transactionCount()
                ))
                .toList();

        SalesReportResult result = new SalesReportResult(
                validated.startDate(),
                validated.endDate(),
                validated.paymentMethod(),
                validated.productKeyword(),
                validated.trendGranularity().name(),
                totalGrossSales,
                totalRefundAmount,
                totalNetSales,
                trend,
                reportRows
        );
        reportCacheService.put(centerId, result);
        return result;
    }

    private ValidatedReportQuery validateQuery(ReportQuery query) {
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
        TrendGranularity trendGranularity = TrendGranularity.from(query.trendGranularity());
        OffsetDateTime startAt = startDate.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime endExclusiveAt = endDate.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();

        return new ValidatedReportQuery(
                startDate,
                endDate,
                paymentMethod,
                productKeyword,
                trendGranularity,
                new SalesSettlementReportRepository.QueryCommand(
                        currentUserProvider.currentCenterId(),
                        startAt,
                        endExclusiveAt,
                        paymentMethod,
                        productKeyword
                )
        );
    }

    private int normalizeRecentAdjustmentsLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_RECENT_ADJUSTMENTS_LIMIT;
        }
        if (limit < 1 || limit > MAX_RECENT_ADJUSTMENTS_LIMIT) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "limit must be between 1 and " + MAX_RECENT_ADJUSTMENTS_LIMIT
            );
        }
        return limit;
    }

    private BigDecimal sum(
            List<SalesSettlementReportRepository.SalesAggregateRow> rows,
            java.util.function.Function<SalesSettlementReportRepository.SalesAggregateRow, BigDecimal> getter
    ) {
        return rows.stream()
                .map(getter)
                .map(this::nullSafe)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
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
            String productKeyword,
            String trendGranularity
    ) {
    }

    private record ValidatedReportQuery(
            LocalDate startDate,
            LocalDate endDate,
            String paymentMethod,
            String productKeyword,
            TrendGranularity trendGranularity,
            SalesSettlementReportRepository.QueryCommand command
    ) {
    }

    public record SalesReportResult(
            LocalDate startDate,
            LocalDate endDate,
            String paymentMethod,
            String productKeyword,
            String trendGranularity,
            BigDecimal totalGrossSales,
            BigDecimal totalRefundAmount,
            BigDecimal totalNetSales,
            List<SalesTrendPoint> trend,
            List<SalesReportRow> rows
    ) {
    }

    public record SalesTrendPoint(
            LocalDate bucketStartDate,
            String bucketLabel,
            BigDecimal grossSales,
            BigDecimal refundAmount,
            BigDecimal netSales,
            Long transactionCount
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

    public record RecentAdjustmentResult(
            Long paymentId,
            String adjustmentType,
            String productName,
            String memberName,
            String paymentMethod,
            BigDecimal amount,
            OffsetDateTime paidAt,
            String memo,
            String approvalRef
    ) {
    }

    enum TrendGranularity {
        DAILY("date_trunc('day', p.paid_at AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'") {
            @Override
            String labelFor(LocalDate date) {
                return DATE_FORMATTER.format(date);
            }
        },
        WEEKLY("date_trunc('week', p.paid_at AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'") {
            @Override
            String labelFor(LocalDate date) {
                return DATE_FORMATTER.format(date) + " 주간";
            }
        },
        MONTHLY("date_trunc('month', p.paid_at AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'") {
            @Override
            String labelFor(LocalDate date) {
                return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
            }
        },
        YEARLY("date_trunc('year', p.paid_at AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'") {
            @Override
            String labelFor(LocalDate date) {
                return String.valueOf(date.getYear());
            }
        };

        private final String bucketExpression;

        TrendGranularity(String bucketExpression) {
            this.bucketExpression = bucketExpression;
        }

        static TrendGranularity from(String value) {
            if (value == null || value.isBlank()) {
                return DAILY;
            }
            try {
                return TrendGranularity.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "trendGranularity is invalid");
            }
        }

        String bucketExpression() {
            return bucketExpression;
        }

        abstract String labelFor(LocalDate date);
    }
}
