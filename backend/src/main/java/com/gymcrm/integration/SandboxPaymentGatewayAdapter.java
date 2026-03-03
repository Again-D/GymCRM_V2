package com.gymcrm.integration;

import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class SandboxPaymentGatewayAdapter implements PaymentGatewayAdapter {
    private static final String PROVIDER = "sandbox-pg";

    @Override
    public ApproveResult approve(ApproveRequest request) {
        maybeFail(SandboxFailureModeResolver.resolve(request.attributes()), "approve");
        return new ApproveResult(
                PROVIDER,
                "pg-tx-" + UUID.randomUUID(),
                OffsetDateTime.now().toString()
        );
    }

    @Override
    public CancelResult cancel(CancelRequest request) {
        maybeFail(SandboxFailureModeResolver.resolve(request.attributes()), "cancel");
        return new CancelResult(
                PROVIDER,
                OffsetDateTime.now().toString(),
                "pg-cancel-" + UUID.randomUUID()
        );
    }

    private void maybeFail(ExternalFailureMode mode, String operation) {
        if (mode == ExternalFailureMode.NONE) {
            return;
        }
        if (mode == ExternalFailureMode.TIMEOUT) {
            throw new ExternalAdapterException(PROVIDER, mode, true, "sandbox timeout on PG " + operation);
        }
        if (mode == ExternalFailureMode.HTTP_5XX) {
            throw new ExternalAdapterException(PROVIDER, mode, true, "sandbox 5xx on PG " + operation);
        }
        throw new ExternalAdapterException(PROVIDER, mode, false, "sandbox offline on PG " + operation);
    }
}
