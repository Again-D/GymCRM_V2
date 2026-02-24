package com.gymcrm.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class AuthCookieSupport {
    public static final String REFRESH_COOKIE_NAME = "gymcrm_refresh_token";

    private final long refreshTokenMaxAgeSeconds;

    public AuthCookieSupport(@Value("${app.security.jwt.refresh-token-days:7}") long refreshTokenDays) {
        this.refreshTokenMaxAgeSeconds = refreshTokenDays * 24 * 60 * 60;
    }

    public String extractRefreshToken(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (REFRESH_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public void writeRefreshTokenCookie(jakarta.servlet.http.HttpServletResponse response, String token, boolean secure) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(secure)
                .sameSite(secure ? "Strict" : "Lax")
                .path("/")
                .maxAge(refreshTokenMaxAgeSeconds)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearRefreshTokenCookie(jakarta.servlet.http.HttpServletResponse response, boolean secure) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite(secure ? "Strict" : "Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
