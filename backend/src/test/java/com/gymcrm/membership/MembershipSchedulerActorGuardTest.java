package com.gymcrm.membership;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.membership.service.MembershipSchedulerActorGuard;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MembershipSchedulerActorGuardTest {

    private final AuthUserRepository authUserRepository = mock(AuthUserRepository.class);

    @Test
    void allowsStartupWhenConfiguredSchedulerActorIsActive() {
        when(authUserRepository.findActiveById(1L)).thenReturn(Optional.of(activeUser("ACTIVE")));

        MembershipSchedulerActorGuard guard = new MembershipSchedulerActorGuard(authUserRepository, 1L);

        assertDoesNotThrow(() -> guard.run(null));
    }

    @Test
    void blocksStartupWhenConfiguredSchedulerActorIsMissing() {
        when(authUserRepository.findActiveById(999L)).thenReturn(Optional.empty());

        MembershipSchedulerActorGuard guard = new MembershipSchedulerActorGuard(authUserRepository, 999L);

        assertThrows(IllegalStateException.class, () -> guard.run(null));
    }

    @Test
    void blocksStartupWhenConfiguredSchedulerActorIsInactive() {
        when(authUserRepository.findActiveById(7L)).thenReturn(Optional.of(activeUser("INACTIVE")));

        MembershipSchedulerActorGuard guard = new MembershipSchedulerActorGuard(authUserRepository, 7L);

        assertThrows(IllegalStateException.class, () -> guard.run(null));
    }

    private AuthUser activeUser(String userStatus) {
        return new AuthUser(1L, 1L, "scheduler-admin", "hash", "Scheduler Admin", "010-0000-0000", "ROLE_MANAGER", userStatus, null, null);
    }
}
