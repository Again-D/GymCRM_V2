package com.gymcrm.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "요청 값이 올바르지 않습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "대상을 찾을 수 없습니다."),
    CONFLICT(HttpStatus.CONFLICT, "이미 처리되었거나 충돌이 발생했습니다."),
    BUSINESS_RULE(HttpStatus.UNPROCESSABLE_ENTITY, "비즈니스 규칙 위반입니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus status() {
        return status;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}

