package com.gymcrm.auth;

import com.gymcrm.audit.AuditLogService;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class AuthAccessRevocationService {
    private final AuthUserRepository authUserRepository;
    private final AuthRefreshTokenRepository authRefreshTokenRepository;
    private final AccessRevocationMarkerService accessRevocationMarkerService;
    private final AuditLogService auditLogService;
    private final CurrentUserProvider currentUserProvider;

    public AuthAccessRevocationService(
            AuthUserRepository authUserRepository,
            AuthRefreshTokenRepository authRefreshTokenRepository,
            AccessRevocationMarkerService accessRevocationMarkerService,
            AuditLogService auditLogService,
            CurrentUserProvider currentUserProvider
    ) {
        this.authUserRepository = authUserRepository;
        this.authRefreshTokenRepository = authRefreshTokenRepository;
        this.accessRevocationMarkerService = accessRevocationMarkerService;
        this.auditLogService = auditLogService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public int revokeAccessAfter(Long userId, OffsetDateTime revokedAfter, Long updatedBy) {
        int updated = authUserRepository.updateAccessRevokedAfter(userId, revokedAfter, updatedBy);
        if (updated == 1) {
            accessRevocationMarkerService.mirrorRevokeAfter(userId, revokedAfter);
        }
        return updated;
    }

    @Transactional
    public ForceRevokeResult forceRevokeUserAccess(Long targetUserId) {
        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        AuthUser targetUser = authUserRepository.findActiveByCenterAndUserId(centerId, targetUserId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다. userId=" + targetUserId));
        OffsetDateTime revokedAfter = OffsetDateTime.now(ZoneOffset.UTC);
        int updated = authUserRepository.updateAccessRevokedAfter(targetUser.userId(), revokedAfter, actorUserId);
        if (updated != 1) {
            throw new ApiException(ErrorCode.CONFLICT, "사용자 access revoke marker를 갱신하지 못했습니다. userId=" + targetUserId);
        }
        accessRevocationMarkerService.mirrorRevokeAfter(targetUser.userId(), revokedAfter);
        int revokedRefreshTokens = authRefreshTokenRepository.revokeActiveByUserId(targetUser.userId(), "FORCED_REVOKE");
        auditLogService.recordEvent(
                "ACCOUNT_ACCESS_REVOKE",
                "USER",
                String.valueOf(targetUser.userId()),
                "{\"targetUserId\":%d,\"revokedRefreshTokens\":%d}".formatted(targetUser.userId(), revokedRefreshTokens)
        );
        return new ForceRevokeResult(targetUser.userId(), revokedAfter, revokedRefreshTokens);
    }

    public record ForceRevokeResult(
            Long userId,
            OffsetDateTime accessRevokedAfter,
            int revokedRefreshTokenCount
    ) {}
}
