package com.gymcrm.member.repository;

import com.gymcrm.member.entity.Member;
import com.gymcrm.member.entity.MemberEntity;
import com.gymcrm.member.enums.Gender;
import com.gymcrm.member.enums.MemberStatus;
import jakarta.persistence.EntityManager;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class MemberRepository {
    private final MemberJpaRepository memberJpaRepository;
    private final MemberQueryRepository memberQueryRepository;
    private final EntityManager entityManager;
    private final JPAQueryFactory queryFactory;

    public MemberRepository(
            MemberJpaRepository memberJpaRepository,
            MemberQueryRepository memberQueryRepository,
            EntityManager entityManager,
            JPAQueryFactory queryFactory
    ) {
        this.memberJpaRepository = memberJpaRepository;
        this.memberQueryRepository = memberQueryRepository;
        this.entityManager = entityManager;
        this.queryFactory = queryFactory;
    }

    public Member insert(MemberCreateCommand command) {
        OffsetDateTime now = OffsetDateTime.now();
        MemberEntity entity = new MemberEntity();
        entity.setCenterId(command.centerId());
        entity.setMemberName(command.memberName());
        entity.setPhone(command.phone());
        entity.setPhoneEncrypted(command.phoneEncrypted());
        entity.setEmail(command.email());
        entity.setGender(toStorageValue(command.gender()));
        entity.setBirthDate(command.birthDate());
        entity.setBirthDateEncrypted(command.birthDateEncrypted());
        entity.setPiiKeyVersion(command.piiKeyVersion());
        entity.setMemberStatus(command.memberStatus().value());
        entity.setJoinDate(command.joinDate());
        entity.setConsentSms(Boolean.TRUE.equals(command.consentSms()));
        entity.setConsentMarketing(Boolean.TRUE.equals(command.consentMarketing()));
        entity.setMemo(command.memo());
        entity.setEmergencyContactName(command.emergencyContactName());
        entity.setEmergencyContactPhone(command.emergencyContactPhone());
        entity.setEmergencyContactRelationship(command.emergencyContactRelationship());
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

    public List<MemberPiiRotationCandidate> findStalePiiRotationCandidates(
            int activeKeyVersion,
            OffsetDateTime updatedBefore,
            int limit
    ) {
        return memberQueryRepository.findStalePiiRotationCandidates(activeKeyVersion, updatedBefore, limit)
                .stream()
                .map(candidate -> new MemberPiiRotationCandidate(candidate.memberId(), candidate.piiKeyVersion()))
                .toList();
    }

    public Member update(MemberUpdateCommand command) {
        MemberEntity entity = memberJpaRepository.findByMemberIdAndIsDeletedFalse(command.memberId())
                .orElseThrow();
        entity.setMemberName(command.memberName());
        entity.setPhone(command.phone());
        entity.setPhoneEncrypted(command.phoneEncrypted());
        entity.setEmail(command.email());
        entity.setGender(toStorageValue(command.gender()));
        entity.setBirthDate(command.birthDate());
        entity.setBirthDateEncrypted(command.birthDateEncrypted());
        entity.setPiiKeyVersion(command.piiKeyVersion());
        entity.setMemberStatus(command.memberStatus().value());
        entity.setJoinDate(command.joinDate());
        entity.setConsentSms(Boolean.TRUE.equals(command.consentSms()));
        entity.setConsentMarketing(Boolean.TRUE.equals(command.consentMarketing()));
        entity.setMemo(command.memo());
        entity.setEmergencyContactName(command.emergencyContactName());
        entity.setEmergencyContactPhone(command.emergencyContactPhone());
        entity.setEmergencyContactRelationship(command.emergencyContactRelationship());
        entity.setUpdatedAt(OffsetDateTime.now());
        entity.setUpdatedBy(command.actorUserId());
        MemberEntity saved = memberJpaRepository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return toDomain(saved);
    }

    public boolean rotatePiiIfVersionMatches(MemberPiiRotationCommand command) {
        long updated = queryFactory.update(com.gymcrm.member.entity.QMemberEntity.memberEntity)
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.phone, command.phone())
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.phoneEncrypted, command.phoneEncrypted())
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.birthDate, command.birthDate())
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.birthDateEncrypted, command.birthDateEncrypted())
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.piiKeyVersion, command.newPiiKeyVersion())
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.updatedAt, OffsetDateTime.now())
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.updatedBy, command.actorUserId())
                .where(
                        com.gymcrm.member.entity.QMemberEntity.memberEntity.memberId.eq(command.memberId()),
                        com.gymcrm.member.entity.QMemberEntity.memberEntity.isDeleted.isFalse(),
                        command.expectedPiiKeyVersion() == null
                                ? com.gymcrm.member.entity.QMemberEntity.memberEntity.piiKeyVersion.isNull()
                                : com.gymcrm.member.entity.QMemberEntity.memberEntity.piiKeyVersion.eq(command.expectedPiiKeyVersion())
                )
                .execute();
        return updated > 0;
    }

    @Transactional
    public void withdraw(Long memberId, Long actorUserId) {
        MemberEntity entity = memberJpaRepository.findByMemberIdAndIsDeletedFalse(memberId)
                .orElseThrow();
        OffsetDateTime now = OffsetDateTime.now();
        entity.setMemberStatus(MemberStatus.WITHDRAWN.name());
        entity.setWithdrawnAt(now);
        entity.setUpdatedAt(now);
        entity.setUpdatedBy(actorUserId);
        memberJpaRepository.saveAndFlush(entity);
    }

    public List<WithdrawnMemberProjection> findWithdrawnBefore(OffsetDateTime cutoff, int limit) {
        return memberQueryRepository.findWithdrawnBefore(cutoff, limit);
    }

    @Transactional
    public void destroyPii(Long memberId, Long actorUserId) {
        OffsetDateTime now = OffsetDateTime.now();
        queryFactory.update(com.gymcrm.member.entity.QMemberEntity.memberEntity)
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.phone, "[DESTROYED]")
                .setNull(com.gymcrm.member.entity.QMemberEntity.memberEntity.phoneEncrypted)
                .setNull(com.gymcrm.member.entity.QMemberEntity.memberEntity.email)
                .setNull(com.gymcrm.member.entity.QMemberEntity.memberEntity.birthDate)
                .setNull(com.gymcrm.member.entity.QMemberEntity.memberEntity.birthDateEncrypted)
                .setNull(com.gymcrm.member.entity.QMemberEntity.memberEntity.piiKeyVersion)
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.updatedAt, now)
                .set(com.gymcrm.member.entity.QMemberEntity.memberEntity.updatedBy, actorUserId)
                .where(
                        com.gymcrm.member.entity.QMemberEntity.memberEntity.memberId.eq(memberId),
                        com.gymcrm.member.entity.QMemberEntity.memberEntity.isDeleted.isFalse()
                )
                .execute();
    }

    @Transactional
    public void delete(Long memberId, Long actorUserId) {
        MemberEntity entity = memberJpaRepository.findByMemberIdAndIsDeletedFalse(memberId)
                .orElseThrow();
        OffsetDateTime now = OffsetDateTime.now();
        entity.setDeleted(true);
        entity.setDeletedAt(now);
        entity.setDeletedBy(actorUserId);
        entity.setUpdatedAt(now);
        entity.setUpdatedBy(actorUserId);
        memberJpaRepository.saveAndFlush(entity);
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
                Gender.from(entity.getGender()),
                entity.getBirthDate(),
                entity.getBirthDateEncrypted(),
                entity.getPiiKeyVersion(),
                MemberStatus.from(entity.getMemberStatus()),
                entity.getJoinDate(),
                entity.isConsentSms(),
                entity.isConsentMarketing(),
                entity.getMemo(),
                entity.getEmergencyContactName(),
                entity.getEmergencyContactPhone(),
                entity.getEmergencyContactRelationship(),
                entity.getWithdrawnAt(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    private String toStorageValue(Enum<?> value) {
        return value == null ? null : value.name();
    }

    public record MemberCreateCommand(
            Long centerId,
            String memberName,
            String phone,
            String phoneEncrypted,
            String email,
            Gender gender,
            java.time.LocalDate birthDate,
            String birthDateEncrypted,
            Integer piiKeyVersion,
            MemberStatus memberStatus,
            java.time.LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo,
            String emergencyContactName,
            String emergencyContactPhone,
            String emergencyContactRelationship,
            Long actorUserId
    ) {}

    public record MemberUpdateCommand(
            Long memberId,
            String memberName,
            String phone,
            String phoneEncrypted,
            String email,
            Gender gender,
            java.time.LocalDate birthDate,
            String birthDateEncrypted,
            Integer piiKeyVersion,
            MemberStatus memberStatus,
            java.time.LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo,
            String emergencyContactName,
            String emergencyContactPhone,
            String emergencyContactRelationship,
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

    public record MemberPiiRotationCommand(
            Long memberId,
            String phone,
            String phoneEncrypted,
            LocalDate birthDate,
            String birthDateEncrypted,
            Integer newPiiKeyVersion,
            Integer expectedPiiKeyVersion,
            Long actorUserId
    ) {}

    public record MemberPiiRotationCandidate(
            Long memberId,
            Integer piiKeyVersion
    ) {}

    public record WithdrawnMemberProjection(
            Long memberId,
            OffsetDateTime withdrawnAt
    ) {}
}
