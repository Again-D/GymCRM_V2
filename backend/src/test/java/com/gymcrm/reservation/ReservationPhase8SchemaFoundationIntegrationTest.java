package com.gymcrm.reservation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class ReservationPhase8SchemaFoundationIntegrationTest {

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void reservationsTableHasPhase8AttendanceColumnsAndNoShowConstraint() {
        Integer checkedInColumnCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_name = 'reservations'
                  AND column_name = 'checked_in_at'
                """).query(Integer.class).single();
        Integer noShowColumnCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_name = 'reservations'
                  AND column_name = 'no_show_at'
                """).query(Integer.class).single();

        assertEquals(1, checkedInColumnCount);
        assertEquals(1, noShowColumnCount);

        Integer noShowConstraintCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE t.relname = 'reservations'
                  AND c.conname = 'chk_reservations_no_show_at'
                """).query(Integer.class).single();

        assertEquals(1, noShowConstraintCount);
    }

    @Test
    void membershipUsageEventsTableAndUniqueInvariantExist() {
        Integer tableCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name = 'membership_usage_events'
                """).query(Integer.class).single();
        assertEquals(1, tableCount);

        Integer uniqueIndexCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM pg_indexes
                WHERE tablename = 'membership_usage_events'
                  AND indexname = 'uk_membership_usage_events_reservation_type'
                """).query(Integer.class).single();

        assertEquals(1, uniqueIndexCount);

        Boolean hasReservationCompleteCheck = jdbcClient.sql("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    WHERE t.relname = 'membership_usage_events'
                      AND c.conname = 'chk_membership_usage_events_type'
                )
                """).query(Boolean.class).single();
        assertTrue(Boolean.TRUE.equals(hasReservationCompleteCheck));
    }
}
