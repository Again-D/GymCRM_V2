package com.gymcrm.member.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum Gender {
    MALE,
    FEMALE,
    OTHER;

    @JsonCreator
    public static Gender from(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Gender.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("gender must be MALE, FEMALE, or OTHER");
        }
    }

    @JsonValue
    public String value() {
        return name();
    }
}
