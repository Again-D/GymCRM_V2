package com.gymcrm.reservation;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class TrainerScheduleRepository {
    private final TrainerScheduleJpaRepository trainerScheduleJpaRepository;
    private final TrainerScheduleQueryRepository trainerScheduleQueryRepository;
    private final EntityManager entityManager;

    public TrainerScheduleRepository(
            TrainerScheduleJpaRepository trainerScheduleJpaRepository,
            TrainerScheduleQueryRepository trainerScheduleQueryRepository,
            EntityManager entityManager
    ) {
        this.trainerScheduleJpaRepository = trainerScheduleJpaRepository;
        this.trainerScheduleQueryRepository = trainerScheduleQueryRepository;
        this.entityManager = entityManager;
    }

    public Optional<TrainerSchedule> findById(Long scheduleId) {
        entityManager.clear();
        return trainerScheduleJpaRepository.findByScheduleIdAndIsDeletedFalse(scheduleId).map(this::toDomain);
    }

    public List<TrainerSchedule> findAll(Long centerId) {
        entityManager.clear();
        return trainerScheduleQueryRepository.findAll(centerId);
    }

    @Transactional
    public Optional<TrainerSchedule> incrementCurrentCountIfAvailable(Long scheduleId, Long actorUserId) {
        return trainerScheduleQueryRepository.incrementCurrentCountIfAvailable(scheduleId, actorUserId);
    }

    @Transactional
    public Optional<TrainerSchedule> decrementCurrentCountIfPositive(Long scheduleId, Long actorUserId) {
        return trainerScheduleQueryRepository.decrementCurrentCountIfPositive(scheduleId, actorUserId);
    }

    @Transactional
    public TrainerSchedule insert(TrainerScheduleCreateCommand command) {
        TrainerScheduleEntity entity = new TrainerScheduleEntity();
        entity.setCenterId(command.centerId());
        entity.setScheduleType(command.scheduleType());
        entity.setTrainerName(command.trainerName());
        entity.setSlotTitle(command.slotTitle());
        entity.setStartAt(command.startAt());
        entity.setEndAt(command.endAt());
        entity.setCapacity(command.capacity());
        entity.setCurrentCount(command.currentCount());
        entity.setMemo(command.memo());
        entity.setDeleted(false);
        entity.setCreatedAt(command.startAt());
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(command.startAt());
        entity.setUpdatedBy(command.actorUserId());
        TrainerScheduleEntity saved = trainerScheduleJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    private TrainerSchedule toDomain(TrainerScheduleEntity entity) {
        return new TrainerSchedule(
                entity.getScheduleId(),
                entity.getCenterId(),
                entity.getScheduleType(),
                entity.getTrainerName(),
                entity.getSlotTitle(),
                entity.getStartAt(),
                entity.getEndAt(),
                entity.getCapacity(),
                entity.getCurrentCount(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public record TrainerScheduleCreateCommand(
            Long centerId,
            String scheduleType,
            String trainerName,
            String slotTitle,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            Integer capacity,
            Integer currentCount,
            String memo,
            Long actorUserId
    ) {}
}
