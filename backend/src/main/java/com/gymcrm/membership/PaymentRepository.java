package com.gymcrm.membership;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class PaymentRepository {
    private final PaymentJpaRepository paymentJpaRepository;
    private final EntityManager entityManager;

    public PaymentRepository(PaymentJpaRepository paymentJpaRepository, EntityManager entityManager) {
        this.paymentJpaRepository = paymentJpaRepository;
        this.entityManager = entityManager;
    }

    public Payment insert(PaymentCreateCommand command) {
        PaymentEntity entity = new PaymentEntity();
        entity.setCenterId(command.centerId());
        entity.setMemberId(command.memberId());
        entity.setMembershipId(command.membershipId());
        entity.setPaymentType(command.paymentType());
        entity.setPaymentStatus(command.paymentStatus());
        entity.setPaymentMethod(command.paymentMethod());
        entity.setAmount(command.amount());
        entity.setPaidAt(command.paidAt());
        entity.setApprovalRef(command.approvalRef());
        entity.setMemo(command.memo());
        entity.setDeleted(false);
        entity.setCreatedAt(command.paidAt());
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(command.paidAt());
        entity.setUpdatedBy(command.actorUserId());
        PaymentEntity saved = paymentJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Optional<Payment> findLatestCompletedPurchaseByMembershipId(Long membershipId) {
        return paymentJpaRepository.findFirstByMembershipIdAndPaymentTypeAndPaymentStatusAndIsDeletedFalseOrderByPaymentIdDesc(
                membershipId,
                "PURCHASE",
                "COMPLETED"
        ).map(this::toDomain);
    }

    private Payment toDomain(PaymentEntity entity) {
        return new Payment(
                entity.getPaymentId(),
                entity.getCenterId(),
                entity.getMemberId(),
                entity.getMembershipId(),
                entity.getPaymentType(),
                entity.getPaymentStatus(),
                entity.getPaymentMethod(),
                entity.getAmount(),
                entity.getPaidAt(),
                entity.getApprovalRef(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public record PaymentCreateCommand(
            Long centerId,
            Long memberId,
            Long membershipId,
            String paymentType,
            String paymentStatus,
            String paymentMethod,
            java.math.BigDecimal amount,
            java.time.OffsetDateTime paidAt,
            String approvalRef,
            String memo,
            Long actorUserId
    ) {}
}
