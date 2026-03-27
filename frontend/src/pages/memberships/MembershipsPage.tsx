import { useEffect, useState } from "react";

import { MemberContextFallback } from "../member-context/MemberContextFallback";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { MembershipPaymentRecord, PurchasedMembership } from "../members/modules/types";
import { createDefaultProductFilters } from "../products/modules/types";
import { useProductsQuery } from "../products/modules/useProductsQuery";
import { useMembershipPrototypeState } from "./modules/useMembershipPrototypeState";
import { useTrainerOptionsQuery } from "./modules/useTrainerOptionsQuery";
import { Modal } from "../../shared/ui/Modal";

import styles from "./MembershipsPage.module.css";
import { Link } from "react-router-dom";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

function buildStatusText(membership: PurchasedMembership) {
  if (membership.membershipStatus === "HOLDING") {
    return membership.activeHoldStatus === "ACTIVE" ? "홀딩 중" : "홀딩";
  }
  if (membership.membershipStatus === "ACTIVE") return "활성";
  if (membership.membershipStatus === "REFUNDED") return "환불됨";
  if (membership.membershipStatus === "EXPIRED") return "만료";
  return membership.membershipStatus;
}

function paymentLabel(payment: MembershipPaymentRecord) {
  return `${payment.paymentType} · ${payment.paymentStatus} · ${payment.paymentMethod}`;
}

