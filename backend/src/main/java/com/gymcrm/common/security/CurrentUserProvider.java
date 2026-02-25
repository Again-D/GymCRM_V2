package com.gymcrm.common.security;

public interface CurrentUserProvider {
    Long currentUserId();
    Long currentCenterId();
    String currentUsername();
}
