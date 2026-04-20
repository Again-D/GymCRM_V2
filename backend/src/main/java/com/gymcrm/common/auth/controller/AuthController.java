package com.gymcrm.common.auth.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.auth.AuthCookieSupport;
import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.service.AuthAccessRevocationService;
import com.gymcrm.common.auth.service.AuthAccountLifecycleService;
import com.gymcrm.common.auth.service.AuthService;
import com.gymcrm.common.auth.service.AuthUserQueryService;
import com.gymcrm.common.auth.service.JwtTokenService;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.common.security.CurrentUserProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpHeaders;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@Validated
public class AuthController {
    private final AuthService authService;
    private final AuthAccessRevocationService authAccessRevocationService;
    private final AuthAccountLifecycleService authAccountLifecycleService;
    private final AuthUserQueryService authUserQueryService;
    private final AuthCookieSupport authCookieSupport;
    private final JwtTokenService jwtTokenService;
    private final CurrentUserProvider currentUserProvider;
    private final Environment environment;

    public AuthController(
            AuthService authService,
            AuthAccessRevocationService authAccessRevocationService,
            AuthAccountLifecycleService authAccountLifecycleService,
            AuthUserQueryService authUserQueryService,
            AuthCookieSupport authCookieSupport,
            JwtTokenService jwtTokenService,
            CurrentUserProvider currentUserProvider,
            Environment environment
    ) {
        this.authService = authService;
        this.authAccessRevocationService = authAccessRevocationService;
        this.authAccountLifecycleService = authAccountLifecycleService;
        this.authUserQueryService = authUserQueryService;
        this.authCookieSupport = authCookieSupport;
        this.jwtTokenService = jwtTokenService;
        this.currentUserProvider = currentUserProvider;
        this.environment = environment;
    }

