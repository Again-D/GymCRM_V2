package com.gymcrm.common.error;

import com.gymcrm.common.api.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException ex) {
        ErrorCode code = ex.getErrorCode();
        return ResponseEntity.status(code.status())
                .body(ApiResponse.error(
                        code.defaultMessage(),
                        new ApiResponse.ApiError(code.name(), code.status().value(), ex.getMessage())
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(this::formatFieldError)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ApiResponse.error(
                ErrorCode.VALIDATION_ERROR.defaultMessage(),
                new ApiResponse.ApiError(ErrorCode.VALIDATION_ERROR.name(), 400, detail)
        ));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(
                ErrorCode.VALIDATION_ERROR.defaultMessage(),
                new ApiResponse.ApiError(ErrorCode.VALIDATION_ERROR.name(), 400, ex.getMessage())
        ));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(ApiResponse.error(
                "허용되지 않은 요청 메서드입니다.",
                new ApiResponse.ApiError("METHOD_NOT_ALLOWED", HttpStatus.METHOD_NOT_ALLOWED.value(), ex.getMessage())
        ));
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(Exception ex) {
        return ResponseEntity.status(ErrorCode.ACCESS_DENIED.status())
                .body(ApiResponse.error(
                        ErrorCode.ACCESS_DENIED.defaultMessage(),
                        new ApiResponse.ApiError(
                                ErrorCode.ACCESS_DENIED.name(),
                                ErrorCode.ACCESS_DENIED.status().value(),
                                "접근 권한이 없습니다."
                        )
                ));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException ex) {
        return ResponseEntity.status(ErrorCode.NOT_FOUND.status())
                .body(ApiResponse.error(
                        ErrorCode.NOT_FOUND.defaultMessage(),
                        new ApiResponse.ApiError(
                                ErrorCode.NOT_FOUND.name(),
                                ErrorCode.NOT_FOUND.status().value(),
                                ex.getMessage()
                        )
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.internalServerError().body(ApiResponse.error(
                ErrorCode.INTERNAL_ERROR.defaultMessage(),
                new ApiResponse.ApiError(
                        ErrorCode.INTERNAL_ERROR.name(),
                        500,
                        "Internal server error"
                )
        ));
    }

    private String formatFieldError(FieldError error) {
        return error.getField() + ": " + (error.getDefaultMessage() == null ? "invalid" : error.getDefaultMessage());
    }
}
