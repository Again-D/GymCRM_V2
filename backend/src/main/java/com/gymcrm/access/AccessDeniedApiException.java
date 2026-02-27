package com.gymcrm.access;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;

public class AccessDeniedApiException extends ApiException {
    public AccessDeniedApiException(String message) {
        super(ErrorCode.BUSINESS_RULE, message);
    }
}
