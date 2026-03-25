package com.gymcrm.crm.service;

import java.time.OffsetDateTime;
import java.util.List;

public interface CrmRetryWheelService {
    List<Long> pollDue(Long centerId, OffsetDateTime now, int limit);

    void schedule(Long centerId, Long crmMessageEventId, OffsetDateTime nextAttemptAt);

    void remove(Long centerId, Long crmMessageEventId);
}
