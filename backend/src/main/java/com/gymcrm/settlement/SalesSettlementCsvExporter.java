package com.gymcrm.settlement;

import com.gymcrm.settlement.service.SalesSettlementReportService;
import org.springframework.stereotype.Component;

import java.util.StringJoiner;

@Component
public class SalesSettlementCsvExporter {
    public String export(SalesSettlementReportService.SalesReportResult report) {
        StringBuilder csv = new StringBuilder();
        csv.append("startDate,endDate,paymentMethod,productKeyword,totalGrossSales,totalRefundAmount,totalNetSales\n");
        csv.append(join(
                report.startDate().toString(),
                report.endDate().toString(),
                nullable(report.paymentMethod()),
                nullable(report.productKeyword()),
                report.totalGrossSales().toPlainString(),
                report.totalRefundAmount().toPlainString(),
                report.totalNetSales().toPlainString()
        )).append('\n');

        csv.append('\n');
        csv.append("productName,paymentMethod,grossSales,refundAmount,netSales,transactionCount\n");
        for (SalesSettlementReportService.SalesReportRow row : report.rows()) {
            csv.append(join(
                    row.productName(),
                    row.paymentMethod(),
                    row.grossSales().toPlainString(),
                    row.refundAmount().toPlainString(),
                    row.netSales().toPlainString(),
                    String.valueOf(row.transactionCount())
            )).append('\n');
        }
        return csv.toString();
    }

    private String join(String... values) {
        StringJoiner joiner = new StringJoiner(",");
        for (String value : values) {
            joiner.add(escape(value));
        }
        return joiner.toString();
    }

    private String escape(String value) {
        String safe = value == null ? "" : value;
        if (!safe.contains(",") && !safe.contains("\"") && !safe.contains("\n")) {
            return safe;
        }
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private String nullable(String value) {
        return value == null ? "" : value;
    }
}
