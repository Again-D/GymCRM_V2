package com.gymcrm.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class CurrentUserProviderConditionalTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(PrototypeCurrentUserProvider.class, SecurityContextCurrentUserProvider.class);

    @Test
    void selectsJwtProviderForUppercaseJwtMode() {
        contextRunner.withPropertyValues("app.security.mode=JWT")
                .run(context -> {
                    CurrentUserProvider provider = context.getBean(CurrentUserProvider.class);
                    assertInstanceOf(SecurityContextCurrentUserProvider.class, provider);
                });
    }

    @Test
    void selectsPrototypeProviderForUppercasePrototypeMode() {
        contextRunner.withPropertyValues("app.security.mode=PROTOTYPE")
                .run(context -> {
                    CurrentUserProvider provider = context.getBean(CurrentUserProvider.class);
                    assertInstanceOf(PrototypeCurrentUserProvider.class, provider);
                });
    }
}
