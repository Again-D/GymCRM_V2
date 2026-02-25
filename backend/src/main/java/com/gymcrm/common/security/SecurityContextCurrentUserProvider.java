package com.gymcrm.common.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnExpression("'${app.security.mode:prototype}'.trim().equalsIgnoreCase('jwt')")
public class SecurityContextCurrentUserProvider implements CurrentUserProvider {

    @Override
    public Long currentUserId() {
        Authentication authentication = requireAuthentication();
        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthenticatedUserPrincipal p) {
            return p.userId();
        }
        throw new IllegalStateException("Authenticated principal does not expose userId yet");
    }

    @Override
    public String currentUsername() {
        Authentication authentication = requireAuthentication();
        if (authentication.getName() == null || authentication.getName().isBlank()) {
            throw new IllegalStateException("Authenticated principal does not expose username");
        }
        return authentication.getName();
    }

    @Override
    public Long currentCenterId() {
        Authentication authentication = requireAuthentication();
        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthenticatedUserPrincipal p) {
            return p.centerId();
        }
        throw new IllegalStateException("Authenticated principal does not expose centerId");
    }

    private Authentication requireAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            throw new IllegalStateException("No authenticated user in security context");
        }
        return authentication;
    }

    public record AuthenticatedUserPrincipal(Long userId, Long centerId, String username, String roleCode) {}
}
