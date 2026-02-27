package com.gymcrm.access;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class MemberAccessSessionRepository {
    private final JdbcClient jdbcClient;

    public MemberAccessSessionRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public MemberAccessSession insertOpen(InsertOpenCommand command) {
        return jdbcClient.sql("""
                INSERT INTO member_access_sessions (
                    center_id, member_id, membership_id, reservation_id,
                    entry_event_id, entry_at
                )
                VALUES (
                    :centerId, :memberId, :membershipId, :reservationId,
                    :entryEventId, :entryAt
                )
                RETURNING
                    access_session_id,
                    center_id,
                    member_id,
                    NULL::VARCHAR AS member_name,
                    NULL::VARCHAR AS phone,
                    membership_id,
                    reservation_id,
                    entry_event_id,
                    entry_at,
                    exit_event_id,
                    exited_at,
                    created_at,
                    updated_at
                """)
                .paramSource(command)
                .query(MemberAccessSession.class)
                .single();
    }

    public Optional<MemberAccessSession> findOpenByMember(Long centerId, Long memberId) {
        return jdbcClient.sql("""
                SELECT
                    s.access_session_id,
                    s.center_id,
                    s.member_id,
                    m.member_name,
                    m.phone,
                    s.membership_id,
                    s.reservation_id,
                    s.entry_event_id,
                    s.entry_at,
                    s.exit_event_id,
                    s.exited_at,
                    s.created_at,
                    s.updated_at
                FROM member_access_sessions s
                JOIN members m ON m.member_id = s.member_id
                WHERE s.center_id = :centerId
                  AND s.member_id = :memberId
                  AND s.exited_at IS NULL
                """)
                .param("centerId", centerId)
                .param("memberId", memberId)
                .query(MemberAccessSession.class)
                .optional();
    }

    public Optional<MemberAccessSession> closeSession(CloseCommand command) {
        return jdbcClient.sql("""
                UPDATE member_access_sessions
                SET
                    exit_event_id = :exitEventId,
                    exited_at = :exitedAt,
                    updated_at = CURRENT_TIMESTAMP
                WHERE access_session_id = :accessSessionId
                  AND exited_at IS NULL
                RETURNING
                    access_session_id,
                    center_id,
                    member_id,
                    NULL::VARCHAR AS member_name,
                    NULL::VARCHAR AS phone,
                    membership_id,
                    reservation_id,
                    entry_event_id,
                    entry_at,
                    exit_event_id,
                    exited_at,
                    created_at,
                    updated_at
                """)
                .paramSource(command)
                .query(MemberAccessSession.class)
                .optional();
    }

    public List<MemberAccessSession> findOpenSessions(Long centerId, int limit) {
        return jdbcClient.sql("""
                SELECT
                    s.access_session_id,
                    s.center_id,
                    s.member_id,
                    m.member_name,
                    m.phone,
                    s.membership_id,
                    s.reservation_id,
                    s.entry_event_id,
                    s.entry_at,
                    s.exit_event_id,
                    s.exited_at,
                    s.created_at,
                    s.updated_at
                FROM member_access_sessions s
                JOIN members m ON m.member_id = s.member_id
                WHERE s.center_id = :centerId
                  AND s.exited_at IS NULL
                ORDER BY s.entry_at DESC
                LIMIT :limit
                """)
                .param("centerId", centerId)
                .param("limit", limit)
                .query(MemberAccessSession.class)
                .list();
    }

    public int countOpenSessions(Long centerId) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM member_access_sessions
                WHERE center_id = :centerId
                  AND exited_at IS NULL
                """)
                .param("centerId", centerId)
                .query(Integer.class)
                .single();
        return count == null ? 0 : count;
    }

    public record InsertOpenCommand(
            Long centerId,
            Long memberId,
            Long membershipId,
            Long reservationId,
            Long entryEventId,
            OffsetDateTime entryAt
    ) {}

    public record CloseCommand(
            Long accessSessionId,
            Long exitEventId,
            OffsetDateTime exitedAt
    ) {}
}
