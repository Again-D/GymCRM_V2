package com.gymcrm.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymcrm.common.api.ApiResponse;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException, ServletException {
        Object ex = request.getAttribute("jwt_auth_exception");
        ApiResponse<Void> body;
        int status;
        if (ex instanceof ApiException apiException) {
            ErrorCode code = apiException.getErrorCode();
            status = code.status().value();
            body = ApiResponse.error(
                    code.defaultMessage(),
                    new ApiResponse.ApiError(code.name(), status, apiException.getMessage())
            );
        } else {
            status = HttpServletResponse.SC_UNAUTHORIZED;
            body = ApiResponse.error(
                    ErrorCode.AUTHENTICATION_FAILED.defaultMessage(),
                    new ApiResponse.ApiError(
                            ErrorCode.AUTHENTICATION_FAILED.name(),
                            status,
                            "인증이 필요합니다."
                    )
            );
        }

        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), body);
    }
}
