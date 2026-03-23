package com.gymcrm.member.repository;

import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.Gender;
import com.gymcrm.member.enums.MemberStatus;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.gymcrm.member.entity.QMemberEntity.memberEntity;
import static com.gymcrm.membership.QMemberMembershipEntity.memberMembershipEntity;

@Repository
public class MemberQueryRepository {
    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    public MemberQueryRepository(JPAQueryFactory queryFactory, EntityManager entityManager) {
        this.queryFactory = queryFactory;
        this.entityManager = entityManager;
    }

    public List<Member> findAll(Long centerId, String memberCodeKeyword, String nameKeyword, String phoneKeyword) {
        return queryFactory
                .select(Projections.constructor(
                        MemberRow.class,
                        memberEntity.memberId,
                        memberEntity.centerId,
                        memberEntity.memberCode,
                        memberEntity.memberName,
                        memberEntity.phone,
                        memberEntity.phoneEncrypted,
                        memberEntity.email,
                        memberEntity.gender,
                        memberEntity.birthDate,
                        memberEntity.birthDateEncrypted,
                        memberEntity.piiKeyVersion,
                        memberEntity.memberStatus,
                        memberEntity.joinDate,
                        memberEntity.consentSms,
                        memberEntity.consentMarketing,
                        memberEntity.memo,
                        memberEntity.createdAt,
                        memberEntity.createdBy,
                        memberEntity.updatedAt,
                        memberEntity.updatedBy
                ))
                .from(memberEntity)
                .where(
                        memberEntity.centerId.eq(centerId),
                        memberEntity.isDeleted.isFalse(),
                        containsIgnoreCase(memberEntity.memberCode, memberCodeKeyword),
                        containsIgnoreCase(memberEntity.memberName, nameKeyword),
                        containsIgnoreCase(memberEntity.phone, phoneKeyword)
                )
                .orderBy(memberEntity.memberId.desc())
                .limit(100)
                .fetch()
                .stream()
                .map(row -> new Member(
                        row.memberId(),
                        row.centerId(),
                        row.memberCode(),
                        row.memberName(),
                        row.phone(),
                        row.phoneEncrypted(),
                        row.email(),
                        Gender.from(row.gender()),
                        row.birthDate(),
                        row.birthDateEncrypted(),
                        row.piiKeyVersion(),
                        MemberStatus.from(row.memberStatus()),
                        row.joinDate(),
                        row.consentSms(),
                        row.consentMarketing(),
                        row.memo(),
                        row.createdAt(),
                        row.createdBy(),
                        row.updatedAt(),
                        row.updatedBy()
                ))
                .toList();
    }

