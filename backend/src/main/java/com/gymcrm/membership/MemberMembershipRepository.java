package com.gymcrm.membership;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static com.gymcrm.membership.QMemberMembershipEntity.memberMembershipEntity;

@Repository
public class MemberMembershipRepository {
    private final MemberMembershipJpaRepository memberMembershipJpaRepository;
    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    public MemberMembershipRepository(
            MemberMembershipJpaRepository memberMembershipJpaRepository,
            JPAQueryFactory queryFactory,
            EntityManager entityManager
    ) {
        this.memberMembershipJpaRepository = memberMembershipJpaRepository;
        this.queryFactory = queryFactory;
        this.entityManager = entityManager;
    }

    public MemberMembership insert(MemberMembershipCreateCommand command) {
        MemberMembershipEntity entity = new MemberMembershipEntity();
        entity.setCenterId(command.centerId());
        entity.setMemberId(command.memberId());
        entity.setProductId(command.productId());
        entity.setAssignedTrainerId(command.assignedTrainerId());
        entity.setMembershipStatus(command.membershipStatus());
        entity.setProductNameSnapshot(command.productNameSnapshot());
        entity.setProductCategorySnapshot(command.productCategorySnapshot());
        entity.setProductTypeSnapshot(command.productTypeSnapshot());
        entity.setPriceAmountSnapshot(command.priceAmountSnapshot());
        entity.setPurchasedAt(command.purchasedAt());
        entity.setStartDate(command.startDate());
        entity.setEndDate(command.endDate());
        entity.setTotalCount(command.totalCount());
        entity.setRemainingCount(command.remainingCount());
        entity.setUsedCount(command.usedCount());
        entity.setHoldDaysUsed(command.holdDaysUsed());
        entity.setHoldCountUsed(command.holdCountUsed());
        entity.setMemo(command.memo());
        entity.setDeleted(false);
        entity.setCreatedAt(command.purchasedAt());
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(command.purchasedAt());
        entity.setUpdatedBy(command.actorUserId());
        MemberMembershipEntity saved = memberMembershipJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Optional<MemberMembership> findById(Long membershipId) {
        // Phase 4 coexistence: JDBC-based writers still update this table in the same request/test flows.
        // Clear the persistence context before reads so repository callers do not observe stale entities.
        entityManager.clear();
        return memberMembershipJpaRepository.findByMembershipIdAndIsDeletedFalse(membershipId).map(this::toDomain);
    }

    public MemberMembership updateStatus(Long membershipId, String membershipStatus, Long actorUserId) {
        MemberMembershipEntity entity = memberMembershipJpaRepository.findByMembershipIdAndIsDeletedFalse(membershipId)
                .orElseThrow();
        entity.setMembershipStatus(membershipStatus);
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(actorUserId);
        MemberMembershipEntity saved = memberMembershipJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Optional<MemberMembership> updateStatusIfCurrent(
            Long membershipId,
            String expectedStatus,
            String membershipStatus,
            Long actorUserId
    ) {
        long updated = queryFactory.update(memberMembershipEntity)
                .set(memberMembershipEntity.membershipStatus, membershipStatus)
                .set(memberMembershipEntity.updatedAt, OffsetDateTime.now())
                .set(memberMembershipEntity.updatedBy, actorUserId)
                .where(
                        memberMembershipEntity.membershipId.eq(membershipId),
                        memberMembershipEntity.membershipStatus.eq(expectedStatus),
                        memberMembershipEntity.isDeleted.isFalse()
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return memberMembershipJpaRepository.findByMembershipIdAndIsDeletedFalse(membershipId).map(this::toDomain);
    }

    public MemberMembership updateAfterResume(MembershipResumeUpdateCommand command) {
        long updated = queryFactory.update(memberMembershipEntity)
                .set(memberMembershipEntity.membershipStatus, command.membershipStatus())
                .set(memberMembershipEntity.endDate, command.endDate())
                .set(memberMembershipEntity.holdDaysUsed, command.holdDaysUsed())
                .set(memberMembershipEntity.holdCountUsed, command.holdCountUsed())
                .set(memberMembershipEntity.updatedAt, OffsetDateTime.now())
                .set(memberMembershipEntity.updatedBy, command.actorUserId())
                .where(
                        memberMembershipEntity.membershipId.eq(command.membershipId()),
                        memberMembershipEntity.isDeleted.isFalse()
                )
                .execute();
        if (updated == 0) {
            throw new IllegalStateException("Membership updateAfterResume target not found: " + command.membershipId());
        }
        entityManager.clear();
        return memberMembershipJpaRepository.findByMembershipIdAndIsDeletedFalse(command.membershipId())
                .map(this::toDomain)
                .orElseThrow();
    }

    public Optional<MemberMembership> consumeOneCountIfEligible(Long membershipId, Long actorUserId) {
        long updated = queryFactory.update(memberMembershipEntity)
                .set(memberMembershipEntity.remainingCount, memberMembershipEntity.remainingCount.subtract(1))
                .set(memberMembershipEntity.usedCount, memberMembershipEntity.usedCount.add(1))
                .set(memberMembershipEntity.updatedAt, OffsetDateTime.now())
                .set(memberMembershipEntity.updatedBy, actorUserId)
                .where(
                        memberMembershipEntity.membershipId.eq(membershipId),
                        memberMembershipEntity.membershipStatus.eq("ACTIVE"),
                        memberMembershipEntity.productTypeSnapshot.eq("COUNT"),
                        memberMembershipEntity.remainingCount.isNotNull(),
                        memberMembershipEntity.remainingCount.gt(0),
                        memberMembershipEntity.isDeleted.isFalse()
                )
                .execute();
        if (updated == 0) {
            return Optional.empty();
        }
        entityManager.clear();
        return memberMembershipJpaRepository.findByMembershipIdAndIsDeletedFalse(membershipId).map(this::toDomain);
    }

    public List<MemberMembership> findVisibleByMemberId(Long centerId, Long memberId, Long trainerUserId) {
        return queryFactory
                .selectFrom(memberMembershipEntity)
                .where(
                        memberMembershipEntity.centerId.eq(centerId),
                        memberMembershipEntity.memberId.eq(memberId),
                        trainerUserId == null ? null : memberMembershipEntity.assignedTrainerId.eq(trainerUserId),
                        memberMembershipEntity.isDeleted.isFalse()
                )
                .orderBy(memberMembershipEntity.membershipId.desc())
                .fetch()
                .stream()
                .map(this::toDomain)
                .toList();
    }

    private MemberMembership toDomain(MemberMembershipEntity entity) {
        return new MemberMembership(
                entity.getMembershipId(),
                entity.getCenterId(),
                entity.getMemberId(),
                entity.getProductId(),
                entity.getAssignedTrainerId(),
                entity.getMembershipStatus(),
                entity.getProductNameSnapshot(),
                entity.getProductCategorySnapshot(),
                entity.getProductTypeSnapshot(),
                entity.getPriceAmountSnapshot(),
                entity.getPurchasedAt(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getTotalCount(),
                entity.getRemainingCount(),
                entity.getUsedCount(),
                entity.getHoldDaysUsed(),
                entity.getHoldCountUsed(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public record MemberMembershipCreateCommand(
            Long centerId,
            Long memberId,
            Long productId,
            Long assignedTrainerId,
            String membershipStatus,
            String productNameSnapshot,
            String productCategorySnapshot,
            String productTypeSnapshot,
            java.math.BigDecimal priceAmountSnapshot,
            java.time.OffsetDateTime purchasedAt,
            java.time.LocalDate startDate,
            java.time.LocalDate endDate,
            Integer totalCount,
            Integer remainingCount,
            Integer usedCount,
            Integer holdDaysUsed,
            Integer holdCountUsed,
            String memo,
            Long actorUserId
    ) {}

    public record MembershipResumeUpdateCommand(
            Long membershipId,
            String membershipStatus,
            LocalDate endDate,
            Integer holdDaysUsed,
            Integer holdCountUsed,
            Long actorUserId
    ) {}
}
