package com.gymcrm.common.security;

public final class AccessPolicies {
    private AccessPolicies() {}

    // Prototype mode keeps no-auth behavior for local demo flows.
    public static final String PROTOTYPE_OR_CENTER_ADMIN =
            "@securityModeSettings.isPrototypeMode() or hasRole('CENTER_ADMIN')";

    public static final String PROTOTYPE_OR_CENTER_ADMIN_OR_DESK =
            "@securityModeSettings.isPrototypeMode() or hasAnyRole('CENTER_ADMIN','DESK')";
}
