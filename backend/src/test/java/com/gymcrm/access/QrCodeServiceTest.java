package com.gymcrm.access;

import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class QrCodeServiceTest {

    @Test
    void verifyFailsClosedWhenQrTokenStoreIsUnavailable() {
        QrTokenStore qrTokenStore = mock(QrTokenStore.class);
        MemberRepository memberRepository = mock(MemberRepository.class);
        AccessService accessService = mock(AccessService.class);
        CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);

        given(currentUserProvider.currentCenterId()).willReturn(1L);
        given(qrTokenStore.consume(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq("qr-token"), org.mockito.ArgumentMatchers.any()))
                .willThrow(new QrTokenStoreUnavailableException("down", new RuntimeException("redis down")));

        QrCodeService service = new QrCodeService(qrTokenStore, memberRepository, accessService, currentUserProvider, 30);

        QrCodeService.VerifyResult result = service.verifyAndHandle(
                new QrCodeService.VerifyRequest("qr-token", "gate-redis", QrCodeService.GateMode.ONLINE, com.gymcrm.integration.ExternalFailureMode.NONE)
        );

        assertThat(result.allowed()).isFalse();
        assertThat(result.code()).isEqualTo("A104");
        assertThat(result.reason()).contains("QR_STORE_UNAVAILABLE");
        assertThat(result.gateAction()).isEqualTo("KEEP_LOCKED");
        verifyNoInteractions(accessService);
    }
}
