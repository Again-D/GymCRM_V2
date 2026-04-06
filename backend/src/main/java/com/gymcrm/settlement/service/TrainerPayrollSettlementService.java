package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.entity.TrainerSettlement;
import com.gymcrm.settlement.repository.TrainerPayrollSettlementRepository;
import com.gymcrm.settlement.repository.TrainerSettlementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

@Service
public class TrainerPayrollSettlementService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final TrainerPayrollSettlementRepository repository;
    private final TrainerSettlementRepository trainerSettlementRepository;
    private final CurrentUserProvider currentUserProvider;

    public TrainerPayrollSettlementService(
            TrainerPayrollSettlementRepository repository,
            TrainerSettlementRepository trainerSettlementRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.repository = repository;
        this.trainerSettlementRepository = trainerSettlementRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public MonthlyPayrollResult getMonthlyPayroll(MonthlyPayrollQuery query) {
        validateQuery(query);
        List<TrainerSettlement> confirmedSettlements = trainerSettlementRepository.findConfirmedByCenterIdAndSettlementMonth(
                currentUserProvider.currentCenterId(),
                query.settlementMonth().atDay(1)
        );
        if (!confirmedSettlements.isEmpty()) {
            List<TrainerPayrollRow> confirmedRows = confirmedSettlements.stream()
                    .map(settlement -> new TrainerPayrollRow(
                            settlement.settlementId(),
                            settlement.trainerUserId(),
                            settlement.trainerName(),
                            settlement.completedClassCount(),
                            settlement.sessionUnitPrice(),
                            settlement.payrollAmount()
                    ))
                    .toList();

            long totalCompletedClassCount = confirmedRows.stream()
                    .mapToLong(TrainerPayrollRow::completedClassCount)
                    .sum();
            BigDecimal totalPayrollAmount = confirmedRows.stream()
                    .map(TrainerPayrollRow::payrollAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            return new MonthlyPayrollResult(
                    query.settlementMonth(),
                    confirmedRows.isEmpty() ? query.sessionUnitPrice() : confirmedRows.get(0).sessionUnitPrice(),
                    totalCompletedClassCount,
                    totalPayrollAmount,
                    "CONFIRMED",
                    confirmedSettlements.get(0).confirmedAt(),
                    confirmedRows
            );
        }
        return calculateMonthlyPayroll(query);
    }

    @Transactional(readOnly = true)
    public MonthlyPayrollResult calculateMonthlyPayroll(MonthlyPayrollQuery query) {
        validateQuery(query);
        return calculateDraftMonthlyPayroll(query);
    }

    private MonthlyPayrollResult calculateDraftMonthlyPayroll(MonthlyPayrollQuery query) {
        if (query.settlementMonth() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "settlementMonth is required");
        }
        if (query.sessionUnitPrice() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "sessionUnitPrice is required");
        }
        if (query.sessionUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "sessionUnitPrice must be >= 0");
        }

        OffsetDateTime startAt = query.settlementMonth().atDay(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime endExclusiveAt = query.settlementMonth().plusMonths(1).atDay(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();

        List<TrainerPayrollSettlementRepository.TrainerCompletedCountRow> rows = repository.findMonthlyCompletedPtCounts(
                new TrainerPayrollSettlementRepository.QueryCommand(
                        currentUserProvider.currentCenterId(),
                        startAt,
                        endExclusiveAt
                )
        );

        List<TrainerPayrollRow> payrollRows = rows.stream()
                .map(row -> new TrainerPayrollRow(
                        null,
                        row.trainerUserId(),
                        row.trainerName(),
                        row.completedClassCount(),
                        query.sessionUnitPrice(),
                        query.sessionUnitPrice().multiply(BigDecimal.valueOf(row.completedClassCount()))
                ))
                .toList();

        long totalCompletedClassCount = payrollRows.stream()
                .mapToLong(TrainerPayrollRow::completedClassCount)
                .sum();
        BigDecimal totalPayrollAmount = payrollRows.stream()
                .map(TrainerPayrollRow::payrollAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new MonthlyPayrollResult(
                query.settlementMonth(),
                query.sessionUnitPrice(),
                totalCompletedClassCount,
                totalPayrollAmount,
                "DRAFT",
                null,
                payrollRows
        );
    }

    private void validateQuery(MonthlyPayrollQuery query) {
        if (query.settlementMonth() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "settlementMonth is required");
        }
        if (query.sessionUnitPrice() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "sessionUnitPrice is required");
        }
        if (query.sessionUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "sessionUnitPrice must be >= 0");
        }
    }

    public record MonthlyPayrollQuery(
            YearMonth settlementMonth,
            BigDecimal sessionUnitPrice
    ) {
    }

    public record MonthlyPayrollResult(
            YearMonth settlementMonth,
            BigDecimal sessionUnitPrice,
            long totalCompletedClassCount,
            BigDecimal totalPayrollAmount,
            String settlementStatus,
            OffsetDateTime confirmedAt,
            List<TrainerPayrollRow> rows
    ) {
    }

    public record TrainerPayrollRow(
            Long settlementId,
            Long trainerUserId,
            String trainerName,
            long completedClassCount,
            BigDecimal sessionUnitPrice,
            BigDecimal payrollAmount
    ) {
    }
}
