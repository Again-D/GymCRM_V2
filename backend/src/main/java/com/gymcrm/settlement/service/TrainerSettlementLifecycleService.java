package com.gymcrm.settlement.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
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
import com.gymcrm.settlement.repository.TrainerSettlementSourceRepository;
import com.gymcrm.settlement.repository.TrainerSettlementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@Service
public class TrainerSettlementLifecycleService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final String ROLE_TRAINER = "ROLE_TRAINER";

    private final TrainerSettlementRepository trainerSettlementRepository;
    private final TrainerPayrollSettlementService trainerPayrollSettlementService;
    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository settlementDetailRepository;
    private final TrainerSettlementSourceRepository trainerSettlementSourceRepository;
    private final AuthUserRepository authUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public TrainerSettlementLifecycleService(
            TrainerSettlementRepository trainerSettlementRepository,
            TrainerPayrollSettlementService trainerPayrollSettlementService,
            SettlementRepository settlementRepository,
            SettlementDetailRepository settlementDetailRepository,
            TrainerSettlementSourceRepository trainerSettlementSourceRepository,
            AuthUserRepository authUserRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.trainerSettlementRepository = trainerSettlementRepository;
        this.trainerPayrollSettlementService = trainerPayrollSettlementService;
        this.settlementRepository = settlementRepository;
        this.settlementDetailRepository = settlementDetailRepository;
        this.trainerSettlementSourceRepository = trainerSettlementSourceRepository;
        this.authUserRepository = authUserRepository;
        this.currentUserProvider = currentUserProvider;
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
        if (trainerSettlementRepository.existsConfirmedByCenterIdAndSettlementMonth(centerId, preview.settlementMonth().atDay(1))) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 확정된 월 정산이 존재합니다. settlementMonth=" + preview.settlementMonth());
        }

        OffsetDateTime confirmedAt = OffsetDateTime.now(BUSINESS_ZONE);
        Long actorUserId = currentUserProvider.currentUserId();

        trainerSettlementRepository.insertAll(
                preview.rows().stream()
                        .map(row -> new TrainerSettlementRepository.TrainerSettlementCreateCommand(
                                centerId,
                                preview.settlementMonth().atDay(1),
                                row.trainerUserId(),
                                row.trainerName(),
                                row.completedClassCount(),
                                row.sessionUnitPrice(),
                                row.payrollAmount(),
                                "CONFIRMED",
                                confirmedAt,
                                actorUserId,
                                confirmedAt,
                                actorUserId
                        ))
                        .toList()
        );

        return trainerPayrollSettlementService.getMonthlyPayroll(query);
    }

    @Transactional(readOnly = true)
    public List<TrainerSettlement> getConfirmedSettlements(YearMonth settlementMonth) {
        List<TrainerSettlement> settlements = trainerSettlementRepository.findConfirmedByCenterIdAndSettlementMonth(
                currentUserProvider.currentCenterId(),
                settlementMonth.atDay(1)
        );
        AuthUser actor = currentActorOrNull();
        if (actor == null || !ROLE_TRAINER.equals(actor.roleCode())) {
            return settlements;
        }
        return settlements.stream()
                .filter(settlement -> actor.userId().equals(settlement.trainerUserId()))
                .toList();
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

        if (trainerSettlementRepository.existsConfirmedByCenterIdAndSettlementMonth(
                settlement.centerId(),
                settlement.settlementDate()
        )) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 확정된 월 정산 스냅샷이 존재합니다. settlementMonth=" + settlement.settlementDate());
        }

        OffsetDateTime confirmedAt = OffsetDateTime.now(BUSINESS_ZONE);
        Long actorUserId = currentUserProvider.currentUserId();
        Map<Long, String> trainerNames = trainerSettlementSourceRepository.findTrainerNames(
                settlement.centerId(),
                details.stream().map(SettlementDetail::userId).toList()
        );

        trainerSettlementRepository.insertAll(
                details.stream()
                        .filter(detail -> SettlementLessonType.PT.name().equals(detail.lessonType()))
                        .map(detail -> new TrainerSettlementRepository.TrainerSettlementCreateCommand(
                                settlement.centerId(),
                                settlement.settlementDate(),
                                detail.userId(),
                                trainerNames.getOrDefault(detail.userId(), "Unknown Trainer"),
                                (long) detail.lessonCount(),
                                detail.unitPrice(),
                                detail.netAmount(),
                                SettlementStatus.CONFIRMED.name(),
                                confirmedAt,
                                actorUserId,
                                confirmedAt,
                                actorUserId
                        ))
                        .toList()
        );

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

    private AuthUser currentActorOrNull() {
        try {
            return authUserRepository.findActiveById(currentUserProvider.currentUserId())
                    .filter(AuthUser::isActive)
                    .orElse(null);
        } catch (IllegalStateException ex) {
            return null;
        }
    }

    public record ConfirmSettlementResult(
            Long settlementId,
            String status,
            OffsetDateTime confirmedAt
    ) {
    }
}
