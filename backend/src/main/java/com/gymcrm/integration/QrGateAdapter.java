package com.gymcrm.integration;

import java.time.OffsetDateTime;
import java.util.Map;

public interface QrGateAdapter {
    VerifyResult verifyAndOpen(VerifyRequest request);

    record VerifyRequest(
            Long centerId,
            Long memberId,
            String qrToken,
            String deviceId,
            OffsetDateTime requestedAt,
            Map<String, String> attributes
    ) {
    }

    record VerifyResult(
            String provider,
            boolean gateOpened,
            String eventId,
            OffsetDateTime verifiedAt
    ) {
    }
}
