package com.gymcrm.common.auth.service;

import java.time.OffsetDateTime;

public class NoOpAccessRevocationMarkerService implements AccessRevocationMarkerService {
    @Override
    public void mirrorRevokeAfter(Long userId, OffsetDateTime revokedAfter) {
        // no-op when runtime marker cache is disabled
    }

    @Override
    public OffsetDateTime resolveRevokeAfter(Long userId, OffsetDateTime canonicalValue) {
        return canonicalValue;
    }

    @Override
    public void clear(Long userId) {
        // no-op when runtime marker cache is disabled
    }
}
