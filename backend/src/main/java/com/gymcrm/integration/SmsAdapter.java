package com.gymcrm.integration;

import java.util.Map;

public interface SmsAdapter {
    SendResult send(SendRequest request);

    record SendRequest(
            Long centerId,
            Long memberId,
            String phone,
            String content,
            Map<String, String> attributes
    ) {
    }

    record SendResult(
            String provider,
            String messageId,
            String acceptedAt
    ) {
    }
}
