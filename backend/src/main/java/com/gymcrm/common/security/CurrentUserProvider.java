package com.gymcrm.common.security;

public interface CurrentUserProvider {
    Long currentUserId();
    String currentUsername();
}

