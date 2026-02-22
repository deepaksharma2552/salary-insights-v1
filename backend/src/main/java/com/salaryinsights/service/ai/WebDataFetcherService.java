package com.salaryinsights.service.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salaryinsights.dto.response.AiSalaryData;
import com.salaryinsights.entity.Company;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Uses the LLM to retrieve structured salary data for a given company.
 * This is the "web data fetcher" layer — it fires a prompt, receives JSON,
 * and parses it into a strongly-typed {@link AiSalaryData} object.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebDataFetcherService {

    private final AnthropicClient anthropicClient;
    private final LlmPromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;

    /**
     * Fetch latest salary data for a company by calling the LLM.
     *
     * @param company the company to fetch data for
     * @return parsed salary data
     */
    public AiSalaryData fetchSalaryData(Company company) {
        log.info("[AI] Fetching salary data for company: {}", company.getName());

        String prompt   = promptBuilder.buildSalaryFetchPrompt(company);
        String rawJson  = anthropicClient.complete(prompt, 2048);

        log.debug("[AI] Raw LLM response for {}: {}", company.getName(), rawJson);

        return parseResponse(rawJson, company.getName());
    }

    /**
     * Ask the LLM to suggest a standardized level mapping for a new internal level name.
     */
    public LevelMappingSuggestion suggestLevelMapping(
            String companyName,
            String internalLevelName,
            java.util.List<String> availableStandardizedLevels) {

        log.info("[AI] Suggesting mapping for level '{}' at '{}'", internalLevelName, companyName);

        String prompt  = promptBuilder.buildLevelMappingPrompt(companyName, internalLevelName, availableStandardizedLevels);
        String rawJson = anthropicClient.complete(prompt, 256);

        try {
            return objectMapper.readValue(sanitizeJson(rawJson), LevelMappingSuggestion.class);
        } catch (JsonProcessingException e) {
            log.warn("[AI] Could not parse mapping suggestion, returning fallback. Raw: {}", rawJson);
            return LevelMappingSuggestion.fallback(internalLevelName);
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private AiSalaryData parseResponse(String raw, String companyName) {
        try {
            String json = sanitizeJson(raw);
            return objectMapper.readValue(json, AiSalaryData.class);
        } catch (JsonProcessingException e) {
            log.error("[AI] Failed to parse JSON for {}: {} | Raw: {}", companyName, e.getMessage(), raw);
            throw new AiUnavailableException("LLM returned malformed JSON for company: " + companyName);
        }
    }

    /**
     * Strip markdown code fences that the LLM sometimes wraps responses in,
     * even when instructed not to.
     */
    private String sanitizeJson(String raw) {
        if (raw == null) return "{}";
        String trimmed = raw.strip();
        // Remove ```json ... ``` or ``` ... ```
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("```(?:json)?\\s*", "");
            int lastFence = trimmed.lastIndexOf("```");
            if (lastFence != -1) trimmed = trimmed.substring(0, lastFence);
        }
        return trimmed.strip();
    }

    // ── inner record ─────────────────────────────────────────────────────────

    public record LevelMappingSuggestion(
            String internalLevel,
            String suggestedStandardizedLevel,
            double confidence,
            String reasoning) {

        public static LevelMappingSuggestion fallback(String internalLevel) {
            return new LevelMappingSuggestion(internalLevel, "Mid", 0.5, "Could not parse AI response");
        }
    }
}