    public List<MemberRepository.MemberSummaryProjection> findAllSummaries(
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
        LocalDate expiringThresholdDate = referenceDate.plusDays(7);
        boolean hasMembershipInclusionFilters = trainerId != null
                || productId != null
                || dateFrom != null
                || dateTo != null;
        boolean hasMembershipFilters = hasMembershipInclusionFilters || hasText(membershipOperationalStatus);
        JPAQuery<BaseMemberRow> baseMembersQuery = queryFactory
                .select(Projections.constructor(
                        BaseMemberRow.class,
                        memberEntity.memberId,
                        memberEntity.centerId,
                        memberEntity.memberCode,
                        memberEntity.memberName,
                        memberEntity.phone,
                        memberEntity.memberStatus,
                        memberEntity.joinDate
                ))
                .from(memberEntity)
                .where(
                        memberEntity.centerId.eq(centerId),
                        memberEntity.isDeleted.isFalse(),
                        containsSummaryKeyword(keyword),
                        containsIgnoreCase(memberEntity.memberCode, memberCodeKeyword),
                        containsIgnoreCase(memberEntity.memberName, nameKeyword),
                        containsIgnoreCase(memberEntity.phone, phoneKeyword),
                        equalsIgnoreCase(memberEntity.memberStatus, memberStatus)
                )
                .orderBy(memberEntity.memberId.desc());
        if (!hasMembershipFilters) {
            baseMembersQuery.limit(100);
        }
        List<BaseMemberRow> baseMembers = baseMembersQuery.fetch();

        if (baseMembers.isEmpty()) {
            return List.of();
        }

        List<Long> memberIds = baseMembers.stream().map(BaseMemberRow::memberId).toList();
        List<MembershipSummaryRow> visibleMemberships = queryFactory
                .select(Projections.constructor(
                        MembershipSummaryRow.class,
                        memberMembershipEntity.memberId,
                        memberMembershipEntity.membershipId,
                        memberMembershipEntity.membershipStatus,
                        memberMembershipEntity.endDate,
                        memberMembershipEntity.remainingCount,
                        memberMembershipEntity.productCategorySnapshot,
                        memberMembershipEntity.productTypeSnapshot
                ))
                .from(memberMembershipEntity)
                .where(
                        memberMembershipEntity.centerId.eq(centerId),
                        memberMembershipEntity.memberId.in(memberIds),
                        memberMembershipEntity.isDeleted.isFalse(),
                        memberMembershipEntity.membershipStatus.in("ACTIVE", "HOLDING"),
                        trainerId == null ? null : memberMembershipEntity.assignedTrainerId.eq(trainerId)
                )
                .fetch();

        List<MembershipSummaryRow> filteredMemberships = queryFactory
                .select(Projections.constructor(
                        MembershipSummaryRow.class,
                        memberMembershipEntity.memberId,
                        memberMembershipEntity.membershipId,
                        memberMembershipEntity.membershipStatus,
                        memberMembershipEntity.endDate,
                        memberMembershipEntity.remainingCount,
                        memberMembershipEntity.productCategorySnapshot,
                        memberMembershipEntity.productTypeSnapshot
                ))
                .from(memberMembershipEntity)
                .where(
                        memberMembershipEntity.centerId.eq(centerId),
                        memberMembershipEntity.memberId.in(memberIds),
                        memberMembershipEntity.isDeleted.isFalse(),
                        memberMembershipEntity.membershipStatus.in("ACTIVE", "HOLDING"),
                        trainerId == null ? null : memberMembershipEntity.assignedTrainerId.eq(trainerId),
                        productId == null ? null : memberMembershipEntity.productId.eq(productId),
                        dateFrom == null ? null : memberMembershipEntity.endDate.isNull().or(memberMembershipEntity.endDate.goe(dateFrom)),
                        dateTo == null ? null : memberMembershipEntity.startDate.loe(dateTo)
                )
                .fetch();

        Map<Long, List<MembershipSummaryRow>> visibleMembershipsByMemberId = visibleMemberships.stream()
                .collect(Collectors.groupingBy(MembershipSummaryRow::memberId));
        Map<Long, List<MembershipSummaryRow>> filteredMembershipsByMemberId = filteredMemberships.stream()
                .collect(Collectors.groupingBy(MembershipSummaryRow::memberId));

        List<MemberRepository.MemberSummaryProjection> result = new ArrayList<>();
        for (BaseMemberRow member : baseMembers) {
            List<MembershipSummaryRow> visibleRows = visibleMembershipsByMemberId.getOrDefault(member.memberId(), List.of());
            List<MembershipSummaryRow> filteredRows = filteredMembershipsByMemberId.getOrDefault(member.memberId(), List.of());
            if (hasMembershipInclusionFilters && filteredRows.isEmpty()) {
                continue;
            }

            MembershipSummaryRow representativeMembership = selectRepresentativeMembership(visibleRows);
            result.add(new MemberRepository.MemberSummaryProjection(
                    member.memberId(),
                    member.centerId(),
                    member.memberCode(),
                    member.memberName(),
                    member.phone(),
                    member.memberStatus(),
                    member.joinDate(),
                    deriveMembershipOperationalStatus(visibleRows, representativeMembership, referenceDate, expiringThresholdDate),
                    representativeMembership == null ? null : representativeMembership.endDate(),
                    sumRemainingPtCount(visibleRows)
            ));
        }
        if (!hasText(membershipOperationalStatus)) {
            return result;
        }
        String normalizedStatus = membershipOperationalStatus.trim();
        return result.stream()
                .filter(member -> normalizedStatus.equals(member.membershipOperationalStatus()))
                .toList();
    }

    private com.querydsl.core.types.Predicate containsIgnoreCase(
            com.querydsl.core.types.dsl.StringPath path,
            String keyword
    ) {
        return hasText(keyword) ? path.containsIgnoreCase(keyword.trim()) : null;
    }

