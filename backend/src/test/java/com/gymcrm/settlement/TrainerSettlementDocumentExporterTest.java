package com.gymcrm.settlement;

import com.gymcrm.settlement.service.TrainerSettlementDocumentService;
import org.junit.jupiter.api.Test;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrainerSettlementDocumentExporterTest {

    private final TrainerSettlementDocumentExporter exporter = new TrainerSettlementDocumentExporter();

    @Test
    void exportsConfirmedSettlementsAsPdf() throws Exception {
        byte[] pdf = exporter.exportDocuments(List.of(
                new TrainerSettlementDocumentService.TrainerSettlementDocument(
                        1L,
                        YearMonth.of(2026, 3),
                        LocalDate.of(2026, 3, 1),
                        LocalDate.of(2026, 3, 31),
                        "CONFIRMED",
                        OffsetDateTime.parse("2026-03-25T10:00:00+09:00"),
                        1L,
                        41L,
                        "Trainer Alpha",
                        new TrainerSettlementDocumentService.DocumentLine(12, new BigDecimal("50000"), new BigDecimal("600000")),
                        new TrainerSettlementDocumentService.DocumentLine(0, BigDecimal.ZERO, BigDecimal.ZERO),
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        new BigDecimal("600000")
                )
        ));

        assertArrayEquals(new byte[]{'%', 'P', 'D', 'F'}, new byte[]{pdf[0], pdf[1], pdf[2], pdf[3]});
        try (var document = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(document);
            assertTrue(text.contains("Trainer Settlement Statement"));
            assertTrue(text.contains("Settlement Month: 2026-03"));
            assertTrue(text.contains("Settlement Period: 2026-03-01 ~ 2026-03-31"));
            assertTrue(text.contains("Trainer Alpha"));
            assertTrue(text.contains("PT Completed Classes: 12"));
            assertTrue(text.contains("PT Session Unit Price: 50000"));
            assertTrue(text.contains("PT Amount: 600000"));
            assertTrue(text.contains("Total Amount: 600000"));
            assertTrue(text.contains("Confirmed At: 2026-03-25T10:00:00+09:00"));
        }
    }

    @Test
    void addsAdditionalPdfPagesWhenRowsOverflowSinglePage() throws Exception {
        List<TrainerSettlementDocumentService.TrainerSettlementDocument> documents = java.util.stream.IntStream.rangeClosed(1, 20)
                .mapToObj(index -> new TrainerSettlementDocumentService.TrainerSettlementDocument(
                        (long) index,
                        YearMonth.of(2026, 3),
                        YearMonth.of(2026, 3).atDay(1),
                        YearMonth.of(2026, 3).atEndOfMonth(),
                        "CONFIRMED",
                        OffsetDateTime.parse("2026-03-25T10:00:00+09:00"),
                        1L,
                        (long) index,
                        "Trainer " + index,
                        new TrainerSettlementDocumentService.DocumentLine(10, new BigDecimal("50000"), new BigDecimal("500000")),
                        new TrainerSettlementDocumentService.DocumentLine(2, new BigDecimal("30000"), new BigDecimal("60000")),
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        new BigDecimal("560000")
                ))
                .toList();

        byte[] pdf = exporter.exportDocuments(documents);

        try (var document = Loader.loadPDF(pdf)) {
            assertTrue(document.getNumberOfPages() > 1);
            String text = new PDFTextStripper().getText(document);
            assertTrue(text.contains("Trainer 20"));
        }
    }
}
