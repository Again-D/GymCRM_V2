package com.gymcrm.crm.service;

public interface CrmDispatchClaimService {
    boolean tryClaim(Long centerId, Long crmMessageEventId);
}
