package com.salaryinsights.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum InternalLevel {
    SDE_1("SDE 1"),
    SDE_2("SDE 2"),
    SDE_3("SDE 3"),
    STAFF_ENGINEER("Staff Engineer"),
    PRINCIPAL_ENGINEER("Principal Engineer"),
    ARCHITECT("Architect"),
    ENGINEERING_MANAGER("Engineering Manager"),
    SR_ENGINEERING_MANAGER("Sr. Engineering Manager"),
    DIRECTOR("Director"),
    SR_DIRECTOR("Sr. Director"),
    VP("VP");

    private final String displayName;

    InternalLevel(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    // Accepts both "SDE 1" (display) and "SDE_1" (enum name) from JSON
    @JsonCreator
    public static InternalLevel fromValue(String value) {
        if (value == null) return null;
        for (InternalLevel level : values()) {
            if (level.displayName.equalsIgnoreCase(value) || level.name().equalsIgnoreCase(value)) {
                return level;
            }
        }
        throw new IllegalArgumentException("Unknown internal level: " + value);
    }
}
