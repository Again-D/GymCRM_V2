DO $$
DECLARE
    center_admin_role_id BIGINT;
    manager_role_id BIGINT;
BEGIN
    SELECT role_id
    INTO center_admin_role_id
    FROM roles
    WHERE role_code = 'ROLE_CENTER_ADMIN';

    IF center_admin_role_id IS NULL THEN
        RETURN;
    END IF;

    SELECT role_id
    INTO manager_role_id
    FROM roles
    WHERE role_code = 'ROLE_MANAGER';

    IF manager_role_id IS NULL THEN
        INSERT INTO roles (role_code, description, created_by, updated_by)
        VALUES ('ROLE_MANAGER', '운영 관리자', 0, 0)
        RETURNING role_id INTO manager_role_id;
    END IF;

    UPDATE user_roles
    SET role_id = manager_role_id
    WHERE role_id = center_admin_role_id;

    DELETE FROM roles
    WHERE role_id = center_admin_role_id;
END $$;
