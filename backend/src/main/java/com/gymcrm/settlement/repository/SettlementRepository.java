package com.gymcrm.settlement.repository;

import com.gymcrm.settlement.entity.Settlement;
import com.gymcrm.settlement.entity.SettlementEntity;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.Optional;

@Repository
public class SettlementRepository {
    private final SettlementJpaRepository settlementJpaRepository;
    private final EntityManager entityManager;

    public SettlementRepository(
            SettlementJpaRepository settlementJpaRepository,
            EntityManager entityManager
    ) {
        this.settlementJpaRepository = settlementJpaRepository;
        this.entityManager = entityManager;
    }

    public Optional<Settlement> findActiveById(Long settlementId) {
        return settlementJpaRepository.findBySettlementIdAndIsDeletedFalse(settlementId)
                .map(this::toDomain);
    }

    public Optional<Settlement> findActiveByCenterAndYearMonth(Long centerId, int year, int month) {
        return settlementJpaRepository.findByCenterIdAndSettlementYearAndSettlementMonthAndIsDeletedFalse(
                centerId,
                year,
                month
        ).map(this::toDomain);
    }

    public Optional<Settlement> findActiveByCenterAndPeriodScope(
            Long centerId,
            java.time.LocalDate periodStart,
            java.time.LocalDate periodEnd,
            String scopeType,
            Long scopeTrainerUserId
    ) {
        boolean isMonthlyAllScope = "ALL".equals(scopeType)
                && scopeTrainerUserId == null
                && periodStart.getDayOfMonth() == 1
                && periodEnd.equals(periodStart.withDayOfMonth(periodStart.lengthOfMonth()));
        if (!isMonthlyAllScope) {
            return Optional.empty();
        }
        return findActiveByCenterAndYearMonth(centerId, periodStart.getYear(), periodStart.getMonthValue());
    }

    public boolean existsOverlappingSettlement(
            Long centerId,
            String status,
            java.time.LocalDate periodStart,
            java.time.LocalDate periodEnd,
            String scopeType,
            Long scopeTrainerUserId,
            Long excludeSettlementId
    ) {
        boolean isMonthlyAllScope = "ALL".equals(scopeType)
                && scopeTrainerUserId == null
                && periodStart.getDayOfMonth() == 1
                && periodEnd.equals(periodStart.withDayOfMonth(periodStart.lengthOfMonth()));
        if (!isMonthlyAllScope) {
            return false;
        }
        Optional<SettlementEntity> existing = settlementJpaRepository.findByCenterIdAndSettlementYearAndSettlementMonthAndIsDeletedFalse(
                centerId,
                periodStart.getYear(),
                periodStart.getMonthValue()
        );
        if (existing.isEmpty()) {
            return false;
        }
        if (excludeSettlementId != null && excludeSettlementId.equals(existing.get().getSettlementId())) {
            return false;
        }
        return status.equals(existing.get().getStatus());
    }

    public Settlement create(CreateCommand command) {
        SettlementEntity entity = new SettlementEntity();
        entity.setCenterId(command.centerId());
        entity.setSettlementYear(command.settlementYear());
        entity.setSettlementMonth(command.settlementMonth());
        entity.setTotalLessonCount(command.totalLessonCount());
        entity.setTotalAmount(command.totalAmount());
        entity.setStatus(command.status());
        entity.setSettlementDate(YearMonth.of(command.settlementYear(), command.settlementMonth()).atDay(1));
        entity.setConfirmedBy(command.confirmedBy());
        entity.setConfirmedAt(command.confirmedAt());
        entity.setDeleted(false);
        entity.setCreatedAt(command.createdAt());
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(command.createdAt());
        entity.setUpdatedBy(command.actorUserId());
        SettlementEntity saved = settlementJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Settlement updateSummaryAndStatus(UpdateCommand command) {
        SettlementEntity entity = settlementJpaRepository.findBySettlementIdAndIsDeletedFalse(command.settlementId())
                .orElseThrow();
        entity.setTotalLessonCount(command.totalLessonCount());
        entity.setTotalAmount(command.totalAmount());
        entity.setStatus(command.status());
        entity.setConfirmedAt(command.confirmedAt());
        entity.setConfirmedBy(command.confirmedBy());
        entity.setUpdatedAt(command.updatedAt());
        entity.setUpdatedBy(command.updatedBy());
        SettlementEntity saved = settlementJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    private Settlement toDomain(SettlementEntity entity) {
        return new Settlement(
                entity.getSettlementId(),
                entity.getCenterId(),
                entity.getSettlementYear(),
                entity.getSettlementMonth(),
                entity.getTotalLessonCount(),
                entity.getTotalAmount(),
                entity.getStatus(),
                entity.getSettlementDate(),
                entity.getConfirmedBy(),
                entity.getConfirmedAt(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public record CreateCommand(
            Long centerId,
            int settlementYear,
            int settlementMonth,
            int totalLessonCount,
            BigDecimal totalAmount,
            String status,
            Long confirmedBy,
            OffsetDateTime confirmedAt,
            OffsetDateTime createdAt,
            Long actorUserId
    ) {
    }

    public record UpdateCommand(
            Long settlementId,
            int totalLessonCount,
            BigDecimal totalAmount,
            String status,
            Long confirmedBy,
            OffsetDateTime confirmedAt,
            OffsetDateTime updatedAt,
            Long updatedBy
    ) {
    }
}
