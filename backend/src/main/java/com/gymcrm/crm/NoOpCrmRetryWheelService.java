package com.gymcrm.crm;

import java.time.OffsetDateTime;
import java.util.List;

public class NoOpCrmRetryWheelService implements CrmRetryWheelService {
    @Override
    public List<Long> pollDue(Long centerId, OffsetDateTime now, int limit) {
        return List.of();
    }

    @Override
    public void schedule(Long centerId, Long crmMessageEventId, OffsetDateTime nextAttemptAt) {
        // no-op when retry wheel is disabled
    }

    @Override
    public void remove(Long centerId, Long crmMessageEventId) {
        // no-op when retry wheel is disabled
    }
}
