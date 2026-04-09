package com.gymcrm.settlement.dto.response;

import com.gymcrm.settlement.service.TrainerSettlementCreationService;

import java.math.BigDecimal;

public record CreateTrainerSettlementResponse(
        Long settlementId,
        TrainerResponse trainer,
        PeriodResponse period,
        SummaryResponse summary,
        CalculationResponse calculation,
        String status,
        String createdAt
) {
    public static CreateTrainerSettlementResponse from(TrainerSettlementCreationService.CreateSettlementResult result) {
        return new CreateTrainerSettlementResponse(
                result.settlementId(),
                new TrainerResponse(result.trainerId(), result.userName()),
                new PeriodResponse(result.periodStart(), result.periodEnd()),
                new SummaryResponse(
                        result.totalSessions(),
                        result.completedSessions(),
                        result.cancelledSessions(),
                        result.noShowSessions(),
                        result.ptSessions(),
                        result.gxSessions()
                ),
                new CalculationResponse(
                        result.ptRatePerSession(),
                        result.gxRatePerSession(),
                        result.ptAmount(),
                        result.gxAmount(),
                        result.bonus(),
                        result.bonusReason(),
                        result.deduction(),
                        result.deductionReason(),
                        result.totalAmount()
                ),
                result.status(),
                result.createdAt().toString()
        );
    }

    public record TrainerResponse(
            String trainerId,
            String name
    ) {
    }

    public record PeriodResponse(
            java.time.LocalDate start,
            java.time.LocalDate end
    ) {
    }

    public record SummaryResponse(
            long totalSessions,
            long completedSessions,
            long cancelledSessions,
            long noShowSessions,
            long ptSessions,
            long gxSessions
    ) {
    }

    public record CalculationResponse(
            BigDecimal ptRatePerSession,
            BigDecimal gxRatePerSession,
            BigDecimal ptAmount,
            BigDecimal gxAmount,
            BigDecimal bonus,
            String bonusReason,
            BigDecimal deduction,
            String deductionReason,
            BigDecimal totalAmount
    ) {
    }
}