export default function MembershipsPage() {
  const { selectedMember, selectedMemberId,clearSelectedMember } = useSelectedMemberStore();
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
    refundMembership,
  } = useSelectedMemberMembershipsQuery();
  
  const { products, productsLoading, productsQueryError, loadProducts, resetProductsQuery } = useProductsQuery({
    getDefaultFilters: () => ({
      ...createDefaultProductFilters(),
      status: "ACTIVE"
    })
  });
  const {
    trainerOptions,
    trainerOptionsLoading,
    trainerOptionsError,
    loadTrainerOptions,
    resetTrainerOptions
  } = useTrainerOptionsQuery();

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
    void loadTrainerOptions();
    return () => {
      resetProductsQuery();
      resetTrainerOptions();
    };
  }, [loadProducts, loadTrainerOptions, resetProductsQuery, resetTrainerOptions]);

  if (!selectedMember) {
    return (
      <MemberContextFallback
        title="회원권 업무"
        description="회원권 업무는 회원 단위로 진행됩니다. 구매, 홀딩, 환불 작업을 시작하려면 먼저 회원을 선택해 주세요."
        submitLabel="회원 선택 후 시작"
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
    <section className="ops-shell">
      <article className="panel-card">
        <div className="ops-hero">
          <div className="ops-hero__copy">
            <span className="ops-eyebrow">생애주기 콘솔</span>
            <h1 className="ops-title">회원권 업무</h1>
            <p className="ops-subtitle">구매, 홀딩, 재개, 환불을 한 화면에서 처리하며 선택된 회원 컨텍스트를 유지합니다.</p>
            <div className="ops-meta">
              <span className="ops-meta__pill">구매 우선</span>
              <span className="ops-meta__pill">모달 액션</span>
              <span className="ops-meta__pill">결제 연동</span>
            </div>
          </div>
          <div>
            <button 
            type="button" 
            className="primary-button"
            onClick={() => {
              clearSelectedMember();
            }}
          >
            다른 회원 선택
            </button>
            <button 
              type="button" 
              className="primary-button"
              onClick={() => setActiveModal('purchase')}
            >
              신규 등록
            </button>
          </div>
        </div>

        <div className="ops-stat-strip">
          <div className="ops-stat-card">
            <span className="ops-stat-card__label">선택된 회원</span>
            <span className="ops-stat-card__value">#{selectedMember.memberId}</span>
            <span className="ops-stat-card__hint">{selectedMember.memberName}</span>
          </div>
          <div className="ops-stat-card">
            <span className="ops-stat-card__label">회원권 건수</span>
            <span className="ops-stat-card__value">{selectedMemberMemberships.length}</span>
            <span className="ops-stat-card__hint">현재 회원의 회원권 구독 내역 수</span>
          </div>
          <div className="ops-stat-card">
            <span className="ops-stat-card__label">세션 결제</span>
            <span className="ops-stat-card__value">{payments.length}</span>
            <span className="ops-stat-card__hint">이번 세션에서 발생한 결제 건수</span>
          </div>
        </div>

        <SelectedMemberContextBadge />

        <div className="mt-lg ops-shell">
          <section className="ops-section">
            <div className="ops-section__header">
              <div>
                <h2 className="ops-section__title">활성 회원권</h2>
                <p className="ops-section__subtitle">현재 선택된 회원의 구독 상태와 가능한 액션을 확인합니다.</p>
              </div>
            </div>

            {selectedMemberMembershipsLoading ? (
              <div className="pill muted">회원권 데이터 동기화 중...</div>
            ) : selectedMemberMemberships.length === 0 ? (
              <div className="ops-empty">이 회원의 활성 또는 과거 회원권을 찾을 수 없습니다.</div>
            ) : (
              <div className="table-shell">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>상품</th>
                      <th>상태</th>
                      <th>유효 기간</th>
                      <th>이용 횟수</th>
                      <th className="ops-right">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMemberMemberships.map((membership) => (
                      <tr key={membership.membershipId}>
                        <td><strong>{membership.membershipId}</strong></td>
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
                          <span className="text-muted">{membership.endDate ?? "무기한"}</span>
                        </td>
                        <td>
                          {membership.remainingCount != null ? (
                            <strong className="text-sm">{membership.remainingCount}회 남음</strong>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="ops-table-actions">
                            {membership.membershipStatus === 'ACTIVE' && (
                              <>
                                <button 
                                  type="button" 
                                  className="secondary-button ops-action-button"
                                  onClick={() => {
                                    setTargetMembership(membership);
                                    setActiveModal('hold');
                                  }}
                                >
                                  홀딩
                                </button>
                                <button 
                                  type="button" 
                                  className={`secondary-button ops-action-button ${styles.dangerText}`}
                                  onClick={() => {
                                    setTargetMembership(membership);
                                    setActiveModal('refund');
                                  }}
                                >
                                  환불
                                </button>
                              </>
                            )}
                            {membership.membershipStatus === 'HOLDING' && membership.activeHoldStatus === 'ACTIVE' && (
                              <button 
                                type="button" 
                                className="primary-button ops-action-button"
                                onClick={() => {
                                  setTargetMembership(membership);
                                  setActiveModal('resume');
                                }}
                              >
                                재개
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

          <section className="ops-section">
            <div className="ops-section__header">
              <div>
                <h2 className="ops-section__title">결제 이력 (세션 한정)</h2>
                <p className="ops-section__subtitle">방금 실행한 작업의 결제 결과를 즉시 확인합니다.</p>
              </div>
            </div>
            <div className="ops-block ops-block--soft">
              {payments.length === 0 ? (
                <p className="text-muted text-sm">이번 세션에서 생성된 결제 내역이 없습니다.</p>
              ) : (
                <div className="stack-sm">
                  {payments.map((payment) => (
                    <div key={payment.paymentId} className="ops-block">
                      <div className={styles.flex1}>
                        <div className={`row-actions ${styles.betweenRow}`}>
                          <span className="text-xs text-muted">ID: #{payment.paymentId}</span>
                          <span className={`pill ok ${styles.smallPill}`}>{payment.paymentStatus}</span>
                        </div>
                        <div className={`text-sm ${styles.bold}`}>{paymentLabel(payment)}</div>
                        <div className="text-xs text-muted mt-xs">연결 회원권: #{payment.membershipId}</div>
                      </div>
                      <div className={styles.paymentAmount}>
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
          title="신규 회원권 등록"
          size="md"
          footer={
            <>
              <button type="button" className="secondary-button" onClick={handleCloseModal}>취소</button>
              <button 
                type="button" 
                className="primary-button" 
                disabled={!purchaseForm.productId || (purchasePreview?.product.productCategory === "PT" && !purchaseForm.assignedTrainerId)}
                onClick={async () => {
                  const res = await handlePurchaseSubmit();
                  if (res) handleCloseModal();
                }}
              >
                구매 확정
              </button>
            </>
          }
        >
          <div className="stack-md">
            <label className="stack-sm">
              <span className="text-sm">상품 선택</span>
              <select
                className="input"
                value={purchaseForm.productId}
                onChange={(event) => {
                  clearPanelFeedback();
                  setPurchaseForm((prev) => ({ ...prev, productId: event.target.value, assignedTrainerId: "" }));
                }}
              >
                <option value="">-- 상품을 선택하세요 --</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.productName} ({product.productType}) · {formatCurrency(product.priceAmount)}
                  </option>
                ))}
              </select>
            </label>
            {purchasePreview?.product.productCategory === "PT" && (
              <label className="stack-sm">
                <span className="text-sm">담당 트레이너</span>
                <select
                  className="input"
                  value={purchaseForm.assignedTrainerId}
                  onChange={(event) =>
                    setPurchaseForm((prev) => ({
                      ...prev,
                      assignedTrainerId: event.target.value
                    }))
                  }
                  disabled={trainerOptionsLoading}
                >
                  <option value="">
                    {trainerOptionsLoading ? "-- 트레이너를 불러오는 중 --" : "-- 담당 트레이너를 선택하세요 --"}
                  </option>
                  {trainerOptions.map((trainer) => (
                    <option key={trainer.userId} value={trainer.userId}>
                      {trainer.displayName}
                    </option>
                  ))}
                </select>
                {trainerOptionsError ? (
                  <span className="text-xs text-danger">{trainerOptionsError}</span>
                ) : null}
              </label>
            )}
            <div className={`row-actions ${styles.gap16}`}>
              <label className={`stack-sm ${styles.flex1}`}>
                <span className="text-sm">시작일</span>
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
              <label className={`stack-sm ${styles.flex1}`}>
                <span className="text-sm">결제 수단</span>
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
                  <option value="CASH">현금</option>
                  <option value="CARD">카드</option>
                  <option value="TRANSFER">계좌이체</option>
                  <option value="ETC">기타</option>
                </select>
              </label>
            </div>
            
            <label className="stack-sm">
              <span className="text-sm">결제 금액</span>
              <input
                className="input"
                value={purchaseForm.paidAmount}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, paidAmount: event.target.value }))}
                placeholder="비워두면 정가로 처리됩니다"
              />
            </label>

            {purchasePreview && (
              <div className={`panel-card ${styles.previewBox}`}>
                <strong className={`text-xs text-muted ${styles.uppercase}`}>구매 미리보기</strong>
                <div className="mt-sm stack-sm">
                   <div className={`row-actions ${styles.betweenRow}`}>
                     <span className="text-sm">기간</span>
                     <span className={`text-sm ${styles.bold}`}>{purchasePreview.startDate} ~ {purchasePreview.endDate ?? "-"}</span>
                   </div>
                   <div className={`row-actions ${styles.betweenRow}`}>
                     <span className="text-sm">청구 금액</span>
                     <span className={`text-sm ${styles.bolder}`}>{formatCurrency(purchasePreview.chargeAmount)}</span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={activeModal === 'hold' && targetMembership != null}
          onClose={handleCloseModal}
          title={`회원권 #${targetMembership?.membershipId} 홀딩`}
          footer={
            <>
              <button type="button" className="secondary-button" onClick={handleCloseModal}>취소</button>
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
                홀딩 처리
              </button>
            </>
          }
        >
          {targetMembership && currentDraft && (
            <div className={`stack-md ${styles.gap16}`}>
              <div className="row-actions">
                <label className={`stack-sm ${styles.flex1}`}>
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
                <label className={`stack-sm ${styles.flex1}`}>
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
                <span className="text-sm">사유</span>
                <input
                  className="input"
                  placeholder="예: 여행, 부상"
                  value={currentDraft.holdReason}
                  onChange={(event) =>
                    updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                      ...prev,
                      holdReason: event.target.value
                    }))
                  }
                />
              </label>
              <div className={`pill info mt-sm ${styles.block}`}>
                {(() => {
                  const preview = buildHoldPreview(targetMembership);
                  return 'error' in preview ? preview.error : `영향: ${preview.plannedHoldDays}일 추가. 재계산된 만료일: ${preview.recalculatedEndDate ?? "-"}`;  
                })()}
              </div>
            </div>
          )}
        </Modal>

        <Modal
           isOpen={activeModal === 'resume' && targetMembership != null}
           onClose={handleCloseModal}
           title="회원권 홀딩 해제"
           footer={
             <>
               <button type="button" className="secondary-button" onClick={handleCloseModal}>취소</button>
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
                 지금 재개
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
                <div className={`pill info mt-sm ${styles.block}`}>
                  {(() => {
                    const preview = buildResumePreview(targetMembership);
                    return 'error' in preview ? preview.error : `재개 계산 완료. 새 만료일: ${preview.recalculatedEndDate ?? "-"}`;  
                  })()}
                </div>
             </div>
          )}
        </Modal>

        <Modal
          isOpen={activeModal === 'refund' && targetMembership != null}
          onClose={handleCloseModal}
          title="회원권 환불 처리"
          size="md"
          footer={
            <>
              <button type="button" className="secondary-button" onClick={handleCloseModal}>취소</button>
              <button 
                type="button" 
                className={`primary-button ${styles.dangerButton}`}
                onClick={async () => {
                  if (targetMembership) {
                    await handleRefundSubmit(targetMembership);
                    handleCloseModal();
                  }
                }}
              >
                환불 확정
              </button>
            </>
          }
        >
          {targetMembership && currentDraft && (
            <div className="stack-md">
               <div className={`row-actions ${styles.gap16}`}>
                <label className={`stack-sm ${styles.flex1}`}>
                  <span className="text-sm">환불 기준일</span>
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
                <label className={`stack-sm ${styles.flex1}`}>
                  <span className="text-sm">환불 수단</span>
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
                    <option value="CASH">현금</option>
                    <option value="CARD">카드</option>
                    <option value="TRANSFER">계좌이체</option>
                  </select>
                </label>
              </div>
              <label className="stack-sm">
                <span className="text-sm">메모</span>
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
                className={`secondary-button ${styles.selfStart}`}
                onClick={() => void handleRefundPreview(targetMembership)}
              >
                환불 금액 계산
              </button>

              {membershipRefundPreviewById[targetMembership.membershipId] && (
                <div className={`panel-card ${styles.previewBox}`}>
                  <div className="stack-sm">
                    <div className={`row-actions ${styles.betweenRow}`}>
                      <span className="text-sm">원래 금액</span>
                      <span>{formatCurrency(membershipRefundPreviewById[targetMembership.membershipId].originalAmount)}</span>
                    </div>
                    <div className={`row-actions ${styles.betweenRow}`}>
                      <span className="text-sm">사용 금액</span>
                      <span>- {formatCurrency(membershipRefundPreviewById[targetMembership.membershipId].usedAmount)}</span>
                    </div>
                    <div className={`row-actions ${styles.betweenRow} ${styles.refundSummary}`}>
                      <span className={`text-sm ${styles.bold}`}>환불 합계</span>
                      <span className={`text-sm ${styles.bolder} ${styles.dangerText}`}>
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
