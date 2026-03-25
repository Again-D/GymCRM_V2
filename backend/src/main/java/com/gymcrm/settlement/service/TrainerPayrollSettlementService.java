package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.repository.TrainerPayrollSettlementRepository;
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
    private final CurrentUserProvider currentUserProvider;

    public TrainerPayrollSettlementService(
            TrainerPayrollSettlementRepository repository,
            CurrentUserProvider currentUserProvider
    ) {
        this.repository = repository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public MonthlyPayrollResult getMonthlyPayroll(MonthlyPayrollQuery query) {
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
                payrollRows
        );
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
            List<TrainerPayrollRow> rows
    ) {
    }

    public record TrainerPayrollRow(
            String trainerName,
            long completedClassCount,
            BigDecimal sessionUnitPrice,
            BigDecimal payrollAmount
    ) {
    }
}
