package com.salaryinsights.service.ai;

/**
 * Thrown when the AI backend is unavailable or misconfigured.
 * Controllers catch this and return a 503 with a helpful message.
 */
public class AiUnavailableException extends RuntimeException {
    public AiUnavailableException(String message) {
        super(message);
    }
}
