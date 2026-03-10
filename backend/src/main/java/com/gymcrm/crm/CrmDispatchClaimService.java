package com.gymcrm.crm;

public interface CrmDispatchClaimService {
    boolean tryClaim(Long centerId, Long crmMessageEventId);
}
