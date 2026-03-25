package com.gymcrm.trainer;

import com.gymcrm.common.auth.entity.AuthUser;
import com.gymcrm.common.auth.repository.AuthUserRepository;
import com.gymcrm.common.auth.service.AuthAccessRevocationService;
import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;
import com.gymcrm.common.security.CurrentUserProvider;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class TrainerService {
    private static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";
    private static final String ROLE_CENTER_ADMIN = "ROLE_CENTER_ADMIN";
    private static final String ROLE_DESK = "ROLE_DESK";
    private static final String ROLE_TRAINER = "ROLE_TRAINER";
    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_INACTIVE = "INACTIVE";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private final AuthUserRepository authUserRepository;
    private final TrainerQueryRepository trainerQueryRepository;
    private final CurrentUserProvider currentUserProvider;
    private final PasswordEncoder passwordEncoder;
    private final AuthAccessRevocationService authAccessRevocationService;

    public TrainerService(
            AuthUserRepository authUserRepository,
            TrainerQueryRepository trainerQueryRepository,
            CurrentUserProvider currentUserProvider,
            PasswordEncoder passwordEncoder,
            AuthAccessRevocationService authAccessRevocationService
    ) {
        this.authUserRepository = authUserRepository;
        this.trainerQueryRepository = trainerQueryRepository;
        this.currentUserProvider = currentUserProvider;
        this.passwordEncoder = passwordEncoder;
        this.authAccessRevocationService = authAccessRevocationService;
    }

    @Transactional(readOnly = true)
    public List<TrainerSummary> list(String status, String keyword, Long requestedCenterId) {
        AuthUser actor = requireActor();
        ensureReadAccess(actor);
        Long centerId = resolveActorCenter(actor, requestedCenterId);
        return trainerQueryRepository.findTrainerSummaries(centerId, status, keyword, LocalDate.now(BUSINESS_ZONE)).stream()
                .map(row -> new TrainerSummary(
                        row.userId(),
                        row.centerId(),
                        row.displayName(),
                        row.userStatus(),
                        row.phone(),
                        row.assignedMemberCount(),
                        row.todayConfirmedReservationCount()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public TrainerDetail getDetail(Long trainerUserId) {
        AuthUser actor = requireActor();
        ensureReadAccess(actor);
        AuthUser trainer = requireTrainer(actor, trainerUserId);
        TrainerQueryRepository.TrainerDetailRow row = trainerQueryRepository.findTrainerDetail(
                        trainer.centerId(),
                        trainer.userId(),
                        LocalDate.now(BUSINESS_ZONE)
                )
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId));
        List<AssignedMemberSummary> assignedMembers = trainerQueryRepository.findAssignedMembers(trainer.centerId(), trainer.userId()).stream()
                .map(member -> new AssignedMemberSummary(
                        member.memberId(),
                        member.memberName(),
                        member.membershipId(),
                        member.membershipStatus()
                ))
                .toList();
        return new TrainerDetail(
                row.userId(),
                row.centerId(),
                row.loginId(),
                row.displayName(),
                row.userStatus(),
                row.phone(),
                row.assignedMemberCount(),
                row.todayConfirmedReservationCount(),
                assignedMembers,
                canManage(actor)
        );
    }

    @Transactional
    public TrainerDetail create(CreateTrainerCommand command) {
        AuthUser actor = requireActor();
        ensureManageAccess(actor);
        Long centerId = resolveActorCenter(actor, command.centerId());
        String loginId = requireText(command.loginId(), "loginId");
        String password = requireText(command.password(), "password");
        String displayName = requireText(command.displayName(), "displayName");
        String phone = normalizeNullable(command.phone());

        try {
            AuthUser created = authUserRepository.insert(new AuthUserRepository.AuthUserCreateCommand(
                    centerId,
                    loginId,
                    passwordEncoder.encode(password),
                    displayName,
                    phone,
                    ROLE_TRAINER,
                    STATUS_ACTIVE,
                    actor.userId()
            ));
            return getDetail(created.userId());
        } catch (DataAccessException ex) {
            throw mapWriteException(ex);
        }
    }

    @Transactional
    public TrainerDetail update(Long trainerUserId, UpdateTrainerCommand command) {
        AuthUser actor = requireActor();
        ensureManageAccess(actor);
        AuthUser trainer = requireTrainer(actor, trainerUserId);
        String loginId = requireText(command.loginId(), "loginId");
        String displayName = requireText(command.displayName(), "displayName");
        String phone = normalizeNullable(command.phone());

        try {
            AuthUser updated = authUserRepository.updateProfile(new AuthUserRepository.AuthUserProfileUpdateCommand(
                    trainer.userId(),
                    loginId,
                    displayName,
                    phone,
                    actor.userId()
            ));
            if (updated == null) {
                throw new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId);
            }
            return getDetail(updated.userId());
        } catch (DataAccessException ex) {
            throw mapWriteException(ex);
        }
    }

    @Transactional
    public TrainerDetail updateStatus(Long trainerUserId, String userStatus) {
        AuthUser actor = requireActor();
        ensureManageAccess(actor);
        requireTrainer(actor, trainerUserId);
        String normalizedStatus = normalizeStatus(userStatus);
        authAccessRevocationService.updateStatusAndRevoke(trainerUserId, normalizedStatus);
        return getDetail(trainerUserId);
    }

    @Transactional(readOnly = true)
    public boolean currentActorCanManage() {
        return canManage(requireActor());
    }

    private AuthUser requireActor() {
        return authUserRepository.findActiveById(currentUserProvider.currentUserId())
                .filter(AuthUser::isActive)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTHENTICATION_FAILED, "활성 사용자 정보를 찾을 수 없습니다."));
    }

    private AuthUser requireTrainer(AuthUser actor, Long trainerUserId) {
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())) {
            return authUserRepository.findById(trainerUserId)
                    .filter(user -> ROLE_TRAINER.equals(user.roleCode()))
                    .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId));
        }
        return authUserRepository.findActiveByCenterAndUserId(actor.centerId(), trainerUserId)
                .filter(user -> ROLE_TRAINER.equals(user.roleCode()))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "트레이너를 찾을 수 없습니다. userId=" + trainerUserId));
    }

    private void ensureReadAccess(AuthUser actor) {
        if (canManage(actor) || ROLE_DESK.equals(actor.roleCode())) {
            return;
        }
        throw new ApiException(ErrorCode.ACCESS_DENIED, "트레이너 관리 조회 권한이 없습니다.");
    }

    private void ensureManageAccess(AuthUser actor) {
        if (canManage(actor)) {
            return;
        }
        throw new ApiException(ErrorCode.ACCESS_DENIED, "트레이너 관리 권한이 없습니다.");
    }

    private boolean canManage(AuthUser actor) {
        return ROLE_SUPER_ADMIN.equals(actor.roleCode()) || ROLE_CENTER_ADMIN.equals(actor.roleCode());
    }

    private Long resolveActorCenter(AuthUser actor, Long requestedCenterId) {
        if (ROLE_SUPER_ADMIN.equals(actor.roleCode())) {
            if (requestedCenterId == null) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "centerId is required for super admin");
            }
            return requestedCenterId;
        }
        if (requestedCenterId == null) {
            return actor.centerId();
        }
        if (!actor.centerId().equals(requestedCenterId)) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "현재 사용자 센터 범위에서만 트레이너를 조회하거나 변경할 수 있습니다.");
        }
        return requestedCenterId;
    }

    private String normalizeStatus(String userStatus) {
        String normalized = requireText(userStatus, "userStatus").toUpperCase();
        if (!STATUS_ACTIVE.equals(normalized) && !STATUS_INACTIVE.equals(normalized)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "userStatus is invalid");
        }
        return normalized;
    }

    private String requireText(String value, String fieldName) {
        String trimmed = normalizeNullable(value);
        if (trimmed == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, fieldName + " is required");
        }
        return trimmed;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ApiException mapWriteException(DataAccessException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message != null && message.contains("uk_users_center_login_active")) {
            return new ApiException(ErrorCode.CONFLICT, "동일 로그인 ID가 이미 존재합니다.");
        }
        return new ApiException(ErrorCode.INTERNAL_ERROR, "트레이너 계정 처리 중 오류가 발생했습니다.");
    }

    public record CreateTrainerCommand(
            Long centerId,
            String loginId,
            String password,
            String displayName,
            String phone
    ) {
    }

    public record UpdateTrainerCommand(
            String loginId,
            String displayName,
            String phone
    ) {
    }

    public record TrainerSummary(
            Long userId,
            Long centerId,
            String displayName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount
    ) {
    }

    public record AssignedMemberSummary(
            Long memberId,
            String memberName,
            Long membershipId,
            String membershipStatus
    ) {
    }

    public record TrainerDetail(
            Long userId,
            Long centerId,
            String loginId,
            String displayName,
            String userStatus,
            String phone,
            Long assignedMemberCount,
            Long todayConfirmedReservationCount,
            List<AssignedMemberSummary> assignedMembers,
            boolean accountFieldsVisible
    ) {
    }
}
