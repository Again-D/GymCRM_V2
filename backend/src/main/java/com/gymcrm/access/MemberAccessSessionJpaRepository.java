package com.gymcrm.access;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberAccessSessionJpaRepository extends JpaRepository<MemberAccessSessionEntity, Long> {
}
