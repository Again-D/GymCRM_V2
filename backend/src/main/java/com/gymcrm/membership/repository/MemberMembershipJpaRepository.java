package com.gymcrm.membership.repository;

import com.gymcrm.membership.entity.MemberMembershipEntity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberMembershipJpaRepository extends JpaRepository<MemberMembershipEntity, Long> {
    Optional<MemberMembershipEntity> findByMembershipIdAndIsDeletedFalse(Long membershipId);
}
