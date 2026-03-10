package com.gymcrm.crm;

import com.gymcrm.common.config.RedisRuntimeProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.io.IOException;
import java.net.Socket;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class RedisCrmDispatchClaimServiceIntegrationTest {

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redisTemplate;
    private RedisCrmDispatchClaimService claimService;

    @BeforeEach
    void setUp() {
        assumeTrue(isRedisReachable(), "local redis is not running on localhost:6379");
        RedisStandaloneConfiguration configuration = new RedisStandaloneConfiguration("localhost", 6379);
        configuration.setDatabase(13);
        connectionFactory = new LettuceConnectionFactory(configuration);
        connectionFactory.afterPropertiesSet();
        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
        claimService = new RedisCrmDispatchClaimService(redisTemplate, redisProps());
    }

    @AfterEach
    void tearDown() {
        if (redisTemplate != null && redisTemplate.getConnectionFactory() != null) {
            redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
        }
        if (connectionFactory != null) {
            connectionFactory.destroy();
        }
    }

    @Test
    void sameEventCanOnlyBeClaimedOnceWithinLeaseWindow() {
        boolean first = claimService.tryClaim(1L, 101L);
        boolean second = claimService.tryClaim(1L, 101L);

        assertThat(first).isTrue();
        assertThat(second).isFalse();
        assertThat(claimService.ttlSeconds(101L)).isPositive();
    }

    private RedisRuntimeProperties redisProps() {
        return new RedisRuntimeProperties(
                true,
                false,
                new RedisRuntimeProperties.Toggle(false),
                new RedisRuntimeProperties.ReservationLock(false, Duration.ofMillis(250), Duration.ofSeconds(3)),
                new RedisRuntimeProperties.CrmDispatchClaim(true, Duration.ofSeconds(30)),
                new RedisRuntimeProperties.Toggle(false)
        );
    }

    private boolean isRedisReachable() {
        try (Socket socket = new Socket("localhost", 6379)) {
            return socket.isConnected();
        } catch (IOException ex) {
            return false;
        }
    }
}
