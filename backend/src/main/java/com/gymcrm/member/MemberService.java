package com.gymcrm.member;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class MemberService {
    private static final long DEFAULT_CENTER_ID = 1L;

    private final MemberRepository memberRepository;
    private final CurrentUserProvider currentUserProvider;

    public MemberService(MemberRepository memberRepository, CurrentUserProvider currentUserProvider) {
        this.memberRepository = memberRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public Member create(MemberCreateRequest request) {
        String normalizedStatus = normalizeStatus(request.memberStatus());
        String normalizedGender = normalizeUpperOrNull(request.gender());
        String normalizedMemberName = requireTrimmedValue(request.memberName(), "memberName");
        String normalizedPhone = requireTrimmedValue(request.phone(), "phone");

        validateStatus(normalizedStatus);
        validateGender(normalizedGender);

        try {
            return memberRepository.insert(new MemberRepository.MemberCreateCommand(
                    DEFAULT_CENTER_ID,
                    normalizedMemberName,
                    normalizedPhone,
                    trimToNull(request.email()),
                    normalizedGender,
                    request.birthDate(),
                    normalizedStatus,
                    request.joinDate() == null ? LocalDate.now() : request.joinDate(),
                    request.consentSms() != null && request.consentSms(),
                    request.consentMarketing() != null && request.consentMarketing(),
                    trimToNull(request.memo()),
                    currentUserProvider.currentUserId()
            ));
        } catch (DataAccessException ex) {
            throw mapDataAccessException(ex);
        }
    }

    @Transactional(readOnly = true)
    public List<Member> list(String nameKeyword, String phoneKeyword) {
        return memberRepository.findAll(DEFAULT_CENTER_ID, nameKeyword, phoneKeyword);
    }

    @Transactional(readOnly = true)
    public Member get(Long memberId) {
        return memberRepository.findById(memberId)
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
        String nextStatus = request.memberStatus() == null ? current.memberStatus() : normalizeStatus(request.memberStatus());
        String nextGender = request.gender() == null ? current.gender() : normalizeUpperOrNull(request.gender());
        validateStatus(nextStatus);
        validateGender(nextGender);

        try {
            return memberRepository.update(new MemberRepository.MemberUpdateCommand(
                    memberId,
                    nextMemberName,
                    nextPhone,
                    request.email() == null ? current.email() : trimToNull(request.email()),
                    nextGender,
                    request.birthDate() == null ? current.birthDate() : request.birthDate(),
                    nextStatus,
                    request.joinDate() == null ? current.joinDate() : request.joinDate(),
                    request.consentSms() == null ? current.consentSms() : request.consentSms(),
                    request.consentMarketing() == null ? current.consentMarketing() : request.consentMarketing(),
                    request.memo() == null ? current.memo() : trimToNull(request.memo()),
                    currentUserProvider.currentUserId()
            ));
        } catch (DataAccessException ex) {
            throw mapDataAccessException(ex);
        }
    }

    private void validateStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memberStatus is required");
        }
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memberStatus must be ACTIVE or INACTIVE");
        }
    }

    private void validateGender(String gender) {
        if (gender == null) {
            return;
        }
        if (!"MALE".equals(gender) && !"FEMALE".equals(gender) && !"OTHER".equals(gender)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "gender must be MALE, FEMALE, or OTHER");
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

    public record MemberCreateRequest(
            String memberName,
            String phone,
            String email,
            String gender,
            LocalDate birthDate,
            String memberStatus,
            LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo
    ) {}

    public record MemberUpdateRequest(
            String memberName,
            String phone,
            String email,
            String gender,
            LocalDate birthDate,
            String memberStatus,
            LocalDate joinDate,
            Boolean consentSms,
            Boolean consentMarketing,
            String memo
    ) {}
}
