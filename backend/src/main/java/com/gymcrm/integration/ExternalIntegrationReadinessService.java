package com.gymcrm.integration;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ExternalIntegrationReadinessService {
    private final PaymentGatewayAdapter paymentGatewayAdapter;
    private final AlimtalkAdapter alimtalkAdapter;
    private final SmsAdapter smsAdapter;
    private final QrGateAdapter qrGateAdapter;

    public ExternalIntegrationReadinessService(
            PaymentGatewayAdapter paymentGatewayAdapter,
            AlimtalkAdapter alimtalkAdapter,
            SmsAdapter smsAdapter,
            QrGateAdapter qrGateAdapter
    ) {
        this.paymentGatewayAdapter = paymentGatewayAdapter;
        this.alimtalkAdapter = alimtalkAdapter;
        this.smsAdapter = smsAdapter;
        this.qrGateAdapter = qrGateAdapter;
    }

    public ReadinessResult runSandboxScenario(SandboxScenario scenario) {
        List<String> logs = new ArrayList<>();
        String runId = UUID.randomUUID().toString();

        PaymentGatewayAdapter.ApproveResult approved;
        try {
            approved = paymentGatewayAdapter.approve(new PaymentGatewayAdapter.ApproveRequest(
                    scenario.centerId(),
                    scenario.memberId(),
                    "sandbox-order-" + runId,
                    scenario.amount(),
                    scenario.paymentMethod(),
                    attributes(scenario.paymentApproveFailureMode(), runId)
            ));
            logs.add("payment.approve.success:" + approved.providerTransactionId());
        } catch (ExternalAdapterException ex) {
            logs.add("payment.approve.failed:" + ex.failureMode());
            return new ReadinessResult(
                    "PAYMENT_APPROVE_FAILED",
                    false,
                    false,
                    false,
                    false,
                    false,
                    false,
                    ex.failureMode().name(),
                    logs
            );
        }

        boolean fallbackUsed = false;
        String messageFailureMode = "NONE";
        try {
            AlimtalkAdapter.SendResult sent = alimtalkAdapter.send(new AlimtalkAdapter.SendRequest(
                    scenario.centerId(),
                    scenario.memberId(),
                    scenario.phone(),
                    "EXPIRY_REMINDER",
                    "sandbox readiness message",
                    attributes(scenario.alimtalkFailureMode(), runId)
            ));
            logs.add("message.alimtalk.success:" + sent.messageId());
        } catch (ExternalAdapterException ex) {
            fallbackUsed = true;
            messageFailureMode = ex.failureMode().name();
            logs.add("message.alimtalk.failed:" + ex.failureMode());
            try {
                SmsAdapter.SendResult smsSent = smsAdapter.send(new SmsAdapter.SendRequest(
                        scenario.centerId(),
                        scenario.memberId(),
                        scenario.phone(),
                        "sandbox fallback sms",
                        attributes(scenario.smsFailureMode(), runId)
                ));
                logs.add("message.sms.fallback.success:" + smsSent.messageId());
            } catch (ExternalAdapterException smsEx) {
                logs.add("message.sms.fallback.failed:" + smsEx.failureMode());
                return new ReadinessResult(
                        "MESSAGE_FALLBACK_FAILED",
                        true,
                        false,
                        true,
                        false,
                        false,
                        false,
                        smsEx.failureMode().name(),
                        logs
                );
            }
        }

        try {
            QrGateAdapter.VerifyResult verified = qrGateAdapter.verifyAndOpen(new QrGateAdapter.VerifyRequest(
                    scenario.centerId(),
                    scenario.memberId(),
                    "sandbox-qr-token-" + runId,
                    scenario.deviceId(),
                    OffsetDateTime.now(ZoneOffset.UTC),
                    attributes(scenario.qrFailureMode(), runId)
            ));
            logs.add("qr.verify.success:" + verified.eventId());
            return new ReadinessResult(
                    fallbackUsed ? "SUCCESS_WITH_MESSAGE_FALLBACK" : "SUCCESS",
                    true,
                    true,
                    fallbackUsed,
                    true,
                    false,
                    false,
                    messageFailureMode,
                    logs
            );
        } catch (ExternalAdapterException qrEx) {
            logs.add("qr.verify.failed:" + qrEx.failureMode());

            try {
                PaymentGatewayAdapter.CancelResult canceled = paymentGatewayAdapter.cancel(new PaymentGatewayAdapter.CancelRequest(
                        scenario.centerId(),
                        approved.providerTransactionId(),
                        scenario.amount(),
                        "sandbox compensation after qr failure",
                        attributes(scenario.paymentCancelFailureMode(), runId)
                ));
                logs.add("payment.cancel.compensation.success:" + canceled.cancelId());
                return new ReadinessResult(
                        "QR_GATE_FAILED_COMPENSATED",
                        true,
                        true,
                        fallbackUsed,
                        false,
                        true,
                        true,
                        messageFailureMode,
                        logs
                );
            } catch (ExternalAdapterException cancelEx) {
                logs.add("payment.cancel.compensation.failed:" + cancelEx.failureMode());
                return new ReadinessResult(
                        "QR_GATE_FAILED_COMPENSATION_FAILED",
                        true,
                        true,
                        fallbackUsed,
                        false,
                        true,
                        false,
                        messageFailureMode,
                        logs
                );
            }
        }
    }

    private Map<String, String> attributes(String failureMode, String runId) {
        Map<String, String> attributes = new HashMap<>();
        attributes.put("simulateFailure", failureMode == null ? "NONE" : failureMode);
        attributes.put("readinessRunId", runId);
        return attributes;
    }

    public record SandboxScenario(
            Long centerId,
            Long memberId,
            BigDecimal amount,
            String paymentMethod,
            String phone,
            String deviceId,
            String paymentApproveFailureMode,
            String alimtalkFailureMode,
            String smsFailureMode,
            String qrFailureMode,
            String paymentCancelFailureMode
    ) {
    }

    public record ReadinessResult(
            String outcome,
            boolean paymentApproved,
            boolean messageSent,
            boolean fallbackToSms,
            boolean qrGateOpened,
            boolean compensationTriggered,
            boolean compensationSucceeded,
            String messageFailureMode,
            List<String> logs
    ) {
    }
}
