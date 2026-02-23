package com.gymcrm.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@Profile({"dev", "staging"})
public class PrototypeCorsConfig implements WebMvcConfigurer {
    private final List<String> allowedOrigins;

    public PrototypeCorsConfig(
            @Value("${app.prototype.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}") List<String> allowedOrigins
    ) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/v1/**")
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
