package com.gymcrm.crm;

import com.gymcrm.crm.entity.CrmMessageEvent;

public interface CrmMessageSender {
    SendResult send(CrmMessageEvent event);

    record SendResult(
            boolean success,
            String providerMessageId,
            String errorMessage
    ) {
    }
}
