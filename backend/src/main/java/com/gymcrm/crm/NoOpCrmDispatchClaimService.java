package com.gymcrm.crm;

public class NoOpCrmDispatchClaimService implements CrmDispatchClaimService {
    @Override
    public boolean tryClaim(Long centerId, Long crmMessageEventId) {
        return true;
    }
}
