import { useEffect } from "react";

import { MemberContextFallback } from "../member-context/MemberContextFallback";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { MembershipPaymentRecord, PurchasedMembership } from "../members/modules/types";
import { useMembershipPrototypeState } from "./modules/useMembershipPrototypeState";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

function buildStatusText(membership: PurchasedMembership) {
  if (membership.membershipStatus === "HOLDING") {
    return membership.activeHoldStatus === "ACTIVE" ? "HOLDING · ACTIVE_HOLD" : "HOLDING";
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
    createLocalMembership,
    patchLocalMembership
  } = useSelectedMemberMembershipsQuery();
  const {
    prototypeProducts,
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
    createLocalMembership,
    patchLocalMembership
  });

  useEffect(() => {
    if (selectedMemberId == null) {
      resetSelectedMemberMembershipsQuery();
      return;
    }
    void loadSelectedMemberMemberships(selectedMemberId);
  }, [selectedMemberId, loadSelectedMemberMemberships, resetSelectedMemberMembershipsQuery]);

  if (!selectedMember) {
    return (
      <MemberContextFallback
        title="회원권 업무 프로토타입"
        description="회원권 업무는 선택된 회원 기준으로 동작합니다. 이 화면에서 바로 회원을 선택해 다음 prototype slice를 이어갈 수 있습니다."
        submitLabel="이 회원으로 시작"
      />
    );
  }

  return (
    <section className="members-prototype-layout">
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>회원권 업무 프로토타입</h1>
            <p>선택 회원 회원권 query 위에 purchase / hold / resume / refund action surface를 얹어서 새 구조에서 업무 흐름을 설명합니다.</p>
          </div>
        </div>

        <SelectedMemberContextBadge />

        <div className="placeholder-card">
          <h2>회원권 구매</h2>
          <form
            className="members-filter-grid"
            onSubmit={(event) => {
              event.preventDefault();
              handlePurchaseSubmit();
            }}
          >
            <label>
              상품 선택
              <select
                value={purchaseForm.productId}
                onChange={(event) => {
                  clearPanelFeedback();
                  setPurchaseForm((prev) => ({ ...prev, productId: event.target.value }));
                }}
              >
                <option value="">선택하세요</option>
                {prototypeProducts.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.productName} · {product.productType} · {formatCurrency(product.priceAmount)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              시작일
              <input
                type="date"
                value={purchaseForm.startDate}
                onChange={(event) => {
                  clearPanelFeedback();
                  setPurchaseForm((prev) => ({ ...prev, startDate: event.target.value }));
                }}
              />
            </label>
            <label>
              결제수단
              <select
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
                <option value="TRANSFER">이체</option>
                <option value="ETC">기타</option>
              </select>
            </label>
            <label>
              결제금액
              <input
                value={purchaseForm.paidAmount}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, paidAmount: event.target.value }))}
                placeholder="비우면 상품가"
              />
            </label>
            <label>
              회원권 메모
              <input
                value={purchaseForm.membershipMemo}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, membershipMemo: event.target.value }))}
              />
            </label>
            <label>
              결제 메모
              <input
                value={purchaseForm.paymentMemo}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, paymentMemo: event.target.value }))}
              />
            </label>
            <div className="placeholder-card">
              <strong>구매 미리보기</strong>
              {!purchasePreview ? (
                <p>상품을 선택하면 미리보기를 표시합니다.</p>
              ) : (
                <ul>
                  <li>유형: {purchasePreview.product.productType}</li>
                  <li>시작일: {purchasePreview.startDate}</li>
                  <li>만료일: {purchasePreview.endDate ?? "-"}</li>
                  <li>잔여횟수: {purchasePreview.remainingCount ?? "-"}</li>
                  <li>청구금액: {formatCurrency(purchasePreview.chargeAmount)}</li>
                </ul>
              )}
            </div>
            <div className="toolbar-actions">
              <button type="submit" className="primary-button" disabled={!purchaseForm.productId}>
                회원권 구매
              </button>
            </div>
          </form>
        </div>

        {membershipPanelMessage ? <p>{membershipPanelMessage}</p> : null}
        {membershipPanelError ? <p className="error-text">{membershipPanelError}</p> : null}
        {selectedMemberMembershipsError ? <p className="error-text">{selectedMemberMembershipsError}</p> : null}

        <div className="placeholder-stack">
          <div className="placeholder-card">
            <h2>선택 회원 회원권 목록</h2>
            {selectedMemberMembershipsLoading ? (
              <p>회원권 목록을 불러오는 중...</p>
            ) : selectedMemberMemberships.length === 0 ? (
              <p>선택 회원의 회원권이 없습니다.</p>
            ) : (
              <div className="table-shell">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>상품</th>
                      <th>상태</th>
                      <th>시작일</th>
                      <th>만료일</th>
                      <th>잔여횟수</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMemberMemberships.map((membership) => {
                      const draft = getMembershipActionDraft(membership.membershipId);
                      const holdPreview = buildHoldPreview(membership);
                      const resumePreview = buildResumePreview(membership);
                      const refundPreview = membershipRefundPreviewById[membership.membershipId];
                      const holdPreviewText =
                        "error" in holdPreview
                          ? holdPreview.error
                          : `홀딩 ${holdPreview.plannedHoldDays}일 / 예상 만료일 ${holdPreview.recalculatedEndDate ?? "-"}`;
                      const resumePreviewText =
                        "error" in resumePreview || !("actualHoldDays" in resumePreview)
                          ? resumePreview.error
                          : `예상 홀딩일수 ${resumePreview.actualHoldDays}일 / 해제 후 만료일 ${resumePreview.recalculatedEndDate ?? "-"}`;

                      return (
                        <tr key={membership.membershipId}>
                          <td>{membership.membershipId}</td>
                          <td>{membership.productNameSnapshot}</td>
                          <td>{buildStatusText(membership)}</td>
                          <td>{membership.startDate}</td>
                          <td>{membership.endDate ?? "-"}</td>
                          <td>{membership.remainingCount ?? "-"}</td>
                          <td>
                            <div className="placeholder-stack">
                              {membership.membershipStatus === "ACTIVE" ? (
                                <div className="placeholder-card">
                                  <strong>홀딩</strong>
                                  <label>
                                    시작일
                                    <input
                                      type="date"
                                      value={draft.holdStartDate}
                                      onChange={(event) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          holdStartDate: event.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    종료일
                                    <input
                                      type="date"
                                      value={draft.holdEndDate}
                                      onChange={(event) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          holdEndDate: event.target.value,
                                          resumeDate: event.target.value || prev.resumeDate
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    사유
                                    <input
                                      value={draft.holdReason}
                                      onChange={(event) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          holdReason: event.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <p>{holdPreviewText}</p>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => handleHoldSubmit(membership)}
                                  >
                                    홀딩
                                  </button>
                                </div>
                              ) : null}

                              {membership.membershipStatus === "HOLDING" && membership.activeHoldStatus === "ACTIVE" ? (
                                <div className="placeholder-card">
                                  <strong>홀딩 해제</strong>
                                  <label>
                                    해제일
                                    <input
                                      type="date"
                                      value={draft.resumeDate}
                                      onChange={(event) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          resumeDate: event.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <p>{resumePreviewText}</p>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => handleResumeSubmit(membership)}
                                  >
                                    홀딩 해제
                                  </button>
                                </div>
                              ) : null}

                              {membership.membershipStatus === "ACTIVE" ? (
                                <div className="placeholder-card">
                                  <strong>환불</strong>
                                  <label>
                                    환불 기준일
                                    <input
                                      type="date"
                                      value={draft.refundDate}
                                      onChange={(event) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundDate: event.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    환불 수단
                                    <select
                                      value={draft.refundPaymentMethod}
                                      onChange={(event) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundPaymentMethod: event.target.value as typeof prev.refundPaymentMethod
                                        }))
                                      }
                                    >
                                      <option value="CASH">현금</option>
                                      <option value="CARD">카드</option>
                                      <option value="TRANSFER">이체</option>
                                      <option value="ETC">기타</option>
                                    </select>
                                  </label>
                                  <label>
                                    환불 메모
                                    <input
                                      value={draft.refundMemo}
                                      onChange={(event) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundMemo: event.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <div className="row-actions">
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      onClick={() => handleRefundPreview(membership)}
                                    >
                                      환불 미리보기
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      onClick={() => handleRefundSubmit(membership)}
                                    >
                                      환불 확정
                                    </button>
                                  </div>
                                  {refundPreview ? (
                                    <p>
                                      원금 {formatCurrency(refundPreview.originalAmount)} / 사용분{" "}
                                      {formatCurrency(refundPreview.usedAmount)} / 환불액{" "}
                                      {formatCurrency(refundPreview.refundAmount)}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="placeholder-card">
            <h2>이번 세션 결제 이력</h2>
            {payments.length === 0 ? (
              <p>아직 prototype session에서 생성된 결제 이력이 없습니다.</p>
            ) : (
              <ul>
                {payments.map((payment) => (
                  <li key={payment.paymentId}>
                    #{payment.paymentId} · 회원권 {payment.membershipId} · {paymentLabel(payment)} ·{" "}
                    {formatCurrency(payment.amount)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
