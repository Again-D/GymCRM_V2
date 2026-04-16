package com.gymcrm.member.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.common.security.PiiEncryptionService;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.dto.request.MemberUpdateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.Gender;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class MemberService {
    private static final long DEFAULT_CENTER_ID = 1L;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final MemberRepository memberRepository;
    private final AuthUserRepository authUserRepository;
    private final CurrentUserProvider currentUserProvider;
    private final PiiEncryptionService piiEncryptionService;
    private final int piiKeyVersion;

    public MemberService(
            MemberRepository memberRepository,
            AuthUserRepository authUserRepository,
            CurrentUserProvider currentUserProvider,
            PiiEncryptionService piiEncryptionService,
            @Value("${app.security.pii.key-version:1}") int piiKeyVersion
    ) {
        this.memberRepository = memberRepository;
        this.authUserRepository = authUserRepository;
        this.currentUserProvider = currentUserProvider;
        this.piiEncryptionService = piiEncryptionService;
        this.piiKeyVersion = piiKeyVersion;
    }

    @Transactional
    public Member create(MemberCreateRequest request) {
        MemberStatus memberStatus = parseRequiredMemberStatus(request.memberStatus());
        Gender gender = parseGender(request.gender());
        String normalizedMemberName = requireTrimmedValue(request.memberName(), "memberName");
        String normalizedPhone = requireTrimmedValue(request.phone(), "phone");

        try {
            String encryptedPhone = piiEncryptionService.encrypt(normalizedPhone);
            String encryptedBirthDate = request.birthDate() == null ? null : piiEncryptionService.encrypt(request.birthDate().toString());
            return resolvePii(memberRepository.insert(new MemberRepository.MemberCreateCommand(
                    DEFAULT_CENTER_ID,
                    normalizedMemberName,
                    normalizedPhone,
                    encryptedPhone,
                    trimToNull(request.email()),
                    gender,
                    request.birthDate(),
                    encryptedBirthDate,
                    piiKeyVersion,
                    memberStatus,
                    request.joinDate() == null ? LocalDate.now() : request.joinDate(),
                    request.consentSms() != null && request.consentSms(),
                    request.consentMarketing() != null && request.consentMarketing(),
                    trimToNull(request.memo()),
                    currentUserProvider.currentUserId()
            )));
        } catch (DataAccessException ex) {
            throw mapDataAccessException(ex);
        }
    }

    @Transactional(readOnly = true)
    public List<MemberSummary> list(
            String keyword,
            String memberCodeKeyword,
            String nameKeyword,
            String phoneKeyword,
            String memberStatus,
            Long trainerId,
            Long productId,
            String membershipOperationalStatus,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        LocalDate businessDate = LocalDate.now(BUSINESS_ZONE);
        Long effectiveTrainerId = resolveTrainerScopedFilter(trainerId);
        String normalizedMemberStatus = normalizeUpperOrNull(memberStatus);
        if (normalizedMemberStatus != null) {
            parseRequiredMemberStatus(normalizedMemberStatus);
        }
        return memberRepository.findAllSummaries(
                        DEFAULT_CENTER_ID,
                        keyword,
                        memberCodeKeyword,
                        nameKeyword,
                        phoneKeyword,
                        normalizedMemberStatus,
                        effectiveTrainerId,
                        productId,
                        membershipOperationalStatus,
                        dateFrom,
                        dateTo,
                        businessDate
                ).stream()
                .map(summary -> new MemberSummary(
                        summary.memberId(),
                        summary.centerId(),
                        summary.memberCode(),
                        summary.memberName(),
                        summary.phone(),
                        summary.memberStatus(),
                        summary.joinDate(),
                        summary.membershipOperationalStatus(),
                        summary.membershipExpiryDate(),
                        summary.remainingPtCount()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public Member get(Long memberId) {
        guardTrainerMemberAccess(memberId);
        return memberRepository.findById(memberId)
                .map(this::resolvePii)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + memberId));
    }

    @Transactional
    public Member update(Long memberId, MemberUpdateRequest request) {
        Member current = get(memberId);

        String nextMemberName = request.memberName() == null
                ? current.memberName()
                : requireTrimmedValue(request.memberName(), "memberName");
        String nextPhone = request.phone() == null
                ? current.phone()
                : requireTrimmedValue(request.phone(), "phone");
        MemberStatus nextStatus = request.memberStatus() == null
                ? current.memberStatus()
                : parseRequiredMemberStatus(request.memberStatus());
        Gender nextGender = request.gender() == null
                ? current.gender()
                : parseGender(request.gender());

        try {
            LocalDate nextBirthDate = request.birthDate() == null ? current.birthDate() : request.birthDate();
            return resolvePii(memberRepository.update(new MemberRepository.MemberUpdateCommand(
                    memberId,
                    nextMemberName,
                    nextPhone,
                    piiEncryptionService.encrypt(nextPhone),
                    request.email() == null ? current.email() : trimToNull(request.email()),
                    nextGender,
                    nextBirthDate,
                    nextBirthDate == null ? null : piiEncryptionService.encrypt(nextBirthDate.toString()),
                    piiKeyVersion,
                    nextStatus,
                    request.joinDate() == null ? current.joinDate() : request.joinDate(),
                    request.consentSms() == null ? current.consentSms() : request.consentSms(),
                    request.consentMarketing() == null ? current.consentMarketing() : request.consentMarketing(),
                    request.memo() == null ? current.memo() : trimToNull(request.memo()),
                    currentUserProvider.currentUserId()
            )));
        } catch (DataAccessException ex) {
            throw mapDataAccessException(ex);
        }
    }

    @Transactional
    public void delete(Long memberId) {
        AuthUser actor = currentActorOrNull();
        if (actor == null) {
            throw new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다.");
        }

        Member current = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + memberId));

        if (!"ROLE_SUPER_ADMIN".equals(actor.roleCode())
                && !current.centerId().equals(currentUserProvider.currentCenterId())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "현재 센터의 회원만 삭제할 수 있습니다.");
        }

        memberRepository.delete(memberId, actor.userId());
    }

    private Member resolvePii(Member member) {
        String phone = member.phone();
        LocalDate birthDate = member.birthDate();
        if ((phone == null || phone.isBlank()) && member.phoneEncrypted() != null) {
            phone = piiEncryptionService.decrypt(member.phoneEncrypted());
        }
        if (birthDate == null && member.birthDateEncrypted() != null) {
            birthDate = LocalDate.parse(piiEncryptionService.decrypt(member.birthDateEncrypted()));
        }
        return new Member(
                member.memberId(),
                member.centerId(),
                member.memberCode(),
                member.memberName(),
                phone,
                member.phoneEncrypted(),
                member.email(),
                member.gender(),
                birthDate,
                member.birthDateEncrypted(),
                member.piiKeyVersion(),
                member.memberStatus(),
                member.joinDate(),
                member.consentSms(),
                member.consentMarketing(),
                member.memo(),
                member.createdAt(),
                member.createdBy(),
                member.updatedAt(),
                member.updatedBy()
        );
    }

    private MemberStatus parseRequiredMemberStatus(String status) {
        MemberStatus parsed = MemberStatus.from(status);
        if (parsed == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memberStatus is required");
        }
        return parsed;
    }

    private Gender parseGender(String gender) {
        try {
            return Gender.from(gender);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, ex.getMessage());
        }
    }

    private ApiException mapDataAccessException(DataAccessException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message != null && message.contains("uk_members_center_phone_active")) {
            return new ApiException(ErrorCode.CONFLICT, "동일 연락처 회원이 이미 존재합니다.");
        }
        return new ApiException(ErrorCode.INTERNAL_ERROR, "회원 데이터 처리 중 오류가 발생했습니다.");
    }

    private String requireTrimmedValue(String value, String fieldName) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, fieldName + " is required");
        }
        return trimmed;
    }

    private String normalizeStatus(String status) {
        return status == null ? null : status.trim().toUpperCase();
    }

    private String normalizeUpperOrNull(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toUpperCase();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Long resolveTrainerScopedFilter(Long requestedTrainerId) {
        AuthUser actor = currentActorOrNull();
        if (actor == null || !"ROLE_TRAINER".equals(actor.roleCode())) {
            return requestedTrainerId;
        }
        if (requestedTrainerId != null && !requestedTrainerId.equals(actor.userId())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "트레이너는 본인 담당 회원만 조회할 수 있습니다.");
        }
        return actor.userId();
    }

    private void guardTrainerMemberAccess(Long memberId) {
        AuthUser actor = currentActorOrNull();
        if (actor == null || !"ROLE_TRAINER".equals(actor.roleCode())) {
            return;
        }
        boolean visible = memberRepository.existsActiveTrainerScopedMembership(actor.centerId(), memberId, actor.userId());
        if (!visible) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "트레이너는 본인 담당 회원만 조회할 수 있습니다.");
        }
    }

    private AuthUser currentActorOrNull() {
        try {
            Long userId = currentUserProvider.currentUserId();
            return authUserRepository.findActiveById(userId).orElse(null);
        } catch (IllegalStateException ex) {
            return null;
        }
    }
}
