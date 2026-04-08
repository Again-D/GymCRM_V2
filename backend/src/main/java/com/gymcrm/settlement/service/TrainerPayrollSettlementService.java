package com.gymcrm.settlement.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
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
    private static final String ROLE_TRAINER = "ROLE_TRAINER";
    private static final BigDecimal DEFAULT_TRAINER_READONLY_SESSION_UNIT_PRICE = new BigDecimal("50000");

    private final TrainerPayrollSettlementRepository repository;
    private final TrainerSettlementRepository trainerSettlementRepository;
    private final AuthUserRepository authUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public TrainerPayrollSettlementService(
            TrainerPayrollSettlementRepository repository,
            TrainerSettlementRepository trainerSettlementRepository,
            AuthUserRepository authUserRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.repository = repository;
        this.trainerSettlementRepository = trainerSettlementRepository;
        this.authUserRepository = authUserRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public MonthlyPayrollResult getMonthlyPayroll(MonthlyPayrollQuery query) {
        ActorScope actorScope = resolveActorScope();
        MonthlyPayrollQuery scopedQuery = normalizeQueryForActor(query, actorScope);
        validateQuery(scopedQuery);
        List<TrainerSettlement> confirmedSettlements = trainerSettlementRepository.findConfirmedByCenterIdAndSettlementMonth(
                currentUserProvider.currentCenterId(),
                scopedQuery.settlementMonth().atDay(1)
        );
        if (actorScope.trainerUserId() != null) {
            confirmedSettlements = confirmedSettlements.stream()
                    .filter(settlement -> actorScope.trainerUserId().equals(settlement.trainerUserId()))
                    .toList();
        }
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
                    scopedQuery.settlementMonth(),
                    confirmedRows.isEmpty() ? scopedQuery.sessionUnitPrice() : confirmedRows.get(0).sessionUnitPrice(),
                    totalCompletedClassCount,
                    totalPayrollAmount,
                    "CONFIRMED",
                    confirmedSettlements.get(0).confirmedAt(),
                    confirmedRows
            );
        }
        return calculateDraftMonthlyPayroll(scopedQuery, actorScope);
    }

    @Transactional(readOnly = true)
    public MonthlyPayrollResult calculateMonthlyPayroll(MonthlyPayrollQuery query) {
        ActorScope actorScope = resolveActorScope();
        MonthlyPayrollQuery scopedQuery = normalizeQueryForActor(query, actorScope);
        validateQuery(scopedQuery);
        return calculateDraftMonthlyPayroll(scopedQuery, actorScope);
    }

    @Transactional(readOnly = true)
    public TrainerMonthlyPtSummaryResult getCurrentTrainerMonthlyPtSummary(YearMonth settlementMonth) {
        if (settlementMonth == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "settlementMonth is required");
        }

        AuthUser actor = currentActorOrNull();
        if (actor == null || !ROLE_TRAINER.equals(actor.roleCode())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "트레이너만 본인 월간 PT 실적을 조회할 수 있습니다.");
        }

        OffsetDateTime startAt = settlementMonth.atDay(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime endExclusiveAt = settlementMonth.plusMonths(1).atDay(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();

        List<TrainerPayrollSettlementRepository.TrainerCompletedCountRow> rows = repository.findMonthlyCompletedPtCounts(
                new TrainerPayrollSettlementRepository.QueryCommand(
                        currentUserProvider.currentCenterId(),
                        startAt,
                        endExclusiveAt,
                        actor.userId()
                )
        );

        long completedClassCount = rows.stream()
                .mapToLong(TrainerPayrollSettlementRepository.TrainerCompletedCountRow::completedClassCount)
                .sum();
        String trainerName = rows.isEmpty() ? actor.displayName() : rows.get(0).trainerName();

        return new TrainerMonthlyPtSummaryResult(
                settlementMonth,
                actor.userId(),
                trainerName,
                completedClassCount
        );
    }

    private MonthlyPayrollResult calculateDraftMonthlyPayroll(MonthlyPayrollQuery query, ActorScope actorScope) {
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
                        endExclusiveAt,
                        actorScope.trainerUserId()
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

    private MonthlyPayrollQuery normalizeQueryForActor(MonthlyPayrollQuery query, ActorScope actorScope) {
        if (actorScope.trainerUserId() == null) {
            return query;
        }
        return new MonthlyPayrollQuery(
                query.settlementMonth(),
                DEFAULT_TRAINER_READONLY_SESSION_UNIT_PRICE
        );
    }

    private ActorScope resolveActorScope() {
        AuthUser actor = currentActorOrNull();
        if (actor == null || !ROLE_TRAINER.equals(actor.roleCode())) {
            return ActorScope.unrestricted();
        }
        return ActorScope.forTrainer(actor.userId());
    }

    private AuthUser currentActorOrNull() {
        try {
            return authUserRepository.findActiveById(currentUserProvider.currentUserId())
                    .filter(AuthUser::isActive)
                    .orElse(null);
        } catch (IllegalStateException ex) {
            return null;
        }
    }

    private record ActorScope(Long trainerUserId) {
        static ActorScope unrestricted() {
            return new ActorScope(null);
        }

        static ActorScope forTrainer(Long trainerUserId) {
            return new ActorScope(trainerUserId);
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

    public record TrainerMonthlyPtSummaryResult(
            YearMonth settlementMonth,
            Long trainerUserId,
            String trainerName,
            long completedClassCount
    ) {
    }
}
