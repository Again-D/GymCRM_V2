package com.gymcrm.health;

import com.gymcrm.auth.JwtAuthenticationFilter;
import com.gymcrm.auth.RestAccessDeniedHandler;
import com.gymcrm.auth.RestAuthenticationEntryPoint;
import com.gymcrm.common.config.PrototypeModeSettings;
import com.gymcrm.common.config.RedisRuntimeProperties;
import com.gymcrm.common.config.SecurityModeSettings;
import com.gymcrm.common.error.GlobalExceptionHandler;
import com.gymcrm.common.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {HealthController.class, Phase1SampleController.class})
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class Phase1SampleControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PrototypeModeSettings prototypeModeSettings;

    @MockBean
    private RedisRuntimeProperties redisRuntimeProperties;

    @MockBean
    private SecurityModeSettings securityModeSettings;

    @MockBean
    private CurrentUserProvider currentUserProvider;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private RestAuthenticationEntryPoint restAuthenticationEntryPoint;

    @MockBean
    private RestAccessDeniedHandler restAccessDeniedHandler;

    @BeforeEach
    void setUpSecurityModeDefaults() {
        given(securityModeSettings.mode()).willReturn("prototype");
        given(securityModeSettings.isPrototypeMode()).willReturn(true);
        given(securityModeSettings.isJwtMode()).willReturn(false);
        given(redisRuntimeProperties.enabled()).willReturn(false);
        given(redisRuntimeProperties.startupRequired()).willReturn(false);
        given(redisRuntimeProperties.qrTokenStore()).willReturn(new RedisRuntimeProperties.Toggle(false));
        given(redisRuntimeProperties.reservationLock()).willReturn(new RedisRuntimeProperties.ReservationLock(false, java.time.Duration.ofMillis(250), java.time.Duration.ofSeconds(3)));
        given(redisRuntimeProperties.crmDispatchClaim()).willReturn(new RedisRuntimeProperties.CrmDispatchClaim(false, java.time.Duration.ofSeconds(30)));
        given(redisRuntimeProperties.settlementDashboardCache()).willReturn(new RedisRuntimeProperties.SettlementDashboardCache(false, java.time.Duration.ofSeconds(30)));
        given(redisRuntimeProperties.settlementReportCache()).willReturn(new RedisRuntimeProperties.SettlementReportCache(false, java.time.Duration.ofSeconds(60)));
        given(redisRuntimeProperties.authDenylist()).willReturn(new RedisRuntimeProperties.Toggle(false));
    }

    @Test
    void healthReturnsSuccessEnvelope() throws Exception {
        given(prototypeModeSettings.isNoAuthEnabled()).willReturn(true);
        given(currentUserProvider.currentUserId()).willReturn(1L);

        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.securityMode").value("prototype"))
                .andExpect(jsonPath("$.data.prototypeNoAuth").value(true))
                .andExpect(jsonPath("$.data.currentUserId").value(1))
                .andExpect(jsonPath("$.data.redis.crmDispatchClaimEnabled").value(false))
                .andExpect(jsonPath("$.data.redis.settlementDashboardCacheEnabled").value(false))
                .andExpect(jsonPath("$.data.redis.settlementReportCacheEnabled").value(false))
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void validationErrorReturnsValidationCode() throws Exception {
        mockMvc.perform(post("/api/v1/samples/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.status").value(400));
    }

    @Test
    void businessErrorReturnsBusinessRuleCode() throws Exception {
        mockMvc.perform(get("/api/v1/samples/business-error"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("BUSINESS_RULE"))
                .andExpect(jsonPath("$.error.status").value(422))
                .andExpect(jsonPath("$.error.detail").value("샘플 비즈니스 오류"));
    }
}
