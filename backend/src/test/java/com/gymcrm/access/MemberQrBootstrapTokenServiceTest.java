package com.gymcrm.access;

import com.gymcrm.common.error.ApiException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MemberQrBootstrapTokenServiceTest {
    private static final String SECRET = "test-secret-test-secret-test-secret-test-secret";

    @Test
    void parseRejectsInvalidBootstrapToken() {
        MemberQrBootstrapTokenService service = new MemberQrBootstrapTokenService(SECRET, "gymcrm", 1);

        assertThatThrownBy(() -> service.parse("not-a-jwt"))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(com.gymcrm.common.error.ErrorCode.TOKEN_INVALID);
    }

    @Test
    void parseRejectsExpiredBootstrapToken() throws Exception {
        MemberQrBootstrapTokenService service = new MemberQrBootstrapTokenService(SECRET, "gymcrm", 0);
        String token = service.issue(1L, 101L).token();
        Thread.sleep(1100L);

        assertThatThrownBy(() -> service.parse(token))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(com.gymcrm.common.error.ErrorCode.TOKEN_EXPIRED);
    }

    @Test
    void issueEmbedsCenterAndMemberClaims() {
        MemberQrBootstrapTokenService service = new MemberQrBootstrapTokenService(SECRET, "gymcrm", 10);

        MemberQrBootstrapTokenService.IssuedBootstrapToken issued = service.issue(1L, 101L);
        MemberQrBootstrapTokenService.BootstrapClaims claims = service.parse(issued.token());

        assertThat(claims.centerId()).isEqualTo(1L);
        assertThat(claims.memberId()).isEqualTo(101L);
        assertThat(claims.expiresAt()).isAfter(claims.issuedAt());
    }
}
