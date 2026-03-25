package com.gymcrm.settlement;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
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

    public TrainerPayrollSettlementController(TrainerPayrollSettlementService service) {
        this.service = service;
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

    public record MonthlyTrainerPayrollResponse(
            String settlementMonth,
            BigDecimal sessionUnitPrice,
            long totalCompletedClassCount,
            BigDecimal totalPayrollAmount,
            List<TrainerPayrollRowResponse> rows
    ) {
        static MonthlyTrainerPayrollResponse from(TrainerPayrollSettlementService.MonthlyPayrollResult result) {
            return new MonthlyTrainerPayrollResponse(
                    result.settlementMonth().toString(),
                    result.sessionUnitPrice(),
                    result.totalCompletedClassCount(),
                    result.totalPayrollAmount(),
                    result.rows().stream().map(TrainerPayrollRowResponse::from).toList()
            );
        }
    }

    public record TrainerPayrollRowResponse(
            String trainerName,
            long completedClassCount,
            BigDecimal sessionUnitPrice,
            BigDecimal payrollAmount
    ) {
        static TrainerPayrollRowResponse from(TrainerPayrollSettlementService.TrainerPayrollRow row) {
            return new TrainerPayrollRowResponse(
                    row.trainerName(),
                    row.completedClassCount(),
                    row.sessionUnitPrice(),
                    row.payrollAmount()
            );
        }
    }
}
