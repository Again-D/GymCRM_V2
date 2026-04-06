package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.settlement.entity.TrainerSettlement;
import com.gymcrm.settlement.repository.TrainerSettlementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

@Service
public class TrainerSettlementLifecycleService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final TrainerSettlementRepository trainerSettlementRepository;
    private final TrainerPayrollSettlementService trainerPayrollSettlementService;
    private final CurrentUserProvider currentUserProvider;

    public TrainerSettlementLifecycleService(
            TrainerSettlementRepository trainerSettlementRepository,
            TrainerPayrollSettlementService trainerPayrollSettlementService,
            CurrentUserProvider currentUserProvider
    ) {
        this.trainerSettlementRepository = trainerSettlementRepository;
        this.trainerPayrollSettlementService = trainerPayrollSettlementService;
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
        return trainerSettlementRepository.findConfirmedByCenterIdAndSettlementMonth(
                currentUserProvider.currentCenterId(),
                settlementMonth.atDay(1)
        );
    }
}
