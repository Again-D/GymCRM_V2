package com.gymcrm.crm;

import com.gymcrm.common.error.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class CrmMessageTemplateServiceIntegrationTest {

    @Autowired
    private CrmMessageTemplateService service;

    @Test
    @Transactional
    void createUpdateAndListTemplates() {
        CrmMessageTemplate created = service.create(new CrmMessageTemplateService.CreateRequest(
                "birthday_offer",
                "생일 축하 템플릿",
                "SMS",
                "MARKETING",
                "회원님 생일 축하드립니다!",
                true
        ));

        assertEquals("BIRTHDAY_OFFER", created.templateCode());
        assertEquals("SMS", created.channelType());
        assertTrue(created.isActive());

        CrmMessageTemplate updated = service.update(new CrmMessageTemplateService.UpdateRequest(
                created.templateId(),
                "생일 축하 템플릿(수정)",
                "KAKAO",
                "TRANSACTIONAL",
                "생일 쿠폰이 발급되었습니다.",
                false
        ));

        assertEquals(created.templateId(), updated.templateId());
        assertEquals("KAKAO", updated.channelType());
        assertEquals("TRANSACTIONAL", updated.templateType());
        assertEquals("생일 축하 템플릿(수정)", updated.templateName());
        assertEquals("생일 쿠폰이 발급되었습니다.", updated.templateBody());
        assertTrue(!updated.isActive());

        CrmMessageTemplateService.ListResult all = service.list(
                new CrmMessageTemplateService.ListRequest(null, false, 100)
        );
        assertTrue(all.rows().stream().anyMatch(row -> row.templateId().equals(created.templateId())));

        CrmMessageTemplateService.ListResult kakaoOnly = service.list(
                new CrmMessageTemplateService.ListRequest("KAKAO", false, 100)
        );
        assertTrue(kakaoOnly.rows().stream().anyMatch(row -> row.templateId().equals(created.templateId())));

        CrmMessageTemplateService.ListResult activeOnly = service.list(
                new CrmMessageTemplateService.ListRequest(null, true, 100)
        );
        assertTrue(activeOnly.rows().stream().noneMatch(row -> row.templateId().equals(created.templateId())));
    }

    @Test
    @Transactional
    void duplicateTemplateCodeIsRejected() {
        service.create(new CrmMessageTemplateService.CreateRequest(
                "event_common",
                "이벤트 공통",
                "SMS",
                "MARKETING",
                "신규 이벤트 안내",
                true
        ));

        ApiException ex = assertThrows(ApiException.class, () -> service.create(new CrmMessageTemplateService.CreateRequest(
                "EVENT_COMMON",
                "이벤트 공통2",
                "SMS",
                "MARKETING",
                "신규 이벤트 안내2",
                true
        )));
        assertEquals(com.gymcrm.common.error.ErrorCode.CONFLICT, ex.getErrorCode());
    }
}
