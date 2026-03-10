package com.gymcrm.membership;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberMembershipJpaRepository extends JpaRepository<MemberMembershipEntity, Long> {
    Optional<MemberMembershipEntity> findByMembershipIdAndIsDeletedFalse(Long membershipId);
}
