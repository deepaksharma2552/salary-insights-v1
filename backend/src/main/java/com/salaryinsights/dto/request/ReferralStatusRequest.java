package com.salaryinsights.dto.request;

import com.salaryinsights.enums.ReferralStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReferralStatusRequest {

    @NotNull(message = "Status is required")
    private ReferralStatus status;

    /** Optional note explaining the decision — especially useful on rejection. */
    @Size(max = 500)
    private String adminNote;
}
