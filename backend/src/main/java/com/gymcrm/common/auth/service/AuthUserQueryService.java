package com.gymcrm.common.auth.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthUserQueryService {
    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_MANAGER = "ROLE_MANAGER";
    private static final String ROLE_DESK = "ROLE_DESK";
    private static final String ROLE_TRAINER = "ROLE_TRAINER";
    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_INACTIVE = "INACTIVE";

    private final AuthUserRepository authUserRepository;

    public AuthUserQueryService(AuthUserRepository authUserRepository) {
        this.authUserRepository = authUserRepository;
    }

    @Transactional(readOnly = true)
    public Page<AuthUser> listUsers(Long centerId, String q, String roleCode, String userStatus, int page, int size) {
        String normalizedQuery = normalizeOptionalText(q);
        String normalizedRoleCode = normalizeRoleCode(roleCode);
        String normalizedUserStatus = normalizeUserStatus(userStatus);
        return authUserRepository.searchUsers(
                centerId,
                normalizedQuery,
                normalizedRoleCode,
                normalizedUserStatus,
                PageRequest.of(page - 1, size)
        );
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeRoleCode(String value) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            return null;
        }
        String upper = normalized.toUpperCase();
        if (!upper.equals(ROLE_ADMIN)
                && !upper.equals(ROLE_MANAGER)
                && !upper.equals(ROLE_DESK)
                && !upper.equals(ROLE_TRAINER)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "roleCode is invalid");
        }
        return upper;
    }

    private String normalizeUserStatus(String value) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            return null;
        }
        String upper = normalized.toUpperCase();
        if (!upper.equals(STATUS_ACTIVE) && !upper.equals(STATUS_INACTIVE)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "userStatus is invalid");
        }
        return upper;
    }
}
