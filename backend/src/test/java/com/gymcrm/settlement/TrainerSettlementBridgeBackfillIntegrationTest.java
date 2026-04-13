package com.gymcrm.settlement;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm"
})
@ActiveProfiles("dev")
class TrainerSettlementBridgeBackfillIntegrationTest {

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private DataSource dataSource;

    @Test
    @Transactional
    void backfillCreatesCanonicalSettlementAndPtDetailsFromLegacyBridgeRows() {
        YearMonth settlementMonth = YearMonth.of(2101, 1);
        cleanupMonth(settlementMonth);
        long trainerA = createTrainerUser("bridge-backfill-a");
        long trainerB = createTrainerUser("bridge-backfill-b");

        insertLegacyTrainerSettlement(settlementMonth, trainerA, "Backfill Trainer A", 2, new BigDecimal("50000"), new BigDecimal("100000"));
        insertLegacyTrainerSettlement(settlementMonth, trainerB, "Backfill Trainer B", 1, new BigDecimal("70000"), new BigDecimal("70000"));

        runV38Backfill();

        Long canonicalCount = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM settlements
                WHERE center_id = 1
                  AND settlement_year = :year
                  AND settlement_month = :month
                  AND is_deleted = FALSE
                """)
                .param("year", settlementMonth.getYear())
                .param("month", settlementMonth.getMonthValue())
                .query(Long.class)
                .single();
        assertEquals(1L, canonicalCount);

        Long settlementId = jdbcClient.sql("""
                SELECT settlement_id
                FROM settlements
                WHERE center_id = 1
                  AND settlement_year = :year
                  AND settlement_month = :month
                  AND is_deleted = FALSE
                """)
                .param("year", settlementMonth.getYear())
                .param("month", settlementMonth.getMonthValue())
                .query(Long.class)
                .single();

        assertEquals("CONFIRMED", jdbcClient.sql("""
                SELECT status
                FROM settlements
                WHERE settlement_id = :settlementId
                """)
                .param("settlementId", settlementId)
                .query(String.class)
                .single());

        assertEquals(3, jdbcClient.sql("""
                SELECT total_lesson_count
                FROM settlements
                WHERE settlement_id = :settlementId
                """)
                .param("settlementId", settlementId)
                .query(Integer.class)
                .single());

        assertEquals(0, new BigDecimal("170000").compareTo(jdbcClient.sql("""
                SELECT total_amount
                FROM settlements
                WHERE settlement_id = :settlementId
                """)
                .param("settlementId", settlementId)
                .query(BigDecimal.class)
                .single()));

        assertEquals(2L, jdbcClient.sql("""
                SELECT COUNT(*)
                FROM settlement_details
                WHERE settlement_id = :settlementId
                  AND lesson_type = 'PT'
                """)
                .param("settlementId", settlementId)
                .query(Long.class)
                .single());

        assertEquals(0, new BigDecimal("70000").compareTo(jdbcClient.sql("""
                SELECT unit_price
                FROM settlement_details
                WHERE settlement_id = :settlementId
                  AND user_id = :trainerUserId
                  AND lesson_type = 'PT'
                """)
                .param("settlementId", settlementId)
                .param("trainerUserId", trainerB)
                .query(BigDecimal.class)
                .single()));
    }

    @Test
    @Transactional
    void backfillIsIdempotentForAlreadyProjectedLegacyRows() {
        YearMonth settlementMonth = YearMonth.of(2101, 2);
        cleanupMonth(settlementMonth);
        long trainerA = createTrainerUser("bridge-idempotent-a");
        long trainerB = createTrainerUser("bridge-idempotent-b");

        insertLegacyTrainerSettlement(settlementMonth, trainerA, "Idempotent Trainer A", 1, new BigDecimal("50000"), new BigDecimal("50000"));
        insertLegacyTrainerSettlement(settlementMonth, trainerB, "Idempotent Trainer B", 2, new BigDecimal("60000"), new BigDecimal("120000"));

        runV38Backfill();
        runV38Backfill();

        assertEquals(1L, jdbcClient.sql("""
                SELECT COUNT(*)
                FROM settlements
                WHERE center_id = 1
                  AND settlement_year = :year
                  AND settlement_month = :month
                  AND is_deleted = FALSE
                """)
                .param("year", settlementMonth.getYear())
                .param("month", settlementMonth.getMonthValue())
                .query(Long.class)
                .single());

        assertEquals(2L, jdbcClient.sql("""
                SELECT COUNT(*)
                FROM settlement_details details
                JOIN settlements settlement
                  ON settlement.settlement_id = details.settlement_id
                WHERE settlement.center_id = 1
                  AND settlement.settlement_year = :year
                  AND settlement.settlement_month = :month
                  AND settlement.is_deleted = FALSE
                  AND details.lesson_type = 'PT'
                """)
                .param("year", settlementMonth.getYear())
                .param("month", settlementMonth.getMonthValue())
                .query(Long.class)
                .single());
    }

    @Test
    @Transactional
    void backfillMergesIntoExistingConfirmedCanonicalSettlementWithoutDuplicatingMonthBatch() {
        YearMonth settlementMonth = YearMonth.of(2101, 3);
        cleanupMonth(settlementMonth);
        long trainerA = createTrainerUser("bridge-merge-a");

        Long settlementId = jdbcClient.sql("""
                INSERT INTO settlements (
                    center_id,
                    settlement_year,
                    settlement_month,
                    total_lesson_count,
                    total_amount,
                    status,
                    settlement_date,
                    confirmed_by,
                    confirmed_at,
                    is_deleted,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                ) VALUES (
                    1,
                    :year,
                    :month,
                    0,
                    0,
                    'CONFIRMED',
                    :settlementDate,
                    1,
                    CURRENT_TIMESTAMP,
                    FALSE,
                    CURRENT_TIMESTAMP,
                    1,
                    CURRENT_TIMESTAMP,
                    1
                )
                RETURNING settlement_id
                """)
                .param("year", settlementMonth.getYear())
                .param("month", settlementMonth.getMonthValue())
                .param("settlementDate", settlementMonth.atDay(1))
                .query(Long.class)
                .single();

        insertLegacyTrainerSettlement(settlementMonth, trainerA, "Merge Trainer A", 3, new BigDecimal("45000"), new BigDecimal("135000"));

        runV38Backfill();

        assertEquals(1L, jdbcClient.sql("""
                SELECT COUNT(*)
                FROM settlements
                WHERE center_id = 1
                  AND settlement_year = :year
                  AND settlement_month = :month
                  AND is_deleted = FALSE
                """)
                .param("year", settlementMonth.getYear())
                .param("month", settlementMonth.getMonthValue())
                .query(Long.class)
                .single());

        assertEquals(1L, jdbcClient.sql("""
                SELECT COUNT(*)
                FROM settlement_details
                WHERE settlement_id = :settlementId
                  AND user_id = :trainerUserId
                  AND lesson_type = 'PT'
                """)
                .param("settlementId", settlementId)
                .param("trainerUserId", trainerA)
                .query(Long.class)
                .single());
    }

    @Test
    @Transactional
    void backfillFailsFastWhenLegacyRowsContainNullTrainerUserId() {
        YearMonth settlementMonth = YearMonth.of(2101, 4);
        cleanupMonth(settlementMonth);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcClient.sql("""
                INSERT INTO trainer_settlements (
                    center_id,
                    settlement_month,
                    trainer_user_id,
                    trainer_name,
                    completed_class_count,
                    session_unit_price,
                    payroll_amount,
                    settlement_status,
                    confirmed_at,
                    confirmed_by,
                    is_deleted,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                ) VALUES (
                    1,
                    :settlementMonth,
                    NULL,
                    :trainerName,
                    1,
                    50000,
                    50000,
                    'CONFIRMED',
                    :confirmedAt,
                    1,
                    FALSE,
                    :createdAt,
                    1,
                    :updatedAt,
                    1
                )
                """)
                .param("settlementMonth", settlementMonth.atDay(1))
                .param("trainerName", "Null Trainer")
                .param("confirmedAt", now)
                .param("createdAt", now)
                .param("updatedAt", now)
                .update();

        RuntimeException exception = assertThrows(RuntimeException.class, this::runV38Backfill);
        String message = exception.getMessage();
        Throwable cause = exception.getCause();
        assertTrue(
                (message != null && message.contains("V38 backfill blocked"))
                        || (cause != null && cause.getMessage() != null && cause.getMessage().contains("V38 backfill blocked"))
        );
    }

    private void runV38Backfill() {
        java.sql.Connection connection = DataSourceUtils.getConnection(dataSource);
        try {
            String sql = StreamUtils.copyToString(
                    new ClassPathResource("db/migration/V38__backfill_legacy_trainer_settlements_into_canonical.sql").getInputStream(),
                    StandardCharsets.UTF_8
            );
            try (var statement = connection.createStatement()) {
                statement.execute(sql);
            }
        } catch (Exception ex) {
            throw new DataAccessResourceFailureException("Failed to execute V38 backfill migration", ex);
        } finally {
            DataSourceUtils.releaseConnection(connection, dataSource);
        }
    }

    private void cleanupMonth(YearMonth settlementMonth) {
        ensureLegacyBridgeTableExists();
        jdbcClient.sql("""
                DELETE FROM settlement_details
                WHERE settlement_id IN (
                    SELECT settlement_id
                    FROM settlements
                    WHERE center_id = 1
                      AND settlement_year = :year
                      AND settlement_month = :month
                )
                """)
                .param("year", settlementMonth.getYear())
                .param("month", settlementMonth.getMonthValue())
                .update();
        jdbcClient.sql("""
                DELETE FROM settlements
                WHERE center_id = 1
                  AND settlement_year = :year
                  AND settlement_month = :month
                """)
                .param("year", settlementMonth.getYear())
                .param("month", settlementMonth.getMonthValue())
                .update();
        jdbcClient.sql("""
                DELETE FROM trainer_settlements
                WHERE center_id = 1
                  AND settlement_month = :settlementMonth
                """)
                .param("settlementMonth", settlementMonth.atDay(1))
                .update();
    }

    private void ensureLegacyBridgeTableExists() {
        jdbcClient.sql("""
                CREATE TABLE IF NOT EXISTS trainer_settlements (
                    settlement_id BIGSERIAL PRIMARY KEY,
                    center_id BIGINT NOT NULL,
                    settlement_month DATE NOT NULL,
                    trainer_user_id BIGINT NULL,
                    trainer_name VARCHAR(100) NOT NULL,
                    completed_class_count BIGINT NOT NULL,
                    session_unit_price NUMERIC(12, 2) NOT NULL,
                    payroll_amount NUMERIC(14, 2) NOT NULL,
                    settlement_status VARCHAR(20) NOT NULL,
                    confirmed_at TIMESTAMPTZ NOT NULL,
                    confirmed_by BIGINT NOT NULL,
                    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL,
                    created_by BIGINT NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    updated_by BIGINT NOT NULL
                )
                """)
                .update();
    }

    private long createTrainerUser(String loginPrefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String loginId = loginPrefix + "-" + suffix;

        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id,
                    login_id,
                    password_hash,
                    user_name,
                    user_status,
                    is_deleted,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                ) VALUES (
                    1,
                    :loginId,
                    'noop',
                    :userName,
                    'ACTIVE',
                    FALSE,
                    CURRENT_TIMESTAMP,
                    1,
                    CURRENT_TIMESTAMP,
                    1
                )
                RETURNING user_id
                """)
                .param("loginId", loginId)
                .param("userName", "Trainer " + suffix)
                .query(Long.class)
                .single();

