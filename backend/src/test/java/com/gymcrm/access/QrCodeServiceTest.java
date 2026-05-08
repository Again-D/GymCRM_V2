package com.gymcrm.access;

import com.gymcrm.member.entity.Member;
import com.gymcrm.member.enums.MemberStatus;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class QrCodeServiceTest {

    @Test
    void verifyFailsClosedWhenQrTokenStoreIsUnavailable() {
        QrTokenStore qrTokenStore = mock(QrTokenStore.class);
        MemberRepository memberRepository = mock(MemberRepository.class);
        AccessService accessService = mock(AccessService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
        MemberQrBootstrapTokenService bootstrapTokenService = mock(MemberQrBootstrapTokenService.class);

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(qrTokenStore.consume(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq("qr-token"), org.mockito.ArgumentMatchers.any()))
                .willThrow(new QrTokenStoreUnavailableException("down", new RuntimeException("redis down")));

        QrCodeService service = new QrCodeService(
                qrTokenStore,
                memberRepository,
                accessService,
                currentUserProvider,
                bootstrapTokenService,
                30
        );

        QrCodeService.VerifyResult result = service.verifyAndHandle(
                new QrCodeService.VerifyRequest("qr-token", "gate-redis", QrCodeService.GateMode.ONLINE, com.gymcrm.integration.ExternalFailureMode.NONE)
        );

        assertThat(result.allowed()).isFalse();
        assertThat(result.code()).isEqualTo("A104");
        assertThat(result.reason()).contains("QR_STORE_UNAVAILABLE");
        assertThat(result.gateAction()).isEqualTo("KEEP_LOCKED");
        verifyNoInteractions(accessService);
    }

    @Test
    void resolveMemberQrSessionIssuesFreshQrTokenForSignedBootstrapToken() {
        QrTokenStore qrTokenStore = mock(QrTokenStore.class);
        MemberRepository memberRepository = mock(MemberRepository.class);
        AccessService accessService = mock(AccessService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
        MemberQrBootstrapTokenService bootstrapTokenService = new MemberQrBootstrapTokenService(
                "test-secret-test-secret-test-secret-test-secret",
                "gymcrm",
                10
        );
        MemberQrBootstrapTokenService.IssuedBootstrapToken issuedBootstrapToken = bootstrapTokenService.issue(1L, 101L);
        Member member = new Member(
                101L,
                1L,
                "MBR-101",
                "홍길동",
                "010-1234-5678",
                null,
                "hong@example.com",
                null,
                LocalDate.of(1990, 1, 1),
                null,
                1,
                MemberStatus.ACTIVE,
                LocalDate.of(2026, 5, 1),
                true,
                false,
                "memo",
                null,
                null,
                null,
                null,
                issuedBootstrapToken.issuedAt(),
                0L,
                issuedBootstrapToken.issuedAt(),
                0L
        );
        OffsetDateTime qrIssuedAt = issuedBootstrapToken.issuedAt().plusSeconds(1);
        OffsetDateTime qrExpiresAt = qrIssuedAt.plusSeconds(30);

        given(memberRepository.findById(101L)).willReturn(Optional.of(member));
        given(qrTokenStore.issue(eq(1L), eq(101L), any(), eq(30))).willReturn(
                new QrTokenStore.IssuedToken("member-qr-token-1", 1L, 101L, qrIssuedAt, qrExpiresAt)
        );

        QrCodeService service = new QrCodeService(
                qrTokenStore,
                memberRepository,
                accessService,
                currentUserProvider,
                bootstrapTokenService,
                30
        );

        QrCodeService.MemberQrSessionResult result = service.resolveMemberQrSession(issuedBootstrapToken.token());

        assertThat(result.memberId()).isEqualTo(101L);
        assertThat(result.memberName()).isEqualTo("홍길동");
        assertThat(result.qrToken()).isEqualTo("member-qr-token-1");
        assertThat(result.expiresAt()).isEqualTo(qrExpiresAt);
        assertThat(result.bootstrapExpiresAt()).isAfter(result.issuedAt());
        assertThat(result.bootstrapExpiresAt()).isBefore(issuedBootstrapToken.expiresAt().plusSeconds(1));
    }
}
