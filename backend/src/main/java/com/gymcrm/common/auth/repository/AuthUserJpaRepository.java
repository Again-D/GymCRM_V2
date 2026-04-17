package com.gymcrm.common.auth.repository;

import com.gymcrm.common.auth.entity.AuthUserEntity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AuthUserJpaRepository extends JpaRepository<AuthUserEntity, Long> {
    @EntityGraph(attributePaths = "roles")
    Optional<AuthUserEntity> findByCenterIdAndLoginIdAndIsDeletedFalse(Long centerId, String loginId);
    @EntityGraph(attributePaths = "roles")
    Optional<AuthUserEntity> findByCenterIdAndUserIdAndIsDeletedFalse(Long centerId, Long userId);
    @EntityGraph(attributePaths = "roles")
    Optional<AuthUserEntity> findByUserIdAndIsDeletedFalse(Long userId);
    @EntityGraph(attributePaths = "roles")
    List<AuthUserEntity> findDistinctByCenterIdAndUserStatusAndIsDeletedFalseAndRoles_RoleCodeOrderByUserIdAsc(
            Long centerId,
            String userStatus,
            String roleCode
    );

    @Query(value = """
            select distinct u
            from AuthUserEntity u
            where u.centerId = :centerId
              and u.isDeleted = false
              and (:userStatus is null or upper(u.userStatus) = :userStatus)
              and (
                lower(coalesce(u.userName, '')) like lower(concat('%', coalesce(:q, ''), '%'))
                or lower(coalesce(u.loginId, '')) like lower(concat('%', coalesce(:q, ''), '%'))
              )
              and (
                :roleCode is null
                or exists (
                    select 1
                    from u.roles assignedRole
                    where assignedRole.roleCode = :roleCode
                )
              )
            order by u.userId asc
            """,
            countQuery = """
            select count(distinct u.userId)
            from AuthUserEntity u
            where u.centerId = :centerId
              and u.isDeleted = false
              and (:userStatus is null or upper(u.userStatus) = :userStatus)
              and (
                lower(coalesce(u.userName, '')) like lower(concat('%', coalesce(:q, ''), '%'))
                or lower(coalesce(u.loginId, '')) like lower(concat('%', coalesce(:q, ''), '%'))
              )
              and (
                :roleCode is null
                or exists (
                    select 1
                    from u.roles assignedRole
                    where assignedRole.roleCode = :roleCode
                )
              )
            """)
    Page<AuthUserEntity> searchAdminUsers(
            Long centerId,
            String q,
            String roleCode,
            String userStatus,
            Pageable pageable
    );

    @Query("""
            select distinct u
            from AuthUserEntity u
            left join fetch u.roles
            where u.userId in :userIds
            """)
    List<AuthUserEntity> findAllWithRolesByUserIdIn(List<Long> userIds);
}
