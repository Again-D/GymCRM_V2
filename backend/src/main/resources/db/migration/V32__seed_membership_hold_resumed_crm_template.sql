-- V32: Seed Membership Hold Auto-Resume CRM Template
-- Target Center: 1 (Default Center)

INSERT INTO crm_message_templates (
    center_id, template_code, template_name, channel_type, template_type, template_body, 
    is_active, created_at, updated_at, created_by, updated_by
)
VALUES (
    1,
    'MEMBERSHIP_HOLD_RESUMED',
    '회원권 홀딩 만료 자동 재개 알림',
    'SMS',
    'TRANSACTIONAL',
    '[GymCRM] {memberName}님의 회원권 홀딩이 종료되어 금일({today})부로 자동 재개되었습니다. 운동하러 오세요!',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    1,
    1
);
