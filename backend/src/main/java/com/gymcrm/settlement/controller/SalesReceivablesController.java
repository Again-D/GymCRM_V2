package com.gymcrm.settlement.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.settlement.service.SalesReceivablesService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/settlements")
public class SalesReceivablesController {
    private final SalesReceivablesService salesReceivablesService;

    public SalesReceivablesController(SalesReceivablesService salesReceivablesService) {
        this.salesReceivablesService = salesReceivablesService;
    }

    @GetMapping("/receivables")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_MANAGER_OR_DESK)
    public ApiResponse<ReceivablesResponse> getReceivables(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDate,
            @RequestParam(required = false) @Min(1) @Max(50) Integer limit
    ) {
        SalesReceivablesService.ReceivablesResult result = salesReceivablesService.getReceivables(
                new SalesReceivablesService.ReceivablesQuery(baseDate, limit)
        );
        return ApiResponse.success(ReceivablesResponse.from(result), "미수금 조회 성공");
    }

    public record ReceivablesResponse(
            LocalDate baseDate,
            int limit,
            BigDecimal totalOutstandingAmount,
            long receivableCount,
            long reminderEligibleCount,
            List<ReceivableRowResponse> rows
    ) {
        static ReceivablesResponse from(SalesReceivablesService.ReceivablesResult result) {
            return new ReceivablesResponse(
                    result.baseDate(),
                    result.limit(),
                    result.totalOutstandingAmount(),
                    result.receivableCount(),
                    result.reminderEligibleCount(),
                    result.rows().stream().map(ReceivableRowResponse::from).toList()
            );
        }
    }

    public record ReceivableRowResponse(
            Long membershipId,
            Long memberId,
            String memberName,
            String productName,
            String productCategory,
            String membershipStatus,
            BigDecimal contractAmount,
            Long paymentId,
            String paymentMethod,
            BigDecimal paidAmount,
            LocalDate paidDate,
            LocalDate followUpDate,
            BigDecimal outstandingAmount,
            boolean reminderEligible,
            String reminderChannel
    ) {
        static ReceivableRowResponse from(SalesReceivablesService.ReceivableRow row) {
            return new ReceivableRowResponse(
                    row.membershipId(),
                    row.memberId(),
                    row.memberName(),
                    row.productName(),
                    row.productCategory(),
                    row.membershipStatus(),
                    row.contractAmount(),
                    row.paymentId(),
                    row.paymentMethod(),
                    row.paidAmount(),
                    row.paidDate(),
                    row.followUpDate(),
                    row.outstandingAmount(),
                    row.reminderEligible(),
                    row.reminderChannel()
            );
        }
    }
}
