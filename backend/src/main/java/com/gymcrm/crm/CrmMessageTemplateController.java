package com.gymcrm.crm;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/crm/templates")
public class CrmMessageTemplateController {
    private final CrmMessageTemplateService crmMessageTemplateService;

    public CrmMessageTemplateController(CrmMessageTemplateService crmMessageTemplateService) {
        this.crmMessageTemplateService = crmMessageTemplateService;
    }

    @PostMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<TemplateResponse> create(@Valid @RequestBody CreateRequest request) {
        CrmMessageTemplate created = crmMessageTemplateService.create(new CrmMessageTemplateService.CreateRequest(
                request.templateCode(),
                request.templateName(),
                request.channelType(),
                request.templateType(),
                request.templateBody(),
                request.isActive()
        ));
        return ApiResponse.success(TemplateResponse.from(created), "CRM 템플릿이 등록되었습니다.");
    }

    @PatchMapping("/{templateId}")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<TemplateResponse> update(
            @PathVariable Long templateId,
            @Valid @RequestBody UpdateRequest request
    ) {
        CrmMessageTemplate updated = crmMessageTemplateService.update(new CrmMessageTemplateService.UpdateRequest(
                templateId,
                request.templateName(),
                request.channelType(),
                request.templateType(),
                request.templateBody(),
                request.isActive()
        ));
        return ApiResponse.success(TemplateResponse.from(updated), "CRM 템플릿이 수정되었습니다.");
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<ListResponse> list(
            @RequestParam(required = false)
            @Pattern(regexp = "^(?i)(SMS|KAKAO|EMAIL)?$", message = "channelType is invalid")
            String channelType,
            @RequestParam(required = false) Boolean activeOnly,
            @RequestParam(defaultValue = "100") @Min(1) @Max(500) Integer limit
    ) {
        CrmMessageTemplateService.ListResult result = crmMessageTemplateService.list(
                new CrmMessageTemplateService.ListRequest(channelType, activeOnly, limit)
        );
        return ApiResponse.success(ListResponse.from(result), "CRM 템플릿 목록 조회 성공");
    }

    public record CreateRequest(
            @NotBlank(message = "templateCode is required")
            @Pattern(regexp = "^[A-Za-z0-9_\\-]{2,40}$", message = "templateCode is invalid")
            String templateCode,
            @NotBlank(message = "templateName is required") String templateName,
            @NotBlank(message = "channelType is required")
            @Pattern(regexp = "^(?i)(SMS|KAKAO|EMAIL)$", message = "channelType is invalid")
            String channelType,
            @NotBlank(message = "templateType is required")
            @Pattern(regexp = "^(?i)(MARKETING|TRANSACTIONAL)$", message = "templateType is invalid")
            String templateType,
            @NotBlank(message = "templateBody is required") String templateBody,
            Boolean isActive
    ) {
    }

    public record UpdateRequest(
            @NotBlank(message = "templateName is required") String templateName,
            @NotBlank(message = "channelType is required")
            @Pattern(regexp = "^(?i)(SMS|KAKAO|EMAIL)$", message = "channelType is invalid")
            String channelType,
            @NotBlank(message = "templateType is required")
            @Pattern(regexp = "^(?i)(MARKETING|TRANSACTIONAL)$", message = "templateType is invalid")
            String templateType,
            @NotBlank(message = "templateBody is required") String templateBody,
            Boolean isActive
    ) {
    }

    public record ListResponse(
            List<TemplateResponse> rows
    ) {
        static ListResponse from(CrmMessageTemplateService.ListResult result) {
            return new ListResponse(result.rows().stream().map(TemplateResponse::from).toList());
        }
    }

    public record TemplateResponse(
            Long templateId,
            String templateCode,
            String templateName,
            String channelType,
            String templateType,
            String templateBody,
            boolean isActive,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        static TemplateResponse from(CrmMessageTemplate template) {
            return new TemplateResponse(
                    template.templateId(),
                    template.templateCode(),
                    template.templateName(),
                    template.channelType(),
                    template.templateType(),
                    template.templateBody(),
                    template.isActive(),
                    template.createdAt(),
                    template.updatedAt()
            );
        }
    }
}
