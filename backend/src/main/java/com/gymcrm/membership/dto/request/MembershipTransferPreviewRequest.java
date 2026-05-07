package com.gymcrm.membership.dto.request;

import java.math.BigDecimal;

public record MembershipTransferPreviewRequest(
        Long transfereeMemberId,
        BigDecimal transferFee
) {
}
