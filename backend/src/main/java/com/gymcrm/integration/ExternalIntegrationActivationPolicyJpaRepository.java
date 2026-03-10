package com.gymcrm.integration;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExternalIntegrationActivationPolicyJpaRepository extends JpaRepository<ExternalIntegrationActivationPolicyEntity, Long> {
    Optional<ExternalIntegrationActivationPolicyEntity> findByCenterIdAndIsDeletedFalse(Long centerId);
}