    private com.querydsl.core.types.Predicate equalsIgnoreCase(
            com.querydsl.core.types.dsl.StringPath path,
            String keyword
    ) {
        return hasText(keyword) ? path.equalsIgnoreCase(keyword.trim()) : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private BooleanExpression containsSummaryKeyword(String keyword) {
        if (!hasText(keyword)) {
            return null;
        }
        String trimmed = keyword.trim();
        return memberEntity.memberId.stringValue().containsIgnoreCase(trimmed)
                .or(memberEntity.memberCode.containsIgnoreCase(trimmed))
                .or(memberEntity.memberName.containsIgnoreCase(trimmed))
                .or(memberEntity.phone.containsIgnoreCase(trimmed))
                .or(memberEntity.memberStatus.containsIgnoreCase(trimmed));
    }

    private MembershipSummaryRow selectRepresentativeMembership(List<MembershipSummaryRow> memberships) {
        if (memberships.isEmpty()) {
            return null;
        }
        List<MembershipSummaryRow> holdingMemberships = memberships.stream()
                .filter(membership -> "HOLDING".equals(membership.membershipStatus()))
                .toList();
        List<MembershipSummaryRow> representativePool = holdingMemberships.isEmpty() ? memberships : holdingMemberships;
        return representativePool.stream()
                .sorted(membershipSummaryComparator())
                .findFirst()
                .orElse(null);
    }

    private Comparator<MembershipSummaryRow> membershipSummaryComparator() {
        return Comparator
                .comparing(MembershipSummaryRow::endDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(MembershipSummaryRow::membershipId);
    }

    private String deriveMembershipOperationalStatus(
            List<MembershipSummaryRow> memberships,
            MembershipSummaryRow representativeMembership,
            LocalDate referenceDate,
            LocalDate expiringThresholdDate
    ) {
        if (memberships.isEmpty() || representativeMembership == null) {
            return "없음";
        }
        if (memberships.stream().anyMatch(membership -> "HOLDING".equals(membership.membershipStatus()))) {
            return "홀딩중";
        }
        if (representativeMembership.endDate() == null) {
            return "정상";
        }
        if (representativeMembership.endDate().isBefore(referenceDate)) {
            return "만료";
        }
        if (!representativeMembership.endDate().isAfter(expiringThresholdDate)) {
            return "만료임박";
        }
        return "정상";
    }

    private Integer sumRemainingPtCount(List<MembershipSummaryRow> memberships) {
        int sum = memberships.stream()
                .filter(membership -> "ACTIVE".equals(membership.membershipStatus()))
                .filter(membership -> "PT".equals(membership.productCategorySnapshot()))
                .filter(membership -> "COUNT".equals(membership.productTypeSnapshot()))
                .map(MembershipSummaryRow::remainingCount)
                .filter(Objects::nonNull)
                .filter(remaining -> remaining > 0)
                .mapToInt(Integer::intValue)
                .sum();
        return sum == 0 ? null : sum;
    }

    public boolean existsActiveTrainerScopedMembership(Long centerId, Long memberId, Long trainerUserId) {
        Number count = (Number) entityManager.createNativeQuery("""
                SELECT COUNT(*)
                FROM member_memberships mm
                WHERE mm.center_id = :centerId
                  AND mm.member_id = :memberId
                  AND mm.assigned_trainer_id = :trainerUserId
                  AND mm.membership_status = 'ACTIVE'
                  AND mm.is_deleted = FALSE
                """)
                .setParameter("centerId", centerId)
                .setParameter("memberId", memberId)
                .setParameter("trainerUserId", trainerUserId)
                .getSingleResult();
        return count != null && count.longValue() > 0;
    }

    public static final class BaseMemberRow {
        private final Long memberId;
        private final Long centerId;
        private final String memberCode;
        private final String memberName;
        private final String phone;
        private final String memberStatus;
        private final LocalDate joinDate;

        public BaseMemberRow(
                Long memberId,
                Long centerId,
                String memberCode,
                String memberName,
                String phone,
                String memberStatus,
                LocalDate joinDate
        ) {
            this.memberId = memberId;
            this.centerId = centerId;
            this.memberCode = memberCode;
            this.memberName = memberName;
            this.phone = phone;
            this.memberStatus = memberStatus;
            this.joinDate = joinDate;
        }

        public Long memberId() {
            return memberId;
        }

        public Long centerId() {
            return centerId;
        }

        public String memberCode() {
            return memberCode;
        }

        public String memberName() {
            return memberName;
        }

        public String phone() {
            return phone;
        }

        public String memberStatus() {
            return memberStatus;
        }

        public LocalDate joinDate() {
            return joinDate;
        }
    }

    public record MemberRow(
            Long memberId,
            Long centerId,
            String memberCode,
            String memberName,
            String phone,
            String phoneEncrypted,
            String email,
            String gender,
            LocalDate birthDate,
            String birthDateEncrypted,
            Integer piiKeyVersion,
            String memberStatus,
            LocalDate joinDate,
            boolean consentSms,
            boolean consentMarketing,
            String memo,
            java.time.OffsetDateTime createdAt,
            Long createdBy,
            java.time.OffsetDateTime updatedAt,
            Long updatedBy
    ) {
    }

    public static final class MembershipSummaryRow {
        private final Long memberId;
        private final Long membershipId;
        private final String membershipStatus;
        private final LocalDate endDate;
        private final Integer remainingCount;
        private final String productCategorySnapshot;
        private final String productTypeSnapshot;

        public MembershipSummaryRow(
                Long memberId,
                Long membershipId,
                String membershipStatus,
                LocalDate endDate,
                Integer remainingCount,
                String productCategorySnapshot,
                String productTypeSnapshot
        ) {
            this.memberId = memberId;
            this.membershipId = membershipId;
            this.membershipStatus = membershipStatus;
            this.endDate = endDate;
            this.remainingCount = remainingCount;
            this.productCategorySnapshot = productCategorySnapshot;
            this.productTypeSnapshot = productTypeSnapshot;
        }

        public Long memberId() {
            return memberId;
        }

        public Long membershipId() {
            return membershipId;
        }

        public String membershipStatus() {
            return membershipStatus;
        }

        public LocalDate endDate() {
            return endDate;
        }

        public Integer remainingCount() {
            return remainingCount;
        }

        public String productCategorySnapshot() {
            return productCategorySnapshot;
        }

        public String productTypeSnapshot() {
            return productTypeSnapshot;
        }
    }
}
