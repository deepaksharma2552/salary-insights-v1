package com.salaryinsights.dto.request;

import com.salaryinsights.enums.OpportunityStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OpportunityStatusRequest {

    @NotNull(message = "Status is required")
    private OpportunityStatus status;

    /** Required when status = REJECTED. */
    private String rejectionReason;
}
