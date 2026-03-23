package com.gymcrm.member.repository;

import com.gymcrm.member.entity.MemberEntity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberJpaRepository extends JpaRepository<MemberEntity, Long> {
    Optional<MemberEntity> findByMemberIdAndIsDeletedFalse(Long memberId);
}
