package com.salaryinsights.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salaryinsights.dto.response.BenefitItem;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

/**
 * JPA converter that stores List<BenefitItem> as a JSON array string in the DB.
 *
 * Follows the same pattern as JsonListConverter — no external library needed,
 * works with any JDBC driver, plays nicely with Hibernate's L2 cache and
 * connection pool under high concurrency (ObjectMapper is thread-safe).
 *
 * DB column: TEXT, holds e.g. [{"name":"ESOPs","amount":"Varies"},...]
 *
 * Performance note: ObjectMapper is instantiated once (static final) and
 * reused across all calls — safe because ObjectMapper is fully thread-safe
 * after configuration. No synchronisation overhead per request.
 */
@Converter
public class JsonBenefitConverter implements AttributeConverter<List<BenefitItem>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<BenefitItem>> TYPE_REF = new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(List<BenefitItem> benefits) {
        if (benefits == null || benefits.isEmpty()) return "[]";
        try {
            return MAPPER.writeValueAsString(benefits);
        } catch (Exception e) {
            return "[]";
        }
    }

    @Override
    public List<BenefitItem> convertToEntityAttribute(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(json, TYPE_REF);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
