package com.gymcrm.crm;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.gymcrm.crm.service.RedisCrmRetryWheelService;

import java.io.IOException;
import java.net.Socket;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class RedisCrmRetryWheelServiceIntegrationTest {

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redisTemplate;
    private RedisCrmRetryWheelService retryWheelService;

    @BeforeEach
    void setUp() {
        assumeTrue(isRedisReachable(), "local redis is not running on localhost:6379");
        RedisStandaloneConfiguration configuration = new RedisStandaloneConfiguration("localhost", 6379);
        configuration.setDatabase(10);
        connectionFactory = new LettuceConnectionFactory(configuration);
        connectionFactory.afterPropertiesSet();
        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
        retryWheelService = new RedisCrmRetryWheelService(redisTemplate);
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
    void scheduleAndPollDueReturnsReadyIdsAndRemovesThem() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        retryWheelService.schedule(1L, 101L, now.minusSeconds(10));
        retryWheelService.schedule(1L, 102L, now.plusSeconds(30));

        List<Long> due = retryWheelService.pollDue(1L, now, 10);
        List<Long> secondPoll = retryWheelService.pollDue(1L, now, 10);

        assertThat(due).containsExactly(101L);
        assertThat(secondPoll).isEmpty();
    }

    private boolean isRedisReachable() {
        try (Socket socket = new Socket("localhost", 6379)) {
            return socket.isConnected();
        } catch (IOException ex) {
            return false;
        }
    }
}
