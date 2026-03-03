package com.gymcrm.integration;

import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class SandboxQrGateAdapter implements QrGateAdapter {
    private static final String PROVIDER = "sandbox-qr-gate";

    @Override
    public VerifyResult verifyAndOpen(VerifyRequest request) {
        ExternalFailureMode mode = SandboxFailureModeResolver.resolve(request.attributes());
        if (mode == ExternalFailureMode.TIMEOUT) {
            throw new ExternalAdapterException(PROVIDER, mode, true, "sandbox timeout on QR gate verify");
        }
        if (mode == ExternalFailureMode.HTTP_5XX) {
            throw new ExternalAdapterException(PROVIDER, mode, true, "sandbox 5xx on QR gate verify");
        }
        if (mode == ExternalFailureMode.OFFLINE) {
            throw new ExternalAdapterException(PROVIDER, mode, false, "sandbox offline on QR gate verify");
        }

        return new VerifyResult(
                PROVIDER,
                true,
                "qr-evt-" + UUID.randomUUID(),
                OffsetDateTime.now()
        );
    }
}
