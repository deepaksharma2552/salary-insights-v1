package com.salaryinsights.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Location {
    BENGALURU("Bengaluru"),
    HYDERABAD("Hyderabad"),
    PUNE("Pune"),
    DELHI_NCR("Delhi-NCR"),
    KOCHI("Kochi"),
    COIMBATORE("Coimbatore"),
    MYSORE("Mysore"),
    MANGALURU("Mangaluru");

    private final String displayName;

    Location(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    @JsonCreator
    public static Location fromValue(String value) {
        if (value == null) return null;
        for (Location l : values()) {
            if (l.displayName.equalsIgnoreCase(value) || l.name().equalsIgnoreCase(value)) {
                return l;
            }
        }
        return null; // graceful — unknown locations stored as null
    }
}
