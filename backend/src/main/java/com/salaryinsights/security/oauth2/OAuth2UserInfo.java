package com.salaryinsights.security.oauth2;

import java.util.Map;

/**
 * Abstract user info wrapper — each provider returns differently shaped attributes.
 * Concrete subclasses know how to extract name/email/providerId from the raw map.
 */
public abstract class OAuth2UserInfo {

    protected final Map<String, Object> attributes;

    protected OAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    public Map<String, Object> getAttributes() { return attributes; }

    public abstract String getProviderId();
    public abstract String getName();
    public abstract String getEmail();
    public abstract String getImageUrl();
}
