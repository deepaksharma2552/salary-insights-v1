package com.salaryinsights.security.oauth2;

import java.util.Map;

public class FacebookOAuth2UserInfo extends OAuth2UserInfo {

    public FacebookOAuth2UserInfo(Map<String, Object> attributes) {
        super(attributes);
    }

    @Override
    public String getProviderId() {
        return (String) attributes.get("id");
    }

    @Override
    public String getName() {
        return (String) attributes.get("name");
    }

    @Override
    public String getEmail() {
        return (String) attributes.get("email");
    }

    @Override
    @SuppressWarnings("unchecked")
    public String getImageUrl() {
        // Facebook returns: { "picture": { "data": { "url": "..." } } }
        Object picture = attributes.get("picture");
        if (picture instanceof Map) {
            Map<String, Object> pictureData = (Map<String, Object>) picture;
            Object data = pictureData.get("data");
            if (data instanceof Map) {
                return (String) ((Map<String, Object>) data).get("url");
            }
        }
        return null;
    }
}
