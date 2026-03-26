package com.salaryinsights.dto.response;

import lombok.Data;

import java.util.UUID;

@Data
public class FunctionLevelResponse {
    private UUID   id;
    private String name;
    private int    sortOrder;

    /** UUID of the mapped standardized level — null if not mapped. */
    private UUID   standardizedLevelId;

    /** Display name of the mapped standardized level (e.g. "SDE 2") — null if not mapped. */
    private String standardizedLevelName;
}
