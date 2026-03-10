package com.gymcrm.auth;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.io.IOException;
import java.net.Socket;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class RedisAccessRevocationMarkerServiceIntegrationTest {

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redisTemplate;
    private RedisAccessRevocationMarkerService markerService;

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
        markerService = new RedisAccessRevocationMarkerService(redisTemplate);
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
    void storesAndResolvesUserRevokeAfterMarker() {
        OffsetDateTime revokedAfter = OffsetDateTime.now().minusSeconds(5);

        markerService.mirrorRevokeAfter(7L, revokedAfter);

        assertThat(markerService.resolveRevokeAfter(7L, null)).isEqualTo(revokedAfter);
        assertThat(redisTemplate.opsForValue().get("auth:revoke-after:user:7")).isEqualTo(revokedAfter.toString());
    }

    private boolean isRedisReachable() {
        try (Socket socket = new Socket("localhost", 6379)) {
            return socket.isConnected();
        } catch (IOException ex) {
            return false;
        }
    }
}
