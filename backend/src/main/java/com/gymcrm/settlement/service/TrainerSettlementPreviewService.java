package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.dto.request.PreviewTrainerSettlementRequest;
import com.gymcrm.settlement.repository.TrainerSettlementSourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@Service
public class TrainerSettlementPreviewService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final String TRAINER_ID_ALL = "ALL";

    private final TrainerSettlementSourceRepository trainerSettlementSourceRepository;
    private final CurrentUserProvider currentUserProvider;
    private final SettlementConflictService settlementConflictService;

    public TrainerSettlementPreviewService(
            TrainerSettlementSourceRepository trainerSettlementSourceRepository,
            CurrentUserProvider currentUserProvider,
            SettlementConflictService settlementConflictService
    ) {
        this.trainerSettlementSourceRepository = trainerSettlementSourceRepository;
        this.currentUserProvider = currentUserProvider;
        this.settlementConflictService = settlementConflictService;
    }

    @Transactional(readOnly = true)
    public PreviewResult preview(PreviewTrainerSettlementRequest request) {
        YearMonth settlementMonth = resolveSettlementMonth(request.settlementMonth(), request.periodStart(), request.periodEnd());
        LocalDate periodStart = settlementMonth.atDay(1);
        LocalDate periodEnd = settlementMonth.atEndOfMonth();

        Long trainerUserId = parseTrainerUserId(request.trainerId());
        String trainerName = trainerUserId == null ? "전체 트레이너" : resolveTrainerName(currentUserProvider.currentCenterId(), trainerUserId);

        OffsetDateTime startAt = periodStart.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime endExclusiveAt = periodEnd.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();

        List<PreviewRow> rows = trainerSettlementSourceRepository.findSettlementMetrics(
                        currentUserProvider.currentCenterId(),
                        startAt,
                        endExclusiveAt,
                        trainerUserId
                ).stream()
                .map(this::toPreviewRow)
                .toList();

        boolean hasRateWarnings = rows.stream().anyMatch(PreviewRow::hasRateWarning);
        boolean hasConflict = settlementConflictService.hasConfirmedMonthConflict(
                currentUserProvider.currentCenterId(),
                settlementMonth,
                null
        );

        long totalSessions = rows.stream().mapToLong(PreviewRow::totalSessions).sum();
        long completedSessions = rows.stream().mapToLong(PreviewRow::completedSessions).sum();
        long cancelledSessions = rows.stream().mapToLong(PreviewRow::cancelledSessions).sum();
        long noShowSessions = rows.stream().mapToLong(PreviewRow::noShowSessions).sum();
        BigDecimal totalAmount = rows.stream().anyMatch(row -> row.totalAmount() == null)
                ? null
                : rows.stream()
                .map(PreviewRow::totalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        boolean hasPayableSessions = rows.stream().anyMatch(row -> row.completedSessions() > 0);

        return new PreviewResult(
                trainerUserId == null ? TRAINER_ID_ALL : String.valueOf(trainerUserId),
                trainerName,
                periodStart,
                periodEnd,
                totalSessions,
                completedSessions,
                cancelledSessions,
                noShowSessions,
                totalAmount,
                hasRateWarnings,
                hasConflict,
                hasPayableSessions && !hasRateWarnings && !hasConflict,
                rows
        );
    }

    @Transactional(readOnly = true)
    public PreviewResult previewForCurrentTrainer(String settlementMonth, String periodStart, String periodEnd) {
        Long currentTrainerUserId = currentUserProvider.currentUserId();
        return preview(new PreviewTrainerSettlementRequest(
                String.valueOf(currentTrainerUserId),
                settlementMonth,
                periodStart,
                periodEnd
        ));
    }

    private PreviewRow toPreviewRow(TrainerSettlementSourceRepository.TrainerSettlementSourceRow row) {
        long ptSessions = safeLong(row.ptSessionCount());
        long gxSessions = safeLong(row.gxSessionCount());
        long completedSessions = safeLong(row.ptCompletedClassCount()) + safeLong(row.gxCompletedClassCount());
        long cancelledSessions = safeLong(row.cancelledClassCount());
        long noShowSessions = safeLong(row.noShowClassCount());

        boolean missingPtRate = safeLong(row.ptCompletedClassCount()) > 0 && row.ptSessionUnitPrice() == null;
        boolean missingGxRate = safeLong(row.gxCompletedClassCount()) > 0 && row.gxSessionUnitPrice() == null;
        String rateWarningMessage = buildRateWarningMessage(row.trainerUserId(), missingPtRate, missingGxRate);

        BigDecimal ptAmount = missingPtRate || row.ptSessionUnitPrice() == null
                ? (safeLong(row.ptCompletedClassCount()) > 0 ? null : BigDecimal.ZERO)
                : row.ptSessionUnitPrice().multiply(BigDecimal.valueOf(safeLong(row.ptCompletedClassCount())));
        BigDecimal gxAmount = missingGxRate || row.gxSessionUnitPrice() == null
                ? (safeLong(row.gxCompletedClassCount()) > 0 ? null : BigDecimal.ZERO)
                : row.gxSessionUnitPrice().multiply(BigDecimal.valueOf(safeLong(row.gxCompletedClassCount())));
        BigDecimal totalAmount = ptAmount == null || gxAmount == null ? null : ptAmount.add(gxAmount);

        return new PreviewRow(
                row.trainerUserId(),
                row.userName(),
                ptSessions + gxSessions,
                completedSessions,
                cancelledSessions,
                noShowSessions,
                ptSessions,
                gxSessions,
                row.ptSessionUnitPrice(),
                row.gxSessionUnitPrice(),
                ptAmount,
                gxAmount,
                totalAmount,
                missingPtRate || missingGxRate,
                rateWarningMessage
        );
    }

    private String buildRateWarningMessage(Long trainerUserId, boolean missingPtRate, boolean missingGxRate) {
        if (!missingPtRate && !missingGxRate) {
            return null;
        }
        if (missingPtRate && missingGxRate) {
            return "트레이너 정산 단가가 설정되지 않았습니다. trainerId=" + trainerUserId;
        }
        if (missingPtRate) {
            return "트레이너 PT 정산 단가가 설정되지 않았습니다. trainerId=" + trainerUserId;
        }
        return "트레이너 GX 정산 단가가 설정되지 않았습니다. trainerId=" + trainerUserId;
    }

    private String resolveTrainerName(Long centerId, Long trainerUserId) {
        Map<Long, String> names = trainerSettlementSourceRepository.findTrainerNames(centerId, List.of(trainerUserId));
        return names.getOrDefault(trainerUserId, "Unknown Trainer");
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
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

    public record PreviewResult(
            String trainerId,
            String trainerName,
            LocalDate periodStart,
            LocalDate periodEnd,
            long totalSessions,
            long completedSessions,
            long cancelledSessions,
            long noShowSessions,
            BigDecimal totalAmount,
            boolean hasRateWarnings,
            boolean hasConflict,
            boolean createAllowed,
            List<PreviewRow> rows
    ) {
    }

    public record PreviewRow(
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
    }
}
