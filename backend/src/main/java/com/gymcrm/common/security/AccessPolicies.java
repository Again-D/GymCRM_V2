package com.gymcrm.common.security;

public final class AccessPolicies {
    private AccessPolicies() {}

    // Prototype mode keeps no-auth behavior for local demo flows.
    public static final String PROTOTYPE_OR_MANAGER =
            "@securityModeSettings.isPrototypeMode() or hasAnyRole('SUPER_ADMIN','MANAGER')";

    public static final String PROTOTYPE_OR_MANAGER_OR_DESK =
            "@securityModeSettings.isPrototypeMode() or hasAnyRole('SUPER_ADMIN','MANAGER','DESK')";

    public static final String PROTOTYPE_OR_MANAGER_OR_DESK_OR_TRAINER =
            "@securityModeSettings.isPrototypeMode() or hasAnyRole('SUPER_ADMIN','MANAGER','DESK','TRAINER')";

    public static final String PROTOTYPE_OR_TRAINER =
            "@securityModeSettings.isPrototypeMode() or hasRole('TRAINER')";

}
