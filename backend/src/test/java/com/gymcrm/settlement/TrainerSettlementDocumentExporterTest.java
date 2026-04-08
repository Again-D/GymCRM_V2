package com.gymcrm.settlement;

import com.gymcrm.settlement.entity.TrainerSettlement;
import org.junit.jupiter.api.Test;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrainerSettlementDocumentExporterTest {

    private final TrainerSettlementDocumentExporter exporter = new TrainerSettlementDocumentExporter();

    @Test
    void exportsConfirmedSettlementsAsPdf() throws Exception {
        byte[] pdf = exporter.export(List.of(
                new TrainerSettlement(
                        1L,
                        1L,
                        LocalDate.of(2026, 3, 1),
                        41L,
                        "Trainer Alpha",
                        12L,
                        new BigDecimal("50000"),
                        new BigDecimal("600000"),
                        "CONFIRMED",
                        OffsetDateTime.parse("2026-03-25T10:00:00+09:00"),
                        1L,
                        OffsetDateTime.parse("2026-03-25T10:00:00+09:00"),
                        1L,
                        OffsetDateTime.parse("2026-03-25T10:00:00+09:00"),
                        1L
                )
        ));

        assertArrayEquals(new byte[]{'%', 'P', 'D', 'F'}, new byte[]{pdf[0], pdf[1], pdf[2], pdf[3]});
        try (var document = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(document);
            assertTrue(text.contains("Trainer Settlement Statement"));
            assertTrue(text.contains("Settlement Month: 2026-03"));
            assertTrue(text.contains("Trainer Alpha"));
            assertTrue(text.contains("Completed Classes: 12"));
            assertTrue(text.contains("Session Unit Price: 50000"));
            assertTrue(text.contains("Payroll Amount: 600000"));
            assertTrue(text.contains("Confirmed At: 2026-03-25T10:00:00+09:00"));
        }
    }
}
