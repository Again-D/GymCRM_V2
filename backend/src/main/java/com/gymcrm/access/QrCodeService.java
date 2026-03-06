package com.gymcrm.access;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.integration.ExternalFailureMode;
import com.gymcrm.member.Member;
import com.gymcrm.member.MemberRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class QrCodeService {
    private static final int MIN_QR_TTL_SECONDS = 1;
    private static final int MAX_QR_TTL_SECONDS = 300;

    private final QrTokenStore qrTokenStore;
    private final MemberRepository memberRepository;
    private final AccessService accessService;
    private final CurrentUserProvider currentUserProvider;
    private final int qrTtlSeconds;

    public QrCodeService(
            QrTokenStore qrTokenStore,
            MemberRepository memberRepository,
            AccessService accessService,
            CurrentUserProvider currentUserProvider,
            @Value("${app.access.qr.ttl-seconds:30}") int qrTtlSeconds
    ) {
        this.qrTokenStore = qrTokenStore;
        this.memberRepository = memberRepository;
        this.accessService = accessService;
        this.currentUserProvider = currentUserProvider;
        this.qrTtlSeconds = normalizeTtl(qrTtlSeconds);
    }

    @Transactional
    public IssueResult issue(Long memberId) {
        if (memberId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "memberId is required");
        }
        Long centerId = currentUserProvider.currentCenterId();
        validateMember(centerId, memberId);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        QrTokenStore.IssuedToken issuedToken = qrTokenStore.issue(centerId, memberId, now, qrTtlSeconds);
        return new IssueResult(
                issuedToken.token(),
                issuedToken.memberId(),
                issuedToken.issuedAt(),
                issuedToken.expiresAt(),
                qrTtlSeconds
        );
    }

    @Transactional
    public VerifyResult verifyAndHandle(VerifyRequest request) {
        if (request == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "request is required");
        }
        if (request.qrToken() == null || request.qrToken().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "qrToken is required");
        }
        if (request.deviceId() == null || request.deviceId().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "deviceId is required");
        }

        if (request.gateMode() == GateMode.OFFLINE) {
            return VerifyResult.offlineFallback(request.deviceId());
        }

        Long centerId = currentUserProvider.currentCenterId();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        QrTokenStore.ConsumedToken consumed = qrTokenStore.consume(centerId, request.qrToken().trim(), now);

        if (!consumed.matchesCenter(centerId)) {
            return VerifyResult.denied("A002", "QR_INVALID", "유효하지 않은 QR 코드입니다.", null, request.deviceId());
        }

        if (consumed.status() == QrTokenStore.ConsumeStatus.EXPIRED) {
            AccessEvent denied = accessService.recordGateDenied(consumed.memberId(), "QR_EXPIRED");
            return VerifyResult.denied("A003", "QR_EXPIRED", "QR 코드가 만료되었습니다.", denied, request.deviceId());
        }

        if (consumed.status() == QrTokenStore.ConsumeStatus.REUSED) {
            AccessEvent denied = accessService.recordGateDenied(consumed.memberId(), "QR_REUSED");
            return VerifyResult.denied("A004", "QR_REUSED", "이미 사용된 QR 코드입니다.", denied, request.deviceId());
        }

        if (consumed.status() == QrTokenStore.ConsumeStatus.INVALID) {
            return VerifyResult.denied("A002", "QR_INVALID", "유효하지 않은 QR 코드입니다.", null, request.deviceId());
        }

        if (request.simulateFailure() == ExternalFailureMode.TIMEOUT) {
            AccessEvent denied = accessService.recordGateDenied(consumed.memberId(), "GATE_TIMEOUT");
            return VerifyResult.denied("A101", "GATE_TIMEOUT", "게이트 제어 요청 시간이 초과되었습니다.", denied, request.deviceId());
        }
        if (request.simulateFailure() == ExternalFailureMode.HTTP_5XX) {
            AccessEvent denied = accessService.recordGateDenied(consumed.memberId(), "GATE_SERVER_ERROR");
            return VerifyResult.denied("A102", "GATE_SERVER_ERROR", "게이트 제어 서버 오류가 발생했습니다.", denied, request.deviceId());
        }
        if (request.simulateFailure() == ExternalFailureMode.OFFLINE) {
            AccessEvent denied = accessService.recordGateDenied(consumed.memberId(), "GATE_OFFLINE");
            return VerifyResult.denied("A103", "GATE_OFFLINE", "게이트 장비가 오프라인 상태입니다.", denied, request.deviceId());
        }

        try {
            AccessEvent granted = accessService.enter(new AccessService.EnterRequest(consumed.memberId(), null, null));
            return VerifyResult.allowed(granted, request.deviceId());
        } catch (AccessDeniedApiException denied) {
            return VerifyResult.denied(
                    "A001",
                    "ACCESS_DENIED",
                    denied.getMessage(),
                    null,
                    request.deviceId()
            );
        }
    }

    private Member validateMember(Long centerId, Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + memberId));
        if (!centerId.equals(member.centerId())) {
            throw new ApiException(ErrorCode.NOT_FOUND, "회원을 찾을 수 없습니다. memberId=" + memberId);
        }
        return member;
    }

    private int normalizeTtl(int ttlSeconds) {
        if (ttlSeconds < MIN_QR_TTL_SECONDS || ttlSeconds > MAX_QR_TTL_SECONDS) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "app.access.qr.ttl-seconds must be between " + MIN_QR_TTL_SECONDS + " and " + MAX_QR_TTL_SECONDS
            );
        }
        return ttlSeconds;
    }

    public enum GateMode {
        ONLINE,
        OFFLINE
    }

    public record VerifyRequest(String qrToken, String deviceId, GateMode gateMode, ExternalFailureMode simulateFailure) {
    }

    public record IssueResult(
            String qrToken,
            Long memberId,
            OffsetDateTime issuedAt,
            OffsetDateTime expiresAt,
            int ttlSeconds
    ) {
    }

    public record VerifyResult(
            boolean allowed,
            String gateAction,
            String code,
            String reason,
            AccessEvent accessEvent,
            String deviceId,
            OffsetDateTime verifiedAt
    ) {
        static VerifyResult allowed(AccessEvent accessEvent, String deviceId) {
            return new VerifyResult(
                    true,
                    "OPEN_GATE",
                    "OK",
                    "인증 성공",
                    accessEvent,
                    deviceId,
                    OffsetDateTime.now(ZoneOffset.UTC)
            );
        }

        static VerifyResult denied(String code, String reason, String detail, AccessEvent deniedEvent, String deviceId) {
            return new VerifyResult(
                    false,
                    "KEEP_LOCKED",
                    code,
                    reason + ": " + detail,
                    deniedEvent,
                    deviceId,
                    OffsetDateTime.now(ZoneOffset.UTC)
            );
        }

        static VerifyResult offlineFallback(String deviceId) {
            return new VerifyResult(
                    false,
                    "USE_OFFLINE_CACHE",
                    "A099",
                    "GATE_OFFLINE_FALLBACK: 서버 연결 불가로 게이트 로컬 캐시 검증이 필요합니다.",
                    null,
                    deviceId,
                    OffsetDateTime.now(ZoneOffset.UTC)
            );
        }
    }
}
