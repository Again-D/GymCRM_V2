import { useEffect, useMemo, useState } from "react";

import { useAuthState } from "../../app/auth";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useMembersQuery } from "../members/modules/useMembersQuery";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import { useLockerPrototypeState } from "./modules/useLockerPrototypeState";
import { useLockerQueries } from "./modules/useLockerQueries";
import { Modal } from "../../shared/ui/Modal";

const statusMap: Record<string, { label: string; class: string }> = {
  "AVAILABLE": { label: "AVAILABLE", class: "pill ok" },
  "ASSIGNED": { label: "ASSIGNED", class: "pill info" },
  "MAINTENANCE": { label: "MAINTENANCE", class: "pill danger" },
  "ACTIVE": { label: "ACTIVE", class: "pill ok" },
  "RETURNED": { label: "RETURNED", class: "pill muted" }
};

export default function LockersPage() {
  const { authUser, isMockMode } = useAuthState();
  const { selectedMember, selectedMemberId } = useSelectedMemberStore();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const {
    members,
    membersLoading,
    membersQueryError,
    loadMembers,
    resetMembersQuery
  } = useMembersQuery({
    getDefaultFilters: () => ({
      name: "",
      phone: "",
      membershipOperationalStatus: "",
      dateFrom: "",
      dateTo: ""
    })
  });

  const {
    lockerFilters,
    setLockerFilters,
    lockerAssignForm,
    setLockerAssignForm,
    lockerAssignSubmitting,
    lockerReturnSubmittingId,
    lockerPanelMessage,
    lockerPanelError,
    handleLockerAssign,
    handleLockerReturn
  } = useLockerPrototypeState(selectedMemberId);

  const {
    lockerSlots,
    lockerSlotsLoading,
    lockerAssignments,
    lockerAssignmentsLoading,
    lockerQueryError,
    reloadLockerData,
    resetLockerQueries
  } = useLockerQueries();

  const isLiveLockerRoleSupported =
    isMockMode || authUser?.role === "ROLE_CENTER_ADMIN" || authUser?.role === "ROLE_DESK";

  const slotsPagination = usePagination(lockerSlots, {
    initialPageSize: 10,
    resetDeps: [lockerSlots.length, lockerFilters.lockerStatus, lockerFilters.lockerZone]
  });
  const assignmentsPagination = usePagination(lockerAssignments, {
    initialPageSize: 10,
    resetDeps: [lockerAssignments.length]
  });

  const availableSlots = useMemo(
    () => lockerSlots.filter((slot) => slot.lockerStatus === "AVAILABLE"),
    [lockerSlots]
  );

  useEffect(() => {
    if (!isLiveLockerRoleSupported) {
      resetMembersQuery();
      return;
    }
    void loadMembers();
  }, [isLiveLockerRoleSupported, loadMembers, resetMembersQuery]);

  useEffect(() => {
    if (!isLiveLockerRoleSupported) {
      resetLockerQueries();
      return;
    }
    void reloadLockerData(lockerFilters);
    return () => {
      resetLockerQueries();
    };
  }, [isLiveLockerRoleSupported, lockerFilters, reloadLockerData, resetLockerQueries]);

  async function runLockerAssign() {
    const ok = await handleLockerAssign();
    if (ok) {
      await reloadLockerData(lockerFilters);
      setIsAssignModalOpen(false);
    }
  }

  async function runLockerReturn(lockerAssignmentId: number) {
    const ok = await handleLockerReturn(lockerAssignmentId);
    if (ok) {
      await reloadLockerData(lockerFilters);
    }
  }

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">Storage Surface</span>
          <h1 className="ops-title">Locker Inventory</h1>
          <p className="ops-subtitle">Track locker stock, inspect active assignments, and issue new allocations without leaving the workspace.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">Locker stock</span>
            <span className="ops-meta__pill">Assignment overview</span>
            <span className="ops-meta__pill">Member-linked modal flow</span>
          </div>
        </div>
        <button 
          type="button" 
          className="primary-button" 
          onClick={() => setIsAssignModalOpen(true)}
          disabled={!isLiveLockerRoleSupported}
        >
          New Assignment
        </button>
      </div>

      <div className="ops-kpi-grid">
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">Slots Loaded</span>
          <span className="ops-kpi-card__value">{lockerSlots.length}</span>
          <span className="ops-kpi-card__hint">Locker inventory currently inside the working set</span>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">Available</span>
          <span className="ops-kpi-card__value">{availableSlots.length}</span>
          <span className="ops-kpi-card__hint">Units ready for immediate assignment</span>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">Assignments</span>
          <span className="ops-kpi-card__value">{lockerAssignments.length}</span>
          <span className="ops-kpi-card__hint">Active and returned assignment rows</span>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">Focused Member</span>
          <span className="ops-kpi-card__value">{selectedMemberId ? `#${selectedMemberId}` : "-"}</span>
          <span className="ops-kpi-card__hint">{selectedMember?.memberName ?? "No member selected yet"}</span>
        </div>
      </div>
      
      <section className="ops-surface-grid">
      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">Inventory Directory</h2>
            <p className="ops-section__subtitle">Filter available units, audit storage zones, and prepare assignment actions.</p>
          </div>
        </div>

        <div className="members-filter-grid" style={{ marginBottom: '24px' }}>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">Filter Status</span>
            <select
              className="input"
              value={lockerFilters.lockerStatus}
              disabled={!isLiveLockerRoleSupported}
              onChange={(event) =>
                setLockerFilters((prev) => ({ ...prev, lockerStatus: event.target.value as typeof prev.lockerStatus }))
              }
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </label>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">Zone Lookup</span>
            <input
              className="input"
              value={lockerFilters.lockerZone}
              disabled={!isLiveLockerRoleSupported}
              onChange={(event) => setLockerFilters((prev) => ({ ...prev, lockerZone: event.target.value }))}
              placeholder="e.g. Zone A"
            />
          </label>
        </div>

        {!isLiveLockerRoleSupported && (
          <div className="field-ops-note field-ops-note--restricted mb-md">
            <span className="field-ops-note__label">Restricted live mode</span>
            <div className="mt-xs text-sm">Locker assignment and modification actions are disabled for this role.</div>
          </div>
        )}

        {(lockerPanelMessage || lockerPanelError || lockerQueryError) && (
          <div className="ops-feedback-stack mb-md">
            {lockerPanelMessage && <div className="pill ok full-span">{lockerPanelMessage}</div>}
            {(lockerPanelError || lockerQueryError) && <div className="pill danger full-span">{lockerPanelError ?? lockerQueryError}</div>}
          </div>
        )}

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>Locker</th>
                <th>Grade</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {slotsPagination.pagedItems.map((slot: any) => {
                const status = statusMap[slot.lockerStatus] || { label: slot.lockerStatus, class: 'pill muted' };
                return (
                  <tr key={slot.lockerSlotId}>
                    <td>
                      <div className="stack-sm">
                        <span className="text-sm brand-title">{slot.lockerCode}</span>
                        <span className="text-xs text-muted">Zone: {slot.lockerZone ?? "N/A"}</span>
                      </div>
                    </td>
                    <td><span className="text-xs">{slot.lockerGrade ?? "-"}</span></td>
                    <td><span className={status.class}>{status.label}</span></td>
                    <td className="ops-right"><span className="text-xs text-muted">{slot.memo ?? "-"}</span></td>
                  </tr>
                );
              })}
              {slotsPagination.pagedItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    {lockerSlotsLoading ? "Inventory loading..." : "No units found matching criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-md">
          <PaginationControls {...slotsPagination} pageSizeOptions={[10, 20]} onPageChange={slotsPagination.setPage} onPageSizeChange={slotsPagination.setPageSize} />
        </div>
      </article>

      {/* ASSIGNMENTS PANEL */}
      <article className="stack-lg">
        
        <section className="panel-card">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">Active Assignments</h2>
              <p className="ops-section__subtitle">Overview of occupied units, date ranges, and return actions.</p>
            </div>
          </div>

          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Unit / Member</th>
                  <th>Period</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsPagination.pagedItems.map((assignment: any) => {
                   const status = statusMap[assignment.assignmentStatus] || { label: assignment.assignmentStatus, class: 'pill muted' };
                   const isActive = assignment.assignmentStatus === "ACTIVE";
                   return (
                    <tr key={assignment.lockerAssignmentId}>
                      <td>
                        <div className="stack-sm">
                          <span className="text-sm brand-title">{assignment.lockerCode}</span>
                          <span className="text-xs text-muted">{assignment.memberName} (#{assignment.memberId})</span>
                        </div>
                      </td>
                      <td>
                        <div className="stack-sm">
                          <span className="text-xs brand-title">{assignment.startDate}</span>
                          <span className="text-xs text-muted">to {assignment.endDate}</span>
                        </div>
                      </td>
                      <td className="ops-right">
                        {isActive ? (
                           <button
                             type="button"
                             className="secondary-button ops-action-button"
                             style={{ color: 'var(--status-danger)' }}
                             disabled={lockerReturnSubmittingId === assignment.lockerAssignmentId || !isLiveLockerRoleSupported}
                             onClick={() => void runLockerReturn(assignment.lockerAssignmentId)}
                           >
                             {lockerReturnSubmittingId === assignment.lockerAssignmentId ? "Voiding..." : "VOID"}
                           </button>
                        ) : (
                          <span className={status.class}>{status.label}</span>
                        )}
                      </td>
                    </tr>
                   );
                })}
                {assignmentsPagination.pagedItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-cell">
                      {lockerAssignmentsLoading ? "Fetching assignments..." : "No active contracts."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-md">
            <PaginationControls {...assignmentsPagination} pageSizeOptions={[10, 20]} onPageChange={assignmentsPagination.setPage} onPageSizeChange={assignmentsPagination.setPageSize} />
          </div>
        </section>

        {!isLiveLockerRoleSupported && (
          <div className="field-ops-note field-ops-note--restricted">
            <span className="field-ops-note__label">Restricted access</span>
            <p className="text-sm brand-title mt-xs">RESTRICTED ACCESS</p>
            <p className="text-sm mt-xs">Your current role does not have authorization for locker modifications.</p>
          </div>
        )}
      </article>

      {/* ASSIGNMENT MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Register Locker Assignment"
        footer={
          <>
            <button className="secondary-button" onClick={() => setIsAssignModalOpen(false)}>Cancel</button>
            <button 
              className="primary-button" 
              onClick={() => void runLockerAssign()}
              disabled={lockerAssignSubmitting || !lockerAssignForm.lockerSlotId || !lockerAssignForm.memberId}
            >
              {lockerAssignSubmitting ? "Processing..." : "Confirm Assignment"}
            </button>
          </>
        }
      >
        <div className="stack-md">
          <SelectedMemberContextBadge />
          
          <div className="ops-field-grid-2">
            <label className="stack-sm">
              <span className="text-sm">Target Unit</span>
              <select
                className="input"
                name="lockerSlotId"
                value={lockerAssignForm.lockerSlotId}
                onChange={(event) => setLockerAssignForm(prev => ({ ...prev, lockerSlotId: event.target.value }))}
              >
                <option value="">-- Select Available --</option>
                {availableSlots.map(slot => (
                  <option key={slot.lockerSlotId} value={slot.lockerSlotId}>{slot.lockerCode} ({slot.lockerZone})</option>
                ))}
              </select>
            </label>

            <label className="stack-sm">
              <span className="text-sm">Contract Holder</span>
              <select
                className="input"
                name="memberId"
                value={lockerAssignForm.memberId}
                onChange={(event) => setLockerAssignForm(prev => ({ ...prev, memberId: event.target.value }))}
              >
                <option value="">-- Choose Member --</option>
                {members.map(m => (
                  <option key={m.memberId} value={m.memberId}>{m.memberName} (#{m.memberId})</option>
                ))}
              </select>
            </label>
          </div>

          <div className="ops-field-grid-2">
            <label className="stack-sm">
              <span className="text-sm">Start Effective</span>
              <input
                className="input"
                type="date"
                value={lockerAssignForm.startDate}
                onChange={(event) => setLockerAssignForm(prev => ({ ...prev, startDate: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-sm">End Expiration</span>
              <input
                className="input"
                type="date"
                value={lockerAssignForm.endDate}
                onChange={(event) => setLockerAssignForm(prev => ({ ...prev, endDate: event.target.value }))}
              />
            </label>
          </div>

          <label className="stack-sm">
            <span className="text-sm">Operational Memo</span>
            <textarea
              className="input"
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={lockerAssignForm.memo}
              onChange={(event) => setLockerAssignForm(prev => ({ ...prev, memo: event.target.value }))}
              placeholder="Operational details for this assignment..."
            />
          </label>
        </div>
      </Modal>

      </section>
    </section>
  );
}
