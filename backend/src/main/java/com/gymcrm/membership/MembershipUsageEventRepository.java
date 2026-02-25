package com.gymcrm.membership;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class MembershipUsageEventRepository {
    private final JdbcClient jdbcClient;

    public MembershipUsageEventRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<MembershipUsageEvent> findByReservationId(Long reservationId) {
        return jdbcClient.sql("""
                SELECT
                    usage_event_id, center_id, membership_id, reservation_id,
                    usage_event_type, delta_count, processed_at, processed_by,
                    memo, created_at
                FROM membership_usage_events
                WHERE reservation_id = :reservationId
                ORDER BY usage_event_id ASC
                """)
                .param("reservationId", reservationId)
                .query(MembershipUsageEvent.class)
                .list();
    }

    public MembershipUsageEvent insert(InsertCommand command) {
        return jdbcClient.sql("""
                INSERT INTO membership_usage_events (
                    center_id, membership_id, reservation_id, usage_event_type,
                    delta_count, processed_at, processed_by, memo
                )
                VALUES (
                    :centerId, :membershipId, :reservationId, :usageEventType,
                    :deltaCount, :processedAt, :processedBy, :memo
                )
                RETURNING
                    usage_event_id, center_id, membership_id, reservation_id,
                    usage_event_type, delta_count, processed_at, processed_by,
                    memo, created_at
                """)
                .paramSource(command)
                .query(MembershipUsageEvent.class)
                .single();
    }

    public record InsertCommand(
            Long centerId,
            Long membershipId,
            Long reservationId,
            String usageEventType,
            Integer deltaCount,
            OffsetDateTime processedAt,
            Long processedBy,
            String memo
    ) {}
}
