-- NFR-013: 비밀번호 90일 변경 권고 정책 지원
-- password_changed_at: 마지막 비밀번호 변경 시각 (NULL = 초기 생성 상태, created_at 기준으로 해석)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- 기존 계정은 생성 시각을 기준으로 초기화한다
UPDATE users SET password_changed_at = created_at WHERE password_changed_at IS NULL;

COMMENT ON COLUMN users.password_changed_at IS '마지막 비밀번호 변경 시각. NULL이면 created_at을 기준으로 계산한다.';
