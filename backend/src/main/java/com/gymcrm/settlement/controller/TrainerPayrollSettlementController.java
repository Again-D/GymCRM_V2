package com.gymcrm.settlement.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.settlement.TrainerSettlementDocumentExporter;
import com.gymcrm.settlement.dto.response.PreviewTrainerSettlementResponse;
import com.gymcrm.settlement.entity.TrainerSettlement;
import com.gymcrm.settlement.service.TrainerPayrollSettlementService;
import com.gymcrm.settlement.service.TrainerSettlementDocumentService;
import com.gymcrm.settlement.service.TrainerSettlementLifecycleService;
import com.gymcrm.settlement.service.TrainerSettlementPreviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/settlements")
public class TrainerPayrollSettlementController {
    private final TrainerPayrollSettlementService service;
    private final TrainerSettlementLifecycleService trainerSettlementLifecycleService;
    private final TrainerSettlementDocumentExporter trainerSettlementDocumentExporter;
    private final TrainerSettlementDocumentService trainerSettlementDocumentService;
    private final TrainerSettlementPreviewService trainerSettlementPreviewService;

    public TrainerPayrollSettlementController(
            TrainerPayrollSettlementService service,
            TrainerSettlementLifecycleService trainerSettlementLifecycleService,
            TrainerSettlementDocumentExporter trainerSettlementDocumentExporter,
            TrainerSettlementDocumentService trainerSettlementDocumentService,
            TrainerSettlementPreviewService trainerSettlementPreviewService
    ) {
        this.service = service;
        this.trainerSettlementLifecycleService = trainerSettlementLifecycleService;
        this.trainerSettlementDocumentExporter = trainerSettlementDocumentExporter;
        this.trainerSettlementDocumentService = trainerSettlementDocumentService;
        this.trainerSettlementPreviewService = trainerSettlementPreviewService;
    }

