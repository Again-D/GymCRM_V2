package com.gymcrm.settlement;

import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.repository.SalesReceivablesRepository;
import com.gymcrm.settlement.service.SalesReceivablesService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class SalesReceivablesServiceTest {
    @Test
    void computesSummaryFromOutstandingRows() {
        SalesReceivablesRepository repository = mock(SalesReceivablesRepository.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
        SalesReceivablesService service = new SalesReceivablesService(repository, currentUserProvider);

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(repository.findReceivables(new SalesReceivablesRepository.QueryCommand(1L, LocalDate.of(2099, 7, 15), 10)))
                .willReturn(List.of(
                        new SalesReceivablesRepository.SalesReceivableRow(
                                9001L,
                                101L,
                                "김민수",
                                "PT 10회권",
                                "PT",
                                "ACTIVE",
                                new BigDecimal("550000"),
                                31001L,
                                "TRANSFER",
                                new BigDecimal("500000"),
                                OffsetDateTime.of(LocalDateTime.of(2099, 7, 10, 9, 0), ZoneOffset.UTC),
                                LocalDate.of(2099, 7, 10),
                                LocalDate.of(2099, 7, 13),
                                new BigDecimal("50000"),
                                true
                        ),
                        new SalesReceivablesRepository.SalesReceivableRow(
                                9011L,
                                102L,
                                "박서연",
                                "PT 20회권",
                                "PT",
                                "HOLDING",
                                new BigDecimal("550000"),
                                31002L,
                                "CARD",
                                new BigDecimal("520000"),
                                OffsetDateTime.of(LocalDateTime.of(2099, 7, 14, 9, 0), ZoneOffset.UTC),
                                LocalDate.of(2099, 7, 14),
                                LocalDate.of(2099, 7, 17),
                                new BigDecimal("30000"),
                                false
                        )
                ));

        SalesReceivablesService.ReceivablesResult result = service.getReceivables(
                new SalesReceivablesService.ReceivablesQuery(LocalDate.of(2099, 7, 15), 10)
        );

        assertThat(result.totalOutstandingAmount()).isEqualByComparingTo("80000");
        assertThat(result.receivableCount()).isEqualTo(2L);
        assertThat(result.reminderEligibleCount()).isEqualTo(1L);
        assertThat(result.rows()).hasSize(2);
        assertThat(result.rows().get(0).reminderChannel()).isEqualTo("CRM");
        assertThat(result.rows().get(1).reminderChannel()).isEqualTo("REVIEW");
    }
}
