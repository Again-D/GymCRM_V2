package com.gymcrm.member;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.common.security.PiiEncryptionService;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.dto.request.MemberUpdateRequest;
import com.gymcrm.member.dto.response.MemberWithdrawResponse;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.Gender;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.member.service.MemberPiiRotationService;
import com.gymcrm.member.service.MemberService;
import com.gymcrm.member.service.MemberWithdrawalService;
import com.gymcrm.common.auth.entity.AuthUser;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.clearInvocations;
import org.mockito.ArgumentCaptor;

class MemberServiceTest {

    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final AuthUserRepository authUserRepository = mock(AuthUserRepository.class);
    private final CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
    private final PiiEncryptionService piiEncryptionService = mock(PiiEncryptionService.class);
    private final MemberPiiRotationService memberPiiRotationService = mock(MemberPiiRotationService.class);
    private final MemberWithdrawalService memberWithdrawalService = mock(MemberWithdrawalService.class);
    private final MemberService service = new MemberService(
            memberRepository,
            authUserRepository,
            currentUserProvider,
            piiEncryptionService,
            memberPiiRotationService,
            memberWithdrawalService,
            "uploads"
    );

    @Test
    void mapsDuplicatePhoneConstraintToConflict() {
        when(currentUserProvider.currentUserId()).thenReturn(1L);
        when(piiEncryptionService.encryptWithActiveVersion(any()))
                .thenReturn(new PiiEncryptionService.EncryptedPii("enc", 1));
        when(memberRepository.insert(any())).thenThrow(new DataIntegrityViolationException(
                "insert failed",
                new RuntimeException("duplicate key value violates unique constraint \"uk_members_center_phone_active\"")
        ));

        ApiException exception = assertThrows(ApiException.class, () -> service.create(
                new MemberCreateRequest(
                        "테스트회원",
                        "010-1111-2222",
                        null,
                        null,
                        null,
                        "ACTIVE",
                        LocalDate.of(2026, 2, 23),
                        true,
                        false,
                        null
                )
        ));

        assertEquals(ErrorCode.CONFLICT, exception.getErrorCode());
        assertEquals("동일 연락처 회원이 이미 존재합니다.", exception.getMessage());
    }

    @Test
    void trimsAndNormalizesCreatePayloadBeforeInsert() {
        when(currentUserProvider.currentUserId()).thenReturn(99L);
        when(piiEncryptionService.encryptWithActiveVersion(any()))
                .thenReturn(new PiiEncryptionService.EncryptedPii("enc", 1));
        when(memberRepository.insert(any())).thenReturn(sampleMember());
        when(memberPiiRotationService.resolveForRead(any(), anyLong())).thenAnswer(invocation -> invocation.getArgument(0));

        Member result = service.create(new MemberCreateRequest(
                "  테스트회원  ",
                "010-9999-0000",
                "   ",
                "FEMALE",
                null,
                "ACTIVE",
                LocalDate.of(2026, 2, 23),
                null,
                null,
                "   "
        ));

        assertEquals("테스트회원", result.memberName());
    }

    @Test
    void createPersistsEmergencyContactDetailsWhenProvided() {
        when(currentUserProvider.currentUserId()).thenReturn(99L);
        when(piiEncryptionService.encryptWithActiveVersion(any()))
                .thenReturn(new PiiEncryptionService.EncryptedPii("enc", 1));
        when(memberRepository.insert(any())).thenReturn(sampleMember());
        when(memberPiiRotationService.resolveForRead(any(), anyLong())).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(new MemberCreateRequest(
                "테스트회원",
                "010-9999-0000",
                null,
                null,
                null,
                "ACTIVE",
                LocalDate.of(2026, 2, 23),
                null,
                null,
                null,
                "보호자",
                "010-1111-2222",
                "부모"
        ));

        ArgumentCaptor<MemberRepository.MemberCreateCommand> captor = ArgumentCaptor.forClass(MemberRepository.MemberCreateCommand.class);
        verify(memberRepository).insert(captor.capture());
        assertEquals("보호자", captor.getValue().emergencyContactName());
        assertEquals("010-1111-2222", captor.getValue().emergencyContactPhone());
        assertEquals("부모", captor.getValue().emergencyContactRelationship());
    }

    @Test
    void createAcceptsLowercaseAndTrimmedStatusAndGender() {
        when(currentUserProvider.currentUserId()).thenReturn(99L);
        when(piiEncryptionService.encryptWithActiveVersion(any()))
                .thenReturn(new PiiEncryptionService.EncryptedPii("enc", 1));
        when(memberRepository.insert(any())).thenReturn(sampleMember());
        when(memberPiiRotationService.resolveForRead(any(), anyLong())).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(new MemberCreateRequest(
                "테스트회원",
                "010-9999-0000",
                null,
                " female ",
                null,
                " active ",
                LocalDate.of(2026, 2, 23),
                null,
                null,
                null
        ));

        verify(memberRepository).insert(any());
    }

