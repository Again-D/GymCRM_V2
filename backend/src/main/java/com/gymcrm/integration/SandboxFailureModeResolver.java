package com.gymcrm.integration;

import java.util.Map;

final class SandboxFailureModeResolver {
    private static final String KEY = "simulateFailure";

    private SandboxFailureModeResolver() {
    }

    static ExternalFailureMode resolve(Map<String, String> attributes) {
        if (attributes == null) {
            return ExternalFailureMode.NONE;
        }
        return ExternalFailureMode.from(attributes.get(KEY));
    }
}
