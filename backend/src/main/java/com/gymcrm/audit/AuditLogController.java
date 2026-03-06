package com.gymcrm.audit;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditLogController {
    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<AuditLogListResponse> list(
            @RequestParam(required = false)
            @Pattern(regexp = "^(?i)(PII_READ|MEMBERSHIP_REFUND|ACCOUNT_ROLE_CHANGE)?$", message = "eventType is invalid")
            String eventType,
            @RequestParam(defaultValue = "100") @Min(1) @Max(500) Integer limit
    ) {
        List<AuditLogResponse> rows = auditLogService.getRecentLogs(eventType, limit).stream()
                .map(AuditLogResponse::from)
                .toList();
        return ApiResponse.success(new AuditLogListResponse(rows), "감사로그 조회 성공");
    }

    @GetMapping("/retention-runs")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<RetentionRunListResponse> listRetentionRuns(
            @RequestParam(required = false) String jobName,
            @RequestParam(defaultValue = "50") @Min(1) @Max(200) Integer limit
    ) {
        List<RetentionRunResponse> rows = auditLogService.getRecentRetentionRuns(jobName, limit).stream()
                .map(RetentionRunResponse::from)
                .toList();
        return ApiResponse.success(new RetentionRunListResponse(rows), "감사로그 보존 배치 이력 조회 성공");
    }

    @PostMapping("/retention-runs")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN)
    public ApiResponse<RetentionRunResponse> recordRetentionRun(@Valid @RequestBody RecordRetentionRunRequest request) {
        AuditRetentionJobRun run = auditLogService.recordRetentionJobRun(
                request.jobName(),
                request.status(),
                request.startedAt(),
                request.completedAt(),
                request.detailsJson()
        );
        return ApiResponse.success(RetentionRunResponse.from(run), "감사로그 보존 배치 이력이 저장되었습니다.");
    }

    public record RecordRetentionRunRequest(
            String jobName,
            @Pattern(regexp = "^(?i)(SUCCESS|FAILED|PARTIAL)?$", message = "status is invalid")
            String status,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            OffsetDateTime startedAt,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            OffsetDateTime completedAt,
            String detailsJson
    ) {
    }

    public record AuditLogListResponse(
            List<AuditLogResponse> rows
    ) {
    }

    public record AuditLogResponse(
            Long auditLogId,
            Long centerId,
            String eventType,
            Long actorUserId,
            String resourceType,
            String resourceId,
            OffsetDateTime eventAt,
            String traceId,
            String attributesJson,
            OffsetDateTime createdAt
    ) {
        static AuditLogResponse from(AuditLog row) {
            return new AuditLogResponse(
                    row.auditLogId(),
                    row.centerId(),
                    row.eventType(),
                    row.actorUserId(),
                    row.resourceType(),
                    row.resourceId(),
                    row.eventAt(),
                    row.traceId(),
                    row.attributesJson(),
                    row.createdAt()
            );
        }
    }

    public record RetentionRunListResponse(
            List<RetentionRunResponse> rows
    ) {
    }

    public record RetentionRunResponse(
            Long auditRetentionJobRunId,
            String jobName,
            String status,
            OffsetDateTime startedAt,
            OffsetDateTime completedAt,
            String detailsJson,
            Long createdBy,
            OffsetDateTime createdAt
    ) {
        static RetentionRunResponse from(AuditRetentionJobRun row) {
            return new RetentionRunResponse(
                    row.auditRetentionJobRunId(),
                    row.jobName(),
                    row.status(),
                    row.startedAt(),
                    row.completedAt(),
                    row.detailsJson(),
                    row.createdBy(),
                    row.createdAt()
            );
        }
    }
}
