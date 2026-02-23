package com.gymcrm.common.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class PrototypeCurrentUserProvider implements CurrentUserProvider {
    private final Long defaultUserId;
    private final String defaultUsername;

    public PrototypeCurrentUserProvider(
            @Value("${app.prototype.default-admin-user-id:1}") Long defaultUserId,
            @Value("${app.prototype.default-admin-username:prototype-admin}") String defaultUsername
    ) {
        this.defaultUserId = defaultUserId;
        this.defaultUsername = defaultUsername;
    }

    @Override
    public Long currentUserId() {
        return defaultUserId;
    }

    @Override
    public String currentUsername() {
        return defaultUsername;
    }
}

