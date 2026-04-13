package com.gymcrm.settlement;

import com.gymcrm.settlement.service.SalesSettlementReportService;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SalesSettlementCsvExporterTest {
    private final SalesSettlementCsvExporter exporter = new SalesSettlementCsvExporter();

    @Test
    void exportIncludesSummaryAndRowsInWorkbookSheets() throws Exception {
        SalesSettlementReportService.SalesReportResult report = new SalesSettlementReportService.SalesReportResult(
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 31),
                "CARD",
                "PT",
                "DAILY",
                new BigDecimal("100000"),
                new BigDecimal("20000"),
                new BigDecimal("80000"),
                List.of(
                        new SalesSettlementReportService.SalesTrendPoint(
                                LocalDate.of(2026, 3, 1),
                                "2026-03-01",
                                new BigDecimal("100000"),
                                new BigDecimal("20000"),
                                new BigDecimal("80000"),
                                2L
                        ),
                        new SalesSettlementReportService.SalesTrendPoint(
                                LocalDate.of(2026, 3, 2),
                                "2026-03-02",
                                BigDecimal.ZERO,
                                BigDecimal.ZERO,
                                BigDecimal.ZERO,
                                0L
                        ),
                        new SalesSettlementReportService.SalesTrendPoint(
                                LocalDate.of(2026, 3, 3),
                                "2026-03-03",
                                new BigDecimal("50000"),
                                BigDecimal.ZERO,
                                new BigDecimal("50000"),
                                1L
                        )
                ),
                List.of(new SalesSettlementReportService.SalesReportRow(
                        "PT, Premium \"A\"",
                        "CARD",
                        new BigDecimal("100000"),
                        new BigDecimal("20000"),
                        new BigDecimal("80000"),
                        2L
                ))
        );

        byte[] workbookBytes = exporter.export(report);

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(workbookBytes))) {
            assertEquals("매출 정산 리포트", workbook.getSheet("Summary").getRow(0).getCell(0).getStringCellValue());
            assertEquals("시작일", workbook.getSheet("Summary").getRow(2).getCell(0).getStringCellValue());
            assertEquals("2026-03-01", workbook.getSheet("Summary").getRow(2).getCell(1).getStringCellValue());
            assertEquals(80000D, workbook.getSheet("Summary").getRow(11).getCell(1).getNumericCellValue());

            assertEquals("버킷 라벨", workbook.getSheet("Trend").getRow(0).getCell(1).getStringCellValue());
            assertEquals("2026-03-01", workbook.getSheet("Trend").getRow(1).getCell(1).getStringCellValue());
            assertEquals(2D, workbook.getSheet("Trend").getRow(1).getCell(5).getNumericCellValue());
            assertEquals("2026-03-02", workbook.getSheet("Trend").getRow(2).getCell(1).getStringCellValue());
            assertEquals(0D, workbook.getSheet("Trend").getRow(2).getCell(5).getNumericCellValue());

            assertEquals("상품명", workbook.getSheet("Details").getRow(0).getCell(0).getStringCellValue());
            assertEquals("PT, Premium \"A\"", workbook.getSheet("Details").getRow(1).getCell(0).getStringCellValue());
            assertEquals("CARD", workbook.getSheet("Details").getRow(1).getCell(1).getStringCellValue());
        }
    }
}
