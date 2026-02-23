package com.gymcrm.member;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
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
    private final CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
    private final MemberService service = new MemberService(memberRepository, currentUserProvider);

    @Test
    void mapsDuplicatePhoneConstraintToConflict() {
        when(currentUserProvider.currentUserId()).thenReturn(1L);
        when(memberRepository.insert(any())).thenThrow(new DataIntegrityViolationException(
                "insert failed",
                new RuntimeException("duplicate key value violates unique constraint \"uk_members_center_phone_active\"")
        ));

        ApiException exception = assertThrows(ApiException.class, () -> service.create(
                new MemberService.MemberCreateRequest(
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
        when(memberRepository.insert(any())).thenReturn(sampleMember());

        Member result = service.create(new MemberService.MemberCreateRequest(
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
    void createAcceptsLowercaseStatusAndGender() {
        when(currentUserProvider.currentUserId()).thenReturn(99L);
        when(memberRepository.insert(any())).thenReturn(sampleMember());

        service.create(new MemberService.MemberCreateRequest(
                "테스트회원",
                "010-9999-0000",
                null,
                "female",
                null,
                "active",
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
                new MemberService.MemberUpdateRequest(
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
                new MemberService.MemberUpdateRequest(
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
                "테스트회원",
                "010-9999-0000",
                null,
                "FEMALE",
                null,
                "ACTIVE",
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
