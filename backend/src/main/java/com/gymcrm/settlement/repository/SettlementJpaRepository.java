package com.gymcrm.settlement.repository;

import com.gymcrm.settlement.entity.SettlementEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SettlementJpaRepository extends JpaRepository<SettlementEntity, Long> {
    Optional<SettlementEntity> findBySettlementIdAndIsDeletedFalse(Long settlementId);

    Optional<SettlementEntity> findByCenterIdAndSettlementYearAndSettlementMonthAndIsDeletedFalse(
            Long centerId,
            Integer settlementYear,
            Integer settlementMonth
    );

    boolean existsByCenterIdAndSettlementYearAndSettlementMonthAndStatusAndIsDeletedFalse(
            Long centerId,
            Integer settlementYear,
            Integer settlementMonth,
            String status
    );
}
