import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { PlaceholderCard } from "../../shared/ui/PlaceholderCard";
import { formatCurrency } from "../../shared/utils/format";

type MembershipOperationsPanelsProps = {
  selectedMember: any;
  activeProductsForPurchase: any[];
  purchaseForm: any;
  setPurchaseForm: any;
  setPurchaseProductDetail: any;
  loadPurchaseProductDetail: (productId: number) => Promise<void>;
  purchaseProductLoading: boolean;
  purchaseProductDetail: any;
  purchasePreview: any;
  handleMembershipPurchaseSubmit: any;
  memberPurchaseSubmitting: boolean;
  memberPurchaseMessage: string | null;
  memberPurchaseError: string | null;
  selectedMemberMemberships: any[];
  selectedMemberPayments: any[];
  getMembershipActionDraft: (membershipId: number) => any;
  buildHoldPreview: (membership: any, draft: any) => any;
  buildResumePreview: (membership: any, draft: any) => any;
  membershipRefundPreviewById: Record<number, any>;
  membershipActionMessageById: Record<number, string>;
  membershipActionErrorById: Record<number, string>;
  membershipActionSubmittingId: number | null;
  membershipRefundPreviewLoadingId: number | null;
  updateMembershipActionDraft: (membershipId: number, updater: (prev: any) => any) => void;
  handleMembershipHoldSubmit: (membership: any) => Promise<void>;
  handleMembershipResumeSubmit: (membership: any) => Promise<void>;
  handleMembershipRefundPreview: (membership: any) => Promise<void>;
  handleMembershipRefundSubmit: (membership: any) => Promise<void>;
};

