package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.entity.Settlement;
import com.gymcrm.settlement.entity.SettlementDetail;
import com.gymcrm.settlement.enums.SettlementLessonType;
import com.gymcrm.settlement.enums.SettlementStatus;
import com.gymcrm.settlement.repository.SettlementDetailRepository;
import com.gymcrm.settlement.repository.SettlementRepository;
import com.gymcrm.settlement.repository.TrainerSettlementSourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class TrainerSettlementCreationService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final String TRAINER_ID_ALL = "ALL";

    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository settlementDetailRepository;
    private final TrainerSettlementSourceRepository trainerSettlementSourceRepository;
    private final CurrentUserProvider currentUserProvider;

    public TrainerSettlementCreationService(
            SettlementRepository settlementRepository,
            SettlementDetailRepository settlementDetailRepository,
            TrainerSettlementSourceRepository trainerSettlementSourceRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.settlementRepository = settlementRepository;
        this.settlementDetailRepository = settlementDetailRepository;
        this.trainerSettlementSourceRepository = trainerSettlementSourceRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public CreateSettlementResult create(CreateSettlementCommand command) {
        LocalDate periodStart = parseDate(command.periodStart(), "periodStart");
        LocalDate periodEnd = parseDate(command.periodEnd(), "periodEnd");
        validatePeriod(periodStart, periodEnd);

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        Long trainerUserId = parseTrainerUserId(command.trainerId());

        OffsetDateTime monthStartAt = periodStart.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime monthEndExclusiveAt = periodEnd.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        List<TrainerSettlementSourceRepository.TrainerSettlementSourceRow> sourceRows =
                trainerSettlementSourceRepository.findCompletedPtSources(centerId, monthStartAt, monthEndExclusiveAt, trainerUserId);

        if (sourceRows.isEmpty()) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "생성할 트레이너 정산 데이터가 없습니다.");
        }

        sourceRows.forEach(this::validateSettlementRateConfigured);

        YearMonth yearMonth = YearMonth.from(periodStart);
        Settlement settlement = settlementRepository.findActiveByCenterAndYearMonth(centerId, yearMonth.getYear(), yearMonth.getMonthValue())
                .orElseGet(() -> createDraftSettlement(centerId, actorUserId, yearMonth));

        ensureDraftSettlement(settlement);

        List<SettlementDetail> existingDetails = settlementDetailRepository.findBySettlementId(settlement.settlementId());
        List<SettlementDetailRepository.CreateCommand> createCommands = buildCreateCommands(
                settlement,
                sourceRows,
                existingDetails,
                trainerUserId == null,
                actorUserId
        );
        if (createCommands.isEmpty()) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 같은 기간의 트레이너 정산이 생성되어 있습니다.");
        }

        settlementDetailRepository.insertAll(createCommands);
        List<SettlementDetail> allDetails = settlementDetailRepository.findBySettlementId(settlement.settlementId());
        Settlement updatedSettlement = refreshSettlementTotals(settlement, allDetails, actorUserId);

        if (trainerUserId == null) {
            return toAllTrainerResult(updatedSettlement, allDetails, periodStart, periodEnd);
        }

        SettlementDetail createdDetail = allDetails.stream()
                .filter(detail -> trainerUserId.equals(detail.userId()) && SettlementLessonType.PT.name().equals(detail.lessonType()))
                .findFirst()
                .orElseThrow();
        TrainerSettlementSourceRepository.TrainerSettlementSourceRow sourceRow = sourceRows.stream()
                .filter(row -> trainerUserId.equals(row.trainerUserId()))
                .findFirst()
                .orElseThrow();
        return toSingleTrainerResult(updatedSettlement, createdDetail, sourceRow, periodStart, periodEnd);
    }

    private Settlement createDraftSettlement(Long centerId, Long actorUserId, YearMonth yearMonth) {
        OffsetDateTime now = OffsetDateTime.now(BUSINESS_ZONE);
        return settlementRepository.create(new SettlementRepository.CreateCommand(
                centerId,
                yearMonth.getYear(),
                yearMonth.getMonthValue(),
                0,
                BigDecimal.ZERO,
                SettlementStatus.DRAFT.name(),
                yearMonth.atDay(1),
                null,
                null,
                now,
                actorUserId
        ));
    }

    private List<SettlementDetailRepository.CreateCommand> buildCreateCommands(
            Settlement settlement,
            List<TrainerSettlementSourceRepository.TrainerSettlementSourceRow> sourceRows,
            List<SettlementDetail> existingDetails,
            boolean allTrainerRequest,
            Long actorUserId
    ) {
        OffsetDateTime now = OffsetDateTime.now(BUSINESS_ZONE);
        List<SettlementDetailRepository.CreateCommand> commands = new ArrayList<>();
        for (TrainerSettlementSourceRepository.TrainerSettlementSourceRow sourceRow : sourceRows) {
            boolean exists = existingDetails.stream()
                    .anyMatch(detail -> detail.userId().equals(sourceRow.trainerUserId())
                            && SettlementLessonType.PT.name().equals(detail.lessonType()));
            if (exists && !allTrainerRequest) {
                throw new ApiException(ErrorCode.CONFLICT, "이미 같은 기간의 트레이너 정산이 생성되어 있습니다. trainerId=" + sourceRow.trainerUserId());
            }
            if (exists) {
                continue;
            }
            BigDecimal amount = sourceRow.ptSessionUnitPrice()
                    .multiply(BigDecimal.valueOf(sourceRow.completedClassCount()));
            commands.add(new SettlementDetailRepository.CreateCommand(
                    settlement.settlementId(),
                    sourceRow.trainerUserId(),
                    SettlementLessonType.PT.name(),
                    Math.toIntExact(sourceRow.completedClassCount()),
                    sourceRow.ptSessionUnitPrice(),
                    amount,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    amount,
                    null,
                    now,
                    actorUserId
            ));
        }
        return commands;
    }

    private Settlement refreshSettlementTotals(Settlement settlement, List<SettlementDetail> details, Long actorUserId) {
        int totalLessonCount = details.stream()
                .mapToInt(SettlementDetail::lessonCount)
                .sum();
        BigDecimal totalAmount = details.stream()
                .map(SettlementDetail::netAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return settlementRepository.updateSummaryAndStatus(new SettlementRepository.UpdateCommand(
                settlement.settlementId(),
                totalLessonCount,
                totalAmount,
                settlement.status(),
                settlement.confirmedBy(),
                settlement.confirmedAt(),
                OffsetDateTime.now(BUSINESS_ZONE),
                actorUserId
        ));
    }

    private CreateSettlementResult toSingleTrainerResult(
            Settlement settlement,
            SettlementDetail detail,
            TrainerSettlementSourceRepository.TrainerSettlementSourceRow sourceRow,
            LocalDate periodStart,
            LocalDate periodEnd
    ) {
        return new CreateSettlementResult(
                settlement.settlementId(),
                String.valueOf(sourceRow.trainerUserId()),
                sourceRow.userName(),
                periodStart,
                periodEnd,
                detail.lessonCount(),
                detail.lessonCount(),
                0,
                0,
                detail.lessonCount(),
                0,
                detail.unitPrice(),
                BigDecimal.ZERO,
                detail.amount(),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                null,
                BigDecimal.ZERO,
                null,
                detail.netAmount(),
                settlement.status(),
                settlement.createdAt()
        );
    }

    private CreateSettlementResult toAllTrainerResult(
            Settlement settlement,
            List<SettlementDetail> details,
            LocalDate periodStart,
            LocalDate periodEnd
    ) {
        List<SettlementDetail> ptDetails = details.stream()
                .filter(detail -> SettlementLessonType.PT.name().equals(detail.lessonType()))
                .sorted(Comparator.comparing(SettlementDetail::userId))
                .toList();
        BigDecimal ptRatePerSession = ptDetails.isEmpty() ? BigDecimal.ZERO : ptDetails.get(0).unitPrice();
        BigDecimal totalAmount = ptDetails.stream()
                .map(SettlementDetail::netAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalSessions = ptDetails.stream()
                .mapToLong(SettlementDetail::lessonCount)
                .sum();
        return new CreateSettlementResult(
                settlement.settlementId(),
                TRAINER_ID_ALL,
                "전체 트레이너",
                periodStart,
                periodEnd,
                totalSessions,
                totalSessions,
                0,
                0,
                totalSessions,
                0,
                ptRatePerSession,
                BigDecimal.ZERO,
                totalAmount,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                null,
                BigDecimal.ZERO,
                null,
                totalAmount,
                settlement.status(),
                settlement.createdAt()
        );
    }

    private void ensureDraftSettlement(Settlement settlement) {
        if (!SettlementStatus.DRAFT.name().equals(settlement.status())) {
            throw new ApiException(ErrorCode.CONFLICT, "확정된 정산에는 detail을 추가할 수 없습니다. settlementId=" + settlement.settlementId());
        }
    }

    private void validateSettlementRateConfigured(TrainerSettlementSourceRepository.TrainerSettlementSourceRow row) {
        if (row.ptSessionUnitPrice() == null) {
            throw new ApiException(
                    ErrorCode.BUSINESS_RULE,
                    "트레이너 정산 단가가 설정되지 않았습니다. trainerId=" + row.trainerUserId()
            );
        }
    }

    private Long parseTrainerUserId(String trainerId) {
        if (TRAINER_ID_ALL.equalsIgnoreCase(trainerId)) {
            return null;
        }
        try {
            return Long.valueOf(trainerId);
        } catch (NumberFormatException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "trainerId must be a numeric user id or ALL");
        }
    }

    private LocalDate parseDate(String value, String fieldName) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, fieldName + " must be yyyy-MM-dd");
        }
    }

    private void validatePeriod(LocalDate periodStart, LocalDate periodEnd) {
        if (periodEnd.isBefore(periodStart)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "periodEnd must be on or after periodStart");
        }
        YearMonth yearMonth = YearMonth.from(periodStart);
        if (!YearMonth.from(periodEnd).equals(yearMonth)
                || !periodStart.equals(yearMonth.atDay(1))
                || !periodEnd.equals(yearMonth.atEndOfMonth())) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "1차 구현에서는 동일 월의 전체 기간만 허용합니다. periodStart=yyyy-MM-01, periodEnd=yyyy-MM-last-day"
            );
        }
    }

    public record CreateSettlementCommand(
            String trainerId,
            String periodStart,
            String periodEnd
    ) {
    }

    public record CreateSettlementResult(
            Long settlementId,
            String trainerId,
            String userName,
            LocalDate periodStart,
            LocalDate periodEnd,
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
            BigDecimal bonus,
            String bonusReason,
            BigDecimal deduction,
            String deductionReason,
            BigDecimal totalAmount,
            String status,
            OffsetDateTime createdAt
    ) {
    }
}
