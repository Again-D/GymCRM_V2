package com.gymcrm.center.service;

import com.gymcrm.center.dto.request.UpdateCenterProfileRequest;
import com.gymcrm.center.dto.response.CenterProfileResponse;
import com.gymcrm.center.entity.CenterEntity;
import com.gymcrm.center.repository.CenterJpaRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class CenterSettingsService {
    private final CenterJpaRepository centerJpaRepository;
    private final CurrentUserProvider currentUserProvider;

    public CenterSettingsService(CenterJpaRepository centerJpaRepository, CurrentUserProvider currentUserProvider) {
        this.centerJpaRepository = centerJpaRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public CenterProfileResponse getMyCenterProfile() {
        return CenterProfileResponse.from(requireCurrentCenter());
    }

    @Transactional
    public CenterProfileResponse updateMyCenterProfile(UpdateCenterProfileRequest request) {
        CenterEntity center = requireCurrentCenter();
        center.setCenterName(requireText(request.centerName(), "centerName"));
        center.setPhone(normalizeOptionalText(request.phone()));
        center.setAddress(normalizeOptionalText(request.address()));
        center.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        center.setUpdatedBy(currentUserProvider.currentUserId());
        return CenterProfileResponse.from(centerJpaRepository.saveAndFlush(center));
    }

    private CenterEntity requireCurrentCenter() {
        Long centerId = currentUserProvider.currentCenterId();
        return centerJpaRepository.findByCenterIdAndIsDeletedFalse(centerId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "센터 정보를 찾을 수 없습니다. centerId=" + centerId));
    }

    private String requireText(String value, String field) {
        if (value == null || value.trim().isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, field + " is required");
        }
        return value.trim();
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