        jdbcClient.sql("DELETE FROM user_roles WHERE user_id = :userId")
                .param("userId", userId)
                .update();
        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_at, created_by)
                SELECT :userId, role_id, CURRENT_TIMESTAMP, 1
                FROM roles
                WHERE role_code = 'ROLE_TRAINER'
                """)
                .param("userId", userId)
                .update();

        return userId;
    }

    private void insertLegacyTrainerSettlement(
            YearMonth settlementMonth,
            long trainerUserId,
            String trainerName,
            long completedClassCount,
            BigDecimal sessionUnitPrice,
            BigDecimal payrollAmount
    ) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcClient.sql("""
                INSERT INTO trainer_settlements (
                    center_id,
                    settlement_month,
                    trainer_user_id,
                    trainer_name,
                    completed_class_count,
                    session_unit_price,
                    payroll_amount,
                    settlement_status,
                    confirmed_at,
                    confirmed_by,
                    is_deleted,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                ) VALUES (
                    1,
                    :settlementMonth,
                    :trainerUserId,
                    :trainerName,
                    :completedClassCount,
                    :sessionUnitPrice,
                    :payrollAmount,
                    'CONFIRMED',
                    :confirmedAt,
                    :confirmedBy,
                    FALSE,
                    :createdAt,
                    :createdBy,
                    :updatedAt,
                    :updatedBy
                )
                """)
                .param("settlementMonth", settlementMonth.atDay(1))
                .param("trainerUserId", trainerUserId)
                .param("trainerName", trainerName)
                .param("completedClassCount", completedClassCount)
                .param("sessionUnitPrice", sessionUnitPrice)
                .param("payrollAmount", payrollAmount)
                .param("confirmedAt", now)
                .param("confirmedBy", trainerUserId)
                .param("createdAt", now)
                .param("createdBy", trainerUserId)
                .param("updatedAt", now)
                .param("updatedBy", trainerUserId)
                .update();
    }
}
