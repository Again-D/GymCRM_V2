package com.gymcrm.member.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.common.security.PiiEncryptionService;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.dto.request.MemberUpdateRequest;
import com.gymcrm.member.dto.response.MemberWithdrawResponse;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.Gender;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.repository.MemberRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class MemberService {
    private static final long DEFAULT_CENTER_ID = 1L;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final String MEMBER_UPLOAD_RELATIVE_DIR = "/uploads/members";

    private final MemberRepository memberRepository;
    private final AuthUserRepository authUserRepository;
    private final CurrentUserProvider currentUserProvider;
    private final PiiEncryptionService piiEncryptionService;
    private final MemberPiiRotationService memberPiiRotationService;
    private final MemberWithdrawalService memberWithdrawalService;
    private final String appUploadDir;

    public MemberService(
            MemberRepository memberRepository,
            AuthUserRepository authUserRepository,
            CurrentUserProvider currentUserProvider,
            PiiEncryptionService piiEncryptionService,
            MemberPiiRotationService memberPiiRotationService,
            MemberWithdrawalService memberWithdrawalService,
            @Value("${app.upload.dir:uploads}") String appUploadDir
    ) {
        this.memberRepository = memberRepository;
        this.authUserRepository = authUserRepository;
        this.currentUserProvider = currentUserProvider;
        this.piiEncryptionService = piiEncryptionService;
        this.memberPiiRotationService = memberPiiRotationService;
        this.memberWithdrawalService = memberWithdrawalService;
        this.appUploadDir = appUploadDir;
    }

    @Transactional
    public Member create(MemberCreateRequest request) {
        MemberStatus memberStatus = parseRequiredMemberStatus(request.memberStatus());
        Gender gender = parseGender(request.gender());
        String normalizedMemberName = requireTrimmedValue(request.memberName(), "memberName");
        String normalizedPhone = requireTrimmedValue(request.phone(), "phone");

        try {
            PiiEncryptionService.EncryptedPii encryptedPhone = piiEncryptionService.encryptWithActiveVersion(normalizedPhone);
            String encryptedBirthDate = request.birthDate() == null
                    ? null
                    : piiEncryptionService.encryptWithActiveVersion(request.birthDate().toString()).cipherText();
            return resolvePii(memberRepository.insert(new MemberRepository.MemberCreateCommand(
                    DEFAULT_CENTER_ID,
                    normalizedMemberName,
                    normalizedPhone,
                    encryptedPhone.cipherText(),
                    trimToNull(request.email()),
                    gender,
                    request.birthDate(),
                    encryptedBirthDate,
                    encryptedPhone.keyVersion(),
                    memberStatus,
                    request.joinDate() == null ? LocalDate.now() : request.joinDate(),
                    request.consentSms() != null && request.consentSms(),
                    request.consentMarketing() != null && request.consentMarketing(),
                    trimToNull(request.memo()),
                    null,
                    trimToNull(request.emergencyContactName()),
                    trimToNull(request.emergencyContactPhone()),
                    trimToNull(request.emergencyContactRelationship()),
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

    @Transactional
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
            PiiEncryptionService.EncryptedPii encryptedPhone = piiEncryptionService.encryptWithActiveVersion(nextPhone);
            return resolvePii(memberRepository.update(new MemberRepository.MemberUpdateCommand(
                    memberId,
                    nextMemberName,
                    nextPhone,
                    encryptedPhone.cipherText(),
                    request.email() == null ? current.email() : trimToNull(request.email()),
                    nextGender,
                    nextBirthDate,
                    nextBirthDate == null ? null : piiEncryptionService.encryptWithActiveVersion(nextBirthDate.toString()).cipherText(),
                    encryptedPhone.keyVersion(),
                    nextStatus,
                    request.joinDate() == null ? current.joinDate() : request.joinDate(),
                    request.consentSms() == null ? current.consentSms() : request.consentSms(),
                    request.consentMarketing() == null ? current.consentMarketing() : request.consentMarketing(),
                    request.memo() == null ? current.memo() : trimToNull(request.memo()),
                    request.photoUrl() == null ? current.photoUrl() : trimToNull(request.photoUrl()),
                    request.emergencyContactName() == null ? current.emergencyContactName() : trimToNull(request.emergencyContactName()),
                    request.emergencyContactPhone() == null ? current.emergencyContactPhone() : trimToNull(request.emergencyContactPhone()),
                    request.emergencyContactRelationship() == null ? current.emergencyContactRelationship() : trimToNull(request.emergencyContactRelationship()),
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

    @Transactional
    public MemberWithdrawResponse withdraw(Long memberId) {
        AuthUser actor = currentActorOrNull();
        if (actor == null) {
            throw new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다.");
        }

        Member current = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + memberId));

        if (!"ROLE_SUPER_ADMIN".equals(actor.roleCode())
                && !current.centerId().equals(currentUserProvider.currentCenterId())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "현재 센터의 회원만 탈퇴 처리할 수 있습니다.");
        }

        if (MemberStatus.WITHDRAWN == current.memberStatus()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "이미 탈퇴 처리된 회원입니다. memberId=" + memberId);
        }

        return memberWithdrawalService.withdraw(current, actor);
    }

    @Transactional
    public String uploadPhoto(Long memberId, MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "photo is required");
        }

        Member current = get(memberId);
        validateCurrentCenter(current);

        String extension = resolveExtension(photo.getOriginalFilename(), photo.getContentType());
        String relativeUrl = MEMBER_UPLOAD_RELATIVE_DIR + "/" + memberId + extension;
        Path rootDir = Path.of(appUploadDir).toAbsolutePath().normalize();
        Path memberUploadDir = rootDir.resolve("members");
        Path target = memberUploadDir.resolve(memberId + extension);

        try {
            Files.createDirectories(memberUploadDir);
            Files.copy(photo.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "회원 사진 저장에 실패했습니다.");
        }

        try {
            memberRepository.updatePhotoUrl(memberId, relativeUrl, currentUserProvider.currentUserId());
        } catch (Exception ex) {
            try {
                Files.deleteIfExists(target);
            } catch (IOException ignored) {
            }
            throw ex;
        }
        return relativeUrl;
    }

    private Member resolvePii(Member member) {
        return memberPiiRotationService.resolveForRead(member, currentUserProvider.currentUserId());
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

    private void validateCurrentCenter(Member member) {
        AuthUser actor = currentActorOrNull();
        if (actor == null) {
            throw new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다.");
        }
        if (!"ROLE_SUPER_ADMIN".equals(actor.roleCode()) && !member.centerId().equals(currentUserProvider.currentCenterId())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "현재 센터의 회원만 접근할 수 있습니다.");
        }
    }

    private String resolveExtension(String originalFilename, String contentType) {
        if (contentType != null && !contentType.isBlank()) {
            return switch (contentType.toLowerCase()) {
                case "image/jpeg", "image/jpg" -> ".jpg";
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                case "image/gif" -> ".gif";
                default -> throw new ApiException(ErrorCode.VALIDATION_ERROR, "지원하지 않는 이미지 형식입니다.");
            };
        }

        String filename = trimToNull(originalFilename);
        if (filename == null || !filename.contains(".")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "이미지 파일 확장자를 확인할 수 없습니다.");
        }
        String ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        if (!List.of(".jpg", ".jpeg", ".png", ".webp", ".gif").contains(ext)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "지원하지 않는 이미지 형식입니다.");
        }
        return ".jpeg".equals(ext) ? ".jpg" : ext;
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
