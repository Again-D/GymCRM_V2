package com.gymcrm.member;

import com.gymcrm.common.security.PiiEncryptionService;
import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.member.repository.MemberRepository;
import com.gymcrm.member.service.MemberPiiRotationService;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MemberPiiRotationServiceTest {
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final PiiEncryptionService piiEncryptionService = mock(PiiEncryptionService.class);
    private final MemberPiiRotationService service = new MemberPiiRotationService(memberRepository, piiEncryptionService);

    @Test
    void resolveForReadPreservesEmergencyContactFields() {
        when(piiEncryptionService.activeKeyVersion()).thenReturn(2);
        when(memberRepository.rotatePiiIfVersionMatches(any())).thenReturn(false);

        Member source = new Member(
                1L,
                1L,
                "MBR-2026-001001",
                "테스트회원",
                "010-1234-5678",
                "enc-phone",
                "test@example.com",
                null,
                LocalDate.of(1994, 1, 1),
                "enc-birth",
                2,
                MemberStatus.ACTIVE,
                LocalDate.of(2026, 5, 8),
                true,
                false,
                "메모",
                "보호자",
                "010-9999-8888",
                "부모",
                null,
                OffsetDateTime.parse("2026-05-08T00:00:00Z"),
                1L,
                OffsetDateTime.parse("2026-05-08T00:00:00Z"),
                1L
        );

        Member resolved = service.resolveForRead(source, 1L);

        assertEquals("보호자", resolved.emergencyContactName());
        assertEquals("010-9999-8888", resolved.emergencyContactPhone());
        assertEquals("부모", resolved.emergencyContactRelationship());
    }
}
