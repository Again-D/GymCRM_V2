package com.gymcrm.settlement;

import com.gymcrm.settlement.entity.TrainerSettlement;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class TrainerSettlementDocumentExporterTest {

    private final TrainerSettlementDocumentExporter exporter = new TrainerSettlementDocumentExporter();

    @Test
    void exportsConfirmedSettlementsAsCsv() {
        String csv = exporter.export(List.of(
                new TrainerSettlement(
                        1L,
                        1L,
                        LocalDate.of(2026, 3, 1),
                        41L,
                        "정트레이너",
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

        assertTrue(csv.contains("settlementMonth,trainerName,trainerUserId"));
        assertTrue(csv.contains("2026-03-01,정트레이너,41,12,50000,600000,CONFIRMED"));
    }
}
