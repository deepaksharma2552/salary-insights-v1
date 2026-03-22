package com.salaryinsights.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single company benefit with an optional human-readable amount.
 * Stored as a JSON object in the DB via JsonBenefitConverter.
 * amount is a free-text string (e.g. "₹5L/yr", "Varies", "26 weeks") — not a number,
 * so the admin can express any unit without frontend formatting constraints.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BenefitItem {
    private String name;
    private String amount; // nullable — null means "not specified"
}
