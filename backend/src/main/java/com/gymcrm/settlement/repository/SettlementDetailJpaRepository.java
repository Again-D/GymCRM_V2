package com.gymcrm.settlement.repository;

import com.gymcrm.settlement.entity.SettlementDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SettlementDetailJpaRepository extends JpaRepository<SettlementDetailEntity, Long> {
    List<SettlementDetailEntity> findBySettlementIdOrderByUserIdAscLessonTypeAsc(Long settlementId);

    List<SettlementDetailEntity> findBySettlementIdAndUserIdOrderByLessonTypeAsc(Long settlementId, Long userId);

    Optional<SettlementDetailEntity> findBySettlementIdAndUserIdAndLessonType(
            Long settlementId,
            Long userId,
            String lessonType
    );
}
