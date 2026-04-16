INSERT INTO roles (role_code, description, created_by, updated_by)
VALUES ('ROLE_ADMIN', '센터 최고 관리자', 0, 0)
ON CONFLICT (role_code) DO NOTHING;
