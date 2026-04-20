package com.gymcrm.common.auth.service;

import com.gymcrm.audit.AuditLogService;
import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthRefreshTokenRepository;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

@Service
public class AuthAccountLifecycleService {
    private static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";
    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_MANAGER = "ROLE_MANAGER";
    private static final String ROLE_TRAINER = "ROLE_TRAINER";
    private static final String ROLE_DESK = "ROLE_DESK";
    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final Set<String> ADMIN_CREATABLE_ROLE_CODES = Set.of(ROLE_MANAGER, ROLE_TRAINER, ROLE_DESK);
    private static final Set<String> ADMIN_RESETTABLE_ROLE_CODES = Set.of(ROLE_MANAGER, ROLE_TRAINER, ROLE_DESK);

    private final AuthUserRepository authUserRepository;
    private final AuthRefreshTokenRepository authRefreshTokenRepository;
    private final AuthAccessRevocationService authAccessRevocationService;
    private final AuditLogService auditLogService;
    private final CurrentUserProvider currentUserProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthAccountLifecycleService(
            AuthUserRepository authUserRepository,
            AuthRefreshTokenRepository authRefreshTokenRepository,
            AuthAccessRevocationService authAccessRevocationService,
            AuditLogService auditLogService,
            CurrentUserProvider currentUserProvider,
            PasswordEncoder passwordEncoder
    ) {
        this.authUserRepository = authUserRepository;
        this.authRefreshTokenRepository = authRefreshTokenRepository;
        this.authAccessRevocationService = authAccessRevocationService;
        this.auditLogService = auditLogService;
        this.currentUserProvider = currentUserProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AccountLifecycleResult createUser(CreateUserCommand command) {
        AuthUser actor = requireActor();
        Long centerId = currentUserProvider.currentCenterId();
        String loginId = requireText(command.loginId(), "loginId");
        String userName = requireText(command.userName(), "userName");
        String roleCode = normalizeRoleCode(command.roleCode());
        String temporaryPassword = normalizePassword(command.temporaryPassword(), "temporaryPassword");
        validatePasswordPolicy(temporaryPassword, "temporaryPassword");
        ensureCreateRoleAllowed(actor, roleCode);
        ensureLoginIdAvailable(centerId, loginId);

        AuthUser created;
        try {
            created = authUserRepository.insert(new AuthUserRepository.AuthUserCreateCommand(
                    centerId,
                    loginId,
                    passwordEncoder.encode(temporaryPassword),
                    userName,
                    null,
                    null,
                    null,
                    roleCode,
                    STATUS_ACTIVE,
                    true,
                    actor.userId()
            ));
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 존재하는 loginId입니다.");
        }

        auditLogService.recordEvent(
                "ACCOUNT_CREATE",
                "USER",
                String.valueOf(created.userId()),
                "{\"loginId\":\"%s\",\"roleCode\":\"%s\",\"userName\":\"%s\"}".formatted(
                        created.loginId(),
                        created.roleCode(),
                        created.userName()
                )
        );
        return new AccountLifecycleResult(created, null, 0);
    }

    @Transactional
    public AccountLifecycleResult resetPassword(Long targetUserId, ResetPasswordCommand command) {
        AuthUser actor = requireActor();
        AuthUser targetUser = requireScopedUserInCurrentCenter(targetUserId);
        ensureResetAllowed(actor, targetUser);
        String temporaryPassword = normalizePassword(command.temporaryPassword(), "temporaryPassword");
        validatePasswordPolicy(temporaryPassword, "temporaryPassword");

        AuthUser updated = authUserRepository.updatePassword(
                targetUser.userId(),
                passwordEncoder.encode(temporaryPassword),
                true,
                actor.userId()
        );
        if (updated == null) {
            throw new ApiException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다. userId=" + targetUserId);
        }

        OffsetDateTime revokedAfter = OffsetDateTime.now(ZoneOffset.UTC);
        if (authAccessRevocationService.revokeAccessAfter(updated.userId(), revokedAfter, actor.userId()) != 1) {
            throw new ApiException(ErrorCode.CONFLICT, "사용자 access revoke marker를 갱신하지 못했습니다. userId=" + targetUserId);
        }
        int revokedRefreshTokenCount = authRefreshTokenRepository.revokeActiveByUserId(updated.userId(), "PASSWORD_RESET");
        auditLogService.recordEvent(
                "ACCOUNT_PASSWORD_RESET",
                "USER",
                String.valueOf(updated.userId()),
                "{\"targetUserId\":%d,\"roleCode\":\"%s\",\"userStatus\":\"%s\",\"revokedRefreshTokens\":%d}".formatted(
                        updated.userId(),
                        updated.roleCode(),
                        updated.userStatus(),
                        revokedRefreshTokenCount
                )
        );
        return new AccountLifecycleResult(updated, revokedAfter, revokedRefreshTokenCount);
    }

    @Transactional
    public AccountLifecycleResult changePassword(ChangePasswordCommand command) {
        AuthUser actor = requireActor();
        String currentPassword = normalizePassword(command.currentPassword(), "currentPassword");
        String newPassword = normalizePassword(command.newPassword(), "newPassword");
        String newPasswordConfirmation = normalizePassword(command.newPasswordConfirmation(), "newPasswordConfirmation");
        validatePasswordPolicy(newPassword, "newPassword");
        if (!newPassword.equals(newPasswordConfirmation)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "newPasswordConfirmation does not match");
        }

        if (!actor.passwordChangeRequired()) {
            if (currentPassword == null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "currentPassword is required");
            }
            if (!passwordEncoder.matches(currentPassword, actor.passwordHash())) {
                throw new ApiException(ErrorCode.AUTHENTICATION_FAILED, "현재 비밀번호가 올바르지 않습니다.");
            }
        }

