package com.gymcrm.crm.dto.response;

import java.util.List;

import com.gymcrm.crm.service.CrmMessageService;

public record HistoryResponse(
            List<HistoryRowResponse> rows
    ) {
        public static HistoryResponse from(CrmMessageService.MessageHistoryResult result) {
            return new HistoryResponse(result.rows().stream().map(HistoryRowResponse::from).toList());
        }
    }