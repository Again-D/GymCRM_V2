package com.gymcrm.common.auth.service;

import com.gymcrm.audit.AuditLogService;
import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthRefreshTokenRepository;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

@Service
public class AuthAccessRevocationService {
    private static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";
    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_MANAGER = "ROLE_MANAGER";
    private static final String ROLE_TRAINER = "ROLE_TRAINER";
    private static final String ROLE_DESK = "ROLE_DESK";
    private static final Set<String> ADMIN_ASSIGNABLE_ROLE_CODES = Set.of(ROLE_MANAGER, ROLE_TRAINER, ROLE_DESK);
    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_INACTIVE = "INACTIVE";

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
        AuthUser targetUser = requireScopedUser(centerId, targetUserId);
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

    @Transactional
    public UpdateUserRoleResult updateRoleAndRevoke(Long targetUserId, String requestedRoleCode) {
        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        AuthUser actor = requireActor();
        AuthUser targetUser = requireScopedUser(centerId, targetUserId);
        String normalizedRoleCode = normalizeRoleCode(requestedRoleCode);
        ensureRoleChangeAllowed(actor, targetUser, normalizedRoleCode);
        OffsetDateTime revokedAfter = OffsetDateTime.now(ZoneOffset.UTC);

        int updatedRole = authUserRepository.updateRoleCode(targetUser.userId(), normalizedRoleCode, actorUserId);
        if (updatedRole != 1) {
            throw new ApiException(ErrorCode.CONFLICT, "사용자 역할을 갱신하지 못했습니다. userId=" + targetUserId);
        }
        authUserRepository.updateAccessRevokedAfter(targetUser.userId(), revokedAfter, actorUserId);
        accessRevocationMarkerService.mirrorRevokeAfter(targetUser.userId(), revokedAfter);
        int revokedRefreshTokens = authRefreshTokenRepository.revokeActiveByUserId(targetUser.userId(), "ROLE_CHANGED");
        auditLogService.recordEvent(
                "ACCOUNT_ROLE_CHANGE",
                "USER",
                String.valueOf(targetUser.userId()),
                "{\"targetUserId\":%d,\"previousRoleCode\":\"%s\",\"roleCode\":\"%s\",\"revokedRefreshTokens\":%d}".formatted(
                        targetUser.userId(),
                        targetUser.roleCode(),
                        normalizedRoleCode,
                        revokedRefreshTokens
                )
        );
        return new UpdateUserRoleResult(targetUser.userId(), normalizedRoleCode, revokedAfter, revokedRefreshTokens);
    }

    @Transactional
    public UpdateUserStatusResult updateStatusAndRevoke(Long targetUserId, String requestedUserStatus) {
        Long centerId = currentUserProvider.currentCenterId();
        Long actorUserId = currentUserProvider.currentUserId();
        AuthUser targetUser = requireScopedUser(centerId, targetUserId);
        String normalizedUserStatus = normalizeUserStatus(requestedUserStatus);
        OffsetDateTime revokedAfter = OffsetDateTime.now(ZoneOffset.UTC);

        int updatedStatus = authUserRepository.updateUserStatus(targetUser.userId(), normalizedUserStatus, actorUserId);
        if (updatedStatus != 1) {
            throw new ApiException(ErrorCode.CONFLICT, "사용자 user_status를 갱신하지 못했습니다. userId=" + targetUserId);
        }
        authUserRepository.updateAccessRevokedAfter(targetUser.userId(), revokedAfter, actorUserId);
        accessRevocationMarkerService.mirrorRevokeAfter(targetUser.userId(), revokedAfter);
        int revokedRefreshTokens = authRefreshTokenRepository.revokeActiveByUserId(targetUser.userId(), "STATUS_CHANGED");
        auditLogService.recordEvent(
                "ACCOUNT_STATUS_CHANGE",
                "USER",
                String.valueOf(targetUser.userId()),
                "{\"targetUserId\":%d,\"previousUserStatus\":\"%s\",\"userStatus\":\"%s\",\"revokedRefreshTokens\":%d}".formatted(
                        targetUser.userId(),
                        targetUser.userStatus(),
                        normalizedUserStatus,
                        revokedRefreshTokens
                )
        );
        return new UpdateUserStatusResult(targetUser.userId(), normalizedUserStatus, revokedAfter, revokedRefreshTokens);
    }

    private AuthUser requireScopedUser(Long centerId, Long targetUserId) {
        AuthUser actor = requireActor();
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())) {
            return authUserRepository.findById(targetUserId)
                    .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다. userId=" + targetUserId));
        }
        return authUserRepository.findActiveByCenterAndUserId(centerId, targetUserId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다. userId=" + targetUserId));
    }

    private AuthUser requireActor() {
        return authUserRepository.findActiveById(currentUserProvider.currentUserId())
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));
    }

    private void ensureRoleChangeAllowed(AuthUser actor, AuthUser targetUser, String normalizedRoleCode) {
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())) {
            return;
        }
        if (ROLE_ADMIN.equals(actor.roleCode()) && !ADMIN_ASSIGNABLE_ROLE_CODES.contains(normalizedRoleCode)) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "관리자 역할은 지정된 운영 역할만 변경할 수 있습니다.");
        }
        if (actor.userId().equals(targetUser.userId())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "본인 역할은 변경할 수 없습니다.");
        }
        if (ROLE_SUPER_ADMIN.equals(normalizedRoleCode)
                || ROLE_ADMIN.equals(normalizedRoleCode)
                || ROLE_SUPER_ADMIN.equals(targetUser.roleCode())
                || ROLE_ADMIN.equals(targetUser.roleCode())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "슈퍼 관리자 권한은 슈퍼 관리자만 변경할 수 있습니다.");
        }
    }

    private String normalizeRoleCode(String requestedRoleCode) {
        if (requestedRoleCode == null || requestedRoleCode.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "roleCode is required");
        }
        String normalized = requestedRoleCode.trim().toUpperCase();
        if (!normalized.equals(ROLE_SUPER_ADMIN)
                && !normalized.equals(ROLE_ADMIN)
                && !normalized.equals(ROLE_MANAGER)
                && !normalized.equals(ROLE_TRAINER)
                && !normalized.equals(ROLE_DESK)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "roleCode is invalid");
        }
        return normalized;
    }

    private String normalizeUserStatus(String requestedUserStatus) {
        if (requestedUserStatus == null || requestedUserStatus.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "userStatus is required");
        }
        String normalized = requestedUserStatus.trim().toUpperCase();
        if (!normalized.equals(STATUS_ACTIVE) && !normalized.equals(STATUS_INACTIVE)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "userStatus is invalid");
        }
        return normalized;
    }

    public record ForceRevokeResult(
            Long userId,
            OffsetDateTime accessRevokedAfter,
            int revokedRefreshTokenCount
    ) {}

    public record UpdateUserRoleResult(
            Long userId,
            String roleCode,
            OffsetDateTime accessRevokedAfter,
            int revokedRefreshTokenCount
    ) {}

    public record UpdateUserStatusResult(
            Long userId,
            String userStatus,
            OffsetDateTime accessRevokedAfter,
            int revokedRefreshTokenCount
    ) {}
}
