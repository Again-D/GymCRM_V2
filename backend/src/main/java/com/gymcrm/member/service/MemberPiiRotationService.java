package com.gymcrm.member.service;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.PiiEncryptionService;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class MemberPiiRotationService {
    private final MemberRepository memberRepository;
    private final PiiEncryptionService piiEncryptionService;

    public MemberPiiRotationService(
            MemberRepository memberRepository,
            PiiEncryptionService piiEncryptionService
    ) {
        this.memberRepository = memberRepository;
        this.piiEncryptionService = piiEncryptionService;
    }

    @Transactional
    public Member resolveForRead(Member member, Long actorUserId) {
        return resolveForReadWithOutcome(member, actorUserId).member();
    }

    @Transactional
    public ResolutionResult resolveForReadWithOutcome(Member member, Long actorUserId) {
        int activeKeyVersion = piiEncryptionService.activeKeyVersion();
        int sourceKeyVersion = member.piiKeyVersion() == null ? activeKeyVersion : member.piiKeyVersion();

        String resolvedPhone = hasText(member.phone())
                ? member.phone()
                : decryptValue(member.phoneEncrypted(), sourceKeyVersion);
        LocalDate resolvedBirthDate = member.birthDate() != null
                ? member.birthDate()
                : decryptBirthDate(member.birthDateEncrypted(), sourceKeyVersion);

        Member resolved = withResolvedPii(member, resolvedPhone, resolvedBirthDate);
        if (sourceKeyVersion == activeKeyVersion) {
            return new ResolutionResult(resolved, false);
        }

        PiiEncryptionService.EncryptedPii encryptedPhone = piiEncryptionService.encryptWithActiveVersion(resolvedPhone);
        String encryptedBirthDate = resolvedBirthDate == null
                ? null
                : piiEncryptionService.encryptWithActiveVersion(resolvedBirthDate.toString()).cipherText();

        boolean rotated = memberRepository.rotatePiiIfVersionMatches(new MemberRepository.MemberPiiRotationCommand(
                member.memberId(),
                resolvedPhone,
                encryptedPhone.cipherText(),
                resolvedBirthDate,
                encryptedBirthDate,
                encryptedPhone.keyVersion(),
                member.piiKeyVersion(),
                actorUserId
        ));

        return new ResolutionResult(
                withResolvedPii(resolved, resolvedPhone, resolvedBirthDate, encryptedPhone.cipherText(), encryptedBirthDate, encryptedPhone.keyVersion()),
                rotated
        );
    }

    private String decryptValue(String encrypted, int keyVersion) {
        if (!hasText(encrypted)) {
            return null;
        }
        try {
            return piiEncryptionService.decrypt(encrypted, keyVersion);
        } catch (IllegalStateException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "회원 PII 복호화에 실패했습니다.");
        }
    }

    private LocalDate decryptBirthDate(String encrypted, int keyVersion) {
        String value = decryptValue(encrypted, keyVersion);
        return value == null ? null : LocalDate.parse(value);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private Member withResolvedPii(Member source, String phone, LocalDate birthDate) {
        return withResolvedPii(source, phone, birthDate, source.phoneEncrypted(), source.birthDateEncrypted(), source.piiKeyVersion());
    }

    private Member withResolvedPii(
            Member source,
            String phone,
            LocalDate birthDate,
            String phoneEncrypted,
            String birthDateEncrypted,
            Integer piiKeyVersion
    ) {
        return new Member(
                source.memberId(),
                source.centerId(),
                source.memberCode(),
                source.memberName(),
                phone,
                phoneEncrypted,
                source.email(),
                source.gender(),
                birthDate,
                birthDateEncrypted,
                piiKeyVersion,
                source.memberStatus(),
                source.joinDate(),
                source.consentSms(),
                source.consentMarketing(),
                source.memo(),
                source.withdrawnAt(),
                source.createdAt(),
                source.createdBy(),
                source.updatedAt(),
                source.updatedBy()
        );
    }

    public record ResolutionResult(
            Member member,
            boolean rotated
    ) {
    }
}
