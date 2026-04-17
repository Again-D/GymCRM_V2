package com.gymcrm.center.dto.response;

import com.gymcrm.center.entity.CenterEntity;

public record CenterProfileResponse(
        Long centerId,
        String centerName,
        String phone,
        String address
) {
    public static CenterProfileResponse from(CenterEntity center) {
        return new CenterProfileResponse(
                center.getCenterId(),
                center.getCenterName(),
                center.getPhone(),
                center.getAddress()
        );
    }
}
