package com.salaryinsights.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight DTO returned by GET /public/locations.
 * value = enum name (e.g. "BENGALURU")    — used as the API/form parameter
 * label = display name (e.g. "Bengaluru") — shown in dropdowns and filters
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationOptionDTO {
    private String value;
    private String label;
}
