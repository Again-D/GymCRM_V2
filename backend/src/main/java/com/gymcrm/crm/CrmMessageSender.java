package com.gymcrm.crm;

public interface CrmMessageSender {
    SendResult send(CrmMessageEvent event);

    record SendResult(
            boolean success,
            String providerMessageId,
            String errorMessage
    ) {
    }
}
