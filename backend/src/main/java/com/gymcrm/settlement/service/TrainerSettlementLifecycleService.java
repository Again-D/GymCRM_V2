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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.YearMonth;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class TrainerSettlementLifecycleService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final TrainerPayrollSettlementService trainerPayrollSettlementService;
    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository settlementDetailRepository;
    private final CurrentUserProvider currentUserProvider;
    private final SettlementConflictService settlementConflictService;

    public TrainerSettlementLifecycleService(
            TrainerPayrollSettlementService trainerPayrollSettlementService,
            SettlementRepository settlementRepository,
            SettlementDetailRepository settlementDetailRepository,
            CurrentUserProvider currentUserProvider,
            SettlementConflictService settlementConflictService
    ) {
        this.trainerPayrollSettlementService = trainerPayrollSettlementService;
        this.settlementRepository = settlementRepository;
        this.settlementDetailRepository = settlementDetailRepository;
        this.currentUserProvider = currentUserProvider;
        this.settlementConflictService = settlementConflictService;
    }

    @Transactional
    public TrainerPayrollSettlementService.MonthlyPayrollResult confirmMonthlySettlement(
            TrainerPayrollSettlementService.MonthlyPayrollQuery query
    ) {
        TrainerPayrollSettlementService.MonthlyPayrollResult preview = trainerPayrollSettlementService.calculateMonthlyPayroll(query);
        if (preview.rows().isEmpty()) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "확정할 트레이너 정산 데이터가 없습니다.");
        }

        Long centerId = currentUserProvider.currentCenterId();
        Settlement existing = settlementRepository.findActiveByCenterAndYearMonth(
                centerId,
                preview.settlementMonth().getYear(),
                preview.settlementMonth().getMonthValue()
        ).orElse(null);
        if (existing != null && SettlementStatus.CONFIRMED.name().equals(existing.status())) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 확정된 월 정산이 존재합니다. settlementMonth=" + preview.settlementMonth());
        }
        settlementConflictService.ensureNoConfirmedMonthConflict(centerId, preview.settlementMonth(), existing == null ? null : existing.settlementId());

        OffsetDateTime confirmedAt = OffsetDateTime.now(BUSINESS_ZONE);
        Long actorUserId = currentUserProvider.currentUserId();
        Settlement targetSettlement = existing;
        if (targetSettlement == null) {
            targetSettlement = settlementRepository.create(new SettlementRepository.CreateCommand(
                    centerId,
                    preview.settlementMonth().getYear(),
                    preview.settlementMonth().getMonthValue(),
                    0,
                    BigDecimal.ZERO,
                    SettlementStatus.DRAFT.name(),
                    null,
                    null,
                    confirmedAt,
                    actorUserId
            ));
        } else if (!SettlementStatus.DRAFT.name().equals(targetSettlement.status())) {
            throw new ApiException(ErrorCode.CONFLICT, "DRAFT 상태의 정산만 확정할 수 있습니다. settlementMonth=" + preview.settlementMonth());
        }

        List<SettlementDetail> existingDetails = settlementDetailRepository.findBySettlementId(targetSettlement.settlementId());
        boolean hasExistingDetails = !existingDetails.isEmpty();
        if (hasExistingDetails) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 생성된 월 정산 상세가 존재합니다. settlementMonth=" + preview.settlementMonth());
        }

        Long targetSettlementId = targetSettlement.settlementId();
        settlementDetailRepository.insertAll(
                preview.rows().stream()
                        .map(row -> new SettlementDetailRepository.CreateCommand(
                                targetSettlementId,
                                row.trainerUserId(),
                                SettlementLessonType.PT.name(),
                                Math.toIntExact(row.completedClassCount()),
                                row.sessionUnitPrice(),
                                row.payrollAmount(),
                                BigDecimal.ZERO,
                                BigDecimal.ZERO,
                                row.payrollAmount(),
                                null,
                                confirmedAt,
                                actorUserId
                        ))
                        .toList()
        );

        settlementRepository.updateSummaryAndStatus(new SettlementRepository.UpdateCommand(
                targetSettlementId,
                Math.toIntExact(preview.totalCompletedClassCount()),
                preview.totalPayrollAmount(),
                SettlementStatus.CONFIRMED.name(),
                actorUserId,
                confirmedAt,
                confirmedAt,
                actorUserId
        ));

        return trainerPayrollSettlementService.getMonthlyPayroll(query);
    }

    @Transactional
    public ConfirmSettlementResult confirmSettlement(Long settlementId) {
        Settlement settlement = settlementRepository.findActiveById(settlementId)
                .filter(item -> item.centerId().equals(currentUserProvider.currentCenterId()))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "정산을 찾을 수 없습니다. settlementId=" + settlementId));
        if (!SettlementStatus.DRAFT.name().equals(settlement.status())) {
            throw new ApiException(ErrorCode.CONFLICT, "DRAFT 상태의 정산만 확정할 수 있습니다. settlementId=" + settlementId);
        }

        List<SettlementDetail> details = settlementDetailRepository.findBySettlementId(settlementId);
        if (details.isEmpty()) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "확정할 정산 상세가 없습니다. settlementId=" + settlementId);
        }

        settlementConflictService.ensureNoConfirmedMonthConflict(
                settlement.centerId(),
                YearMonth.from(settlement.periodStart()),
                settlement.settlementId()
        );

        OffsetDateTime confirmedAt = OffsetDateTime.now(BUSINESS_ZONE);
        Long actorUserId = currentUserProvider.currentUserId();

                settlementRepository.updateSummaryAndStatus(new SettlementRepository.UpdateCommand(
                settlement.settlementId(),
                settlement.totalLessonCount(),
                settlement.totalAmount(),
                SettlementStatus.CONFIRMED.name(),
                actorUserId,
                confirmedAt,
                confirmedAt,
                actorUserId
        ));

        return new ConfirmSettlementResult(settlementId, SettlementStatus.CONFIRMED.name(), confirmedAt);
    }

    public record ConfirmSettlementResult(
            Long settlementId,
            String status,
            OffsetDateTime confirmedAt
    ) {
    }
}
