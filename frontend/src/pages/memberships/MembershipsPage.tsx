import { useEffect, useState } from "react";

import { MemberContextFallback } from "../member-context/MemberContextFallback";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { MembershipPaymentRecord, PurchasedMembership } from "../members/modules/types";
import { createDefaultProductFilters } from "../products/modules/types";
import { useProductsQuery } from "../products/modules/useProductsQuery";
import { useMembershipPrototypeState } from "./modules/useMembershipPrototypeState";
import { Modal } from "../../shared/ui/Modal";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

function buildStatusText(membership: PurchasedMembership) {
  if (membership.membershipStatus === "HOLDING") {
    return membership.activeHoldStatus === "ACTIVE" ? "HOLDING (ON)" : "HOLDING";
  }
  return membership.membershipStatus;
}

function paymentLabel(payment: MembershipPaymentRecord) {
  return `${payment.paymentType} · ${payment.paymentStatus} · ${payment.paymentMethod}`;
}

export default function MembershipsPage() {
  const { selectedMember, selectedMemberId } = useSelectedMemberStore();
  const {
    selectedMemberMemberships,
    selectedMemberMembershipsLoading,
    selectedMemberMembershipsError,
    loadSelectedMemberMemberships,
    resetSelectedMemberMembershipsQuery,
    createMembership,
    holdMembership,
    resumeMembership,
    previewMembershipRefund,
    refundMembership
  } = useSelectedMemberMembershipsQuery();
  
  const { products, productsLoading, productsQueryError, loadProducts, resetProductsQuery } = useProductsQuery({
    getDefaultFilters: () => ({
      ...createDefaultProductFilters(),
      status: "ACTIVE"
    })
  });

  const {
    purchaseForm,
    setPurchaseForm,
    purchasePreview,
    payments,
    membershipPanelMessage,
    membershipPanelError,
    clearPanelFeedback,
    getMembershipActionDraft,
    updateMembershipActionDraft,
    membershipRefundPreviewById,
    buildHoldPreview,
    buildResumePreview,
    handlePurchaseSubmit,
    handleHoldSubmit,
    handleResumeSubmit,
    handleRefundPreview,
    handleRefundSubmit
  } = useMembershipPrototypeState({
    selectedMemberId,
    availableProducts: products,
    createMembership,
    holdMembership,
    resumeMembership,
    previewMembershipRefund,
    refundMembership
  });

  const [activeModal, setActiveModal] = useState<'purchase' | 'hold' | 'resume' | 'refund' | null>(null);
  const [targetMembership, setTargetMembership] = useState<PurchasedMembership | null>(null);

  useEffect(() => {
    if (selectedMemberId == null) {
      resetSelectedMemberMembershipsQuery();
      return;
    }
    void loadSelectedMemberMemberships(selectedMemberId);
  }, [selectedMemberId, loadSelectedMemberMemberships, resetSelectedMemberMembershipsQuery]);

  useEffect(() => {
    void loadProducts({
      ...createDefaultProductFilters(),
      status: "ACTIVE"
    });
    return () => {
      resetProductsQuery();
    };
  }, []);

  if (!selectedMember) {
    return (
      <MemberContextFallback
        title="Membership Operations"
        description="Membership management is performed on a per-member basis. Please select a member to proceed with purchase, hold, or refund actions."
        submitLabel="Select Member to Start"
      />
    );
  }

  const handleCloseModal = () => {
    setActiveModal(null);
    setTargetMembership(null);
    clearPanelFeedback();
  };

  const currentDraft = targetMembership ? getMembershipActionDraft(targetMembership.membershipId) : null;

  return (
    <section className="members-page-grid">
      <article className="panel-card">
        <header className="panel-card-header mb-md">
          <div>
            <h1 className="brand-title" style={{ fontSize: '1.5rem' }}>Membership Operations</h1>
            <p className="text-muted text-sm">Review and manage membership subscriptions and payment histories.</p>
          </div>
          <button 
            type="button" 
            className="primary-button"
            onClick={() => setActiveModal('purchase')}
          >
            New Registration
          </button>
        </header>

        <SelectedMemberContextBadge />

        <div className="mt-lg">
          <section className="placeholder-stack">
            <header className="mb-md">
              <h2 className="text-sm" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Subscriptions
              </h2>
            </header>

            {selectedMemberMembershipsLoading ? (
              <div className="pill muted">Syncing membership data...</div>
            ) : selectedMemberMemberships.length === 0 ? (
              <div className="panel-card" style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-base)' }}>
                <p className="text-muted">No active or past memberships found for this member.</p>
              </div>
            ) : (
              <div className="table-shell">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Validity</th>
                      <th>Usage</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMemberMemberships.map((membership) => (
                      <tr key={membership.membershipId}>
                        <td style={{ fontWeight: 600 }}>{membership.membershipId}</td>
                        <td>
                          <div className="stack-sm">
                            <span>{membership.productNameSnapshot}</span>
                            <span className="text-xs text-muted">{membership.productTypeSnapshot}</span>
                          </div>
                        </td>
                        <td>
                          <span className={
                            membership.membershipStatus === 'ACTIVE' ? 'pill ok' : 
                            membership.membershipStatus === 'HOLDING' ? 'pill hold' : 'pill muted'
                          }>
                            {buildStatusText(membership)}
                          </span>
                        </td>
                        <td className="text-sm">
                          {membership.startDate} ~ <br/>
                          <span className="text-muted">{membership.endDate ?? "PERPETUAL"}</span>
                        </td>
                        <td>
                          {membership.remainingCount != null ? (
                            <strong className="text-sm">{membership.remainingCount} Left</strong>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                            {membership.membershipStatus === 'ACTIVE' && (
                              <>
                                <button 
                                  type="button" 
                                  className="secondary-button" 
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  onClick={() => {
                                    setTargetMembership(membership);
                                    setActiveModal('hold');
                                  }}
                                >
                                  Hold
                                </button>
                                <button 
                                  type="button" 
                                  className="secondary-button" 
                                  style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--status-danger)' }}
                                  onClick={() => {
                                    setTargetMembership(membership);
                                    setActiveModal('refund');
                                  }}
                                >
                                  Refund
                                </button>
                              </>
                            )}
                            {membership.membershipStatus === 'HOLDING' && membership.activeHoldStatus === 'ACTIVE' && (
                              <button 
                                type="button" 
                                className="primary-button" 
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                onClick={() => {
                                  setTargetMembership(membership);
                                  setActiveModal('resume');
                                }}
                              >
                                Resume
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-lg">
            <header className="mb-md">
              <h2 className="text-sm" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Payment History (Session Only)
              </h2>
            </header>
            <div className="panel-card" style={{ background: 'var(--bg-base)', borderStyle: 'dashed' }}>
              {payments.length === 0 ? (
                <p className="text-muted text-sm">No payment records generated in this session.</p>
              ) : (
                <div className="stack-sm">
                  {payments.map((payment) => (
                    <div key={payment.paymentId} className="nav-item" style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span className="text-xs text-muted">ID: #{payment.paymentId}</span>
                          <span className="pill ok" style={{ fontSize: '10px' }}>{payment.paymentStatus}</span>
                        </div>
                        <div className="text-sm" style={{ fontWeight: 600 }}>{paymentLabel(payment)}</div>
                        <div className="text-xs text-muted mt-xs">Rel. Membership: #{payment.membershipId}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {membershipPanelMessage && <div className="pill ok full-span mt-md">{membershipPanelMessage}</div>}
        {membershipPanelError && <div className="pill danger full-span mt-md">{membershipPanelError}</div>}
        {selectedMemberMembershipsError && <div className="pill danger full-span mt-md">{selectedMemberMembershipsError}</div>}

        {/* MODALS */}
        
        <Modal 
          isOpen={activeModal === 'purchase'} 
          onClose={handleCloseModal} 
          title="New Membership Registration"
          size="md"
          footer={
            <>
              <button type="button" className="secondary-button" onClick={handleCloseModal}>Cancel</button>
              <button 
                type="button" 
                className="primary-button" 
                disabled={!purchaseForm.productId}
                onClick={async () => {
                  const res = await handlePurchaseSubmit();
                  if (res) handleCloseModal();
                }}
              >
                Confirm Purchase
              </button>
            </>
          }
        >
          <div className="stack-md">
            <label className="stack-sm">
              <span className="text-sm">Select Product</span>
              <select
                className="input"
                value={purchaseForm.productId}
                onChange={(event) => {
                  clearPanelFeedback();
                  setPurchaseForm((prev) => ({ ...prev, productId: event.target.value }));
                }}
              >
                <option value="">-- Choose a product --</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.productName} ({product.productType}) · {formatCurrency(product.priceAmount)}
                  </option>
                ))}
              </select>
            </label>
            <div className="row-actions" style={{ gap: '16px' }}>
              <label className="stack-sm" style={{ flex: 1 }}>
                <span className="text-sm">Effective Date</span>
                <input
                  type="date"
                  className="input"
                  value={purchaseForm.startDate}
                  onChange={(event) => {
                    clearPanelFeedback();
                    setPurchaseForm((prev) => ({ ...prev, startDate: event.target.value }));
                  }}
                />
              </label>
              <label className="stack-sm" style={{ flex: 1 }}>
                <span className="text-sm">Payment Method</span>
                <select
                  className="input"
                  value={purchaseForm.paymentMethod}
                  onChange={(event) =>
                    setPurchaseForm((prev) => ({
                      ...prev,
                      paymentMethod: event.target.value as typeof prev.paymentMethod
                    }))
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="TRANSFER">Bank Transfer</option>
                  <option value="ETC">Other</option>
                </select>
              </label>
            </div>
            
            <label className="stack-sm">
              <span className="text-sm">Settlement Amount</span>
              <input
                className="input"
                value={purchaseForm.paidAmount}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, paidAmount: event.target.value }))}
                placeholder="Leave blank for original price"
              />
            </label>

            {purchasePreview && (
              <div className="panel-card" style={{ background: 'var(--bg-base)', padding: '16px' }}>
                <strong className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Purchase Preview</strong>
                <div className="mt-sm stack-sm">
                   <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                     <span className="text-sm">Duration</span>
                     <span className="text-sm" style={{ fontWeight: 600 }}>{purchasePreview.startDate} ~ {purchasePreview.endDate ?? "-"}</span>
                   </div>
                   <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                     <span className="text-sm">Charge Amount</span>
                     <span className="text-sm" style={{ fontWeight: 700 }}>{formatCurrency(purchasePreview.chargeAmount)}</span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={activeModal === 'hold' && targetMembership != null}
          onClose={handleCloseModal}
          title={`Hold Membership #${targetMembership?.membershipId}`}
          footer={
            <>
              <button type="button" className="secondary-button" onClick={handleCloseModal}>Cancel</button>
              <button 
                type="button" 
                className="primary-button"
                onClick={async () => {
                  if (targetMembership) {
                    await handleHoldSubmit(targetMembership);
                    handleCloseModal();
                  }
                }}
              >
                Process Hold
              </button>
            </>
          }
        >
          {targetMembership && currentDraft && (
            <div className="stack-md">
              <div className="row-actions" style={{ gap: '16px' }}>
                <label className="stack-sm" style={{ flex: 1 }}>
                  <span className="text-sm">Start Date</span>
                  <input
                    type="date"
                    className="input"
                    value={currentDraft.holdStartDate}
                    onChange={(event) =>
                      updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                        ...prev,
                        holdStartDate: event.target.value
                      }))
                    }
                  />
                </label>
                <label className="stack-sm" style={{ flex: 1 }}>
                  <span className="text-sm">End Date</span>
                  <input
                    type="date"
                    className="input"
                    value={currentDraft.holdEndDate}
                    onChange={(event) =>
                      updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                        ...prev,
                        holdEndDate: event.target.value
                      }))
                    }
                  />
                </label>
              </div>
              <label className="stack-sm">
                <span className="text-sm">Reason</span>
                <input
                  className="input"
                  placeholder="e.g. Vacation, Injury"
                  value={currentDraft.holdReason}
                  onChange={(event) =>
                    updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                      ...prev,
                      holdReason: event.target.value
                    }))
                  }
                />
              </label>
              <div className="pill info mt-sm" style={{ display: 'block' }}>
                {(() => {
                  const preview = buildHoldPreview(targetMembership);
                  return 'error' in preview ? preview.error : `Impact: ${preview.plannedHoldDays} days added. Recalculated expiry: ${preview.recalculatedEndDate ?? "-"}`;
                })()}
              </div>
            </div>
          )}
        </Modal>

        <Modal
           isOpen={activeModal === 'resume' && targetMembership != null}
           onClose={handleCloseModal}
           title="Release Membership Hold"
           footer={
             <>
               <button type="button" className="secondary-button" onClick={handleCloseModal}>Cancel</button>
               <button 
                type="button" 
                className="primary-button"
                onClick={async () => {
                  if (targetMembership) {
                    await handleResumeSubmit(targetMembership);
                    handleCloseModal();
                  }
                }}
               >
                 Resume Now
               </button>
             </>
           }
        >
          {targetMembership && currentDraft && (
             <div className="stack-md">
                <label className="stack-sm">
                  <span className="text-sm">Resume Date</span>
                  <input
                    type="date"
                    className="input"
                    value={currentDraft.resumeDate}
                    onChange={(event) =>
                      updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                        ...prev,
                        resumeDate: event.target.value
                      }))
                    }
                  />
                </label>
                <div className="pill info mt-sm" style={{ display: 'block' }}>
                  {(() => {
                    const preview = buildResumePreview(targetMembership);
                    return 'error' in preview ? preview.error : `Resume calculated. New expiry: ${preview.recalculatedEndDate ?? "-"}`;
                  })()}
                </div>
             </div>
          )}
        </Modal>

        <Modal
          isOpen={activeModal === 'refund' && targetMembership != null}
          onClose={handleCloseModal}
          title="Process Membership Refund"
          size="md"
          footer={
            <>
              <button type="button" className="secondary-button" onClick={handleCloseModal}>Cancel</button>
              <button 
                type="button" 
                className="primary-button"
                style={{ background: 'var(--status-danger)', borderColor: 'var(--status-danger)' }}
                onClick={async () => {
                  if (targetMembership) {
                    await handleRefundSubmit(targetMembership);
                    handleCloseModal();
                  }
                }}
              >
                Confirm Refund
              </button>
            </>
          }
        >
          {targetMembership && currentDraft && (
            <div className="stack-md">
               <div className="row-actions" style={{ gap: '16px' }}>
                <label className="stack-sm" style={{ flex: 1 }}>
                  <span className="text-sm">Base Refund Date</span>
                  <input
                    type="date"
                    className="input"
                    value={currentDraft.refundDate}
                    onChange={(event) =>
                      updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                        ...prev,
                        refundDate: event.target.value
                      }))
                    }
                  />
                </label>
                <label className="stack-sm" style={{ flex: 1 }}>
                  <span className="text-sm">Refund Method</span>
                  <select
                    className="input"
                    value={currentDraft.refundPaymentMethod}
                    onChange={(event) =>
                      updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                        ...prev,
                        refundPaymentMethod: event.target.value as any
                      }))
                    }
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </label>
              </div>
              <label className="stack-sm">
                <span className="text-sm">Notes</span>
                <input
                  className="input"
                  value={currentDraft.refundMemo}
                  onChange={(event) =>
                    updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                      ...prev,
                      refundMemo: event.target.value
                    }))
                  }
                />
              </label>

              <button 
                type="button" 
                className="secondary-button"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => void handleRefundPreview(targetMembership)}
              >
                Calculate Refund Amount
              </button>

              {membershipRefundPreviewById[targetMembership.membershipId] && (
                <div className="panel-card" style={{ background: 'var(--bg-base)', padding: '16px' }}>
                  <div className="stack-sm">
                    <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                      <span className="text-sm">Original Amount</span>
                      <span>{formatCurrency(membershipRefundPreviewById[targetMembership.membershipId].originalAmount)}</span>
                    </div>
                    <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                      <span className="text-sm">Used Amount</span>
                      <span>- {formatCurrency(membershipRefundPreviewById[targetMembership.membershipId].usedAmount)}</span>
                    </div>
                    <div className="row-actions" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border-minimal)', paddingTop: '8px', marginTop: '4px' }}>
                      <span className="text-sm" style={{ fontWeight: 600 }}>Refund Total</span>
                      <span className="text-sm" style={{ fontWeight: 700, color: 'var(--status-danger)' }}>
                        {formatCurrency(membershipRefundPreviewById[targetMembership.membershipId].refundAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </article>
    </section>
  );
}
