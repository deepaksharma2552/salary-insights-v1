package com.salaryinsights.service.ai;

import com.salaryinsights.entity.Company;
import org.springframework.stereotype.Component;

/**
 * Builds structured, deterministic prompts for the LLM so it returns
 * consistent, parseable JSON about salary data.
 */
@Component
public class LlmPromptBuilder {

    public String buildSalaryFetchPrompt(Company company) {
        return """
                You are a compensation data analyst with access to public salary information.
                
                Fetch the latest publicly available salary ranges for:
                  Company:  %s
                  Industry: %s
                  Location: %s
                
                Cover roles from Junior/Entry-level through Director/VP levels.
                
                Return ONLY valid JSON (no markdown, no explanation, no code fences) in this exact shape:
                {
                  "companyName": "%s",
                  "location": "%s",
                  "dataSource": "public_inference",
                  "entries": [
                    {
                      "jobTitle": "Software Engineer",
                      "department": "Engineering",
                      "internalLevel": "L3",
                      "experienceLevel": "ENTRY",
                      "employmentType": "FULL_TIME",
                      "baseSalary": 120000,
                      "bonus": 15000,
                      "equity": 10000,
                      "currency": "USD",
                      "notes": "Based on public data sources"
                    }
                  ]
                }
                
                Valid values for experienceLevel: INTERN, ENTRY, MID, SENIOR, LEAD, MANAGER, DIRECTOR, VP, C_LEVEL
                Valid values for employmentType: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE
                
                Include at least 5 different roles/levels. Use realistic market data.
                If you cannot find specific data, provide reasonable industry estimates and note that in the notes field.
                Return ONLY the JSON object, nothing else.
                """.formatted(
                company.getName(),
                company.getIndustry() != null ? company.getIndustry() : "Technology",
                company.getLocation() != null ? company.getLocation() : "United States",
                company.getName(),
                company.getLocation() != null ? company.getLocation() : "United States"
        );
    }

    public String buildLevelMappingPrompt(String companyName, String internalLevel,
                                          java.util.List<String> standardizedLevels) {
        return """
                You are a compensation expert who maps company-specific job levels to standardized levels.
                
                Company: %s
                Internal Level Name: "%s"
                
                Available standardized levels (from lowest to highest): %s
                
                Determine which standardized level best matches this internal level.
                
                Return ONLY valid JSON (no markdown, no explanation):
                {
                  "internalLevel": "%s",
                  "suggestedStandardizedLevel": "Mid",
                  "confidence": 0.85,
                  "reasoning": "L4 at most tech companies maps to Mid-level (2-5 years experience)"
                }
                
                Return ONLY the JSON object, nothing else.
                """.formatted(
                companyName,
                internalLevel,
                String.join(", ", standardizedLevels),
                internalLevel
        );
    }
}
