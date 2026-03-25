package com.gymcrm.crm.service;

public class NoOpCrmDispatchClaimService implements CrmDispatchClaimService {
    @Override
    public boolean tryClaim(Long centerId, Long crmMessageEventId) {
        return true;
    }
}
