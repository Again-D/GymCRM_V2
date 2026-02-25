package com.gymcrm.common.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnExpression("'${app.security.mode:prototype}'.trim().equalsIgnoreCase('prototype')")
public class PrototypeCurrentUserProvider implements CurrentUserProvider {
    private final Long defaultUserId;
    private final Long defaultCenterId;
    private final String defaultUsername;

    public PrototypeCurrentUserProvider(
            @Value("${app.prototype.default-admin-user-id:1}") Long defaultUserId,
            @Value("${app.prototype.default-center-id:1}") Long defaultCenterId,
            @Value("${app.prototype.default-admin-username:prototype-admin}") String defaultUsername
    ) {
        this.defaultUserId = defaultUserId;
        this.defaultCenterId = defaultCenterId;
        this.defaultUsername = defaultUsername;
    }

    @Override
    public Long currentUserId() {
        return defaultUserId;
    }

    @Override
    public Long currentCenterId() {
        return defaultCenterId;
    }

    @Override
    public String currentUsername() {
        return defaultUsername;
    }
}
