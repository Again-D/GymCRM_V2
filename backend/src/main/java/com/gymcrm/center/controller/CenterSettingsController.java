package com.gymcrm.center.controller;

import com.gymcrm.center.dto.request.UpdateCenterProfileRequest;
import com.gymcrm.center.dto.response.CenterProfileResponse;
import com.gymcrm.center.service.CenterSettingsService;
import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.security.AccessPolicies;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/centers")
public class CenterSettingsController {
    private final CenterSettingsService centerSettingsService;

    public CenterSettingsController(CenterSettingsService centerSettingsService) {
        this.centerSettingsService = centerSettingsService;
    }

    @GetMapping("/me")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<CenterProfileResponse> getMyCenterProfile() {
        return ApiResponse.success(centerSettingsService.getMyCenterProfile(), "센터 프로필 조회 성공");
    }

    @PatchMapping("/me")
    @PreAuthorize(AccessPolicies.PROTOTYPE_OR_ADMIN)
    public ApiResponse<CenterProfileResponse> updateMyCenterProfile(@Valid @RequestBody UpdateCenterProfileRequest request) {
        return ApiResponse.success(centerSettingsService.updateMyCenterProfile(request), "센터 프로필이 수정되었습니다.");
    }
}
