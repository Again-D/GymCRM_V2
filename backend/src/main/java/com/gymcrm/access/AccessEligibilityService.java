package com.gymcrm.access;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class AccessEligibilityService {
    private final JdbcClient jdbcClient;

    public AccessEligibilityService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<Long> resolveEligibleMembershipId(Long centerId, Long memberId, Long requestedMembershipId) {
        LocalDate today = LocalDate.now();
        if (requestedMembershipId != null) {
            MembershipEligibilityRow row = jdbcClient.sql("""
                    SELECT
                        membership_id,
                        center_id,
                        member_id,
                        membership_status,
                        product_type_snapshot,
                        start_date,
                        end_date,
                        remaining_count
                    FROM member_memberships
                    WHERE membership_id = :membershipId
                      AND is_deleted = FALSE
                    """)
                    .param("membershipId", requestedMembershipId)
                    .query(MembershipEligibilityRow.class)
                    .optional()
                    .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "회원권을 찾을 수 없습니다. membershipId=" + requestedMembershipId));

            validateMembershipScope(centerId, memberId, row);
            if (!isEligible(row, today)) {
                return Optional.empty();
            }
            return Optional.of(row.membershipId());
        }

        List<MembershipEligibilityRow> memberships = jdbcClient.sql("""
                SELECT
                    membership_id,
                    center_id,
                    member_id,
                    membership_status,
                    product_type_snapshot,
                    start_date,
                    end_date,
                    remaining_count
                FROM member_memberships
                WHERE center_id = :centerId
                  AND member_id = :memberId
                  AND membership_status = 'ACTIVE'
                  AND is_deleted = FALSE
                ORDER BY membership_id DESC
                """)
                .param("centerId", centerId)
                .param("memberId", memberId)
                .query(MembershipEligibilityRow.class)
                .list();

        return memberships.stream()
                .filter(row -> isEligible(row, today))
                .map(MembershipEligibilityRow::membershipId)
                .findFirst();
    }

    private boolean isEligible(MembershipEligibilityRow row, LocalDate today) {
        if (!"ACTIVE".equals(row.membershipStatus())) {
            return false;
        }
        if ("COUNT".equals(row.productTypeSnapshot())) {
            return row.remainingCount() != null && row.remainingCount() > 0;
        }

        boolean startValid = row.startDate() == null || !today.isBefore(row.startDate());
        boolean endValid = row.endDate() == null || !today.isAfter(row.endDate());
        return startValid && endValid;
    }

    private void validateMembershipScope(Long centerId, Long memberId, MembershipEligibilityRow row) {
        if (!centerId.equals(row.centerId()) || !memberId.equals(row.memberId())) {
            throw new ApiException(ErrorCode.BUSINESS_RULE, "회원과 회원권 정보가 일치하지 않습니다.");
        }
    }

    private record MembershipEligibilityRow(
            Long membershipId,
            Long centerId,
            Long memberId,
            String membershipStatus,
            String productTypeSnapshot,
            LocalDate startDate,
            LocalDate endDate,
            Integer remainingCount
    ) {}
}
