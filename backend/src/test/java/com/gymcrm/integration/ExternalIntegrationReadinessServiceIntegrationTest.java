package com.gymcrm.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class ExternalIntegrationReadinessServiceIntegrationTest {

    @Autowired
    private ExternalIntegrationReadinessService readinessService;

    @Test
    void successScenarioUsesAllAdaptersWithoutFallback() {
        ExternalIntegrationReadinessService.ReadinessResult result = readinessService.runSandboxScenario(baseScenario(
                "NONE",
                "NONE",
                "NONE",
                "NONE",
                "NONE"
        ));

        assertEquals("SUCCESS", result.outcome());
        assertTrue(result.paymentApproved());
        assertTrue(result.messageSent());
        assertFalse(result.fallbackToSms());
        assertTrue(result.qrGateOpened());
        assertFalse(result.compensationTriggered());
        assertFalse(result.compensationSucceeded());
        assertFalse(result.logs().isEmpty());
    }

    @Test
    void alimtalkTimeoutFallsBackToSms() {
        ExternalIntegrationReadinessService.ReadinessResult result = readinessService.runSandboxScenario(baseScenario(
                "NONE",
                "TIMEOUT",
                "NONE",
                "NONE",
                "NONE"
        ));

        assertEquals("SUCCESS_WITH_MESSAGE_FALLBACK", result.outcome());
        assertTrue(result.paymentApproved());
        assertTrue(result.messageSent());
        assertTrue(result.fallbackToSms());
        assertTrue(result.qrGateOpened());
        assertTrue(result.logs().stream().anyMatch(log -> log.startsWith("message.alimtalk.failed:")));
        assertTrue(result.logs().stream().anyMatch(log -> log.startsWith("message.sms.fallback.success:")));
    }

    @Test
    void alimtalkAndSmsFailuresReturnStructuredFallbackFailureOutcome() {
        ExternalIntegrationReadinessService.ReadinessResult result = readinessService.runSandboxScenario(baseScenario(
                "NONE",
                "HTTP_5XX",
                "TIMEOUT",
                "NONE",
                "NONE"
        ));

        assertEquals("MESSAGE_FALLBACK_FAILED", result.outcome());
        assertTrue(result.paymentApproved());
        assertFalse(result.messageSent());
        assertTrue(result.fallbackToSms());
        assertFalse(result.qrGateOpened());
        assertFalse(result.compensationTriggered());
        assertFalse(result.compensationSucceeded());
        assertTrue(result.logs().stream().anyMatch(log -> log.startsWith("message.alimtalk.failed:")));
        assertTrue(result.logs().stream().anyMatch(log -> log.startsWith("message.sms.fallback.failed:")));
    }

    @Test
    void qrFailureTriggersPaymentCompensation() {
        ExternalIntegrationReadinessService.ReadinessResult result = readinessService.runSandboxScenario(baseScenario(
                "NONE",
                "NONE",
                "NONE",
                "HTTP_5XX",
                "NONE"
        ));

        assertEquals("QR_GATE_FAILED_COMPENSATED", result.outcome());
        assertTrue(result.paymentApproved());
        assertTrue(result.messageSent());
        assertFalse(result.qrGateOpened());
        assertTrue(result.compensationTriggered());
        assertTrue(result.compensationSucceeded());
        assertTrue(result.logs().stream().anyMatch(log -> log.startsWith("payment.cancel.compensation.success:")));
    }

    @Test
    void qrFailureAndCancelTimeoutLeavesCompensationFailureSignal() {
        ExternalIntegrationReadinessService.ReadinessResult result = readinessService.runSandboxScenario(baseScenario(
                "NONE",
                "NONE",
                "NONE",
                "HTTP_5XX",
                "TIMEOUT"
        ));

        assertEquals("QR_GATE_FAILED_COMPENSATION_FAILED", result.outcome());
        assertTrue(result.paymentApproved());
        assertTrue(result.compensationTriggered());
        assertFalse(result.compensationSucceeded());
        assertTrue(result.logs().stream().anyMatch(log -> log.startsWith("payment.cancel.compensation.failed:")));
    }

    @Test
    void paymentTimeoutFailsFastBeforeMessageAndQr() {
        ExternalIntegrationReadinessService.ReadinessResult result = readinessService.runSandboxScenario(baseScenario(
                "TIMEOUT",
                "NONE",
                "NONE",
                "NONE",
                "NONE"
        ));

        assertEquals("PAYMENT_APPROVE_FAILED", result.outcome());
        assertFalse(result.paymentApproved());
        assertFalse(result.messageSent());
        assertFalse(result.qrGateOpened());
        assertFalse(result.compensationTriggered());
        assertTrue(result.logs().stream().anyMatch(log -> log.startsWith("payment.approve.failed:")));
    }

    private ExternalIntegrationReadinessService.SandboxScenario baseScenario(
            String paymentApproveFailure,
            String alimtalkFailure,
            String smsFailure,
            String qrFailure,
            String paymentCancelFailure
    ) {
        return new ExternalIntegrationReadinessService.SandboxScenario(
                1L,
                1L,
                new BigDecimal("10000"),
                "CARD",
                "010-1234-5678",
                "GATE-01",
                paymentApproveFailure,
                alimtalkFailure,
                smsFailure,
                qrFailure,
                paymentCancelFailure
        );
    }
}
