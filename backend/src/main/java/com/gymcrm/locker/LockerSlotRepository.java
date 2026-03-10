package com.gymcrm.locker;

import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class LockerSlotRepository {
    private final LockerSlotJpaRepository lockerSlotJpaRepository;
    private final LockerSlotQueryRepository lockerSlotQueryRepository;

    public LockerSlotRepository(
            LockerSlotJpaRepository lockerSlotJpaRepository,
            LockerSlotQueryRepository lockerSlotQueryRepository
    ) {
        this.lockerSlotJpaRepository = lockerSlotJpaRepository;
        this.lockerSlotQueryRepository = lockerSlotQueryRepository;
    }

    public LockerSlot insert(InsertCommand command) {
        OffsetDateTime now = OffsetDateTime.now();
        LockerSlotEntity entity = new LockerSlotEntity();
        entity.setCenterId(command.centerId());
        entity.setLockerCode(command.lockerCode());
        entity.setLockerZone(command.lockerZone());
        entity.setLockerGrade(command.lockerGrade());
        entity.setLockerStatus(command.lockerStatus());
        entity.setMemo(command.memo());
        entity.setDeleted(false);
        entity.setCreatedAt(now);
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(now);
        entity.setUpdatedBy(command.actorUserId());
        return toDomain(lockerSlotJpaRepository.saveAndFlush(entity));
    }

    public Optional<LockerSlot> findById(Long lockerSlotId, Long centerId) {
        return lockerSlotJpaRepository.findByLockerSlotIdAndCenterIdAndIsDeletedFalse(lockerSlotId, centerId)
                .map(this::toDomain);
    }

    public List<LockerSlot> findAll(Long centerId, String lockerStatus, String lockerZone) {
        return lockerSlotQueryRepository.findAll(centerId, lockerStatus, lockerZone);
    }

    public Optional<LockerSlot> markAssignedIfAvailable(UpdateStatusCommand command) {
        return lockerSlotQueryRepository.markAssignedIfAvailable(command);
    }

    public Optional<LockerSlot> markAvailableIfAssigned(UpdateStatusCommand command) {
        return lockerSlotQueryRepository.markAvailableIfAssigned(command);
    }

    private LockerSlot toDomain(LockerSlotEntity entity) {
        return new LockerSlot(
                entity.getLockerSlotId(),
                entity.getCenterId(),
                entity.getLockerCode(),
                entity.getLockerZone(),
                entity.getLockerGrade(),
                entity.getLockerStatus(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public record InsertCommand(
            Long centerId,
            String lockerCode,
            String lockerZone,
            String lockerGrade,
            String lockerStatus,
            String memo,
            Long actorUserId
    ) {
    }

    public record UpdateStatusCommand(
            Long lockerSlotId,
            Long centerId,
            Long actorUserId,
            OffsetDateTime now
    ) {
    }
}
