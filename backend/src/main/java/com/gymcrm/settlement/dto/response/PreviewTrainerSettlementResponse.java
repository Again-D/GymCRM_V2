package com.gymcrm.settlement.dto.response;

import com.gymcrm.settlement.service.TrainerSettlementPreviewService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PreviewTrainerSettlementResponse(
        String settlementMonth,
        ScopeResponse scope,
        PeriodResponse period,
        SummaryResponse summary,
        ConflictResponse conflict,
        List<RowResponse> rows
) {
    public static PreviewTrainerSettlementResponse from(TrainerSettlementPreviewService.PreviewResult result) {
        return new PreviewTrainerSettlementResponse(
                result.periodStart().toString().substring(0, 7),
                new ScopeResponse(result.trainerId(), result.trainerName()),
                new PeriodResponse(result.periodStart(), result.periodEnd()),
                new SummaryResponse(
                        result.totalSessions(),
                        result.completedSessions(),
                        result.cancelledSessions(),
                        result.noShowSessions(),
                        result.totalAmount(),
                        result.hasRateWarnings()
                ),
                new ConflictResponse(result.hasConflict(), result.createAllowed()),
                result.rows().stream().map(RowResponse::from).toList()
        );
    }

    public record ScopeResponse(
            String trainerId,
            String trainerName
    ) {
    }

    public record PeriodResponse(
            LocalDate start,
            LocalDate end
    ) {
    }

    public record SummaryResponse(
            long totalSessions,
            long completedSessions,
            long cancelledSessions,
            long noShowSessions,
            BigDecimal totalAmount,
            boolean hasRateWarnings
    ) {
    }

    public record ConflictResponse(
            boolean hasConflict,
            boolean createAllowed
    ) {
    }

    public record RowResponse(
            Long trainerUserId,
            String trainerName,
            long totalSessions,
            long completedSessions,
            long cancelledSessions,
            long noShowSessions,
            long ptSessions,
            long gxSessions,
            BigDecimal ptRatePerSession,
            BigDecimal gxRatePerSession,
            BigDecimal ptAmount,
            BigDecimal gxAmount,
            BigDecimal totalAmount,
            boolean hasRateWarning,
            String rateWarningMessage
    ) {
        static RowResponse from(TrainerSettlementPreviewService.PreviewRow row) {
            return new RowResponse(
                    row.trainerUserId(),
                    row.trainerName(),
                    row.totalSessions(),
                    row.completedSessions(),
                    row.cancelledSessions(),
                    row.noShowSessions(),
                    row.ptSessions(),
                    row.gxSessions(),
                    row.ptRatePerSession(),
                    row.gxRatePerSession(),
                    row.ptAmount(),
                    row.gxAmount(),
                    row.totalAmount(),
                    row.hasRateWarning(),
                    row.rateWarningMessage()
            );
        }
    }
}
