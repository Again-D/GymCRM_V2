package com.gymcrm.settlement.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.settlement.SalesSettlementCsvExporter;
import com.gymcrm.settlement.service.SalesSettlementReportService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/settlements")
public class SalesSettlementReportController {
    private final SalesSettlementReportService reportService;
    private final SalesSettlementCsvExporter csvExporter;

    public SalesSettlementReportController(
            SalesSettlementReportService reportService,
            SalesSettlementCsvExporter csvExporter
    ) {
        this.reportService = reportService;
        this.csvExporter = csvExporter;
    }

    @GetMapping("/sales-report")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<SalesReportResponse> getSalesReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false)
            @Pattern(regexp = "^(?i)(CASH|CARD|TRANSFER|ETC)?$", message = "paymentMethod is invalid")
            String paymentMethod,
            @RequestParam(required = false) String productKeyword,
            @RequestParam(required = false)
            @Pattern(regexp = "^(?i)(DAILY|WEEKLY|MONTHLY|YEARLY)?$", message = "trendGranularity is invalid")
            String trendGranularity
    ) {
        SalesSettlementReportService.SalesReportResult result = reportService.getReport(
                new SalesSettlementReportService.ReportQuery(startDate, endDate, paymentMethod, productKeyword, trendGranularity)
        );
        return ApiResponse.success(SalesReportResponse.from(result), "정산 리포트 조회 성공");
    }

    @GetMapping("/sales-report/recent-adjustments")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<List<RecentAdjustmentResponse>> getRecentAdjustments(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false)
            @Pattern(regexp = "^(?i)(CASH|CARD|TRANSFER|ETC)?$", message = "paymentMethod is invalid")
            String paymentMethod,
            @RequestParam(required = false) String productKeyword,
            @RequestParam(required = false) @Min(1) @Max(20) Integer limit
    ) {
        List<RecentAdjustmentResponse> rows = reportService.getRecentAdjustments(
                        new SalesSettlementReportService.ReportQuery(startDate, endDate, paymentMethod, productKeyword, null),
                        limit
                ).stream()
                .map(RecentAdjustmentResponse::from)
                .toList();
        return ApiResponse.success(rows, "최근 환불 조회 성공");
    }

    @GetMapping(value = "/sales-report/export", produces = "text/csv")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ResponseEntity<String> exportSalesReportCsv(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false)
            @Pattern(regexp = "^(?i)(CASH|CARD|TRANSFER|ETC)?$", message = "paymentMethod is invalid")
            String paymentMethod,
            @RequestParam(required = false) String productKeyword,
            @RequestParam(required = false)
            @Pattern(regexp = "^(?i)(DAILY|WEEKLY|MONTHLY|YEARLY)?$", message = "trendGranularity is invalid")
            String trendGranularity
    ) {
        SalesSettlementReportService.SalesReportResult result = reportService.getReport(
                new SalesSettlementReportService.ReportQuery(startDate, endDate, paymentMethod, productKeyword, trendGranularity)
        );
        String fileName = "sales-report-%s-to-%s.csv".formatted(startDate, endDate);
        String csv = csvExporter.export(result);

        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(csv);
    }

    public record SalesReportResponse(
            LocalDate startDate,
            LocalDate endDate,
            String paymentMethod,
            String productKeyword,
            String trendGranularity,
            BigDecimal totalGrossSales,
            BigDecimal totalRefundAmount,
            BigDecimal totalNetSales,
            List<SalesTrendPointResponse> trend,
            List<SalesReportRowResponse> rows
    ) {
        static SalesReportResponse from(SalesSettlementReportService.SalesReportResult result) {
            return new SalesReportResponse(
                    result.startDate(),
                    result.endDate(),
                    result.paymentMethod(),
                    result.productKeyword(),
                    result.trendGranularity(),
                    result.totalGrossSales(),
                    result.totalRefundAmount(),
                    result.totalNetSales(),
                    result.trend().stream().map(SalesTrendPointResponse::from).toList(),
                    result.rows().stream().map(SalesReportRowResponse::from).toList()
            );
        }
    }

    public record SalesTrendPointResponse(
            LocalDate bucketStartDate,
            String bucketLabel,
            BigDecimal grossSales,
            BigDecimal refundAmount,
            BigDecimal netSales,
            Long transactionCount
    ) {
        static SalesTrendPointResponse from(SalesSettlementReportService.SalesTrendPoint point) {
            return new SalesTrendPointResponse(
                    point.bucketStartDate(),
                    point.bucketLabel(),
                    point.grossSales(),
                    point.refundAmount(),
                    point.netSales(),
                    point.transactionCount()
            );
        }
    }

    public record SalesReportRowResponse(
            String productName,
            String paymentMethod,
            BigDecimal grossSales,
            BigDecimal refundAmount,
            BigDecimal netSales,
            Long transactionCount
    ) {
        static SalesReportRowResponse from(SalesSettlementReportService.SalesReportRow row) {
            return new SalesReportRowResponse(
                    row.productName(),
                    row.paymentMethod(),
                    row.grossSales(),
                    row.refundAmount(),
                    row.netSales(),
                    row.transactionCount()
            );
        }
    }

    public record RecentAdjustmentResponse(
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
        static RecentAdjustmentResponse from(SalesSettlementReportService.RecentAdjustmentResult result) {
            return new RecentAdjustmentResponse(
                    result.paymentId(),
                    result.adjustmentType(),
                    result.productName(),
                    result.memberName(),
                    result.paymentMethod(),
                    result.amount(),
                    result.paidAt(),
                    result.memo(),
                    result.approvalRef()
            );
        }
    }
}