        AuthUser updated = authUserRepository.updatePassword(
                actor.userId(),
                passwordEncoder.encode(newPassword),
                false,
                actor.userId()
        );
        if (updated == null) {
            throw new ApiException(ErrorCode.NOT_FOUND, "활성 사용자 정보를 찾을 수 없습니다.");
        }

        OffsetDateTime revokedAfter = OffsetDateTime.now(ZoneOffset.UTC);
        if (authAccessRevocationService.revokeAccessAfter(updated.userId(), revokedAfter, actor.userId()) != 1) {
            throw new ApiException(ErrorCode.CONFLICT, "사용자 access revoke marker를 갱신하지 못했습니다. userId=" + actor.userId());
        }
        int revokedRefreshTokenCount = authRefreshTokenRepository.revokeActiveByUserId(updated.userId(), "PASSWORD_CHANGED");
        auditLogService.recordEvent(
                "ACCOUNT_PASSWORD_CHANGE",
                "USER",
                String.valueOf(updated.userId()),
                "{\"passwordChangeRequired\":false,\"revokedRefreshTokens\":%d}".formatted(revokedRefreshTokenCount)
        );
        return new AccountLifecycleResult(updated, revokedAfter, revokedRefreshTokenCount);
    }

    private AuthUser requireActor() {
        return authUserRepository.findActiveById(currentUserProvider.currentUserId())
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));
    }

    private AuthUser requireScopedUserInCurrentCenter(Long targetUserId) {
        Long centerId = currentUserProvider.currentCenterId();
        return authUserRepository.findActiveByCenterAndUserId(centerId, targetUserId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다. userId=" + targetUserId));
    }

    private void ensureCreateRoleAllowed(AuthUser actor, String requestedRoleCode) {
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())) {
            if (!ROLE_ADMIN.equals(requestedRoleCode)) {
                throw new ApiException(ErrorCode.ACCESS_DENIED, "슈퍼 관리자만 관리자 계정을 생성할 수 있습니다.");
            }
            return;
        }
        if (ROLE_ADMIN.equals(actor.roleCode())) {
            if (!ADMIN_CREATABLE_ROLE_CODES.contains(requestedRoleCode)) {
                throw new ApiException(ErrorCode.ACCESS_DENIED, "관리자 역할은 지정된 운영 역할만 생성할 수 있습니다.");
            }
            return;
        }
        throw new ApiException(ErrorCode.ACCESS_DENIED, "계정 생성 권한이 없습니다.");
    }

    private void ensureResetAllowed(AuthUser actor, AuthUser targetUser) {
        if (actor.userId().equals(targetUser.userId())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "자기 계정은 /my-account에서만 변경할 수 있습니다.");
        }
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())) {
            if (!ROLE_ADMIN.equals(targetUser.roleCode())) {
                throw new ApiException(ErrorCode.ACCESS_DENIED, "슈퍼 관리자만 관리자 계정을 초기화할 수 있습니다.");
            }
            return;
        }
        if (ROLE_ADMIN.equals(actor.roleCode())) {
            if (!ADMIN_RESETTABLE_ROLE_CODES.contains(targetUser.roleCode())) {
                throw new ApiException(ErrorCode.ACCESS_DENIED, "관리자 역할은 지정된 운영 역할만 초기화할 수 있습니다.");
            }
            return;
        }
        throw new ApiException(ErrorCode.ACCESS_DENIED, "비밀번호 초기화 권한이 없습니다.");
    }

    private void ensureLoginIdAvailable(Long centerId, String loginId) {
        if (authUserRepository.findActiveByCenterAndLoginId(centerId, loginId).isPresent()) {
            throw new ApiException(ErrorCode.CONFLICT, "이미 존재하는 loginId입니다.");
        }
    }

    private String normalizeRoleCode(String value) {
        String normalized = requireText(value, "roleCode").toUpperCase();
        if (!normalized.equals(ROLE_SUPER_ADMIN)
                && !normalized.equals(ROLE_ADMIN)
                && !normalized.equals(ROLE_MANAGER)
                && !normalized.equals(ROLE_TRAINER)
                && !normalized.equals(ROLE_DESK)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "roleCode is invalid");
        }
        return normalized;
    }

    private String normalizePassword(String value, String fieldName) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (!fieldName.equals("currentPassword")) {
            return trimmed;
        }
        return trimmed;
    }

    private String requireText(String value, String fieldName) {
        String normalized = normalizePassword(value, fieldName);
        if (normalized == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, fieldName + " is required");
        }
        return normalized;
    }

    private void validatePasswordPolicy(String password, String fieldName) {
        if (password == null || password.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, fieldName + " is required");
        }
        if (password.length() < 8
                || !password.matches(".*[A-Za-z].*")
                || !password.matches(".*[0-9].*")
                || !password.matches(".*[^A-Za-z0-9].*")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, fieldName + " must be at least 8 characters and include letters, numbers, and special characters");
        }
    }

    public record CreateUserCommand(
            String loginId,
            String userName,
            String roleCode,
            String temporaryPassword
    ) {}

    public record ResetPasswordCommand(
            String temporaryPassword
    ) {}

    public record ChangePasswordCommand(
            String currentPassword,
            String newPassword,
            String newPasswordConfirmation
    ) {}

    public record AccountLifecycleResult(
            AuthUser user,
            OffsetDateTime accessRevokedAfter,
            int revokedRefreshTokenCount
    ) {}
}
