package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.entity.Settlement;
import com.gymcrm.settlement.entity.SettlementDetail;
import com.gymcrm.settlement.entity.TrainerSettlement;
import com.gymcrm.settlement.enums.SettlementLessonType;
import com.gymcrm.settlement.enums.SettlementStatus;
import com.gymcrm.settlement.repository.SettlementDetailRepository;
import com.gymcrm.settlement.repository.SettlementRepository;
import com.gymcrm.settlement.repository.TrainerSettlementRepository;
import com.gymcrm.settlement.repository.TrainerSettlementSourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TrainerSettlementDocumentService {
    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository settlementDetailRepository;
    private final TrainerSettlementRepository trainerSettlementRepository;
    private final TrainerSettlementSourceRepository trainerSettlementSourceRepository;
    private final CurrentUserProvider currentUserProvider;

    public TrainerSettlementDocumentService(
            SettlementRepository settlementRepository,
            SettlementDetailRepository settlementDetailRepository,
            TrainerSettlementRepository trainerSettlementRepository,
            TrainerSettlementSourceRepository trainerSettlementSourceRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.settlementRepository = settlementRepository;
        this.settlementDetailRepository = settlementDetailRepository;
        this.trainerSettlementRepository = trainerSettlementRepository;
        this.trainerSettlementSourceRepository = trainerSettlementSourceRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public TrainerSettlementDocument getConfirmedTrainerDocument(Long settlementId, Long trainerId) {
        Settlement settlement = requireAccessibleSettlement(settlementId);
        ensureConfirmed(settlement);

        List<SettlementDetail> details = settlementDetailRepository.findBySettlementIdAndUserId(settlementId, trainerId);
        if (details.isEmpty()) {
            throw new ApiException(
                    ErrorCode.NOT_FOUND,
                    "정산 문서 대상을 찾을 수 없습니다. settlementId=" + settlementId + ", trainerId=" + trainerId
            );
        }

        String trainerName = resolveTrainerNames(settlement.centerId(), List.of(trainerId))
                .getOrDefault(trainerId, "Unknown Trainer");
        return toDocument(settlement, trainerId, trainerName, details);
    }

    @Transactional(readOnly = true)
    public List<TrainerSettlementDocument> getMonthlyBridgeDocuments(YearMonth settlementMonth) {
        Settlement settlement = settlementRepository.findActiveByCenterAndYearMonth(
                        currentUserProvider.currentCenterId(),
                        settlementMonth.getYear(),
                        settlementMonth.getMonthValue()
                )
                .filter(item -> SettlementStatus.CONFIRMED.name().equals(item.status()))
                .orElse(null);
        if (settlement != null) {
            return getCanonicalMonthlyDocuments(settlement);
        }

        List<TrainerSettlement> legacySettlements = trainerSettlementRepository.findConfirmedByCenterIdAndSettlementMonth(
                currentUserProvider.currentCenterId(),
                settlementMonth.atDay(1)
        );
        if (legacySettlements.isEmpty()) {
            throw new ApiException(
                    ErrorCode.NOT_FOUND,
                    "확정된 트레이너 정산을 찾을 수 없습니다. settlementMonth=" + settlementMonth
            );
        }
        return legacySettlements.stream()
                .map(settlementRow -> toLegacyDocument(settlementMonth, settlementRow))
                .sorted(Comparator.comparing(TrainerSettlementDocument::trainerName)
                        .thenComparing(TrainerSettlementDocument::trainerUserId))
                .toList();
    }

    private List<TrainerSettlementDocument> getCanonicalMonthlyDocuments(Settlement settlement) {
        ensureConfirmed(settlement);

        List<SettlementDetail> allDetails = settlementDetailRepository.findBySettlementId(settlement.settlementId());
        if (allDetails.isEmpty()) {
            throw new ApiException(
                    ErrorCode.NOT_FOUND,
                    "정산 문서 상세를 찾을 수 없습니다. settlementId=" + settlement.settlementId()
            );
        }

        Map<Long, String> trainerNames = resolveTrainerNames(
                settlement.centerId(),
                allDetails.stream().map(SettlementDetail::userId).distinct().toList()
        );

        return allDetails.stream()
                .collect(Collectors.groupingBy(SettlementDetail::userId))
                .entrySet()
                .stream()
                .map(entry -> toDocument(
                        settlement,
                        entry.getKey(),
                        trainerNames.getOrDefault(entry.getKey(), "Unknown Trainer"),
                        entry.getValue()
                ))
                .sorted(Comparator.comparing(TrainerSettlementDocument::trainerName)
                        .thenComparing(TrainerSettlementDocument::trainerUserId))
                .toList();
    }

    private Settlement requireAccessibleSettlement(Long settlementId) {
        return settlementRepository.findActiveById(settlementId)
                .filter(settlement -> settlement.centerId().equals(currentUserProvider.currentCenterId()))
                .orElseThrow(() -> new ApiException(
                        ErrorCode.NOT_FOUND,
                        "정산을 찾을 수 없습니다. settlementId=" + settlementId
                ));
    }

    private void ensureConfirmed(Settlement settlement) {
        if (!SettlementStatus.CONFIRMED.name().equals(settlement.status())) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "CONFIRMED 상태의 정산만 문서 출력할 수 있습니다. settlementId=" + settlement.settlementId()
            );
        }
    }

    private Map<Long, String> resolveTrainerNames(Long centerId, List<Long> trainerUserIds) {
        return trainerSettlementSourceRepository.findTrainerNames(centerId, trainerUserIds);
    }

    private TrainerSettlementDocument toDocument(
            Settlement settlement,
            Long trainerUserId,
            String trainerName,
            List<SettlementDetail> details
    ) {
        Map<String, SettlementDetail> byLessonType = details.stream()
                .collect(Collectors.toMap(SettlementDetail::lessonType, Function.identity(), (left, right) -> left));

        DocumentLine pt = toLine(byLessonType.get(SettlementLessonType.PT.name()));
        DocumentLine gx = toLine(byLessonType.get(SettlementLessonType.GX.name()));
        BigDecimal bonusAmount = details.stream()
                .map(SettlementDetail::bonusAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal deductionAmount = details.stream()
                .map(SettlementDetail::deductionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalAmount = details.stream()
                .map(SettlementDetail::netAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new TrainerSettlementDocument(
                settlement.settlementId(),
                YearMonth.of(settlement.periodStart().getYear(), settlement.periodStart().getMonthValue()),
                settlement.periodStart(),
                settlement.periodEnd(),
                settlement.status(),
                settlement.confirmedAt(),
                settlement.confirmedBy(),
                trainerUserId,
                trainerName,
                pt,
                gx,
                bonusAmount,
                deductionAmount,
                totalAmount
        );
    }

    private TrainerSettlementDocument toLegacyDocument(YearMonth settlementMonth, TrainerSettlement settlement) {
        return new TrainerSettlementDocument(
                settlement.settlementId(),
                settlementMonth,
                settlementMonth.atDay(1),
                settlementMonth.atEndOfMonth(),
                settlement.settlementStatus(),
                settlement.confirmedAt(),
                settlement.confirmedBy(),
                settlement.trainerUserId(),
                settlement.trainerName(),
                new DocumentLine(
                        Math.toIntExact(settlement.completedClassCount()),
                        settlement.sessionUnitPrice(),
                        settlement.payrollAmount()
                ),
                new DocumentLine(0, BigDecimal.ZERO, BigDecimal.ZERO),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                settlement.payrollAmount()
        );
    }

    private DocumentLine toLine(SettlementDetail detail) {
        if (detail == null) {
            return new DocumentLine(0, BigDecimal.ZERO, BigDecimal.ZERO);
        }
        return new DocumentLine(detail.lessonCount(), detail.unitPrice(), detail.amount());
    }

    public record TrainerSettlementDocument(
            Long settlementId,
            YearMonth settlementMonth,
            java.time.LocalDate periodStart,
            java.time.LocalDate periodEnd,
            String settlementStatus,
            OffsetDateTime confirmedAt,
            Long confirmedBy,
            Long trainerUserId,
            String trainerName,
            DocumentLine pt,
            DocumentLine gx,
            BigDecimal bonusAmount,
            BigDecimal deductionAmount,
            BigDecimal totalAmount
    ) {
    }

    public record DocumentLine(
            int lessonCount,
            BigDecimal unitPrice,
            BigDecimal amount
    ) {
    }
}
