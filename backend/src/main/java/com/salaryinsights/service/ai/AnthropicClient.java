package com.salaryinsights.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Low-level HTTP client that calls the Anthropic Claude Messages API.
 *
 * Model used: claude-sonnet-4-20250514 (most capable for structured extraction).
 * Docs: https://docs.anthropic.com/en/api/messages
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnthropicClient {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String MODEL   = "claude-sonnet-4-20250514";
    private static final String VERSION = "2023-06-01";

    @Value("${app.ai.anthropic-api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Send a prompt to Claude and return the raw text response.
     *
     * @param userPrompt the full user message
     * @param maxTokens  maximum tokens in the response
     * @return raw LLM response text
     * @throws AiUnavailableException if API key is missing or the call fails
     */
    public String complete(String userPrompt, int maxTokens) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiUnavailableException("Anthropic API key not configured. " +
                    "Set ANTHROPIC_API_KEY environment variable or app.ai.anthropic-api-key in application.yml.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", VERSION);

        Map<String, Object> body = Map.of(
                "model", MODEL,
                "max_tokens", maxTokens,
                "messages", List.of(
                        Map.of("role", "user", "content", userPrompt)
                )
        );

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(API_URL, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new AiUnavailableException("Anthropic API returned: " + response.getStatusCode());
            }

            JsonNode root    = objectMapper.readTree(response.getBody());
            JsonNode content = root.path("content");

            if (content.isArray() && !content.isEmpty()) {
                return content.get(0).path("text").asText();
            }

            throw new AiUnavailableException("Unexpected response shape from Anthropic API");

        } catch (AiUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.error("Anthropic API call failed: {}", e.getMessage(), e);
            throw new AiUnavailableException("Failed to call Anthropic API: " + e.getMessage());
        }
    }
}
