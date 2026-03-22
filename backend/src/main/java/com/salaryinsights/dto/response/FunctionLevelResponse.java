package com.salaryinsights.dto.response;

import lombok.Data;
import java.util.UUID;

@Data
public class FunctionLevelResponse {
    private UUID   id;
    private String name;
    private int    sortOrder;
    /** Mapped InternalLevel enum name (e.g. "SDE_1") — null if not mapped. */
    private String internalLevel;
}