    @PostMapping("/login")
    public ApiResponse<AuthTokenResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        AuthService.AuthTokens tokens = authService.login(new AuthService.LoginCommand(request.loginId(), request.password()));
        authCookieSupport.writeRefreshTokenCookie(response, tokens.refreshToken(), isProdProfileActive());
        return ApiResponse.success(AuthTokenResponse.from(tokens, jwtTokenService.accessTokenExpiresInSeconds()), "로그인에 성공했습니다.");
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthTokenResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String refreshToken = authCookieSupport.extractRefreshToken(request);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "refresh token cookie가 없습니다.");
        }
        AuthService.AuthTokens tokens = authService.refresh(refreshToken);
        authCookieSupport.writeRefreshTokenCookie(response, tokens.refreshToken(), isProdProfileActive());
        return ApiResponse.success(AuthTokenResponse.from(tokens, jwtTokenService.accessTokenExpiresInSeconds()), "토큰이 재발급되었습니다.");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = authCookieSupport.extractRefreshToken(request);
        authService.logout(refreshToken, extractAccessToken(request));
        authCookieSupport.clearRefreshTokenCookie(response, isProdProfileActive());
        return ApiResponse.success(null, "로그아웃되었습니다.");
    }

    @GetMapping("/me")
    public ApiResponse<AuthMeResponse> me() {
        AuthService.UserSession session = authService.me(currentUserProvider.currentUserId());
        return ApiResponse.success(AuthMeResponse.from(session), "현재 사용자 정보입니다.");
    }

    @GetMapping("/trainers")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<List<TrainerSummaryResponse>> trainers() {
        List<TrainerSummaryResponse> items = authService.listActiveTrainers(currentUserProvider.currentCenterId()).stream()
                .map(TrainerSummaryResponse::from)
                .toList();
        return ApiResponse.success(items, "트레이너 목록 조회 성공");
    }

    @GetMapping("/users")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<UserListResponse> listUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) String userStatus,
            @RequestParam(defaultValue = "1") @jakarta.validation.constraints.Min(1) int page,
            @RequestParam(defaultValue = "20") @jakarta.validation.constraints.Min(1) int size
    ) {
        Page<AuthUser> result = authUserQueryService.listUsers(
                currentUserProvider.currentCenterId(),
                q,
                roleCode,
                userStatus,
                page,
                size
        );
        return ApiResponse.success(UserListResponse.from(result), "사용자 목록 조회 성공");
    }

    @PostMapping("/users/{userId}/revoke-access")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<ForceRevokeAccessResponse> revokeAccess(@PathVariable Long userId) {
        AuthAccessRevocationService.ForceRevokeResult result = authAccessRevocationService.forceRevokeUserAccessInCurrentCenter(userId);
        return ApiResponse.success(
                new ForceRevokeAccessResponse(result.userId(), result.accessRevokedAfter(), result.revokedRefreshTokenCount()),
                "사용자 access token이 강제 무효화되었습니다."
        );
    }

    @PostMapping("/users/{userId}/role")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<UpdateUserRoleResponse> updateRole(@PathVariable Long userId, @Valid @RequestBody UpdateUserRoleRequest request) {
        AuthAccessRevocationService.UpdateUserRoleResult result = authAccessRevocationService.updateRoleAndRevokeInCurrentCenter(userId, request.roleCode());
        return ApiResponse.success(
                new UpdateUserRoleResponse(result.userId(), result.roleCode(), result.accessRevokedAfter(), result.revokedRefreshTokenCount()),
                "사용자 역할이 변경되고 기존 토큰이 무효화되었습니다."
        );
    }

    @PostMapping("/users/{userId}/status")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<UpdateUserStatusResponse> updateStatus(@PathVariable Long userId, @Valid @RequestBody UpdateUserStatusRequest request) {
        AuthAccessRevocationService.UpdateUserStatusResult result = authAccessRevocationService.updateStatusAndRevokeInCurrentCenter(userId, request.userStatus());
        return ApiResponse.success(
                new UpdateUserStatusResponse(result.userId(), result.userStatus(), result.accessRevokedAfter(), result.revokedRefreshTokenCount()),
                "사용자 상태가 변경되고 기존 토큰이 무효화되었습니다."
        );
    }

    @PostMapping("/users")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<AccountLifecycleResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        AuthAccountLifecycleService.AccountLifecycleResult result = authAccountLifecycleService.createUser(
                new AuthAccountLifecycleService.CreateUserCommand(
                        request.loginId(),
                        request.userName(),
                        request.roleCode(),
                        request.temporaryPassword()
                )
        );
        return ApiResponse.success(AccountLifecycleResponse.from(result), "사용자 계정을 생성했습니다.");
    }

    @PostMapping("/users/{userId}/password-reset")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<AccountLifecycleResponse> resetUserPassword(
            @PathVariable Long userId,
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        AuthAccountLifecycleService.AccountLifecycleResult result = authAccountLifecycleService.resetPassword(
                userId,
                new AuthAccountLifecycleService.ResetPasswordCommand(request.temporaryPassword())
        );
        return ApiResponse.success(AccountLifecycleResponse.from(result), "사용자 비밀번호가 초기화되었습니다.");
    }

    @PatchMapping("/password")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER)
    public ApiResponse<AccountLifecycleResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        AuthAccountLifecycleService.AccountLifecycleResult result = authAccountLifecycleService.changePassword(
                new AuthAccountLifecycleService.ChangePasswordCommand(
                        request.currentPassword(),
                        request.newPassword(),
                        request.newPasswordConfirmation()
                )
        );
        return ApiResponse.success(AccountLifecycleResponse.from(result), "비밀번호가 변경되었습니다.");
    }

    private boolean isProdProfileActive() {
        return Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase);
    }

    private String extractAccessToken(HttpServletRequest request) {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        String token = authorization.substring("Bearer ".length()).trim();
        return token.isBlank() ? null : token;
    }

    public record LoginRequest(
            @NotBlank(message = "loginId is required") String loginId,
            @NotBlank(message = "password is required") String password
    ) {}

    public record AuthTokenResponse(
            String accessToken,
            long accessTokenExpiresInSeconds,
            OffsetDateTime accessTokenExpiresAt,
            AuthMeResponse user
    ) {
        static AuthTokenResponse from(AuthService.AuthTokens tokens, long accessTokenExpiresInSeconds) {
            return new AuthTokenResponse(
                    tokens.accessToken(),
                    accessTokenExpiresInSeconds,
                    tokens.accessTokenExpiresAt(),
                    AuthMeResponse.from(tokens.user())
            );
        }
    }

    public record AuthMeResponse(
            Long userId,
            Long centerId,
            String loginId,
            String userName,
            String roleCode,
            boolean passwordChangeRequired,
            String primaryRole,
            List<String> roles
    ) {
        static AuthMeResponse from(AuthService.UserSession session) {
            String roleCode = session.roleCode();
            return new AuthMeResponse(
                    session.userId(),
                    session.centerId(),
                    session.loginId(),
                    session.userName(),
                    roleCode,
                    session.passwordChangeRequired(),
                    roleCode,
                    roleCode == null ? List.of() : List.of(roleCode)
            );
        }
    }

    public record ForceRevokeAccessResponse(
            Long userId,
            OffsetDateTime accessRevokedAfter,
            int revokedRefreshTokenCount
    ) {}

    public record TrainerSummaryResponse(
            Long userId,
            Long centerId,
            String userName
    ) {
        static TrainerSummaryResponse from(AuthUser user) {
            return new TrainerSummaryResponse(user.userId(), user.centerId(), user.userName());
        }
    }

    public record UserListResponse(
            List<UserListItemResponse> items,
            PageInfo page
    ) {
        static UserListResponse from(Page<AuthUser> page) {
            List<UserListItemResponse> items = page.getContent().stream()
                    .map(UserListItemResponse::from)
                    .toList();
            return new UserListResponse(
                    items,
                    new PageInfo(page.getNumber() + 1, page.getSize(), page.getTotalElements(), page.getTotalPages())
            );
        }
    }

    public record UserListItemResponse(
            Long userId,
            String loginId,
            String userName,
            String roleCode,
            String userStatus,
            boolean passwordChangeRequired,
            OffsetDateTime lastLoginAt,
            OffsetDateTime accessRevokedAfter
    ) {
        static UserListItemResponse from(AuthUser user) {
            return new UserListItemResponse(
                    user.userId(),
                    user.loginId(),
                    user.userName(),
                    user.roleCode(),
                    user.userStatus(),
                    user.passwordChangeRequired(),
                    user.lastLoginAt(),
                    user.accessRevokedAfter()
            );
        }
    }

    public record PageInfo(
            int page,
            int size,
            long totalItems,
            int totalPages
    ) {}

    public record UpdateUserRoleRequest(
            @jakarta.validation.constraints.Pattern(
                    regexp = "^(?i)(ROLE_SUPER_ADMIN|ROLE_ADMIN|ROLE_MANAGER|ROLE_TRAINER|ROLE_DESK)$",
                    message = "roleCode is invalid"
            )
            String roleCode
    ) {}

    public record UpdateUserRoleResponse(
            Long userId,
            String roleCode,
            OffsetDateTime accessRevokedAfter,
            int revokedRefreshTokenCount
    ) {}

    public record UpdateUserStatusRequest(
            @jakarta.validation.constraints.Pattern(
                    regexp = "^(?i)(ACTIVE|INACTIVE)$",
                    message = "userStatus is invalid"
            )
            String userStatus
    ) {}

    public record UpdateUserStatusResponse(
            Long userId,
            String userStatus,
            OffsetDateTime accessRevokedAfter,
            int revokedRefreshTokenCount
    ) {}

    public record CreateUserRequest(
            @NotBlank(message = "loginId is required") String loginId,
            @NotBlank(message = "userName is required") String userName,
            @NotBlank(message = "roleCode is required")
            @jakarta.validation.constraints.Pattern(
                    regexp = "^(?i)(ROLE_SUPER_ADMIN|ROLE_ADMIN|ROLE_MANAGER|ROLE_TRAINER|ROLE_DESK)$",
                    message = "roleCode is invalid"
            )
            String roleCode,
            @NotBlank(message = "temporaryPassword is required") String temporaryPassword
    ) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "temporaryPassword is required") String temporaryPassword
    ) {}

    public record ChangePasswordRequest(
            String currentPassword,
            @NotBlank(message = "newPassword is required") String newPassword,
            @NotBlank(message = "newPasswordConfirmation is required") String newPasswordConfirmation
    ) {}

    public record AccountLifecycleResponse(
            Long userId,
            Long centerId,
            String loginId,
            String userName,
            String roleCode,
            String userStatus,
            boolean passwordChangeRequired,
            OffsetDateTime accessRevokedAfter,
            int revokedRefreshTokenCount
    ) {
        static AccountLifecycleResponse from(AuthAccountLifecycleService.AccountLifecycleResult result) {
            AuthUser user = result.user();
            return new AccountLifecycleResponse(
                    user.userId(),
                    user.centerId(),
                    user.loginId(),
                    user.userName(),
                    user.roleCode(),
                    user.userStatus(),
                    user.passwordChangeRequired(),
                    result.accessRevokedAfter(),
                    result.revokedRefreshTokenCount()
            );
        }
    }
}
