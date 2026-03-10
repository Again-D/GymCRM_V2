package com.gymcrm.access;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.io.IOException;
import java.net.Socket;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class RedisQrTokenStoreIntegrationTest {

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redisTemplate;
    private RedisQrTokenStore qrTokenStore;

    @BeforeEach
    void setUp() {
        assumeTrue(isRedisReachable(), "local redis is not running on localhost:6379");
        RedisStandaloneConfiguration configuration = new RedisStandaloneConfiguration("localhost", 6379);
        configuration.setDatabase(15);
        connectionFactory = new LettuceConnectionFactory(configuration);
        connectionFactory.afterPropertiesSet();
        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
        qrTokenStore = new RedisQrTokenStore(redisTemplate);
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
    void consumeMarksTokenAsReusedAfterFirstSuccessfulRead() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        QrTokenStore.IssuedToken issued = qrTokenStore.issue(1L, 11L, now, 30);

        QrTokenStore.ConsumedToken first = qrTokenStore.consume(1L, issued.token(), now.plusSeconds(1));
        QrTokenStore.ConsumedToken second = qrTokenStore.consume(1L, issued.token(), now.plusSeconds(2));

        assertThat(first.status()).isEqualTo(QrTokenStore.ConsumeStatus.VALID);
        assertThat(second.status()).isEqualTo(QrTokenStore.ConsumeStatus.REUSED);
        assertThat(second.memberId()).isEqualTo(11L);
    }

    @Test
    void consumeReturnsExpiredAfterTtlBoundary() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        QrTokenStore.IssuedToken issued = qrTokenStore.issue(1L, 12L, now, 1);

        QrTokenStore.ConsumedToken expired = qrTokenStore.consume(1L, issued.token(), now.plusSeconds(2));
        QrTokenStore.ConsumedToken afterExpiredConsume = qrTokenStore.consume(1L, issued.token(), now.plusSeconds(3));

        assertThat(expired.status()).isEqualTo(QrTokenStore.ConsumeStatus.EXPIRED);
        assertThat(afterExpiredConsume.status()).isEqualTo(QrTokenStore.ConsumeStatus.INVALID);
    }

    @Test
    void issuingNewTokenInvalidatesPreviousActiveTokenForSameMember() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        QrTokenStore.IssuedToken first = qrTokenStore.issue(1L, 13L, now, 30);
        QrTokenStore.IssuedToken second = qrTokenStore.issue(1L, 13L, now.plusSeconds(1), 30);

        QrTokenStore.ConsumedToken oldToken = qrTokenStore.consume(1L, first.token(), now.plusSeconds(2));
        QrTokenStore.ConsumedToken newToken = qrTokenStore.consume(1L, second.token(), now.plusSeconds(2));

        assertThat(oldToken.status()).isEqualTo(QrTokenStore.ConsumeStatus.INVALID);
        assertThat(newToken.status()).isEqualTo(QrTokenStore.ConsumeStatus.VALID);
    }

    private boolean isRedisReachable() {
        try (Socket socket = new Socket("localhost", 6379)) {
            return socket.isConnected();
        } catch (IOException ex) {
            return false;
        }
    }
}
