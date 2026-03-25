package com.gymcrm.settlement;

import com.gymcrm.settlement.service.SalesSettlementReportService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SalesSettlementCsvExporterTest {
    private final SalesSettlementCsvExporter exporter = new SalesSettlementCsvExporter();

    @Test
    void exportIncludesSummaryAndRowsWithCsvEscaping() {
        SalesSettlementReportService.SalesReportResult report = new SalesSettlementReportService.SalesReportResult(
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 31),
                "CARD",
                "PT",
                new BigDecimal("100000"),
                new BigDecimal("20000"),
                new BigDecimal("80000"),
                List.of(new SalesSettlementReportService.SalesReportRow(
                        "PT, Premium \"A\"",
                        "CARD",
                        new BigDecimal("100000"),
                        new BigDecimal("20000"),
                        new BigDecimal("80000"),
                        2L
                ))
        );

        String csv = exporter.export(report);

        assertTrue(csv.contains("startDate,endDate,paymentMethod,productKeyword,totalGrossSales,totalRefundAmount,totalNetSales"));
        assertTrue(csv.contains("2026-03-01,2026-03-31,CARD,PT,100000,20000,80000"));
        assertTrue(csv.contains("productName,paymentMethod,grossSales,refundAmount,netSales,transactionCount"));
        assertTrue(csv.contains("\"PT, Premium \"\"A\"\"\",CARD,100000,20000,80000,2"));
    }
}
