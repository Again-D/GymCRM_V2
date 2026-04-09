package com.gymcrm.reservation.gx.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.reservation.entity.TrainerSchedule;
import com.gymcrm.reservation.gx.entity.GxScheduleException;
import com.gymcrm.reservation.gx.entity.GxScheduleRule;
import com.gymcrm.reservation.gx.entity.GxScheduleSnapshot;
import com.gymcrm.reservation.gx.enums.GxScheduleExceptionType;
import com.gymcrm.reservation.gx.repository.GxScheduleRepository;
import com.gymcrm.reservation.repository.TrainerScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GxScheduleService {
    private static final Logger log = LoggerFactory.getLogger(GxScheduleService.class);
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");
    private static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";
    private static final String ROLE_CENTER_ADMIN = "ROLE_CENTER_ADMIN";
    private static final String ROLE_MANAGER = "ROLE_MANAGER";
    private static final String ROLE_DESK = "ROLE_DESK";
    private static final String ROLE_TRAINER = "ROLE_TRAINER";

    private final GxScheduleRepository gxScheduleRepository;
    private final TrainerScheduleRepository trainerScheduleRepository;
    private final AuthUserRepository authUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public GxScheduleService(
            GxScheduleRepository gxScheduleRepository,
            TrainerScheduleRepository trainerScheduleRepository,
            AuthUserRepository authUserRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.gxScheduleRepository = gxScheduleRepository;
        this.trainerScheduleRepository = trainerScheduleRepository;
        this.authUserRepository = authUserRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public GxScheduleSnapshot getSnapshot(String monthText) {
        AuthUser actor = requireActor();
        ensureReadAccess(actor);
        refreshActiveRulesWindow(actor.centerId());

        YearMonth month = parseMonth(monthText);
        LocalDate monthStart = month.atDay(1);
        LocalDate monthEndExclusive = month.plusMonths(1).atDay(1);
        OffsetDateTime monthStartAt = toBusinessOffsetDateTime(monthStart, LocalTime.MIN);
        OffsetDateTime monthEndAt = toBusinessOffsetDateTime(monthEndExclusive, LocalTime.MIN);
        List<GxScheduleRule> rules = gxScheduleRepository.findAllRules(actor.centerId());
        List<GxScheduleException> exceptions = gxScheduleRepository.findExceptionsInMonth(actor.centerId(), monthStart, monthEndExclusive);
        List<TrainerSchedule> generatedSchedules = gxScheduleRepository.findGeneratedSchedulesInMonth(actor.centerId(), monthStartAt, monthEndAt);
        if (ROLE_TRAINER.equals(actor.roleCode())) {
            List<Long> visibleRuleIds = rules.stream()
                    .filter(rule -> actor.userId().equals(rule.trainerUserId()))
                    .map(GxScheduleRule::ruleId)
                    .toList();
            rules = rules.stream()
                    .filter(rule -> visibleRuleIds.contains(rule.ruleId()))
                    .toList();
            exceptions = exceptions.stream()
                    .filter(exception -> visibleRuleIds.contains(exception.ruleId()))
                    .toList();
            generatedSchedules = generatedSchedules.stream()
                    .filter(schedule -> visibleRuleIds.contains(schedule.sourceRuleId()))
                    .toList();
        }
        return new GxScheduleSnapshot(
                month,
                rules,
                exceptions,
                generatedSchedules
        );
    }

    @Transactional
    public GxScheduleSnapshot createRule(CreateRuleRequest request) {
        AuthUser actor = requireActor();
        ensureManagerMutationAccess(actor);
        AuthUser trainer = requireTrainerInCenter(actor.centerId(), request.trainerUserId());
        validateRuleInput(request.dayOfWeek(), request.startTime(), request.endTime(), request.capacity(), request.effectiveStartDate());

        GxScheduleRule rule = gxScheduleRepository.insertRule(new GxScheduleRepository.CreateRuleCommand(
                actor.centerId(),
                trainer.userId(),
                normalizeRequired(request.className(), "className is required"),
                request.dayOfWeek(),
                request.startTime(),
                request.endTime(),
                request.capacity(),
                request.effectiveStartDate(),
                actor.userId()
        ));
        syncRuleWindow(actor.centerId(), rule, actor.userId());
        return getSnapshot(request.monthText());
    }

    @Transactional
    public GxScheduleSnapshot updateRule(UpdateRuleRequest request) {
        AuthUser actor = requireActor();
        ensureManagerMutationAccess(actor);
        GxScheduleRule existing = requireRule(actor.centerId(), request.ruleId());
        AuthUser trainer = requireTrainerInCenter(actor.centerId(), request.trainerUserId());
        validateRuleInput(request.dayOfWeek(), request.startTime(), request.endTime(), request.capacity(), request.effectiveStartDate());

        GxScheduleRule rule = gxScheduleRepository.updateRule(new GxScheduleRepository.UpdateRuleCommand(
                actor.centerId(),
                existing.ruleId(),
                trainer.userId(),
                normalizeRequired(request.className(), "className is required"),
                request.dayOfWeek(),
                request.startTime(),
                request.endTime(),
                request.capacity(),
                request.effectiveStartDate(),
                request.active(),
                actor.userId()
        ));
        syncRuleWindow(actor.centerId(), rule, actor.userId());
        return getSnapshot(request.monthText());
    }

    @Transactional
    public GxScheduleSnapshot deleteRule(Long ruleId, String monthText) {
        AuthUser actor = requireActor();
        ensureManagerMutationAccess(actor);
        GxScheduleRule existing = requireRule(actor.centerId(), ruleId);
        syncRuleWindow(actor.centerId(), new GxScheduleRule(
                existing.ruleId(),
                existing.centerId(),
                existing.trainerUserId(),
                existing.className(),
                existing.dayOfWeek(),
                existing.startTime(),
                existing.endTime(),
                existing.capacity(),
                existing.effectiveStartDate(),
                false,
                existing.createdAt(),
                existing.createdBy(),
                existing.updatedAt(),
                existing.updatedBy()
        ), actor.userId());
        gxScheduleRepository.softDeleteRule(actor.centerId(), ruleId, actor.userId());
        return getSnapshot(monthText);
    }

    @Transactional
    public GxScheduleSnapshot upsertException(UpsertExceptionRequest request) {
        AuthUser actor = requireActor();
        GxScheduleRule rule = requireRule(actor.centerId(), request.ruleId());
        ensureExceptionMutationAccess(actor, rule);

        GxScheduleExceptionType type = parseExceptionType(request.exceptionType());
        validateTrainerExceptionScope(actor, type, request.overrideTrainerUserId(), request.overrideStartTime(), request.overrideEndTime(), request.overrideCapacity());
        validateExceptionInput(type, request.overrideStartTime(), request.overrideEndTime(), request.overrideCapacity());
        Long overrideTrainerUserId = request.overrideTrainerUserId();
        if (overrideTrainerUserId != null) {
            requireTrainerInCenter(actor.centerId(), overrideTrainerUserId);
        }

        gxScheduleRepository.upsertException(new GxScheduleRepository.UpsertExceptionCommand(
                actor.centerId(),
                rule.ruleId(),
                request.exceptionDate(),
                type.name(),
                overrideTrainerUserId,
                request.overrideStartTime(),
                request.overrideEndTime(),
                request.overrideCapacity(),
                normalizeNullable(request.memo()),
                actor.userId()
        ));
        syncRuleWindow(actor.centerId(), rule, actor.userId());
        return getSnapshot(request.monthText());
    }

    @Transactional
    public GxScheduleSnapshot deleteException(Long ruleId, LocalDate exceptionDate, String monthText) {
        AuthUser actor = requireActor();
        GxScheduleRule rule = requireRule(actor.centerId(), ruleId);
        ensureExceptionMutationAccess(actor, rule);

        gxScheduleRepository.deleteException(actor.centerId(), ruleId, exceptionDate, actor.userId());
        syncRuleWindow(actor.centerId(), rule, actor.userId());
        return getSnapshot(monthText);
    }

    private void refreshActiveRulesWindow(Long centerId) {
        AuthUser actor = requireActor();
        for (GxScheduleRule rule : gxScheduleRepository.findActiveRules(centerId)) {
            try {
                syncRuleWindow(centerId, rule, actor.userId());
            } catch (ApiException ex) {
                if (ex.getErrorCode() != ErrorCode.CONFLICT) {
                    throw ex;
                }
                log.warn("Skipped GX rule window refresh due to occupied generated schedule conflict. centerId={}, ruleId={}",
                        centerId,
                        rule.ruleId(),
                        ex);
            }
        }
    }

    private void syncRuleWindow(Long centerId, GxScheduleRule rule, Long actorUserId) {
        LocalDate windowStart = LocalDate.now(BUSINESS_ZONE);
        LocalDate windowEndExclusive = windowStart.plusWeeks(4);
        OffsetDateTime rangeStart = toBusinessOffsetDateTime(windowStart, LocalTime.MIN);
        OffsetDateTime rangeEndExclusive = toBusinessOffsetDateTime(windowEndExclusive, LocalTime.MIN);

        List<GxScheduleException> exceptions = gxScheduleRepository.findExceptionsByRuleInRange(centerId, rule.ruleId(), windowStart, windowEndExclusive);
        List<TrainerSchedule> existingSchedules = gxScheduleRepository.findGeneratedSchedulesByRuleInRange(centerId, rule.ruleId(), rangeStart, rangeEndExclusive);
        Map<LocalDate, GxScheduleException> exceptionByDate = new HashMap<>();
        for (GxScheduleException exception : exceptions) {
            exceptionByDate.put(exception.exceptionDate(), exception);
        }
        Map<LocalDate, DesiredGeneratedSchedule> desiredByDate = buildDesiredSchedules(centerId, rule, exceptionByDate, windowStart, windowEndExclusive);
        Map<LocalDate, TrainerSchedule> existingByDate = new HashMap<>();
        for (TrainerSchedule schedule : existingSchedules) {
            existingByDate.put(toBusinessDate(schedule.startAt()), schedule);
        }

        for (TrainerSchedule existing : existingSchedules) {
            LocalDate date = toBusinessDate(existing.startAt());
            DesiredGeneratedSchedule desired = desiredByDate.remove(date);
            if (desired == null) {
                if (existing.currentCount() != null && existing.currentCount() > 0) {
                    throw new ApiException(ErrorCode.CONFLICT, "예약이 있는 GX 회차는 자동으로 제거할 수 없습니다. scheduleId=" + existing.scheduleId());
                }
                gxScheduleRepository.softDeleteGeneratedSchedule(existing.scheduleId(), actorUserId);
                continue;
            }
            if (needsUpdate(existing, desired)) {
                if (existing.currentCount() != null && existing.currentCount() > 0) {
                    throw new ApiException(ErrorCode.CONFLICT, "예약이 있는 GX 회차는 자동으로 변경할 수 없습니다. scheduleId=" + existing.scheduleId());
                }
                gxScheduleRepository.updateGeneratedSchedule(new GxScheduleRepository.UpdateGeneratedScheduleCommand(
                        existing.scheduleId(),
                        desired.trainerUserId(),
                        desired.trainerName(),
                        desired.className(),
                        desired.startAt(),
                        desired.endAt(),
                        desired.capacity(),
                        desired.memo(),
                        desired.sourceExceptionId(),
                        actorUserId
                ));
            }
        }

        List<DesiredGeneratedSchedule> inserts = new ArrayList<>(desiredByDate.values());
        inserts.sort(Comparator.comparing(DesiredGeneratedSchedule::startAt));
        for (DesiredGeneratedSchedule desired : inserts) {
            trainerScheduleRepository.insert(new TrainerScheduleRepository.TrainerScheduleCreateCommand(
                    centerId,
                    desired.trainerUserId(),
                    "GX",
                    desired.trainerName(),
                    desired.className(),
                    desired.startAt(),
                    desired.endAt(),
                    desired.capacity(),
                    0,
                    desired.memo(),
                    actorUserId,
                    rule.ruleId(),
                    desired.sourceExceptionId()
            ));
        }
    }

    private Map<LocalDate, DesiredGeneratedSchedule> buildDesiredSchedules(
            Long centerId,
            GxScheduleRule rule,
            Map<LocalDate, GxScheduleException> exceptionByDate,
            LocalDate windowStart,
            LocalDate windowEndExclusive
    ) {
        Map<LocalDate, DesiredGeneratedSchedule> desired = new HashMap<>();
        if (!Boolean.TRUE.equals(rule.active())) {
            return desired;
        }
        LocalDate cursor = rule.effectiveStartDate().isAfter(windowStart) ? rule.effectiveStartDate() : windowStart;
        Map<Long, AuthUser> trainerCache = new HashMap<>();
        while (cursor.isBefore(windowEndExclusive)) {
            if (cursor.getDayOfWeek().getValue() == rule.dayOfWeek()) {
                GxScheduleException exception = exceptionByDate.get(cursor);
                if (exception == null || GxScheduleExceptionType.OVERRIDE.name().equals(exception.exceptionType())) {
                    Long trainerUserId = exception != null && exception.overrideTrainerUserId() != null
                            ? exception.overrideTrainerUserId()
                            : rule.trainerUserId();
                    AuthUser trainer = trainerCache.computeIfAbsent(trainerUserId, id -> requireTrainerInCenter(centerId, id));
                    LocalTime startTime = exception != null && exception.overrideStartTime() != null
                            ? exception.overrideStartTime()
                            : rule.startTime();
                    LocalTime endTime = exception != null && exception.overrideEndTime() != null
                            ? exception.overrideEndTime()
                            : rule.endTime();
                    Integer capacity = exception != null && exception.overrideCapacity() != null
                            ? exception.overrideCapacity()
                            : rule.capacity();
                    desired.put(cursor, new DesiredGeneratedSchedule(
                            trainer.userId(),
                            trainer.userName(),
                            rule.className(),
                            toBusinessOffsetDateTime(cursor, startTime),
                            toBusinessOffsetDateTime(cursor, endTime),
                            capacity,
                            normalizeNullable(exception == null ? null : exception.memo()),
                            exception == null ? null : exception.exceptionId()
                    ));
                }
            }
            cursor = cursor.plusDays(1);
        }
        return desired;
    }

    private boolean needsUpdate(TrainerSchedule existing, DesiredGeneratedSchedule desired) {
        return !safeEquals(existing.trainerUserId(), desired.trainerUserId())
                || !safeEquals(existing.trainerName(), desired.trainerName())
                || !safeEquals(existing.slotTitle(), desired.className())
                || !safeEquals(existing.startAt(), desired.startAt())
                || !safeEquals(existing.endAt(), desired.endAt())
                || !safeEquals(existing.capacity(), desired.capacity())
                || !safeEquals(normalizeNullable(existing.memo()), desired.memo())
                || !safeEquals(existing.sourceExceptionId(), desired.sourceExceptionId());
    }

    private GxScheduleRule requireRule(Long centerId, Long ruleId) {
        if (ruleId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "ruleId is required");
        }
        return gxScheduleRepository.findRuleById(centerId, ruleId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "GX 규칙을 찾을 수 없습니다. ruleId=" + ruleId));
    }

    private AuthUser requireActor() {
        return authUserRepository.findActiveById(currentUserProvider.currentUserId())
                .filter(AuthUser::isActive)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));
    }

    private AuthUser requireTrainerInCenter(Long centerId, Long trainerUserId) {
        if (trainerUserId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "trainerUserId is required");
        }
        if (ROLE_SUPER_ADMIN.equals(requireActor().roleCode())) {
            return authUserRepository.findById(trainerUserId)
                    .filter(user -> ROLE_TRAINER.equals(user.roleCode()) && user.isActive())
                    .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId));
        }
        return authUserRepository.findActiveByCenterAndUserId(centerId, trainerUserId)
                .filter(user -> ROLE_TRAINER.equals(user.roleCode()))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId));
    }

    private void ensureReadAccess(AuthUser actor) {
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())
                || ROLE_CENTER_ADMIN.equals(actor.roleCode())
                || ROLE_MANAGER.equals(actor.roleCode())
                || ROLE_DESK.equals(actor.roleCode())
                || ROLE_TRAINER.equals(actor.roleCode())) {
            return;
        }
        throw new ApiException(ErrorCode.ACCESS_DENIED, "GX 스케줄 조회 권한이 없습니다.");
    }

    private void ensureManagerMutationAccess(AuthUser actor) {
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())
                || ROLE_CENTER_ADMIN.equals(actor.roleCode())
                || ROLE_MANAGER.equals(actor.roleCode())) {
            return;
        }
        throw new ApiException(ErrorCode.ACCESS_DENIED, "GX 반복 규칙을 변경할 권한이 없습니다.");
    }

    private void ensureExceptionMutationAccess(AuthUser actor, GxScheduleRule rule) {
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())
                || ROLE_CENTER_ADMIN.equals(actor.roleCode())
                || ROLE_MANAGER.equals(actor.roleCode())) {
            return;
        }
        if (ROLE_TRAINER.equals(actor.roleCode()) && actor.userId().equals(rule.trainerUserId())) {
            return;
        }
        throw new ApiException(ErrorCode.ACCESS_DENIED, "GX 회차 예외를 변경할 권한이 없습니다.");
    }

    private void validateRuleInput(Integer dayOfWeek, LocalTime startTime, LocalTime endTime, Integer capacity, LocalDate effectiveStartDate) {
        if (dayOfWeek == null || dayOfWeek < 1 || dayOfWeek > 7) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "dayOfWeek must be between 1 and 7");
        }
        if (startTime == null || endTime == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "startTime and endTime are required");
        }
        if (!endTime.isAfter(startTime)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "endTime must be after startTime");
        }
        if (capacity == null || capacity <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "capacity must be positive");
        }
        if (effectiveStartDate == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "effectiveStartDate is required");
        }
    }

    private void validateExceptionInput(GxScheduleExceptionType type, LocalTime overrideStartTime, LocalTime overrideEndTime, Integer overrideCapacity) {
        if (type == GxScheduleExceptionType.OFF) {
            if (overrideStartTime != null || overrideEndTime != null || overrideCapacity != null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "OFF exception must not include overrides");
            }
            return;
        }
        if (overrideStartTime == null || overrideEndTime == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "overrideStartTime and overrideEndTime are required");
        }
        if (!overrideEndTime.isAfter(overrideStartTime)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "overrideEndTime must be after overrideStartTime");
        }
        if (overrideCapacity != null && overrideCapacity <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "overrideCapacity must be positive");
        }
    }

    private void validateTrainerExceptionScope(
            AuthUser actor,
            GxScheduleExceptionType type,
            Long overrideTrainerUserId,
            LocalTime overrideStartTime,
            LocalTime overrideEndTime,
            Integer overrideCapacity
    ) {
        if (!ROLE_TRAINER.equals(actor.roleCode())) {
            return;
        }
        if (type != GxScheduleExceptionType.OFF
                || overrideTrainerUserId != null
                || overrideStartTime != null
                || overrideEndTime != null
                || overrideCapacity != null) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "트레이너는 휴강과 메모만 처리할 수 있습니다.");
        }
    }

    private YearMonth parseMonth(String monthText) {
        try {
            return YearMonth.parse(monthText);
        } catch (Exception ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "month must be YYYY-MM");
        }
    }

    private GxScheduleExceptionType parseExceptionType(String exceptionType) {
        try {
            return GxScheduleExceptionType.valueOf(normalizeRequired(exceptionType, "exceptionType is required").toUpperCase());
        } catch (Exception ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "exceptionType is invalid");
        }
    }

    private OffsetDateTime toBusinessOffsetDateTime(LocalDate date, LocalTime time) {
        return LocalDateTime.of(date, time).atZone(BUSINESS_ZONE).toOffsetDateTime();
    }

    private LocalDate toBusinessDate(OffsetDateTime dateTime) {
        return dateTime.atZoneSameInstant(BUSINESS_ZONE).toLocalDate();
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeNullable(value);
        if (normalized == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, message);
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean safeEquals(Object left, Object right) {
        return left == null ? right == null : left.equals(right);
    }

    public record CreateRuleRequest(
            String monthText,
            String className,
            Long trainerUserId,
            Integer dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            Integer capacity,
            LocalDate effectiveStartDate
    ) {
    }

    public record UpdateRuleRequest(
            String monthText,
            Long ruleId,
            String className,
            Long trainerUserId,
            Integer dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            Integer capacity,
            LocalDate effectiveStartDate,
            Boolean active
    ) {
    }

    public record UpsertExceptionRequest(
            String monthText,
            Long ruleId,
            LocalDate exceptionDate,
            String exceptionType,
            Long overrideTrainerUserId,
            LocalTime overrideStartTime,
            LocalTime overrideEndTime,
            Integer overrideCapacity,
            String memo
    ) {
    }

    private record DesiredGeneratedSchedule(
            Long trainerUserId,
            String trainerName,
            String className,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            Integer capacity,
            String memo,
            Long sourceExceptionId
    ) {
    }
}
