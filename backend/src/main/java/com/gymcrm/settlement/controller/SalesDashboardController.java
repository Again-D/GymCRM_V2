package com.gymcrm.settlement.controller;

import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.settlement.service.SalesDashboardService;
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

@Validated
@RestController
@RequestMapping("/api/v1/settlements")
public class SalesDashboardController {
    private final SalesDashboardService salesDashboardService;

    public SalesDashboardController(SalesDashboardService salesDashboardService) {
        this.salesDashboardService = salesDashboardService;
    }

    @GetMapping("/sales-dashboard")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK)
    public ApiResponse<SalesDashboardResponse> getSalesDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDate,
            @RequestParam(required = false) @Min(0) @Max(60) Integer expiringWithinDays
    ) {
        SalesDashboardService.SalesDashboardResult result = salesDashboardService.getDashboard(
                new SalesDashboardService.DashboardQuery(baseDate, expiringWithinDays)
        );
        return ApiResponse.success(SalesDashboardResponse.from(result), "매출 대시보드 조회 성공");
    }

    public record SalesDashboardResponse(
            LocalDate baseDate,
            int expiringWithinDays,
            BigDecimal todayNetSales,
            BigDecimal monthNetSales,
            long newMemberCount,
            long expiringMemberCount
    ) {
        static SalesDashboardResponse from(SalesDashboardService.SalesDashboardResult result) {
            return new SalesDashboardResponse(
                    result.baseDate(),
                    result.expiringWithinDays(),
                    result.todayNetSales(),
                    result.monthNetSales(),
                    result.newMemberCount(),
                    result.expiringMemberCount()
            );
        }
    }
}
