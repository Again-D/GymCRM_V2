package com.gymcrm.common.config;

import com.gymcrm.common.auth.controller.AuthController;
import com.gymcrm.common.security.AccessPolicies;
import com.gymcrm.health.HealthController;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.BooleanSchema;
import io.swagger.v3.oas.models.media.DateTimeSchema;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.method.HandlerMethod;

import java.util.List;

@Configuration
@Profile("dev")
public class OpenApiConfig {
    private static final String BEARER_SCHEME = "bearerAuth";
    private static final String ERROR_RESPONSE_SCHEMA = "ErrorResponse";
    private static final String API_ERROR_SCHEMA = "ApiError";
    private static final String ROLE_POLICY_EXTENSION = "x-role-policy";
    private static final String ROLE_MATRIX_EXTENSION = "x-role-matrix";

    @Bean
    public OpenAPI gymCrmOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("GymCRM Backend API")
                        .version("v1")
                        .description("Development-only API documentation for the GymCRM backend."))
                .components(new Components()
                        .addSecuritySchemes(
                                BEARER_SCHEME,
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                        )
                        .addSchemas(API_ERROR_SCHEMA, apiErrorSchema())
                        .addSchemas(ERROR_RESPONSE_SCHEMA, errorResponseSchema())
                        .addResponses("BadRequest", errorApiResponse("잘못된 요청입니다.", ERROR_RESPONSE_SCHEMA))
                        .addResponses("Unauthorized", errorApiResponse("인증이 필요하거나 토큰이 유효하지 않습니다.", ERROR_RESPONSE_SCHEMA))
                        .addResponses("Forbidden", errorApiResponse("접근 권한이 없습니다.", ERROR_RESPONSE_SCHEMA))
                        .addResponses("NotFound", errorApiResponse("리소스를 찾을 수 없습니다.", ERROR_RESPONSE_SCHEMA))
                        .addResponses("Conflict", errorApiResponse("현재 상태와 충돌하는 요청입니다.", ERROR_RESPONSE_SCHEMA))
                        .addResponses("UnprocessableEntity", errorApiResponse("비즈니스 규칙을 만족하지 못했습니다.", ERROR_RESPONSE_SCHEMA))
                        .addResponses("InternalServerError", errorApiResponse("서버 내부 오류입니다.", ERROR_RESPONSE_SCHEMA))
                )
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .tags(List.of(
                        new Tag().name("auth").description("JWT 로그인, 토큰 재발급, 로그아웃, 현재 사용자 조회 API"),
                        new Tag().name("security").description("보안 정책 문서화: OpenAPI는 기본적으로 bearer JWT 필요, 공개 엔드포인트는 security 예외로 표시됨. role matrix는 각 operation의 `x-role-policy`, `x-role-matrix` extension에 노출됨.")
                ));
    }

    @Bean
    public OperationCustomizer securityAndErrorResponseCustomizer() {
        return (operation, handlerMethod) -> {
            applySecurityDocumentation(operation, handlerMethod);
            applyRolePolicyDocumentation(operation, handlerMethod);
            applyCommonErrorResponses(operation, isPublicOperation(handlerMethod));
            return operation;
        };
    }

    private void applySecurityDocumentation(Operation operation, HandlerMethod handlerMethod) {
        if (isPublicOperation(handlerMethod)) {
            operation.setSecurity(List.of());
            return;
        }
        operation.setSecurity(List.of(new SecurityRequirement().addList(BEARER_SCHEME)));
    }

    private void applyRolePolicyDocumentation(Operation operation, HandlerMethod handlerMethod) {
        if (isPublicOperation(handlerMethod)) {
            operation.addExtension(ROLE_POLICY_EXTENSION, "PUBLIC");
            operation.addExtension(ROLE_MATRIX_EXTENSION, List.of("PUBLIC"));
            return;
        }

        PreAuthorize preAuthorize = handlerMethod.getMethodAnnotation(PreAuthorize.class);
        if (preAuthorize == null) {
            preAuthorize = handlerMethod.getBeanType().getAnnotation(PreAuthorize.class);
        }

        if (preAuthorize == null) {
            operation.addExtension(ROLE_POLICY_EXTENSION, "AUTHENTICATED");
            operation.addExtension(ROLE_MATRIX_EXTENSION, List.of("AUTHENTICATED"));
            return;
        }

        operation.addExtension(ROLE_POLICY_EXTENSION, preAuthorize.value());
        operation.addExtension(ROLE_MATRIX_EXTENSION, resolveRoleMatrix(preAuthorize.value()));
    }

    private void applyCommonErrorResponses(Operation operation, boolean publicOperation) {
        ApiResponses responses = operation.getResponses() == null ? new ApiResponses() : operation.getResponses();
        responses.addApiResponse("400", new ApiResponse().$ref("#/components/responses/BadRequest"));
        responses.addApiResponse("404", new ApiResponse().$ref("#/components/responses/NotFound"));
        responses.addApiResponse("409", new ApiResponse().$ref("#/components/responses/Conflict"));
        responses.addApiResponse("422", new ApiResponse().$ref("#/components/responses/UnprocessableEntity"));
        responses.addApiResponse("500", new ApiResponse().$ref("#/components/responses/InternalServerError"));
        responses.addApiResponse("401", new ApiResponse().$ref("#/components/responses/Unauthorized"));
        if (!publicOperation) {
            responses.addApiResponse("403", new ApiResponse().$ref("#/components/responses/Forbidden"));
        }
        operation.setResponses(responses);
    }

    private boolean isPublicOperation(HandlerMethod handlerMethod) {
        Class<?> beanType = handlerMethod.getBeanType();
        String methodName = handlerMethod.getMethod().getName();
        if (beanType.equals(AuthController.class)) {
            return methodName.equals("login") || methodName.equals("refresh") || methodName.equals("logout");
        }
        return beanType.equals(HealthController.class) && methodName.equals("health");
    }

    private List<String> resolveRoleMatrix(String policy) {
        if (AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN.equals(policy)) {
            return List.of("ROLE_SUPER_ADMIN", "ROLE_CENTER_ADMIN", "ROLE_MANAGER", "PROTOTYPE_NO_AUTH");
        }
        if (AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_DESK.equals(policy)) {
            return List.of("ROLE_SUPER_ADMIN", "ROLE_CENTER_ADMIN", "ROLE_MANAGER", "ROLE_DESK", "PROTOTYPE_NO_AUTH");
        }
        if (AccessPolicies.PROTOTYPE_OR_CENTER_ADMIN_OR_MANAGER_OR_DESK_OR_TRAINER.equals(policy)) {
            return List.of("ROLE_SUPER_ADMIN", "ROLE_CENTER_ADMIN", "ROLE_MANAGER", "ROLE_DESK", "ROLE_TRAINER", "PROTOTYPE_NO_AUTH");
        }
        if (AccessPolicies.PROTOTYPE_OR_TRAINER.equals(policy)) {
            return List.of("ROLE_TRAINER", "PROTOTYPE_NO_AUTH");
        }
        return List.of("AUTHENTICATED");
    }

    private Schema<?> apiErrorSchema() {
        return new ObjectSchema()
                .addProperty("code", new Schema<String>().example("VALIDATION_ERROR"))
                .addProperty("status", new IntegerSchema().example(400))
                .addProperty("detail", new Schema<String>().example("field: is invalid"));
    }

    private Schema<?> errorResponseSchema() {
        ObjectSchema schema = new ObjectSchema();
        schema.addProperty("success", new BooleanSchema()._default(false));
        schema.addProperty("data", new Schema<>().nullable(true));
        schema.addProperty("message", new Schema<String>().example("요청 처리에 실패했습니다."));
        schema.addProperty("timestamp", new DateTimeSchema());
        schema.addProperty("traceId", new Schema<String>().example("trace-1234567890"));
        schema.addProperty("error", new Schema<>().$ref("#/components/schemas/" + API_ERROR_SCHEMA));
        return schema;
    }

    private ApiResponse errorApiResponse(String description, String schemaName) {
        return new ApiResponse()
                .description(description)
                .content(new io.swagger.v3.oas.models.media.Content().addMediaType(
                        org.springframework.http.MediaType.APPLICATION_JSON_VALUE,
                        new io.swagger.v3.oas.models.media.MediaType().schema(new Schema<>().$ref("#/components/schemas/" + schemaName))
                ));
    }
}