    @GetMapping("/trainer-payroll")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<MonthlyTrainerPayrollResponse> getMonthlyTrainerPayroll(
            @RequestParam
            @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "settlementMonth must be YYYY-MM")
            String settlementMonth,
            @RequestParam
            @DecimalMin(value = "0.0", inclusive = true, message = "sessionUnitPrice must be >= 0")
            BigDecimal sessionUnitPrice
    ) {
        TrainerPayrollSettlementService.MonthlyPayrollResult result = service.getMonthlyPayroll(
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(parseSettlementMonth(settlementMonth), sessionUnitPrice)
        );
        return ApiResponse.success(MonthlyTrainerPayrollResponse.from(result), "트레이너 월간 정산 조회 성공");
    }

    @GetMapping("/trainer-payroll/my-summary")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_TRAINER)
    public ApiResponse<TrainerMonthlyPtSummaryResponse> getCurrentTrainerMonthlyPtSummary(
            @RequestParam
            @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "settlementMonth must be YYYY-MM")
            String settlementMonth
    ) {
        TrainerPayrollSettlementService.TrainerMonthlyPtSummaryResult result =
                service.getCurrentTrainerMonthlyPtSummary(parseSettlementMonth(settlementMonth));
        return ApiResponse.success(TrainerMonthlyPtSummaryResponse.from(result), "트레이너 월간 PT 실적 조회 성공");
    }

    @GetMapping("/trainer-payroll/my-preview")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_TRAINER)
    public ApiResponse<PreviewTrainerSettlementResponse> getCurrentTrainerPeriodPreview(
            @RequestParam(required = false, defaultValue = "")
            @Pattern(regexp = "^$|^\\d{4}-\\d{2}$", message = "settlementMonth must be YYYY-MM")
            String settlementMonth,
            @RequestParam(required = false, defaultValue = "")
            @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "periodStart must be yyyy-MM-dd")
            String periodStart,
            @RequestParam(required = false, defaultValue = "")
            @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "periodEnd must be yyyy-MM-dd")
            String periodEnd
    ) {
        return ApiResponse.success(
                PreviewTrainerSettlementResponse.from(
                        trainerSettlementPreviewService.previewForCurrentTrainer(settlementMonth, periodStart, periodEnd)
                ),
                "트레이너 기간 정산 preview 조회 성공"
        );
    }

    @PostMapping("/trainer-payroll/confirm")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<MonthlyTrainerPayrollResponse> confirmMonthlyTrainerPayroll(
            @Valid @RequestBody ConfirmMonthlyTrainerPayrollRequest request
    ) {
        TrainerPayrollSettlementService.MonthlyPayrollResult result = trainerSettlementLifecycleService.confirmMonthlySettlement(
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(
                        parseSettlementMonth(request.settlementMonth()),
                        request.sessionUnitPrice()
                )
        );
        return ApiResponse.success(MonthlyTrainerPayrollResponse.from(result), "트레이너 월간 정산 확정 성공");
    }

    @GetMapping(value = "/trainer-payroll/document", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ResponseEntity<byte[]> exportMonthlyTrainerSettlementDocument(
            @RequestParam
            @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "settlementMonth must be YYYY-MM")
            String settlementMonth
    ) {
        List<TrainerSettlementDocumentService.TrainerSettlementDocument> settlements =
                trainerSettlementDocumentService.getMonthlyBridgeDocuments(parseSettlementMonth(settlementMonth));
        String fileName = "trainer-settlement-%s.pdf".formatted(settlementMonth);
        byte[] pdf = trainerSettlementDocumentExporter.exportDocuments(settlements);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(pdf);
    }

    @GetMapping(value = "/{settlementId}/trainers/{trainerId}/document", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ResponseEntity<byte[]> exportCanonicalTrainerSettlementDocument(
            @org.springframework.web.bind.annotation.PathVariable Long settlementId,
            @org.springframework.web.bind.annotation.PathVariable Long trainerId
    ) {
        TrainerSettlementDocumentService.TrainerSettlementDocument document =
                trainerSettlementDocumentService.getConfirmedTrainerDocument(settlementId, trainerId);
        String fileName = "settlement-%d-trainer-%d.pdf".formatted(settlementId, trainerId);
        byte[] pdf = trainerSettlementDocumentExporter.export(document);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(pdf);
    }

    private YearMonth parseSettlementMonth(String settlementMonth) {
        try {
            return YearMonth.parse(settlementMonth);
        } catch (DateTimeParseException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "settlementMonth must be YYYY-MM");
        }
    }

    public record MonthlyTrainerPayrollResponse(
            String settlementMonth,
            BigDecimal sessionUnitPrice,
            long totalCompletedClassCount,
            BigDecimal totalPayrollAmount,
            String settlementStatus,
            String confirmedAt,
            List<TrainerPayrollRowResponse> rows
    ) {
        static MonthlyTrainerPayrollResponse from(TrainerPayrollSettlementService.MonthlyPayrollResult result) {
            return new MonthlyTrainerPayrollResponse(
                    result.settlementMonth().toString(),
                    result.sessionUnitPrice(),
                    result.totalCompletedClassCount(),
                    result.totalPayrollAmount(),
                    result.settlementStatus(),
                    result.confirmedAt() == null ? null : result.confirmedAt().toString(),
                    result.rows().stream().map(TrainerPayrollRowResponse::from).toList()
            );
        }
    }

    public record ConfirmMonthlyTrainerPayrollRequest(
            @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "settlementMonth must be YYYY-MM")
            String settlementMonth,
            @DecimalMin(value = "0.0", inclusive = true, message = "sessionUnitPrice must be >= 0")
            BigDecimal sessionUnitPrice
    ) {
    }

    public record TrainerPayrollRowResponse(
            Long settlementId,
            Long trainerUserId,
            String trainerName,
            long completedClassCount,
            BigDecimal sessionUnitPrice,
            BigDecimal payrollAmount
    ) {
        static TrainerPayrollRowResponse from(TrainerPayrollSettlementService.TrainerPayrollRow row) {
            return new TrainerPayrollRowResponse(
                    row.settlementId(),
                    row.trainerUserId(),
                    row.trainerName(),
                    row.completedClassCount(),
                    row.sessionUnitPrice(),
                    row.payrollAmount()
            );
        }
    }

    public record TrainerMonthlyPtSummaryResponse(
            String settlementMonth,
            Long trainerUserId,
            String trainerName,
            long completedClassCount
    ) {
        static TrainerMonthlyPtSummaryResponse from(TrainerPayrollSettlementService.TrainerMonthlyPtSummaryResult result) {
            return new TrainerMonthlyPtSummaryResponse(
                    result.settlementMonth().toString(),
                    result.trainerUserId(),
                    result.trainerName(),
                    result.completedClassCount()
            );
        }
    }
}
