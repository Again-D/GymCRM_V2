package com.gymcrm.integration;

import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class SandboxSmsAdapter implements SmsAdapter {
    private static final String PROVIDER = "sandbox-sms";

    @Override
    public SendResult send(SendRequest request) {
        ExternalFailureMode mode = SandboxFailureModeResolver.resolve(request.attributes());
        if (mode == ExternalFailureMode.TIMEOUT) {
            throw new ExternalAdapterException(PROVIDER, mode, true, "sandbox timeout on SMS send");
        }
        if (mode == ExternalFailureMode.HTTP_5XX) {
            throw new ExternalAdapterException(PROVIDER, mode, true, "sandbox 5xx on SMS send");
        }
        if (mode == ExternalFailureMode.OFFLINE) {
            throw new ExternalAdapterException(PROVIDER, mode, false, "sandbox offline on SMS send");
        }

        return new SendResult(
                PROVIDER,
                "sms-" + UUID.randomUUID(),
                OffsetDateTime.now().toString()
        );
    }
}
