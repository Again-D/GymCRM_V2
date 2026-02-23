package com.gymcrm.health;

import com.gymcrm.common.config.PrototypeModeSettings;
import com.gymcrm.common.error.GlobalExceptionHandler;
import com.gymcrm.common.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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
@Import(GlobalExceptionHandler.class)
class Phase1SampleControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PrototypeModeSettings prototypeModeSettings;

    @MockBean
    private CurrentUserProvider currentUserProvider;

    @Test
    void healthReturnsSuccessEnvelope() throws Exception {
        given(prototypeModeSettings.isNoAuthEnabled()).willReturn(true);
        given(currentUserProvider.currentUserId()).willReturn(1L);

        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.prototypeNoAuth").value(true))
                .andExpect(jsonPath("$.data.currentUserId").value(1))
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
