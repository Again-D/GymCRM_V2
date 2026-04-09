package com.gymcrm.settlement;

import com.gymcrm.settlement.service.SalesSettlementReportService;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Component
public class SalesSettlementCsvExporter {
    public byte[] export(SalesSettlementReportService.SalesReportResult report) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);
            CellStyle integerStyle = createIntegerStyle(workbook);

            writeSummarySheet(workbook.createSheet("Summary"), report, headerStyle, currencyStyle);
            writeTrendSheet(workbook.createSheet("Trend"), report, headerStyle, currencyStyle, integerStyle);
            writeDetailSheet(workbook.createSheet("Details"), report, headerStyle, currencyStyle, integerStyle);

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("매출 정산 엑셀 생성에 실패했습니다.", exception);
        }
    }

    private void writeSummarySheet(
            Sheet sheet,
            SalesSettlementReportService.SalesReportResult report,
            CellStyle headerStyle,
            CellStyle currencyStyle
    ) {
        String[][] summaryRows = {
                {"시작일", report.startDate().toString()},
                {"종료일", report.endDate().toString()},
                {"결제 수단", nullable(report.paymentMethod())},
                {"상품 키워드", nullable(report.productKeyword())},
                {"추이 단위", nullable(report.trendGranularity())}
        };

        Row titleRow = sheet.createRow(0);
        titleRow.createCell(0).setCellValue("매출 정산 리포트");

        for (int index = 0; index < summaryRows.length; index++) {
            Row row = sheet.createRow(index + 2);
            row.createCell(0).setCellValue(summaryRows[index][0]);
            row.createCell(1).setCellValue(summaryRows[index][1]);
        }

        Row metricsHeader = sheet.createRow(8);
        applyHeader(metricsHeader, headerStyle, "지표", "값");

        Row grossRow = sheet.createRow(9);
        grossRow.createCell(0).setCellValue("총매출");
        grossRow.createCell(1).setCellValue(report.totalGrossSales().doubleValue());
        grossRow.getCell(1).setCellStyle(currencyStyle);

        Row refundRow = sheet.createRow(10);
        refundRow.createCell(0).setCellValue("총 환불");
        refundRow.createCell(1).setCellValue(report.totalRefundAmount().doubleValue());
        refundRow.getCell(1).setCellStyle(currencyStyle);

        Row netRow = sheet.createRow(11);
        netRow.createCell(0).setCellValue("순매출");
        netRow.createCell(1).setCellValue(report.totalNetSales().doubleValue());
        netRow.getCell(1).setCellStyle(currencyStyle);

        autosize(sheet, 0, 1);
    }

    private void writeTrendSheet(
            Sheet sheet,
            SalesSettlementReportService.SalesReportResult report,
            CellStyle headerStyle,
            CellStyle currencyStyle,
            CellStyle integerStyle
    ) {
        Row headerRow = sheet.createRow(0);
        applyHeader(headerRow, headerStyle, "버킷 시작일", "버킷 라벨", "총매출", "환불", "순매출", "거래 수");

        int rowIndex = 1;
        for (SalesSettlementReportService.SalesTrendPoint point : report.trend()) {
            Row row = sheet.createRow(rowIndex++);
            row.createCell(0).setCellValue(point.bucketStartDate().toString());
            row.createCell(1).setCellValue(point.bucketLabel());
            row.createCell(2).setCellValue(point.grossSales().doubleValue());
            row.createCell(2).setCellStyle(currencyStyle);
            row.createCell(3).setCellValue(point.refundAmount().doubleValue());
            row.createCell(3).setCellStyle(currencyStyle);
            row.createCell(4).setCellValue(point.netSales().doubleValue());
            row.createCell(4).setCellStyle(currencyStyle);
            Cell countCell = row.createCell(5);
            countCell.setCellValue(point.transactionCount());
            countCell.setCellStyle(integerStyle);
        }

        autosize(sheet, 0, 5);
    }

    private void writeDetailSheet(
            Sheet sheet,
            SalesSettlementReportService.SalesReportResult report,
            CellStyle headerStyle,
            CellStyle currencyStyle,
            CellStyle integerStyle
    ) {
        Row headerRow = sheet.createRow(0);
        applyHeader(headerRow, headerStyle, "상품명", "결제 수단", "총매출", "환불", "순매출", "거래 수");

        int rowIndex = 1;
        for (SalesSettlementReportService.SalesReportRow reportRow : report.rows()) {
            Row row = sheet.createRow(rowIndex++);
            row.createCell(0).setCellValue(reportRow.productName());
            row.createCell(1).setCellValue(reportRow.paymentMethod());
            row.createCell(2).setCellValue(reportRow.grossSales().doubleValue());
            row.createCell(2).setCellStyle(currencyStyle);
            row.createCell(3).setCellValue(reportRow.refundAmount().doubleValue());
            row.createCell(3).setCellStyle(currencyStyle);
            row.createCell(4).setCellValue(reportRow.netSales().doubleValue());
            row.createCell(4).setCellStyle(currencyStyle);
            Cell countCell = row.createCell(5);
            countCell.setCellValue(reportRow.transactionCount());
            countCell.setCellStyle(integerStyle);
        }

        autosize(sheet, 0, 5);
    }

    private String nullable(String value) {
        return value == null ? "" : value;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
        return style;
    }

    private CellStyle createIntegerStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.createDataFormat().getFormat("0"));
        return style;
    }

    private void applyHeader(Row row, CellStyle headerStyle, String... values) {
        for (int index = 0; index < values.length; index++) {
            row.createCell(index).setCellValue(values[index]);
            row.getCell(index).setCellStyle(headerStyle);
        }
    }

    private void autosize(Sheet sheet, int startIndex, int endIndex) {
        for (int columnIndex = startIndex; columnIndex <= endIndex; columnIndex++) {
            sheet.autoSizeColumn(columnIndex);
        }
    }
}
