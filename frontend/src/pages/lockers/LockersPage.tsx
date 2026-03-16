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
    <section className="members-page-grid" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) 1fr', gap: '24px', alignItems: 'start' }}>
      
      {/* INVENTORY PANEL */}
      <article className="panel-card">
        <header className="panel-card-header mb-md">
          <div>
            <h1 className="brand-title" style={{ fontSize: '1.25rem' }}>Locker Inventory</h1>
            <p className="text-muted text-xs">Manage physical storage slots and availability.</p>
          </div>
          <button 
            type="button" 
            className="primary-button" 
            onClick={() => setIsAssignModalOpen(true)}
            disabled={!isLiveLockerRoleSupported}
          >
            New Assignment
          </button>
        </header>

        <div className="members-filter-grid" style={{ marginBottom: '24px' }}>
          <label className="stack-sm">
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Filter Status</span>
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
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Zone Lookup</span>
            <input
              className="input"
              value={lockerFilters.lockerZone}
              disabled={!isLiveLockerRoleSupported}
              onChange={(event) => setLockerFilters((prev) => ({ ...prev, lockerZone: event.target.value }))}
              placeholder="e.g. Zone A"
            />
          </label>
        </div>

        {(lockerPanelMessage || lockerPanelError || lockerQueryError) && (
          <div className="mb-md">
            {lockerPanelMessage && <div className="pill ok full-span" style={{ justifyContent: 'center' }}>{lockerPanelMessage}</div>}
            {(lockerPanelError || lockerQueryError) && <div className="pill danger full-span" style={{ justifyContent: 'center' }}>{lockerPanelError ?? lockerQueryError}</div>}
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
                        <span className="text-sm" style={{ fontWeight: 600 }}>{slot.lockerCode}</span>
                        <span className="text-xs text-muted">Zone: {slot.lockerZone ?? "N/A"}</span>
                      </div>
                    </td>
                    <td><span className="text-xs">{slot.lockerGrade ?? "-"}</span></td>
                    <td><span className={status.class}>{status.label}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="text-xs text-muted">{slot.memo ?? "-"}</span></td>
                  </tr>
                );
              })}
              {slotsPagination.pagedItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell" style={{ padding: '32px' }}>
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
          <header className="mb-md">
             <h2 className="brand-title" style={{ fontSize: '1.25rem' }}>Active Assignments</h2>
             <p className="text-muted text-xs">Overview of currently occupied units and contracts.</p>
          </header>

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
                          <span className="text-sm" style={{ fontWeight: 600 }}>{assignment.lockerCode}</span>
                          <span className="text-xs text-muted">{assignment.memberName} (#{assignment.memberId})</span>
                        </div>
                      </td>
                      <td>
                        <div className="stack-sm">
                          <span className="text-xs" style={{ fontWeight: 600 }}>{assignment.startDate}</span>
                          <span className="text-xs text-muted">to {assignment.endDate}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isActive ? (
                           <button
                             type="button"
                             className="secondary-button"
                             style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--status-danger)' }}
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
                    <td colSpan={3} className="empty-cell" style={{ padding: '32px' }}>
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
          <div className="panel-card" style={{ background: 'var(--status-warn-bg)', border: '0' }}>
            <span className="text-xs" style={{ color: 'var(--status-warn)', fontWeight: 700 }}>RESTRICTED ACCESS</span>
            <p className="text-xs" style={{ margin: '4px 0 0' }}>Your current role does not have authorization for locker modifications.</p>
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
  );
}
