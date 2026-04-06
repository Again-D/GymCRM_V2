package com.gymcrm.settlement.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.settlement.TrainerSettlementDocumentExporter;
import com.gymcrm.settlement.entity.TrainerSettlement;
import com.gymcrm.settlement.service.TrainerPayrollSettlementService;
import com.gymcrm.settlement.service.TrainerSettlementLifecycleService;
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
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/settlements")
public class TrainerPayrollSettlementController {
    private final TrainerPayrollSettlementService service;
    private final TrainerSettlementLifecycleService trainerSettlementLifecycleService;
    private final TrainerSettlementDocumentExporter trainerSettlementDocumentExporter;

    public TrainerPayrollSettlementController(
            TrainerPayrollSettlementService service,
            TrainerSettlementLifecycleService trainerSettlementLifecycleService,
            TrainerSettlementDocumentExporter trainerSettlementDocumentExporter
    ) {
        this.service = service;
        this.trainerSettlementLifecycleService = trainerSettlementLifecycleService;
        this.trainerSettlementDocumentExporter = trainerSettlementDocumentExporter;
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
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(YearMonth.parse(settlementMonth), sessionUnitPrice)
        );
        return ApiResponse.success(MonthlyTrainerPayrollResponse.from(result), "트레이너 월간 정산 조회 성공");
    }

    @PostMapping("/trainer-payroll/confirm")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<MonthlyTrainerPayrollResponse> confirmMonthlyTrainerPayroll(
            @Valid @RequestBody ConfirmMonthlyTrainerPayrollRequest request
    ) {
        TrainerPayrollSettlementService.MonthlyPayrollResult result = trainerSettlementLifecycleService.confirmMonthlySettlement(
                new TrainerPayrollSettlementService.MonthlyPayrollQuery(
                        YearMonth.parse(request.settlementMonth()),
                        request.sessionUnitPrice()
                )
        );
        return ApiResponse.success(MonthlyTrainerPayrollResponse.from(result), "트레이너 월간 정산 확정 성공");
    }

    @GetMapping(value = "/trainer-payroll/document", produces = "text/csv")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ResponseEntity<String> exportMonthlyTrainerSettlementDocument(
            @RequestParam
            @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "settlementMonth must be YYYY-MM")
            String settlementMonth
    ) {
        List<TrainerSettlement> settlements = trainerSettlementLifecycleService.getConfirmedSettlements(YearMonth.parse(settlementMonth));
        if (settlements.isEmpty()) {
            throw new ApiException(
                    ErrorCode.NOT_FOUND,
                    "확정된 트레이너 정산을 찾을 수 없습니다. settlementMonth=" + settlementMonth
            );
        }
        String fileName = "trainer-settlement-%s.csv".formatted(settlementMonth);
        String csv = trainerSettlementDocumentExporter.export(settlements);
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(csv);
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
}
