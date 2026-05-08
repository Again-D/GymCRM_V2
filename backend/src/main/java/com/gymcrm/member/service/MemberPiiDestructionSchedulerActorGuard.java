package com.gymcrm.member.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class MemberPiiDestructionSchedulerActorGuard implements ApplicationRunner {
    private final AuthUserRepository authUserRepository;
    private final Long schedulerActorUserId;

    public MemberPiiDestructionSchedulerActorGuard(
            AuthUserRepository authUserRepository,
            @Value("${app.prototype.default-admin-user-id:1}") Long schedulerActorUserId
    ) {
        this.authUserRepository = authUserRepository;
        this.schedulerActorUserId = schedulerActorUserId;
    }

    @Override
    public void run(ApplicationArguments args) {
        authUserRepository.findActiveById(schedulerActorUserId)
                .filter(AuthUser::isActive)
                .orElseThrow(() -> new IllegalStateException(
                        "Configured PII destruction scheduler actor user is missing or inactive: app.prototype.default-admin-user-id=" + schedulerActorUserId
                ));
    }

    public Long schedulerActorUserId() {
        return schedulerActorUserId;
    }
}
