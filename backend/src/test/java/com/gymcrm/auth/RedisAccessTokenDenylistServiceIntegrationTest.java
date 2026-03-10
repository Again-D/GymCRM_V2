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

class RedisAccessTokenDenylistServiceIntegrationTest {

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redisTemplate;
    private RedisAccessTokenDenylistService denylistService;

    @BeforeEach
    void setUp() {
        assumeTrue(isRedisReachable(), "local redis is not running on localhost:6379");
        RedisStandaloneConfiguration configuration = new RedisStandaloneConfiguration("localhost", 6379);
        configuration.setDatabase(14);
        connectionFactory = new LettuceConnectionFactory(configuration);
        connectionFactory.afterPropertiesSet();
        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
        denylistService = new RedisAccessTokenDenylistService(redisTemplate);
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
    void denyStoresJtiUntilTokenExpiry() {
        denylistService.deny("jti-123", OffsetDateTime.now().plusSeconds(30), "LOGOUT");

        assertThat(denylistService.isDenied("jti-123")).isTrue();
        Long ttl = redisTemplate.getExpire("auth:denylist:access:jti-123");
        assertThat(ttl).isNotNull();
        assertThat(ttl).isPositive();
    }

    private boolean isRedisReachable() {
        try (Socket socket = new Socket("localhost", 6379)) {
            return socket.isConnected();
        } catch (IOException ex) {
            return false;
        }
    }
}
