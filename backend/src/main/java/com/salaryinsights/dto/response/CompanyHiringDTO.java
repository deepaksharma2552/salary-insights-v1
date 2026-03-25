package com.salaryinsights.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Lightweight DTO returned by GET /public/companies/hiring-now
 * Maps company_id → open opportunity count so the frontend can
 * render "N open roles" badges on salary rows without a join.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyHiringDTO {
    private UUID companyId;
    private long openRoles;
}
