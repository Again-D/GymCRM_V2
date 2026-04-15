package com.gymcrm.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "DB_URL=jdbc:postgresql://localhost:5433/gymcrm_dev",
        "DB_USERNAME=gymcrm",
        "DB_PASSWORD=gymcrm",
        "app.security.mode=jwt",
        "app.security.dev-admin.seed-enabled=true",
        "app.security.dev-admin.login-id=center-admin",
        "app.security.dev-admin.initial-password=dev-admin-1234!"
})
@ActiveProfiles("dev")
class RoleStorageMigrationIntegrationTest {

    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void canonicalRolesAreSeededAndEveryActiveUserHasExactlyOneRoleMapping() {
        List<String> roleCodes = jdbcClient.sql("""
                SELECT role_code
                FROM roles
                ORDER BY role_code
                """)
                .query(String.class)
                .list();

        assertThat(roleCodes).containsExactly(
                "ROLE_ADMIN",
                "ROLE_DESK",
                "ROLE_MANAGER",
                "ROLE_SUPER_ADMIN",
                "ROLE_TRAINER"
        );

        Integer unmappedActiveUsers = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM (
                    SELECT u.user_id
                    FROM users u
                    LEFT JOIN user_roles ur ON ur.user_id = u.user_id
                    WHERE u.is_deleted = FALSE
                    GROUP BY u.user_id
                    HAVING COUNT(ur.user_role_id) <> 1
                ) violations
                """)
                .query(Integer.class)
                .single();

        assertThat(unmappedActiveUsers).isZero();
    }

    @Test
    void seededCenterAdminHasAdminRoleMapping() {
        String roleCode = jdbcClient.sql("""
                SELECT r.role_code
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.user_id
                JOIN roles r ON r.role_id = ur.role_id
                WHERE u.login_id = 'center-admin'
                  AND u.is_deleted = FALSE
                """)
                .query(String.class)
                .single();

        assertThat(roleCode).isEqualTo("ROLE_ADMIN");
    }
}
