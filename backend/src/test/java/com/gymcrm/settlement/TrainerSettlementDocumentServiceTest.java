package com.gymcrm.settlement;

import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.entity.Settlement;
import com.gymcrm.settlement.entity.SettlementDetail;
import com.gymcrm.settlement.repository.SettlementDetailRepository;
import com.gymcrm.settlement.repository.SettlementRepository;
import com.gymcrm.settlement.repository.TrainerSettlementSourceRepository;
import com.gymcrm.settlement.service.TrainerSettlementDocumentService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TrainerSettlementDocumentServiceTest {

    @Test
    void documentLinesUseBaseAmountWhileTotalUsesNetAmount() {
        SettlementRepository settlementRepository = mock(SettlementRepository.class);
        SettlementDetailRepository settlementDetailRepository = mock(SettlementDetailRepository.class);
        TrainerSettlementSourceRepository trainerSettlementSourceRepository = mock(TrainerSettlementSourceRepository.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        TrainerSettlementDocumentService service = new TrainerSettlementDocumentService(
                settlementRepository,
                settlementDetailRepository,
                trainerSettlementSourceRepository,
                currentUserProvider
        );

        Settlement settlement = new Settlement(
                10L,
                1L,
                2026,
                4,
                3,
                new BigDecimal("145000"),
                "CONFIRMED",
                LocalDate.of(2026, 4, 1),
                99L,
                OffsetDateTime.parse("2026-04-25T10:00:00+09:00"),
                OffsetDateTime.parse("2026-04-25T10:00:00+09:00"),
                99L,
                OffsetDateTime.parse("2026-04-25T10:00:00+09:00"),
                99L
        );
        SettlementDetail ptDetail = new SettlementDetail(
                100L,
                10L,
                41L,
                "PT",
                2,
                new BigDecimal("50000"),
                new BigDecimal("100000"),
                new BigDecimal("10000"),
                BigDecimal.ZERO,
                new BigDecimal("110000"),
                null,
                OffsetDateTime.parse("2026-04-25T10:00:00+09:00"),
                99L,
                OffsetDateTime.parse("2026-04-25T10:00:00+09:00"),
                99L
        );
        SettlementDetail gxDetail = new SettlementDetail(
                101L,
                10L,
                41L,
                "GX",
                1,
                new BigDecimal("30000"),
                new BigDecimal("30000"),
                BigDecimal.ZERO,
                new BigDecimal("5000"),
                new BigDecimal("25000"),
                null,
                OffsetDateTime.parse("2026-04-25T10:00:00+09:00"),
                99L,
                OffsetDateTime.parse("2026-04-25T10:00:00+09:00"),
                99L
        );

        when(currentUserProvider.currentCenterId()).thenReturn(1L);
        when(settlementRepository.findActiveById(10L)).thenReturn(Optional.of(settlement));
        when(settlementDetailRepository.findBySettlementIdAndUserId(10L, 41L)).thenReturn(List.of(ptDetail, gxDetail));
        when(trainerSettlementSourceRepository.findTrainerNames(1L, List.of(41L))).thenReturn(Map.of(41L, "Trainer Alpha"));

        TrainerSettlementDocumentService.TrainerSettlementDocument document =
                service.getConfirmedTrainerDocument(10L, 41L);

        assertEquals(0, new BigDecimal("100000").compareTo(document.pt().amount()));
        assertEquals(0, new BigDecimal("30000").compareTo(document.gx().amount()));
        assertEquals(0, new BigDecimal("135000").compareTo(document.totalAmount()));
        assertEquals(0, new BigDecimal("10000").compareTo(document.bonusAmount()));
        assertEquals(0, new BigDecimal("5000").compareTo(document.deductionAmount()));
        assertEquals(LocalDate.of(2026, 4, 1), document.periodStart());
        assertEquals(LocalDate.of(2026, 4, 30), document.periodEnd());
    }

    @Test
    void monthlyBridgeDocumentsPreferCanonicalBatchWhenPresent() {
        SettlementRepository settlementRepository = mock(SettlementRepository.class);
        SettlementDetailRepository settlementDetailRepository = mock(SettlementDetailRepository.class);
        TrainerSettlementSourceRepository trainerSettlementSourceRepository = mock(TrainerSettlementSourceRepository.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        TrainerSettlementDocumentService service = new TrainerSettlementDocumentService(
                settlementRepository,
                settlementDetailRepository,
                trainerSettlementSourceRepository,
                currentUserProvider
        );

        YearMonth settlementMonth = YearMonth.of(2026, 5);
        Settlement settlement = new Settlement(
                20L,
                1L,
                settlementMonth.getYear(),
                settlementMonth.getMonthValue(),
                1,
                new BigDecimal("50000"),
                "CONFIRMED",
                settlementMonth.atDay(1),
                99L,
                OffsetDateTime.parse("2026-05-31T10:00:00+09:00"),
                OffsetDateTime.parse("2026-05-31T10:00:00+09:00"),
                99L,
                OffsetDateTime.parse("2026-05-31T10:00:00+09:00"),
                99L
        );
        SettlementDetail detail = new SettlementDetail(
                200L,
                20L,
                41L,
                "PT",
                1,
                new BigDecimal("50000"),
                new BigDecimal("50000"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("50000"),
                null,
                OffsetDateTime.parse("2026-05-31T10:00:00+09:00"),
                99L,
                OffsetDateTime.parse("2026-05-31T10:00:00+09:00"),
                99L
        );

        when(currentUserProvider.currentCenterId()).thenReturn(1L);
        when(settlementRepository.findActiveByCenterAndYearMonth(1L, 2026, 5)).thenReturn(Optional.of(settlement));
        when(settlementDetailRepository.findBySettlementId(20L)).thenReturn(List.of(detail));
        when(trainerSettlementSourceRepository.findTrainerNames(1L, List.of(41L))).thenReturn(Map.of(41L, "Canonical Trainer"));

        List<TrainerSettlementDocumentService.TrainerSettlementDocument> documents =
                service.getMonthlyBridgeDocuments(settlementMonth);

        assertEquals(1, documents.size());
        assertEquals(20L, documents.get(0).settlementId());
        assertEquals("Canonical Trainer", documents.get(0).trainerName());
    }

    @Test
    void monthlyBridgeDocumentsFallbackToLegacyRowsWhenCanonicalBatchMissing() {
        SettlementRepository settlementRepository = mock(SettlementRepository.class);
        SettlementDetailRepository settlementDetailRepository = mock(SettlementDetailRepository.class);
        TrainerSettlementSourceRepository trainerSettlementSourceRepository = mock(TrainerSettlementSourceRepository.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        TrainerSettlementDocumentService service = new TrainerSettlementDocumentService(
                settlementRepository,
                settlementDetailRepository,
                trainerSettlementSourceRepository,
                currentUserProvider
        );

        YearMonth settlementMonth = YearMonth.of(2026, 6);
        when(currentUserProvider.currentCenterId()).thenReturn(1L);
        when(settlementRepository.findActiveByCenterAndYearMonth(1L, 2026, 6)).thenReturn(Optional.empty());

        assertThrows(
                com.gymcrm.common.error.ApiException.class,
                () -> service.getMonthlyBridgeDocuments(settlementMonth)
        );
    }
}