export function MembershipOperationsPanels(props: MembershipOperationsPanelsProps) {
  const {
    selectedMember,
    activeProductsForPurchase,
    purchaseForm,
    setPurchaseForm,
    setPurchaseProductDetail,
    loadPurchaseProductDetail,
    purchaseProductLoading,
    purchaseProductDetail,
    purchasePreview,
    handleMembershipPurchaseSubmit,
    memberPurchaseSubmitting,
    memberPurchaseMessage,
    memberPurchaseError,
    selectedMemberMemberships,
    selectedMemberPayments,
    getMembershipActionDraft,
    buildHoldPreview,
    buildResumePreview,
    membershipRefundPreviewById,
    membershipActionMessageById,
    membershipActionErrorById,
    membershipActionSubmittingId,
    membershipRefundPreviewLoadingId,
    updateMembershipActionDraft,
    handleMembershipHoldSubmit,
    handleMembershipResumeSubmit,
    handleMembershipRefundPreview,
    handleMembershipRefundSubmit
  } = props;

  if (!selectedMember) {
    return null;
  }

  return (
    <>
      <article className="panel">
        <PanelHeader title="회원권 구매" />
        <p className="muted-text">선택 회원 기준으로 기간제/횟수제 상품 구매를 처리합니다.</p>

        <form className="form-grid membership-purchase-form" onSubmit={handleMembershipPurchaseSubmit}>
          <label>
            상품 선택 *
            <select
              value={purchaseForm.productId}
              onChange={(e) => {
                const nextProductId = e.target.value;
                setPurchaseForm((prev: any) => ({ ...prev, productId: nextProductId }));
                if (!nextProductId) {
                  setPurchaseProductDetail(null);
                  return;
                }
                void loadPurchaseProductDetail(Number.parseInt(nextProductId, 10));
              }}
            >
              <option value="">선택하세요</option>
              {activeProductsForPurchase.map((product) => (
                <option key={product.productId} value={product.productId}>
                  #{product.productId} · {product.productName} ({product.productType}) · {formatCurrency(product.priceAmount)}
                </option>
              ))}
            </select>
          </label>
          <label>
            시작일
            <input
              type="date"
              value={purchaseForm.startDate}
              onChange={(e) => setPurchaseForm((prev: any) => ({ ...prev, startDate: e.target.value }))}
            />
          </label>
          <label>
            결제수단
            <select
              value={purchaseForm.paymentMethod}
              onChange={(e) =>
                setPurchaseForm((prev: any) => ({
                  ...prev,
                  paymentMethod: e.target.value
                }))
              }
            >
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="ETC">ETC</option>
            </select>
          </label>
          <label>
            결제금액 (비우면 상품가)
            <input
              inputMode="decimal"
              value={purchaseForm.paidAmount}
              onChange={(e) => setPurchaseForm((prev: any) => ({ ...prev, paidAmount: e.target.value }))}
            />
          </label>
          <label className="full-row">
            회원권 메모
            <textarea
              rows={2}
              value={purchaseForm.membershipMemo}
              onChange={(e) => setPurchaseForm((prev: any) => ({ ...prev, membershipMemo: e.target.value }))}
            />
          </label>
          <label className="full-row">
            결제 메모
            <textarea
              rows={2}
              value={purchaseForm.paymentMemo}
              onChange={(e) => setPurchaseForm((prev: any) => ({ ...prev, paymentMemo: e.target.value }))}
            />
          </label>

          <div className="full-row preview-card">
            <strong>구매 계산 미리보기</strong>
            {purchaseProductLoading ? (
              <p className="muted-text">상품 정보를 불러오는 중...</p>
            ) : !purchaseProductDetail ? (
              <p className="muted-text">상품을 선택하면 미리보기를 표시합니다.</p>
            ) : purchasePreview && "error" in purchasePreview ? (
              <NoticeText tone="error" compact>{purchasePreview.error}</NoticeText>
            ) : purchasePreview ? (
              <dl className="purchase-preview-grid">
                <div>
                  <dt>유형</dt>
                  <dd>{purchaseProductDetail.productType}</dd>
                </div>
                <div>
                  <dt>시작일</dt>
                  <dd>{purchasePreview.startDate}</dd>
                </div>
                <div>
                  <dt>만료일</dt>
                  <dd>{purchasePreview.endDate ?? "-"}</dd>
                </div>
                <div>
                  <dt>총횟수</dt>
                  <dd>{purchasePreview.totalCount ?? "-"}</dd>
                </div>
                <div>
                  <dt>잔여횟수</dt>
                  <dd>{purchasePreview.remainingCount ?? "-"}</dd>
                </div>
                <div>
                  <dt>청구금액</dt>
                  <dd>{formatCurrency(purchasePreview.chargeAmount)}</dd>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="form-actions full-row">
            <button
              type="submit"
              className="primary-button"
              disabled={memberPurchaseSubmitting || !selectedMember || !purchaseForm.productId}
            >
              {memberPurchaseSubmitting ? "구매 처리 중..." : "회원권 구매 확정"}
            </button>
          </div>
        </form>

        {memberPurchaseMessage ? <NoticeText tone="success" compact>{memberPurchaseMessage}</NoticeText> : null}
        {memberPurchaseError ? <NoticeText tone="error" compact>{memberPurchaseError}</NoticeText> : null}
      </article>

      <article className="panel">
        <PanelHeader title="회원권 목록 (이번 세션 생성분)" />
        {selectedMemberMemberships.length === 0 ? (
          <PlaceholderCard>
            <p>아직 이 세션에서 생성된 회원권이 없습니다.</p>
          </PlaceholderCard>
        ) : (
          <div className="list-shell">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>상품</th>
                  <th>유형</th>
                  <th>상태</th>
                  <th>시작일</th>
                  <th>만료일</th>
                  <th>잔여횟수</th>
                  <th>액션 (홀딩/해제/환불)</th>
                </tr>
              </thead>
              <tbody>
                {selectedMemberMemberships.map((membership) => (
                  <tr key={membership.membershipId}>
                    <td>{membership.membershipId}</td>
                    <td>{membership.productNameSnapshot}</td>
                    <td>{membership.productTypeSnapshot}</td>
                    <td>{membership.membershipStatus}</td>
                    <td>{membership.startDate}</td>
                    <td>{membership.endDate ?? "-"}</td>
                    <td>{membership.remainingCount ?? "-"}</td>
                    <td>
                      {(() => {
                        const draft = getMembershipActionDraft(membership.membershipId);
                        const holdPreview = buildHoldPreview(membership, draft);
                        const resumePreview = buildResumePreview(membership, draft);
                        const refundPreview = membershipRefundPreviewById[membership.membershipId];
                        const actionMessage = membershipActionMessageById[membership.membershipId];
                        const actionError = membershipActionErrorById[membership.membershipId];
                        const isSubmitting = membershipActionSubmittingId === membership.membershipId;
                        const isRefundPreviewLoading = membershipRefundPreviewLoadingId === membership.membershipId;
                        const canRefund = membership.membershipStatus === "ACTIVE";
                        return (
                          <div className="membership-action-cell">
                            {membership.membershipStatus === "ACTIVE" ? (
                              <details className="membership-action-group" open>
                                <summary>홀딩 처리</summary>
                                <div className="membership-action-group-body">
                                  <label>
                                    홀딩 시작일
                                    <input
                                      type="date"
                                      value={draft.holdStartDate}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          holdStartDate: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    홀딩 종료일
                                    <input
                                      type="date"
                                      value={draft.holdEndDate}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          holdEndDate: e.target.value,
                                          resumeDate: e.target.value || prev.resumeDate
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    사유(선택)
                                    <input
                                      value={draft.holdReason}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          holdReason: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <div className="membership-action-preview">
                                    {holdPreview && "error" in holdPreview ? (
                                      <NoticeText as="span" tone="error" compact>{holdPreview.error}</NoticeText>
                                    ) : holdPreview ? (
                                      <span>
                                        홀딩 {holdPreview.plannedHoldDays}일 / 예상 해제 후 만료일:{" "}
                                        {holdPreview.recalculatedEndDate ?? "-"}
                                      </span>
                                    ) : (
                                      <span className="muted-text">홀딩 미리보기 없음</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={isSubmitting}
                                    onClick={() => void handleMembershipHoldSubmit(membership)}
                                  >
                                    {isSubmitting ? "처리 중..." : "홀딩"}
                                  </button>
                                </div>
                              </details>
                            ) : membership.membershipStatus === "HOLDING" ? (
                              <details className="membership-action-group" open>
                                <summary>홀딩 해제</summary>
                                <div className="membership-action-group-body">
                                  <label>
                                    해제일
                                    <input
                                      type="date"
                                      value={draft.resumeDate}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          resumeDate: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <div className="membership-action-preview">
                                    {resumePreview && "error" in resumePreview ? (
                                      <NoticeText as="span" tone="error" compact>{resumePreview.error}</NoticeText>
                                    ) : resumePreview ? (
                                      <span>
                                        예상 홀딩일수: {resumePreview.actualHoldDays}일 / 해제 후 만료일:{" "}
                                        {resumePreview.recalculatedEndDate ?? "-"}
                                      </span>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={isSubmitting}
                                    onClick={() => void handleMembershipResumeSubmit(membership)}
                                  >
                                    {isSubmitting ? "처리 중..." : "홀딩 해제"}
                                  </button>
                                </div>
                              </details>
                            ) : (
                              <span className="muted-text">상태상 액션 없음</span>
                            )}

                            <div className="membership-action-divider" aria-hidden="true" />

                            {canRefund ? (
                              <details className="membership-action-group">
                                <summary>환불 처리</summary>
                                <div className="membership-action-group-body">
                                  <label>
                                    환불 기준일
                                    <input
                                      type="date"
                                      value={draft.refundDate}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundDate: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    환불 수단
                                    <select
                                      value={draft.refundPaymentMethod}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundPaymentMethod: e.target.value
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
                                    환불 사유(선택)
                                    <input
                                      value={draft.refundReason}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundReason: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    환불 메모(선택)
                                    <input
                                      value={draft.refundMemo}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundMemo: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    결제 메모(선택)
                                    <input
                                      value={draft.refundPaymentMemo}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundPaymentMemo: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <div className="membership-action-preview">
                                    {refundPreview ? (
                                      <div className="membership-preview-stack">
                                        <span>
                                          기준금액 {formatCurrency(refundPreview.originalAmount)} / 사용분{" "}
                                          {formatCurrency(refundPreview.usedAmount)}
                                        </span>
                                        <span>
                                          위약금 {formatCurrency(refundPreview.penaltyAmount)} / 환불액{" "}
                                          {formatCurrency(refundPreview.refundAmount)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="muted-text">환불 미리보기 없음</span>
                                    )}
                                  </div>
                                  <div className="membership-action-buttons">
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      disabled={isSubmitting || isRefundPreviewLoading}
                                      onClick={() => void handleMembershipRefundPreview(membership)}
                                    >
                                      {isRefundPreviewLoading ? "계산 중..." : "환불 미리보기"}
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      disabled={isSubmitting || isRefundPreviewLoading}
                                      onClick={() => void handleMembershipRefundSubmit(membership)}
                                    >
                                      {isSubmitting ? "처리 중..." : "환불 확정"}
                                    </button>
                                  </div>
                                </div>
                              </details>
                            ) : (
                              <p className="muted-text">
                                {membership.membershipStatus === "HOLDING"
                                  ? "홀딩 상태 회원권은 먼저 해제 후 환불해주세요."
                                  : `환불 불가 상태입니다. 현재 상태: ${membership.membershipStatus}`}
                              </p>
                            )}

                            {actionMessage ? <NoticeText tone="success" compact>{actionMessage}</NoticeText> : null}
                            {actionError ? <NoticeText tone="error" compact>{actionError}</NoticeText> : null}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="panel">
        <PanelHeader title="결제 이력 (이번 세션 생성분)" />
        {selectedMemberPayments.length === 0 ? (
          <PlaceholderCard>
            <p>아직 이 세션에서 생성된 결제 이력이 없습니다.</p>
          </PlaceholderCard>
        ) : (
          <div className="list-shell">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>회원권ID</th>
                  <th>유형</th>
                  <th>상태</th>
                  <th>수단</th>
                  <th>금액</th>
                  <th>결제시각</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {selectedMemberPayments.map((payment) => (
                  <tr key={payment.paymentId}>
                    <td>{payment.paymentId}</td>
                    <td>{payment.membershipId}</td>
                    <td>{payment.paymentType}</td>
                    <td>{payment.paymentStatus}</td>
                    <td>{payment.paymentMethod}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td>{payment.paidAt}</td>
                    <td>{payment.memo ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}
