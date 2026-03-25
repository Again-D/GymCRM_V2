package com.gymcrm.membership.dto.request;

import java.time.LocalDate;

public record MembershipResumeRequest(
        LocalDate resumeDate
) {
}
