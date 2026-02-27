package com.gymcrm.access;

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
class AccessPhase9SchemaFoundationIntegrationTest {

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void accessEventsTableExistsWithExpectedCheckConstraints() {
        Integer tableCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name = 'access_events'
                """).query(Integer.class).single();
        assertEquals(1, tableCount);

        Boolean typeConstraintExists = jdbcClient.sql("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    WHERE t.relname = 'access_events'
                      AND c.conname = 'chk_access_events_type'
                )
                """).query(Boolean.class).single();
        assertTrue(Boolean.TRUE.equals(typeConstraintExists));

        Boolean denyConstraintExists = jdbcClient.sql("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    WHERE t.relname = 'access_events'
                      AND c.conname = 'chk_access_events_deny_reason'
                )
                """).query(Boolean.class).single();
        assertTrue(Boolean.TRUE.equals(denyConstraintExists));
    }

    @Test
    void openSessionUniqueIndexExistsForSingleOpenSessionInvariant() {
        Integer uniqueIndexCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM pg_indexes
                WHERE tablename = 'member_access_sessions'
                  AND indexname = 'uk_member_access_sessions_open_per_member'
                """).query(Integer.class).single();

        assertEquals(1, uniqueIndexCount);
    }
}
