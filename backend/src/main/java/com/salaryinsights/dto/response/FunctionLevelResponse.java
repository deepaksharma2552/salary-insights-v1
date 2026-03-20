package com.salaryinsights.dto.response;

import lombok.Data;
import java.util.UUID;

@Data
public class FunctionLevelResponse {
    private UUID   id;
    private String name;
    private int    sortOrder;
}
