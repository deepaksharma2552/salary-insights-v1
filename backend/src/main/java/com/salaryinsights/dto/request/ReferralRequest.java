package com.salaryinsights.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class ReferralRequest {

    @NotBlank(message = "Candidate name is required")
    @Size(max = 200)
    private String candidateName;

    @NotBlank(message = "Candidate email is required")
    @Email(message = "Must be a valid email address")
    @Size(max = 255)
    private String candidateEmail;

    @Size(max = 200)
    private String jobTitle;

    /** ID of an existing company — nullable. */
    private UUID companyId;

    /** Free-text company name when not in the system — nullable. */
    @Size(max = 255)
    private String companyNameRaw;

    @Size(max = 1000, message = "Note must be 1000 characters or fewer")
    private String note;
}
