package com.gymcrm.access;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.integration.ExternalFailureMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@Validated
@RestController
@RequestMapping("/api/v1/access/qr")
public class QrController {
    private final QrCodeService qrCodeService;

    public QrController(QrCodeService qrCodeService) {
        this.qrCodeService = qrCodeService;
    }

    @PostMapping("/issue")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<IssueQrResponse> issue(@Valid @RequestBody IssueQrRequest request) {
        QrCodeService.IssueResult issued = qrCodeService.issue(request.memberId());
        return ApiResponse.success(IssueQrResponse.from(issued), "동적 QR 코드가 발급되었습니다.");
    }

    @PostMapping("/verify")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<VerifyQrResponse> verify(@Valid @RequestBody VerifyQrRequest request) {
        QrCodeService.VerifyResult verified = qrCodeService.verifyAndHandle(
                new QrCodeService.VerifyRequest(
                        request.qrToken(),
                        request.deviceId(),
                        request.gateMode() == null ? QrCodeService.GateMode.ONLINE : request.gateMode(),
                        request.simulateFailure() == null ? ExternalFailureMode.NONE : request.simulateFailure()
                )
        );
        return ApiResponse.success(VerifyQrResponse.from(verified), "게이트 QR 검증이 처리되었습니다.");
    }

    public record IssueQrRequest(@NotNull(message = "memberId is required") Long memberId) {
    }

    public record VerifyQrRequest(
            @NotBlank(message = "qrToken is required") String qrToken,
            @NotBlank(message = "deviceId is required") String deviceId,
            QrCodeService.GateMode gateMode,
            ExternalFailureMode simulateFailure
    ) {
    }

    public record IssueQrResponse(
            String qrToken,
            Long memberId,
            OffsetDateTime issuedAt,
            OffsetDateTime expiresAt,
            int ttlSeconds
    ) {
        static IssueQrResponse from(QrCodeService.IssueResult result) {
            return new IssueQrResponse(
                    result.qrToken(),
                    result.memberId(),
                    result.issuedAt(),
                    result.expiresAt(),
                    result.ttlSeconds()
            );
        }
    }

    public record VerifyQrResponse(
            boolean allowed,
            String gateAction,
            String code,
            String reason,
            String deviceId,
            OffsetDateTime verifiedAt,
            AccessController.AccessEventResponse accessEvent
    ) {
        static VerifyQrResponse from(QrCodeService.VerifyResult result) {
            return new VerifyQrResponse(
                    result.allowed(),
                    result.gateAction(),
                    result.code(),
                    result.reason(),
                    result.deviceId(),
                    result.verifiedAt(),
                    result.accessEvent() == null ? null : AccessController.AccessEventResponse.from(result.accessEvent())
            );
        }
    }
}
