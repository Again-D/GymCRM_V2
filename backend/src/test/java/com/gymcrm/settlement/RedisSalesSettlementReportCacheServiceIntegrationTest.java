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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class RedisSalesSettlementReportCacheServiceIntegrationTest {

    private LettuceConnectionFactory connectionFactory;
    private StringRedisTemplate redisTemplate;
    private RedisSalesSettlementReportCacheService cacheService;

    @BeforeEach
    void setUp() {
        assumeTrue(isRedisReachable(), "local redis is not running on localhost:6379");
        RedisStandaloneConfiguration configuration = new RedisStandaloneConfiguration("localhost", 6379);
        configuration.setDatabase(11);
        connectionFactory = new LettuceConnectionFactory(configuration);
        connectionFactory.afterPropertiesSet();
        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.afterPropertiesSet();
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
        cacheService = new RedisSalesSettlementReportCacheService(
                redisTemplate,
                JsonMapper.builder().findAndAddModules().build(),
                redisProps()
        );
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
    void storesAndReadsCachedReportByQuery() {
        SalesSettlementReportService.SalesReportResult result = new SalesSettlementReportService.SalesReportResult(
                LocalDate.of(2099, 7, 1),
                LocalDate.of(2099, 7, 31),
                "CARD",
                "PT",
                new BigDecimal("100000"),
                new BigDecimal("20000"),
                new BigDecimal("80000"),
                List.of(new SalesSettlementReportService.SalesReportRow(
                        "PT-30",
                        "CARD",
                        new BigDecimal("100000"),
                        new BigDecimal("20000"),
                        new BigDecimal("80000"),
                        2L
                ))
        );

        cacheService.put(1L, result);

        assertThat(cacheService.get(1L, result.startDate(), result.endDate(), "CARD", "PT"))
                .hasValueSatisfying(cached -> {
                    assertThat(cached.totalNetSales()).isEqualByComparingTo(result.totalNetSales());
                    assertThat(cached.rows()).hasSize(1);
                    assertThat(cached.rows().getFirst().productName()).isEqualTo("PT-30");
                });
        assertThat(cacheService.get(1L, result.startDate(), result.endDate(), "CARD", "GX")).isEmpty();
    }

    private RedisRuntimeProperties redisProps() {
        return new RedisRuntimeProperties(
                true,
                false,
                new RedisRuntimeProperties.Toggle(false),
                new RedisRuntimeProperties.ReservationLock(false, Duration.ofMillis(250), Duration.ofSeconds(3)),
                new RedisRuntimeProperties.CrmDispatchClaim(false, Duration.ofSeconds(30)),
                new RedisRuntimeProperties.SettlementDashboardCache(false, Duration.ofSeconds(30)),
                new RedisRuntimeProperties.SettlementReportCache(true, Duration.ofSeconds(60)),
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
