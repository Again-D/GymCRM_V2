package com.gymcrm.crm;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CrmMessageTemplateService {
    private final CrmMessageTemplateRepository repository;
    private final CurrentUserProvider currentUserProvider;

    public CrmMessageTemplateService(
            CrmMessageTemplateRepository repository,
            CurrentUserProvider currentUserProvider
    ) {
        this.repository = repository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public CrmMessageTemplate create(CreateRequest request) {
        String templateCode = normalizeTemplateCode(request.templateCode());
        String templateName = normalizeRequiredText(request.templateName(), "templateName");
        String templateBody = normalizeRequiredText(request.templateBody(), "templateBody");
        String channelType = normalizeChannelType(request.channelType());
        String templateType = normalizeTemplateType(request.templateType());

        CrmMessageTemplateRepository.InsertCommand command = new CrmMessageTemplateRepository.InsertCommand(
                currentUserProvider.currentCenterId(),
                templateCode,
                templateName,
                channelType,
                templateType,
                templateBody,
                request.isActive() == null || request.isActive(),
                currentUserProvider.currentUserId()
        );
        return repository.insert(command)
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT, "동일한 templateCode가 이미 존재합니다."));
    }

    @Transactional
    public CrmMessageTemplate update(UpdateRequest request) {
        if (request.templateId() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "templateId is required");
        }
        String templateName = normalizeRequiredText(request.templateName(), "templateName");
        String templateBody = normalizeRequiredText(request.templateBody(), "templateBody");
        String channelType = normalizeChannelType(request.channelType());
        String templateType = normalizeTemplateType(request.templateType());

        CrmMessageTemplateRepository.UpdateCommand command = new CrmMessageTemplateRepository.UpdateCommand(
                request.templateId(),
                currentUserProvider.currentCenterId(),
                templateName,
                channelType,
                templateType,
                templateBody,
                request.isActive() == null || request.isActive(),
                currentUserProvider.currentUserId()
        );
        return repository.update(command)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "템플릿을 찾을 수 없습니다. templateId=" + request.templateId()));
    }

    @Transactional(readOnly = true)
    public ListResult list(ListRequest request) {
        int limit = request.limit() == null ? 100 : request.limit();
        if (limit < 1 || limit > 500) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "limit must be between 1 and 500");
        }
        String channelType = request.channelType() == null ? null : normalizeChannelType(request.channelType());
        List<CrmMessageTemplate> rows = repository.findAll(currentUserProvider.currentCenterId(), channelType, request.activeOnly(), limit);
        return new ListResult(rows);
    }

    private String normalizeRequiredText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, fieldName + " is required");
        }
        return value.trim();
    }

    private String normalizeTemplateCode(String templateCode) {
        if (templateCode == null || templateCode.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "templateCode is required");
        }
        String normalized = templateCode.trim().toUpperCase();
        if (!normalized.matches("^[A-Z0-9_\\-]{2,40}$")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "templateCode is invalid");
        }
        return normalized;
    }

    private String normalizeChannelType(String channelType) {
        if (channelType == null || channelType.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "channelType is required");
        }
        String normalized = channelType.trim().toUpperCase();
        if (!normalized.equals("SMS") && !normalized.equals("KAKAO") && !normalized.equals("EMAIL")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "channelType is invalid");
        }
        return normalized;
    }

    private String normalizeTemplateType(String templateType) {
        if (templateType == null || templateType.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "templateType is required");
        }
        String normalized = templateType.trim().toUpperCase();
        if (!normalized.equals("MARKETING") && !normalized.equals("TRANSACTIONAL")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "templateType is invalid");
        }
        return normalized;
    }

    public record CreateRequest(
            String templateCode,
            String templateName,
            String channelType,
            String templateType,
            String templateBody,
            Boolean isActive
    ) {
    }

    public record UpdateRequest(
            Long templateId,
            String templateName,
            String channelType,
            String templateType,
            String templateBody,
            Boolean isActive
    ) {
    }

    public record ListRequest(
            String channelType,
            Boolean activeOnly,
            Integer limit
    ) {
    }

    public record ListResult(
            List<CrmMessageTemplate> rows
    ) {
    }
}
