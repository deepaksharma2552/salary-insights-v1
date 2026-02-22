package com.salaryinsights.security.oauth2;

import java.util.Map;

public class LinkedInOAuth2UserInfo extends OAuth2UserInfo {

    public LinkedInOAuth2UserInfo(Map<String, Object> attributes) {
        super(attributes);
    }

    @Override
    public String getProviderId() {
        return (String) attributes.get("sub");
    }

    @Override
    public String getName() {
        String given  = (String) attributes.getOrDefault("given_name", "");
        String family = (String) attributes.getOrDefault("family_name", "");
        String full   = (given + " " + family).strip();
        return full.isEmpty() ? (String) attributes.get("name") : full;
    }

    @Override
    public String getEmail() {
        return (String) attributes.get("email");
    }

    @Override
    public String getImageUrl() {
        return (String) attributes.get("picture");
    }
}
