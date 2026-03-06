package com.gymcrm.crm;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class CrmMessageTemplateRepository {
    private final JdbcClient jdbcClient;

    public CrmMessageTemplateRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<CrmMessageTemplate> insert(InsertCommand command) {
        String sql = """
                INSERT INTO crm_message_templates (
                    center_id, template_code, template_name, channel_type, template_type, template_body,
                    is_active, created_by, updated_by
                ) VALUES (
                    :centerId, :templateCode, :templateName, :channelType, :templateType, :templateBody,
                    :isActive, :actorUserId, :actorUserId
                )
                ON CONFLICT (center_id, template_code) WHERE is_deleted = FALSE DO NOTHING
                RETURNING
                    template_id, center_id, template_code, template_name,
                    channel_type, template_type, template_body, is_active,
                    created_at, updated_at
                """;
        return jdbcClient.sql(sql)
                .param("centerId", command.centerId())
                .param("templateCode", command.templateCode())
                .param("templateName", command.templateName())
                .param("channelType", command.channelType())
                .param("templateType", command.templateType())
                .param("templateBody", command.templateBody())
                .param("isActive", command.isActive())
                .param("actorUserId", command.actorUserId())
                .query(CrmMessageTemplate.class)
                .optional();
    }

    public Optional<CrmMessageTemplate> update(UpdateCommand command) {
        String sql = """
                UPDATE crm_message_templates
                SET template_name = :templateName,
                    channel_type = :channelType,
                    template_type = :templateType,
                    template_body = :templateBody,
                    is_active = :isActive,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :actorUserId
                WHERE template_id = :templateId
                  AND center_id = :centerId
                  AND is_deleted = FALSE
                RETURNING
                    template_id, center_id, template_code, template_name,
                    channel_type, template_type, template_body, is_active,
                    created_at, updated_at
                """;
        return jdbcClient.sql(sql)
                .param("templateId", command.templateId())
                .param("centerId", command.centerId())
                .param("templateName", command.templateName())
                .param("channelType", command.channelType())
                .param("templateType", command.templateType())
                .param("templateBody", command.templateBody())
                .param("isActive", command.isActive())
                .param("actorUserId", command.actorUserId())
                .query(CrmMessageTemplate.class)
                .optional();
    }

    public Optional<CrmMessageTemplate> findById(Long centerId, Long templateId) {
        String sql = """
                SELECT
                    template_id, center_id, template_code, template_name,
                    channel_type, template_type, template_body, is_active,
                    created_at, updated_at
                FROM crm_message_templates
                WHERE center_id = :centerId
                  AND template_id = :templateId
                  AND is_deleted = FALSE
                """;
        return jdbcClient.sql(sql)
                .param("centerId", centerId)
                .param("templateId", templateId)
                .query(CrmMessageTemplate.class)
                .optional();
    }

    public List<CrmMessageTemplate> findAll(Long centerId, String channelType, Boolean activeOnly, int limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    template_id, center_id, template_code, template_name,
                    channel_type, template_type, template_body, is_active,
                    created_at, updated_at
                FROM crm_message_templates
                WHERE center_id = :centerId
                  AND is_deleted = FALSE
                """);
        if (channelType != null) {
            sql.append(" AND channel_type = :channelType");
        }
        if (Boolean.TRUE.equals(activeOnly)) {
            sql.append(" AND is_active = TRUE");
        }
        sql.append(" ORDER BY template_id DESC LIMIT :limit");

        JdbcClient.StatementSpec statement = jdbcClient.sql(sql.toString())
                .param("centerId", centerId)
                .param("limit", limit);
        if (channelType != null) {
            statement = statement.param("channelType", channelType);
        }

        return statement.query(CrmMessageTemplate.class).list();
    }

    public record InsertCommand(
            Long centerId,
            String templateCode,
            String templateName,
            String channelType,
            String templateType,
            String templateBody,
            boolean isActive,
            Long actorUserId
    ) {
    }

    public record UpdateCommand(
            Long templateId,
            Long centerId,
            String templateName,
            String channelType,
            String templateType,
            String templateBody,
            boolean isActive,
            Long actorUserId
    ) {
    }
}
