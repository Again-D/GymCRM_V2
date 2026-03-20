package com.gymcrm.member;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class MemberRepository {
    private final MemberJpaRepository memberJpaRepository;
    private final MemberQueryRepository memberQueryRepository;
    private final EntityManager entityManager;

    public MemberRepository(
            MemberJpaRepository memberJpaRepository,
            MemberQueryRepository memberQueryRepository,
            EntityManager entityManager
    ) {
        this.memberJpaRepository = memberJpaRepository;
        this.memberQueryRepository = memberQueryRepository;
        this.entityManager = entityManager;
    }

    public Member insert(MemberCreateCommand command) {
        OffsetDateTime now = OffsetDateTime.now();
        MemberEntity entity = new MemberEntity();
        entity.setCenterId(command.centerId());
        entity.setMemberName(command.memberName());
        entity.setPhone(command.phone());
        entity.setPhoneEncrypted(command.phoneEncrypted());
        entity.setEmail(command.email());
        entity.setGender(command.gender());
        entity.setBirthDate(command.birthDate());
        entity.setBirthDateEncrypted(command.birthDateEncrypted());
        entity.setPiiKeyVersion(command.piiKeyVersion());
        entity.setMemberStatus(command.memberStatus());
        entity.setJoinDate(command.joinDate());
        entity.setConsentSms(Boolean.TRUE.equals(command.consentSms()));
        entity.setConsentMarketing(Boolean.TRUE.equals(command.consentMarketing()));
        entity.setMemo(command.memo());
        entity.setDeleted(false);
        entity.setCreatedAt(now);
        entity.setCreatedBy(command.actorUserId());
        entity.setUpdatedAt(now);
        entity.setUpdatedBy(command.actorUserId());
        MemberEntity saved = memberJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public Optional<Member> findById(Long memberId) {
        return memberJpaRepository.findByMemberIdAndIsDeletedFalse(memberId).map(this::toDomain);
    }

    public List<Member> findAll(Long centerId, String memberCodeKeyword, String nameKeyword, String phoneKeyword) {
        return memberQueryRepository.findAll(centerId, memberCodeKeyword, nameKeyword, phoneKeyword);
    }

    public List<MemberSummaryProjection> findAllSummaries(
            Long centerId,
            String keyword,
            String memberCodeKeyword,
            String nameKeyword,
            String phoneKeyword,
            String memberStatus,
            Long trainerId,
            Long productId,
            String membershipOperationalStatus,
            LocalDate dateFrom,
            LocalDate dateTo,
            LocalDate referenceDate
    ) {
        return memberQueryRepository.findAllSummaries(
                centerId,
                keyword,
                memberCodeKeyword,
                nameKeyword,
                phoneKeyword,
                memberStatus,
                trainerId,
                productId,
                membershipOperationalStatus,
                dateFrom,
                dateTo,
                referenceDate
        );
    }

    public boolean existsActiveTrainerScopedMembership(Long centerId, Long memberId, Long trainerUserId) {
        return memberQueryRepository.existsActiveTrainerScopedMembership(centerId, memberId, trainerUserId);
    }

    public Member update(MemberUpdateCommand command) {
        MemberEntity entity = memberJpaRepository.findByMemberIdAndIsDeletedFalse(command.memberId())
                .orElseThrow();
        entity.setMemberName(command.memberName());
        entity.setPhone(command.phone());
        entity.setPhoneEncrypted(command.phoneEncrypted());
        entity.setEmail(command.email());
        entity.setGender(command.gender());
        entity.setBirthDate(command.birthDate());
        entity.setBirthDateEncrypted(command.birthDateEncrypted());
        entity.setPiiKeyVersion(command.piiKeyVersion());
        entity.setMemberStatus(command.memberStatus());
        entity.setJoinDate(command.joinDate());
        entity.setConsentSms(Boolean.TRUE.equals(command.consentSms()));
        entity.setConsentMarketing(Boolean.TRUE.equals(command.consentMarketing()));
        entity.setMemo(command.memo());
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(command.actorUserId());
        MemberEntity saved = memberJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    private Member toDomain(MemberEntity entity) {
        return new Member(
                entity.getMemberId(),
                entity.getCenterId(),
                entity.getMemberCode(),
                entity.getMemberName(),
                entity.getPhone(),
                entity.getPhoneEncrypted(),
                entity.getEmail(),
                entity.getGender(),
                entity.getBirthDate(),
                entity.getBirthDateEncrypted(),
                entity.getPiiKeyVersion(),
                entity.getMemberStatus(),
                entity.getJoinDate(),
                entity.isConsentSms(),
                entity.isConsentMarketing(),
                entity.getMemo(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public record MemberCreateCommand(
            Long centerId,
            String memberName,
            String phone,
            String phoneEncrypted,
            String email,
            String gender,
            java.time.LocalDate birthDate,
            String birthDateEncrypted,
            Integer piiKeyVersion,
            String memberStatus,
            java.time.LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo,
            Long actorUserId
    ) {}

    public record MemberUpdateCommand(
            Long memberId,
            String memberName,
            String phone,
            String phoneEncrypted,
            String email,
            String gender,
            java.time.LocalDate birthDate,
            String birthDateEncrypted,
            Integer piiKeyVersion,
            String memberStatus,
            java.time.LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo,
            Long actorUserId
    ) {}

    public record MemberSummaryProjection(
            Long memberId,
            Long centerId,
            String memberCode,
            String memberName,
            String phone,
            String memberStatus,
            LocalDate joinDate,
            String membershipOperationalStatus,
            LocalDate membershipExpiryDate,
            Integer remainingPtCount
    ) {}
}
