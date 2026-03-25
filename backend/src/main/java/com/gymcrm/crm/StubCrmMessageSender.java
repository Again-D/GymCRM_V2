package com.gymcrm.crm;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import com.gymcrm.crm.entity.CrmMessageEvent;

import java.util.UUID;

@Component
@Primary
public class StubCrmMessageSender implements CrmMessageSender {
    @Override
    public SendResult send(CrmMessageEvent event) {
        // deterministic failure branch for retry/dead-letter flow tests
        if (event.payloadJson() != null && event.payloadJson().contains("\"forceFail\":true")) {
            return new SendResult(false, null, "forced failure by payload flag");
        }
        return new SendResult(true, "stub-" + UUID.randomUUID(), null);
    }
}
