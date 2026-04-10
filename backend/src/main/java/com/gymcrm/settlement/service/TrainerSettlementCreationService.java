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
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class TrainerSettlementCreationService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final String TRAINER_ID_ALL = "ALL";

    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository settlementDetailRepository;
    private final TrainerSettlementSourceRepository trainerSettlementSourceRepository;
    private final CurrentUserProvider currentUserProvider;
    private final SettlementConflictService settlementConflictService;

    public TrainerSettlementCreationService(
            SettlementRepository settlementRepository,
            SettlementDetailRepository settlementDetailRepository,
            TrainerSettlementSourceRepository trainerSettlementSourceRepository,
            CurrentUserProvider currentUserProvider,
            SettlementConflictService settlementConflictService
    ) {
        this.settlementRepository = settlementRepository;
        this.settlementDetailRepository = settlementDetailRepository;
        this.trainerSettlementSourceRepository = trainerSettlementSourceRepository;
        this.currentUserProvider = currentUserProvider;
        this.settlementConflictService = settlementConflictService;
    }

    @Transactional
    public CreateSettlementResult create(CreateSettlementCommand command) {
        YearMonth settlementMonth = resolveSettlementMonth(command.settlementMonth(), command.periodStart(), command.periodEnd());
        LocalDate periodStart = settlementMonth.atDay(1);
        LocalDate periodEnd = settlementMonth.atEndOfMonth();

        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        Long trainerUserId = parseTrainerUserId(command.trainerId());

        OffsetDateTime monthStartAt = periodStart.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime monthEndExclusiveAt = periodEnd.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        List<TrainerSettlementSourceRepository.TrainerSettlementSourceRow> sourceRows =
                trainerSettlementSourceRepository.findSettlementMetrics(centerId, monthStartAt, monthEndExclusiveAt, trainerUserId);

        if (sourceRows.isEmpty()) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "생성할 트레이너 정산 데이터가 없습니다.");
        }

        sourceRows.forEach(this::validateSettlementRateConfigured);

        settlementConflictService.ensureNoConfirmedMonthConflict(
                centerId,
                settlementMonth,
                null
        );

        Settlement settlement = settlementRepository.findActiveByCenterAndYearMonth(
                        centerId,
                        settlementMonth.getYear(),
                        settlementMonth.getMonthValue()
                )
                .orElseGet(() -> createDraftSettlement(centerId, actorUserId, settlementMonth));

        ensureDraftSettlement(settlement);

        List<SettlementDetail> existingDetails = settlementDetailRepository.findBySettlementId(settlement.settlementId());
        List<SettlementDetailRepository.CreateCommand> createCommands = buildCreateCommands(
                settlement,
                sourceRows,
                existingDetails,
                actorUserId
        );
        if (createCommands.isEmpty()) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 같은 기간의 트레이너 정산이 생성되어 있습니다.");
        }

        settlementDetailRepository.insertAll(createCommands);
        List<SettlementDetail> allDetails = settlementDetailRepository.findBySettlementId(settlement.settlementId());
        Settlement updatedSettlement = refreshSettlementTotals(settlement, allDetails, actorUserId);

        if (trainerUserId == null) {
            return toAllTrainerResult(updatedSettlement, allDetails, sourceRows, periodStart, periodEnd, settlementMonth);
        }

        List<SettlementDetail> createdDetails = allDetails.stream()
                .filter(detail -> trainerUserId.equals(detail.userId()))
                .toList();
        TrainerSettlementSourceRepository.TrainerSettlementSourceRow sourceRow = sourceRows.stream()
                .filter(row -> trainerUserId.equals(row.trainerUserId()))
                .findFirst()
                .orElseThrow();
        return toSingleTrainerResult(updatedSettlement, createdDetails, sourceRow, periodStart, periodEnd, settlementMonth);
    }

    private Settlement createDraftSettlement(
            Long centerId,
            Long actorUserId,
            YearMonth settlementMonth
    ) {
        OffsetDateTime now = OffsetDateTime.now(BUSINESS_ZONE);
        return settlementRepository.create(new SettlementRepository.CreateCommand(
                centerId,
                settlementMonth.getYear(),
                settlementMonth.getMonthValue(),
                0,
                BigDecimal.ZERO,
                SettlementStatus.DRAFT.name(),
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
            Long actorUserId
    ) {
        OffsetDateTime now = OffsetDateTime.now(BUSINESS_ZONE);
        List<SettlementDetailRepository.CreateCommand> commands = new ArrayList<>();
        for (TrainerSettlementSourceRepository.TrainerSettlementSourceRow sourceRow : sourceRows) {
            Set<String> existingLessonTypes = existingDetails.stream()
                    .filter(detail -> detail.userId().equals(sourceRow.trainerUserId()))
                    .map(SettlementDetail::lessonType)
                    .collect(java.util.stream.Collectors.toCollection(HashSet::new));

            long ptSessions = safeLong(sourceRow.ptCompletedClassCount());
            if (ptSessions > 0 && !existingLessonTypes.contains(SettlementLessonType.PT.name())) {
                BigDecimal ptAmount = sourceRow.ptSessionUnitPrice()
                        .multiply(BigDecimal.valueOf(ptSessions));
                commands.add(new SettlementDetailRepository.CreateCommand(
                        settlement.settlementId(),
                        sourceRow.trainerUserId(),
                        SettlementLessonType.PT.name(),
                        Math.toIntExact(ptSessions),
                        sourceRow.ptSessionUnitPrice(),
                        ptAmount,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        ptAmount,
                        null,
                        now,
                        actorUserId
                ));
            }

            long gxSessions = safeLong(sourceRow.gxCompletedClassCount());
            if (gxSessions > 0 && !existingLessonTypes.contains(SettlementLessonType.GX.name())) {
                BigDecimal gxAmount = sourceRow.gxSessionUnitPrice()
                        .multiply(BigDecimal.valueOf(gxSessions));
                commands.add(new SettlementDetailRepository.CreateCommand(
                        settlement.settlementId(),
                        sourceRow.trainerUserId(),
                        SettlementLessonType.GX.name(),
                        Math.toIntExact(gxSessions),
                        sourceRow.gxSessionUnitPrice(),
                        gxAmount,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        gxAmount,
                        null,
                        now,
                        actorUserId
                ));
            }
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
            List<SettlementDetail> details,
            TrainerSettlementSourceRepository.TrainerSettlementSourceRow sourceRow,
            LocalDate periodStart,
            LocalDate periodEnd,
            YearMonth settlementMonth
    ) {
        SettlementDetail ptDetail = findDetail(details, SettlementLessonType.PT.name());
        SettlementDetail gxDetail = findDetail(details, SettlementLessonType.GX.name());
        BigDecimal ptAmount = ptDetail == null ? BigDecimal.ZERO : ptDetail.amount();
        BigDecimal gxAmount = gxDetail == null ? BigDecimal.ZERO : gxDetail.amount();
        BigDecimal totalAmount = ptAmount.add(gxAmount);
        long ptSessions = safeLong(sourceRow.ptSessionCount());
        long gxSessions = safeLong(sourceRow.gxSessionCount());
        long completedSessions = safeLong(sourceRow.ptCompletedClassCount()) + safeLong(sourceRow.gxCompletedClassCount());
        long cancelledSessions = safeLong(sourceRow.cancelledClassCount());
        long noShowSessions = safeLong(sourceRow.noShowClassCount());
        return new CreateSettlementResult(
                settlement.settlementId(),
                String.valueOf(sourceRow.trainerUserId()),
                sourceRow.userName(),
                settlementMonth,
                periodStart,
                periodEnd,
                ptSessions + gxSessions,
                completedSessions,
                cancelledSessions,
                noShowSessions,
                ptSessions,
                gxSessions,
                ptDetail == null ? sourceRow.ptSessionUnitPrice() : ptDetail.unitPrice(),
                gxDetail == null ? sourceRow.gxSessionUnitPrice() : gxDetail.unitPrice(),
                ptAmount,
                gxAmount,
                BigDecimal.ZERO,
                null,
                BigDecimal.ZERO,
                null,
                totalAmount,
                settlement.status(),
                settlement.createdAt()
        );
    }

    private CreateSettlementResult toAllTrainerResult(
            Settlement settlement,
            List<SettlementDetail> details,
            List<TrainerSettlementSourceRepository.TrainerSettlementSourceRow> sourceRows,
            LocalDate periodStart,
            LocalDate periodEnd,
            YearMonth settlementMonth
    ) {
        List<SettlementDetail> ptDetails = details.stream()
                .filter(detail -> SettlementLessonType.PT.name().equals(detail.lessonType()))
                .sorted(Comparator.comparing(SettlementDetail::userId))
                .toList();
        List<SettlementDetail> gxDetails = details.stream()
                .filter(detail -> SettlementLessonType.GX.name().equals(detail.lessonType()))
                .sorted(Comparator.comparing(SettlementDetail::userId))
                .toList();
        BigDecimal ptAmount = ptDetails.stream()
                .map(SettlementDetail::netAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal gxAmount = gxDetails.stream()
                .map(SettlementDetail::netAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalAmount = ptDetails.stream()
                .map(SettlementDetail::netAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(gxAmount);
        long ptSessions = sourceRows.stream()
                .map(TrainerSettlementSourceRepository.TrainerSettlementSourceRow::ptSessionCount)
                .filter(Objects::nonNull)
                .mapToLong(Long::longValue)
                .sum();
        long gxSessions = sourceRows.stream()
                .map(TrainerSettlementSourceRepository.TrainerSettlementSourceRow::gxSessionCount)
                .filter(Objects::nonNull)
                .mapToLong(Long::longValue)
                .sum();
        long completedSessions = ptDetails.stream()
                .mapToLong(SettlementDetail::lessonCount)
                .sum()
                + gxDetails.stream()
                .mapToLong(SettlementDetail::lessonCount)
                .sum();
        long cancelledSessions = sourceRows.stream()
                .map(TrainerSettlementSourceRepository.TrainerSettlementSourceRow::cancelledClassCount)
                .filter(Objects::nonNull)
                .mapToLong(Long::longValue)
                .sum();
        long noShowSessions = sourceRows.stream()
                .map(TrainerSettlementSourceRepository.TrainerSettlementSourceRow::noShowClassCount)
                .filter(Objects::nonNull)
                .mapToLong(Long::longValue)
                .sum();
        return new CreateSettlementResult(
                settlement.settlementId(),
                TRAINER_ID_ALL,
                "전체 트레이너",
                settlementMonth,
                periodStart,
                periodEnd,
                ptSessions + gxSessions,
                completedSessions,
                cancelledSessions,
                noShowSessions,
                ptSessions,
                gxSessions,
                null,
                null,
                ptAmount,
                gxAmount,
                BigDecimal.ZERO,
                null,
                BigDecimal.ZERO,
                null,
                totalAmount,
                settlement.status(),
                settlement.createdAt()
        );
    }

    private SettlementDetail findDetail(List<SettlementDetail> details, String lessonType) {
        return details.stream()
                .filter(detail -> lessonType.equals(detail.lessonType()))
                .findFirst()
                .orElse(null);
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private void ensureDraftSettlement(Settlement settlement) {
        if (!SettlementStatus.DRAFT.name().equals(settlement.status())) {
            throw new ApiException(ErrorCode.CONFLICT, "확정된 정산에는 detail을 추가할 수 없습니다. settlementId=" + settlement.settlementId());
        }
    }

    private void validateSettlementRateConfigured(TrainerSettlementSourceRepository.TrainerSettlementSourceRow row) {
        if (safeLong(row.ptCompletedClassCount()) > 0 && row.ptSessionUnitPrice() == null) {
            throw new ApiException(
                    ErrorCode.BUSINESS_RULE,
                    "트레이너 PT 정산 단가가 설정되지 않았습니다. trainerId=" + row.trainerUserId()
            );
        }
        if (safeLong(row.gxCompletedClassCount()) > 0 && row.gxSessionUnitPrice() == null) {
            throw new ApiException(
                    ErrorCode.BUSINESS_RULE,
                    "트레이너 GX 정산 단가가 설정되지 않았습니다. trainerId=" + row.trainerUserId()
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

    private YearMonth resolveSettlementMonth(String settlementMonthValue, String periodStartValue, String periodEndValue) {
        if (settlementMonthValue != null && !settlementMonthValue.isBlank()) {
            try {
                return YearMonth.parse(settlementMonthValue);
            } catch (DateTimeParseException ex) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "settlementMonth must be YYYY-MM");
            }
        }
        if (periodStartValue == null || periodStartValue.isBlank() || periodEndValue == null || periodEndValue.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "settlementMonth is required");
        }
        LocalDate periodStart = parseDate(periodStartValue, "periodStart");
        LocalDate periodEnd = parseDate(periodEndValue, "periodEnd");
        if (periodEnd.isBefore(periodStart)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "periodEnd must be on or after periodStart");
        }
        YearMonth settlementMonth = YearMonth.from(periodStart);
        if (!periodStart.equals(settlementMonth.atDay(1)) || !periodEnd.equals(settlementMonth.atEndOfMonth())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "periodStart/periodEnd must describe a full month");
        }
        return settlementMonth;
    }

    public record CreateSettlementCommand(
            String trainerId,
            String settlementMonth,
            String periodStart,
            String periodEnd
    ) {
    }

    public record CreateSettlementResult(
            Long settlementId,
            String trainerId,
            String userName,
            YearMonth settlementMonth,
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
