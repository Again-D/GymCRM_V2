package com.gymcrm.member.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum MemberStatus {
    ACTIVE,
    INACTIVE;

    @JsonCreator
    public static MemberStatus from(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return MemberStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("memberStatus must be ACTIVE or INACTIVE");
        }
    }

    @JsonValue
    public String value() {
        return name();
    }
}
