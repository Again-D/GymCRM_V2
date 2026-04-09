package com.gymcrm.settlement.repository;

import com.gymcrm.settlement.entity.SettlementDetail;
import com.gymcrm.settlement.entity.SettlementDetailEntity;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class SettlementDetailRepository {
    private final SettlementDetailJpaRepository settlementDetailJpaRepository;
    private final EntityManager entityManager;

    public SettlementDetailRepository(
            SettlementDetailJpaRepository settlementDetailJpaRepository,
            EntityManager entityManager
    ) {
        this.settlementDetailJpaRepository = settlementDetailJpaRepository;
        this.entityManager = entityManager;
    }

    public List<SettlementDetail> findBySettlementId(Long settlementId) {
        return settlementDetailJpaRepository.findBySettlementIdOrderByUserIdAscLessonTypeAsc(settlementId)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    public List<SettlementDetail> findBySettlementIdAndUserId(Long settlementId, Long userId) {
        return settlementDetailJpaRepository.findBySettlementIdAndUserIdOrderByLessonTypeAsc(settlementId, userId)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    public Optional<SettlementDetail> findBySettlementIdAndUserIdAndLessonType(Long settlementId, Long userId, String lessonType) {
        return settlementDetailJpaRepository.findBySettlementIdAndUserIdAndLessonType(settlementId, userId, lessonType)
                .map(this::toDomain);
    }

    public List<SettlementDetail> insertAll(List<CreateCommand> commands) {
        List<SettlementDetailEntity> saved = settlementDetailJpaRepository.saveAllAndFlush(
                commands.stream().map(this::toEntity).toList()
        );
        saved.forEach(entityManager::refresh);
        return saved.stream().map(this::toDomain).toList();
    }

    private SettlementDetailEntity toEntity(CreateCommand command) {
        SettlementDetailEntity entity = new SettlementDetailEntity();
        entity.setSettlementId(command.settlementId());
        entity.setUserId(command.userId());
        entity.setLessonType(command.lessonType());
        entity.setLessonCount(command.lessonCount());
        entity.setUnitPrice(command.unitPrice());
        entity.setAmount(command.amount());
        entity.setBonusAmount(command.bonusAmount());
        entity.setDeductionAmount(command.deductionAmount());
        entity.setNetAmount(command.netAmount());
        entity.setMemo(command.memo());
        entity.setCreatedAt(command.createdAt());
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(command.createdAt());
        entity.setUpdatedBy(command.actorUserId());
        return entity;
    }

    private SettlementDetail toDomain(SettlementDetailEntity entity) {
        return new SettlementDetail(
                entity.getSettlementDetailId(),
                entity.getSettlementId(),
                entity.getUserId(),
                entity.getLessonType(),
                entity.getLessonCount(),
                entity.getUnitPrice(),
                entity.getAmount(),
                entity.getBonusAmount(),
                entity.getDeductionAmount(),
                entity.getNetAmount(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public record CreateCommand(
            Long settlementId,
            Long userId,
            String lessonType,
            int lessonCount,
            java.math.BigDecimal unitPrice,
            java.math.BigDecimal amount,
            java.math.BigDecimal bonusAmount,
            java.math.BigDecimal deductionAmount,
            java.math.BigDecimal netAmount,
            String memo,
            java.time.OffsetDateTime createdAt,
            Long actorUserId
    ) {
    }
}
