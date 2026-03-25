package com.gymcrm.membership.dto.request;

import java.time.LocalDate;

public record MembershipRefundPreviewRequest(
        LocalDate refundDate
) {
}
