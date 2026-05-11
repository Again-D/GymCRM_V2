CREATE TABLE waiting_list (
    waiting_id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT NOT NULL REFERENCES trainer_schedules(schedule_id),
    member_id BIGINT NOT NULL REFERENCES members(member_id),
    membership_id BIGINT NOT NULL REFERENCES member_memberships(membership_id),
    queue_order INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    promoted_at TIMESTAMPTZ,
    reservation_id BIGINT REFERENCES reservations(reservation_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL
);

CREATE UNIQUE INDEX uk_waiting_member_schedule ON waiting_list (member_id, schedule_id);
CREATE INDEX idx_waiting_schedule_id ON waiting_list(schedule_id);
CREATE INDEX idx_waiting_member_id ON waiting_list(member_id);
CREATE INDEX idx_waiting_status_order ON waiting_list(schedule_id, queue_order) WHERE status = 'WAITING';

ALTER TABLE waiting_list
    ADD CONSTRAINT ck_waiting_status
        CHECK (status IN ('WAITING', 'PROMOTED', 'CANCELLED', 'EXPIRED'));
