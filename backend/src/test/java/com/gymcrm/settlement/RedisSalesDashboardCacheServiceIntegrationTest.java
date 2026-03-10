package com.gymcrm.settlement;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.gymcrm.common.config.RedisRuntimeProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.Socket;
import java.time.Duration;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class RedisSalesDashboardCacheServiceIntegrationTest {

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redisTemplate;
    private RedisSalesDashboardCacheService cacheService;

    @BeforeEach
    void setUp() {
        assumeTrue(isRedisReachable(), "local redis is not running on localhost:6379");
        RedisStandaloneConfiguration configuration = new RedisStandaloneConfiguration("localhost", 6379);
        configuration.setDatabase(12);
        connectionFactory = new LettuceConnectionFactory(configuration);
        connectionFactory.afterPropertiesSet();
        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
        cacheService = new RedisSalesDashboardCacheService(redisTemplate, JsonMapper.builder().findAndAddModules().build(), redisProps());
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
    void storesAndReadsCachedDashboardByCenterAndQuery() {
        SalesDashboardService.SalesDashboardResult result = new SalesDashboardService.SalesDashboardResult(
                LocalDate.of(2099, 7, 15),
                7,
                new BigDecimal("80000"),
                new BigDecimal("130000"),
                1L,
                1L
        );

        cacheService.put(1L, result);

        assertThat(cacheService.get(1L, LocalDate.of(2099, 7, 15), 7))
                .hasValueSatisfying(cached -> {
                    assertThat(cached.baseDate()).isEqualTo(result.baseDate());
                    assertThat(cached.expiringWithinDays()).isEqualTo(result.expiringWithinDays());
                    assertThat(cached.todayNetSales()).isEqualByComparingTo(result.todayNetSales());
                    assertThat(cached.monthNetSales()).isEqualByComparingTo(result.monthNetSales());
                    assertThat(cached.newMemberCount()).isEqualTo(result.newMemberCount());
                    assertThat(cached.expiringMemberCount()).isEqualTo(result.expiringMemberCount());
                });
        assertThat(cacheService.get(2L, LocalDate.of(2099, 7, 15), 7)).isEmpty();
    }

    private RedisRuntimeProperties redisProps() {
        return new RedisRuntimeProperties(
                true,
                false,
                new RedisRuntimeProperties.Toggle(false),
                new RedisRuntimeProperties.ReservationLock(false, Duration.ofMillis(250), Duration.ofSeconds(3)),
                new RedisRuntimeProperties.CrmDispatchClaim(false, Duration.ofSeconds(30)),
                new RedisRuntimeProperties.SettlementDashboardCache(true, Duration.ofSeconds(30)),
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
