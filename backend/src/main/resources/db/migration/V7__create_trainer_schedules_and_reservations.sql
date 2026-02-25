CREATE TABLE IF NOT EXISTS trainer_schedules (
    schedule_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    schedule_type VARCHAR(20) NOT NULL,
    trainer_name VARCHAR(100) NOT NULL,
    slot_title VARCHAR(120) NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    current_count INTEGER NOT NULL DEFAULT 0,
    memo TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_trainer_schedules_type
        CHECK (schedule_type IN ('PT', 'GX')),
    CONSTRAINT chk_trainer_schedules_time_order
        CHECK (end_at > start_at),
    CONSTRAINT chk_trainer_schedules_capacity
        CHECK (capacity > 0),
    CONSTRAINT chk_trainer_schedules_current_count
        CHECK (current_count >= 0 AND current_count <= capacity)
);

CREATE INDEX IF NOT EXISTS idx_trainer_schedules_center_start
    ON trainer_schedules (center_id, start_at);

CREATE INDEX IF NOT EXISTS idx_trainer_schedules_center_type_start
    ON trainer_schedules (center_id, schedule_type, start_at);

CREATE TABLE IF NOT EXISTS reservations (
    reservation_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    member_id BIGINT NOT NULL REFERENCES members (member_id),
    membership_id BIGINT NOT NULL REFERENCES member_memberships (membership_id),
    schedule_id BIGINT NOT NULL REFERENCES trainer_schedules (schedule_id),
    reservation_status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    cancel_reason TEXT,
    memo TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_reservations_status
        CHECK (reservation_status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
    CONSTRAINT chk_reservations_cancelled_at
        CHECK (
            (reservation_status = 'CANCELLED' AND cancelled_at IS NOT NULL)
            OR
            (reservation_status <> 'CANCELLED')
        ),
    CONSTRAINT chk_reservations_completed_at
        CHECK (
            (reservation_status = 'COMPLETED' AND completed_at IS NOT NULL)
            OR
            (reservation_status <> 'COMPLETED')
        )
);

-- Phase 7 policy: a member can have at most one confirmed reservation per slot.
CREATE UNIQUE INDEX IF NOT EXISTS uk_reservations_member_schedule_confirmed
    ON reservations (member_id, schedule_id)
    WHERE is_deleted = FALSE AND reservation_status = 'CONFIRMED';

CREATE INDEX IF NOT EXISTS idx_reservations_center_status_reserved
    ON reservations (center_id, reservation_status, reserved_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservations_schedule_status
    ON reservations (schedule_id, reservation_status);

CREATE INDEX IF NOT EXISTS idx_reservations_member_status
    ON reservations (member_id, reservation_status, reserved_at DESC);