    @Test
    void updateRejectsBlankMemberName() {
        when(memberRepository.findById(1L)).thenReturn(Optional.of(sampleMember()));
        when(memberPiiRotationService.resolveForRead(any(), anyLong())).thenAnswer(invocation -> invocation.getArgument(0));
        when(currentUserProvider.currentUserId()).thenReturn(99L);

        ApiException exception = assertThrows(ApiException.class, () -> service.update(
                1L,
                new MemberUpdateRequest(
                        "   ",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("memberName is required", exception.getMessage());
        verify(memberRepository, never()).update(any());
    }

    @Test
    void updateRejectsBlankPhone() {
        when(memberRepository.findById(1L)).thenReturn(Optional.of(sampleMember()));
        when(memberPiiRotationService.resolveForRead(any(), anyLong())).thenAnswer(invocation -> invocation.getArgument(0));
        when(currentUserProvider.currentUserId()).thenReturn(99L);

        ApiException exception = assertThrows(ApiException.class, () -> service.update(
                1L,
                new MemberUpdateRequest(
                        null,
                        "   ",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )
        ));

        assertEquals(ErrorCode.VALIDATION_ERROR, exception.getErrorCode());
        assertEquals("phone is required", exception.getMessage());
        verify(memberRepository, never()).update(any());
    }

    @Test
    void withdrawDelegatesToMemberWithdrawalServiceWithoutChangingDuplicateWithdrawSemantics() {
        AuthUser actor = new AuthUser(
                99L,
                1L,
                "center-admin",
                "pw",
                "센터관리자",
                "010-1234-5678",
                "ROLE_MANAGER",
                "ACTIVE",
                false,
                null,
                null,
                null
        );
        Member activeMember = sampleMember();
        when(currentUserProvider.currentUserId()).thenReturn(99L);
        when(currentUserProvider.currentCenterId()).thenReturn(1L);
        when(authUserRepository.findActiveById(99L)).thenReturn(Optional.of(actor));
        when(memberRepository.findById(1L)).thenReturn(Optional.of(activeMember));

        MemberWithdrawResponse expected = new MemberWithdrawResponse(
                1L,
                com.gymcrm.member.enums.MemberStatus.WITHDRAWN,
                true,
                1,
                1,
                java.math.BigDecimal.valueOf(10000)
        );
        when(memberWithdrawalService.withdraw(eq(activeMember), eq(actor))).thenReturn(expected);

        MemberWithdrawResponse actual = service.withdraw(1L);

        assertEquals(expected, actual);
        verify(memberWithdrawalService).withdraw(eq(activeMember), eq(actor));

        Member withdrawnMember = new Member(
                activeMember.memberId(),
                activeMember.centerId(),
                activeMember.memberCode(),
                activeMember.memberName(),
                activeMember.phone(),
                activeMember.phoneEncrypted(),
                activeMember.email(),
                activeMember.gender(),
                activeMember.birthDate(),
                activeMember.birthDateEncrypted(),
                activeMember.piiKeyVersion(),
                MemberStatus.WITHDRAWN,
                activeMember.joinDate(),
                activeMember.consentSms(),
                activeMember.consentMarketing(),
                activeMember.memo(),
                activeMember.photoUrl(),
                activeMember.withdrawnAt(),
                activeMember.createdAt(),
                activeMember.createdBy(),
                activeMember.updatedAt(),
                activeMember.updatedBy()
        );
        when(memberRepository.findById(1L)).thenReturn(Optional.of(withdrawnMember));
        clearInvocations(memberWithdrawalService);

        ApiException duplicate = assertThrows(ApiException.class, () -> service.withdraw(1L));
        assertEquals(ErrorCode.VALIDATION_ERROR, duplicate.getErrorCode());
        assertEquals("이미 탈퇴 처리된 회원입니다. memberId=1", duplicate.getMessage());
        verify(memberWithdrawalService, never()).withdraw(any(), any());
    }

    private Member sampleMember() {
        OffsetDateTime now = OffsetDateTime.parse("2026-02-23T00:00:00Z");
        return new Member(
                1L,
                1L,
                "MBR-2026-001001",
                "테스트회원",
                "010-9999-0000",
                "enc-phone",
                null,
                Gender.FEMALE,
                null,
                null,
                1,
                MemberStatus.ACTIVE,
                LocalDate.of(2026, 2, 23),
                false,
                false,
                null,
                null,
                null,
                now,
                99L,
                now,
                99L
        );
    }
}
