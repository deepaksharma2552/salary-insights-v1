package com.salaryinsights.dto.response;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class JobFunctionResponse {
    private UUID   id;
    private String name;
    private String displayName;
    private int    sortOrder;
    private List<FunctionLevelResponse> levels;
}
