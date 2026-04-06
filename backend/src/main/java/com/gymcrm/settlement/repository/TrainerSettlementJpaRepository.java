package com.gymcrm.settlement.repository;

import com.gymcrm.settlement.entity.TrainerSettlementEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TrainerSettlementJpaRepository extends JpaRepository<TrainerSettlementEntity, Long> {
    List<TrainerSettlementEntity> findByCenterIdAndSettlementMonthAndIsDeletedFalseOrderByTrainerNameAsc(
            Long centerId,
            LocalDate settlementMonth
    );

    boolean existsByCenterIdAndSettlementMonthAndIsDeletedFalse(Long centerId, LocalDate settlementMonth);
}
