package com.gymcrm.settlement.repository;

import com.gymcrm.settlement.entity.TrainerSettlement;
import com.gymcrm.settlement.entity.TrainerSettlementEntity;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class TrainerSettlementRepository {
    private final TrainerSettlementJpaRepository trainerSettlementJpaRepository;
    private final EntityManager entityManager;

    public TrainerSettlementRepository(
            TrainerSettlementJpaRepository trainerSettlementJpaRepository,
            EntityManager entityManager
    ) {
        this.trainerSettlementJpaRepository = trainerSettlementJpaRepository;
        this.entityManager = entityManager;
    }

    public List<TrainerSettlement> findConfirmedByCenterIdAndSettlementMonth(Long centerId, LocalDate settlementMonth) {
        return trainerSettlementJpaRepository
                .findByCenterIdAndSettlementMonthAndIsDeletedFalseOrderByTrainerNameAsc(centerId, settlementMonth)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    public boolean existsConfirmedByCenterIdAndSettlementMonth(Long centerId, LocalDate settlementMonth) {
        return trainerSettlementJpaRepository.existsByCenterIdAndSettlementMonthAndIsDeletedFalse(centerId, settlementMonth);
    }

    public List<TrainerSettlement> insertAll(List<TrainerSettlementCreateCommand> commands) {
        List<TrainerSettlementEntity> saved = trainerSettlementJpaRepository.saveAllAndFlush(
                commands.stream().map(this::toEntity).toList()
        );
        saved.forEach(entityManager::refresh);
        return saved.stream().map(this::toDomain).toList();
    }

    private TrainerSettlementEntity toEntity(TrainerSettlementCreateCommand command) {
        TrainerSettlementEntity entity = new TrainerSettlementEntity();
        entity.setCenterId(command.centerId());
        entity.setSettlementMonth(command.settlementMonth());
        entity.setTrainerUserId(command.trainerUserId());
        entity.setTrainerName(command.trainerName());
        entity.setCompletedClassCount(command.completedClassCount());
        entity.setSessionUnitPrice(command.sessionUnitPrice());
        entity.setPayrollAmount(command.payrollAmount());
        entity.setSettlementStatus(command.settlementStatus());
        entity.setConfirmedAt(command.confirmedAt());
        entity.setConfirmedBy(command.confirmedBy());
        entity.setDeleted(false);
        entity.setCreatedAt(command.createdAt());
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(command.createdAt());
        entity.setUpdatedBy(command.actorUserId());
        return entity;
    }

    private TrainerSettlement toDomain(TrainerSettlementEntity entity) {
        return new TrainerSettlement(
                entity.getSettlementId(),
                entity.getCenterId(),
                entity.getSettlementMonth(),
                entity.getTrainerUserId(),
                entity.getTrainerName(),
                entity.getCompletedClassCount(),
                entity.getSessionUnitPrice(),
                entity.getPayrollAmount(),
                entity.getSettlementStatus(),
                entity.getConfirmedAt(),
                entity.getConfirmedBy(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public record TrainerSettlementCreateCommand(
            Long centerId,
            LocalDate settlementMonth,
            Long trainerUserId,
            String trainerName,
            Long completedClassCount,
            java.math.BigDecimal sessionUnitPrice,
            java.math.BigDecimal payrollAmount,
            String settlementStatus,
            OffsetDateTime confirmedAt,
            Long confirmedBy,
            OffsetDateTime createdAt,
            Long actorUserId
    ) {
    }
}
