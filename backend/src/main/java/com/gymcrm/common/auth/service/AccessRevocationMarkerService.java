package com.gymcrm.common.auth.service;

import java.time.OffsetDateTime;

public interface AccessRevocationMarkerService {
    void mirrorRevokeAfter(Long userId, OffsetDateTime revokedAfter);

    OffsetDateTime resolveRevokeAfter(Long userId, OffsetDateTime canonicalValue);

    void clear(Long userId);
}
