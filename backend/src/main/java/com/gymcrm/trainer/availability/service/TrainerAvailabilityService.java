package com.gymcrm.trainer.availability.service;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import com.gymcrm.trainer.availability.entity.TrainerAvailabilityEffectiveDay;
import com.gymcrm.trainer.availability.entity.TrainerAvailabilityException;
import com.gymcrm.trainer.availability.entity.TrainerAvailabilityRule;
import com.gymcrm.trainer.availability.entity.TrainerAvailabilitySnapshot;
import com.gymcrm.trainer.availability.enums.TrainerAvailabilityExceptionType;
import com.gymcrm.trainer.availability.repository.TrainerAvailabilityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TrainerAvailabilityService {
    private static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";
    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_MANAGER = "ROLE_MANAGER";
    private static final String ROLE_DESK = "ROLE_DESK";
    private static final String ROLE_TRAINER = "ROLE_TRAINER";
    private static final Set<String> READONLY_ROLES = Set.of(ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_MANAGER, ROLE_DESK);

    private final TrainerAvailabilityRepository trainerAvailabilityRepository;
    private final AuthUserRepository authUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public TrainerAvailabilityService(
            TrainerAvailabilityRepository trainerAvailabilityRepository,
            AuthUserRepository authUserRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.trainerAvailabilityRepository = trainerAvailabilityRepository;
        this.authUserRepository = authUserRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public TrainerAvailabilitySnapshot getMyAvailability(String monthText) {
        AuthUser actor = requireActor();
        ensureTrainer(actor);
        YearMonth month = parseMonth(monthText);
        return loadSnapshot(actor.centerId(), actor.userId(), month);
    }

    @Transactional(readOnly = true)
    public TrainerAvailabilitySnapshot getTrainerAvailability(Long trainerUserId, String monthText) {
        AuthUser actor = requireActor();
        ensureReadonlyAccess(actor);
        AuthUser trainer = requireTrainer(actor, trainerUserId);
        YearMonth month = parseMonth(monthText);
        return loadSnapshot(trainer.centerId(), trainer.userId(), month);
    }

    @Transactional
    public TrainerAvailabilitySnapshot replaceMyWeeklyRules(List<TrainerAvailabilityRepository.WeeklyRuleCommand> rules, String monthText) {
        AuthUser actor = requireActor();
        ensureTrainer(actor);
        validateWeeklyRules(rules);
        trainerAvailabilityRepository.replaceWeeklyRules(actor.centerId(), actor.userId(), actor.userId(), rules);
        return loadSnapshot(actor.centerId(), actor.userId(), parseMonth(monthText));
    }

    @Transactional
    public TrainerAvailabilitySnapshot upsertMyException(TrainerAvailabilityRepository.ExceptionCommand command, String monthText) {
        AuthUser actor = requireActor();
        ensureTrainer(actor);
        validateException(command);
        trainerAvailabilityRepository.upsertException(actor.centerId(), actor.userId(), actor.userId(), command);
        return loadSnapshot(actor.centerId(), actor.userId(), parseMonth(monthText));
    }

    @Transactional
    public TrainerAvailabilitySnapshot deleteMyException(LocalDate exceptionDate, String monthText) {
        AuthUser actor = requireActor();
        ensureTrainer(actor);
        trainerAvailabilityRepository.deleteException(actor.centerId(), actor.userId(), exceptionDate, actor.userId());
        return loadSnapshot(actor.centerId(), actor.userId(), parseMonth(monthText));
    }

    private TrainerAvailabilitySnapshot loadSnapshot(Long centerId, Long trainerUserId, YearMonth month) {
        List<TrainerAvailabilityRule> rules = trainerAvailabilityRepository.findWeeklyRules(centerId, trainerUserId);
        List<TrainerAvailabilityException> exceptions = trainerAvailabilityRepository.findExceptionsInMonth(
                centerId,
                trainerUserId,
                month.atDay(1),
                month.plusMonths(1).atDay(1)
        );
        return new TrainerAvailabilitySnapshot(
                trainerUserId,
                month,
                rules,
                exceptions,
                buildEffectiveDays(month, rules, exceptions)
        );
    }

    private List<TrainerAvailabilityEffectiveDay> buildEffectiveDays(
            YearMonth month,
            List<TrainerAvailabilityRule> rules,
            List<TrainerAvailabilityException> exceptions
    ) {
        Map<Integer, TrainerAvailabilityRule> weeklyRuleByDay = new HashMap<>();
        for (TrainerAvailabilityRule rule : rules) {
            weeklyRuleByDay.put(rule.dayOfWeek(), rule);
        }
        Map<LocalDate, TrainerAvailabilityException> exceptionByDate = new LinkedHashMap<>();
        for (TrainerAvailabilityException exception : exceptions) {
            exceptionByDate.put(exception.exceptionDate(), exception);
        }

        return month.atDay(1).datesUntil(month.plusMonths(1).atDay(1))
                .map(date -> {
                    TrainerAvailabilityException exception = exceptionByDate.get(date);
                    if (exception != null) {
                        if (TrainerAvailabilityExceptionType.OFF.name().equals(exception.exceptionType())) {
                            return new TrainerAvailabilityEffectiveDay(
                                    date,
                                    "EXCEPTION_OFF",
                                    "OFF",
                                    null,
                                    null,
                                    exception.memo()
                            );
                        }
                        return new TrainerAvailabilityEffectiveDay(
                                date,
                                "EXCEPTION_OVERRIDE",
                                "AVAILABLE",
                                exception.overrideStartTime(),
                                exception.overrideEndTime(),
                                exception.memo()
                        );
                    }

                    TrainerAvailabilityRule rule = weeklyRuleByDay.get(dayOfWeekNumber(date.getDayOfWeek()));
                    if (rule == null) {
                        return new TrainerAvailabilityEffectiveDay(date, "NONE", "UNSET", null, null, null);
                    }
                    return new TrainerAvailabilityEffectiveDay(
                            date,
                            "WEEKLY_RULE",
                            "AVAILABLE",
                            rule.startTime(),
                            rule.endTime(),
                            null
                    );
                })
                .toList();
    }

    private void validateWeeklyRules(List<TrainerAvailabilityRepository.WeeklyRuleCommand> rules) {
        if (rules == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "rules is required");
        }
        Set<Integer> seenDays = new HashSet<>();
        for (TrainerAvailabilityRepository.WeeklyRuleCommand rule : rules) {
            if (rule.dayOfWeek() == null || rule.dayOfWeek() < 1 || rule.dayOfWeek() > 7) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "dayOfWeek must be between 1 and 7");
            }
            if (!seenDays.add(rule.dayOfWeek())) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "dayOfWeek must be unique");
            }
            if (rule.startTime() == null || rule.endTime() == null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "startTime and endTime are required");
            }
            if (!rule.endTime().isAfter(rule.startTime())) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "endTime must be after startTime");
            }
        }
    }

    private void validateException(TrainerAvailabilityRepository.ExceptionCommand command) {
        if (command.exceptionDate() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "exceptionDate is required");
        }
        TrainerAvailabilityExceptionType type;
        try {
            type = TrainerAvailabilityExceptionType.valueOf(command.exceptionType());
        } catch (Exception ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "exceptionType is invalid");
        }
        if (type == TrainerAvailabilityExceptionType.OFF) {
            if (command.overrideStartTime() != null || command.overrideEndTime() != null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "OFF exception must not include override times");
            }
            return;
        }
        if (command.overrideStartTime() == null || command.overrideEndTime() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "overrideStartTime and overrideEndTime are required");
        }
        if (!command.overrideEndTime().isAfter(command.overrideStartTime())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "overrideEndTime must be after overrideStartTime");
        }
    }

    private YearMonth parseMonth(String monthText) {
        try {
            return YearMonth.parse(monthText);
        } catch (Exception ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "month must be YYYY-MM");
        }
    }

    private AuthUser requireActor() {
        return authUserRepository.findActiveById(currentUserProvider.currentUserId())
                .filter(AuthUser::isActive)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));
    }

    private void ensureTrainer(AuthUser actor) {
        if (!ROLE_TRAINER.equals(actor.roleCode())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "트레이너만 본인 스케줄을 수정할 수 있습니다.");
        }
    }

    private void ensureReadonlyAccess(AuthUser actor) {
        if (READONLY_ROLES.contains(actor.roleCode())) {
            return;
        }
        throw new ApiException(ErrorCode.ACCESS_DENIED, "트레이너 스케줄 조회 권한이 없습니다.");
    }

    private AuthUser requireTrainer(AuthUser actor, Long trainerUserId) {
        if (trainerUserId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "trainerUserId is required");
        }
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())) {
            return authUserRepository.findById(trainerUserId)
                    .filter(user -> ROLE_TRAINER.equals(user.roleCode()))
                    .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId));
        }
        return authUserRepository.findActiveByCenterAndUserId(actor.centerId(), trainerUserId)
                .filter(user -> ROLE_TRAINER.equals(user.roleCode()))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId));
    }

    private int dayOfWeekNumber(DayOfWeek dayOfWeek) {
        return dayOfWeek.getValue();
    }
}
