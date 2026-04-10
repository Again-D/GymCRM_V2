package com.gymcrm.settlement.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.settlement.enums.SettlementStatus;
import com.gymcrm.settlement.repository.SettlementRepository;
import org.springframework.stereotype.Service;

import java.time.YearMonth;

@Service
public class SettlementConflictService {
    private final SettlementRepository settlementRepository;

    public SettlementConflictService(SettlementRepository settlementRepository) {
        this.settlementRepository = settlementRepository;
    }

    public void ensureNoConfirmedMonthConflict(
            Long centerId,
            YearMonth settlementMonth,
            Long excludeSettlementId
    ) {
        boolean hasConflict = settlementRepository.existsOverlappingSettlement(
                centerId,
                SettlementStatus.CONFIRMED.name(),
                settlementMonth.atDay(1),
                settlementMonth.atEndOfMonth(),
                "ALL",
                null,
                excludeSettlementId
        );
        if (!hasConflict) {
            return;
        }
        throw new ApiException(
                ErrorCode.CONFLICT,
                "확정된 정산 기간과 겹치는 정산은 생성하거나 확정할 수 없습니다."
        );
    }

    public boolean hasConfirmedMonthConflict(
            Long centerId,
            YearMonth settlementMonth,
            Long excludeSettlementId
    ) {
        return settlementRepository.existsOverlappingSettlement(
                centerId,
                SettlementStatus.CONFIRMED.name(),
                settlementMonth.atDay(1),
                settlementMonth.atEndOfMonth(),
                "ALL",
                null,
                excludeSettlementId
        );
    }
}
