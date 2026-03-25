package com.gymcrm.member;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.common.security.PiiEncryptionService;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.member.dto.request.MemberCreateRequest;
import com.gymcrm.member.dto.request.MemberUpdateRequest;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.Gender;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.member.service.MemberService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

class MemberServiceTest {

    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final AuthUserRepository authUserRepository = mock(AuthUserRepository.class);
    private final CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
    private final PiiEncryptionService piiEncryptionService = mock(PiiEncryptionService.class);
    private final MemberService service = new MemberService(memberRepository, authUserRepository, currentUserProvider, piiEncryptionService, 1);

    @Test
    void mapsDuplicatePhoneConstraintToConflict() {
        when(currentUserProvider.currentUserId()).thenReturn(1L);
        when(piiEncryptionService.encrypt(any())).thenReturn("enc");
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
        when(piiEncryptionService.encrypt(any())).thenReturn("enc");
        when(memberRepository.insert(any())).thenReturn(sampleMember());

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
    void createAcceptsLowercaseAndTrimmedStatusAndGender() {
        when(currentUserProvider.currentUserId()).thenReturn(99L);
        when(piiEncryptionService.encrypt(any())).thenReturn("enc");
        when(memberRepository.insert(any())).thenReturn(sampleMember());

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
                now,
                99L,
                now,
                99L
        );
    }
}
