CREATE TABLE IF NOT EXISTS locker_slots (
    locker_slot_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    locker_code VARCHAR(40) NOT NULL,
    locker_zone VARCHAR(40),
    locker_grade VARCHAR(20),
    locker_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    memo TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_locker_slots_status
        CHECK (locker_status IN ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_locker_slots_center_code_active
    ON locker_slots (center_id, locker_code)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_locker_slots_center_status
    ON locker_slots (center_id, locker_status, locker_code);

CREATE TABLE IF NOT EXISTS locker_assignments (
    locker_assignment_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    locker_slot_id BIGINT NOT NULL REFERENCES locker_slots (locker_slot_id),
    member_id BIGINT NOT NULL REFERENCES members (member_id),
    assignment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    returned_at TIMESTAMPTZ NULL,
    refund_amount NUMERIC(12, 2),
    return_reason TEXT,
    memo TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_locker_assignments_status
        CHECK (assignment_status IN ('ACTIVE', 'RETURNED')),
    CONSTRAINT chk_locker_assignments_date_order
        CHECK (end_date >= start_date),
    CONSTRAINT chk_locker_assignments_return_fields
        CHECK (
            (assignment_status = 'RETURNED' AND returned_at IS NOT NULL)
            OR
            (assignment_status = 'ACTIVE' AND returned_at IS NULL)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_locker_assignments_active_slot
    ON locker_assignments (locker_slot_id)
    WHERE assignment_status = 'ACTIVE' AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uk_locker_assignments_active_member
    ON locker_assignments (center_id, member_id)
    WHERE assignment_status = 'ACTIVE' AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_locker_assignments_center_status_assigned
    ON locker_assignments (center_id, assignment_status, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_locker_assignments_member_status
    ON locker_assignments (member_id, assignment_status, assigned_at DESC);
