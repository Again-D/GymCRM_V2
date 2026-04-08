import { useEffect, useState } from "react";
import { 
  Button, 
  Card, 
  Col, 
  DatePicker, 
  Divider, 
  Empty, 
  Flex, 
  Form, 
  Input, 
  Modal as AntdModal, 
  Row, 
  Select, 
  Space, 
  Statistic, 
  Table, 
  Tag, 
  Typography,
  Alert,
  theme
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { MemberContextFallback } from "../member-context/MemberContextFallback";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { MembershipPaymentRecord, PurchasedMembership } from "../members/modules/types";
import { createDefaultProductFilters } from "../products/modules/types";
import { useProductsQuery } from "../products/modules/useProductsQuery";
import { useMembershipPrototypeState } from "./modules/useMembershipPrototypeState";
import { useTrainerOptionsQuery } from "./modules/useTrainerOptionsQuery";

import styles from "./MembershipsPage.module.css";

const { Title, Paragraph, Text } = Typography;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

function buildStatusTag(membership: PurchasedMembership) {
  const isBypassed = !!membership.overrideLimits;
  
  if (membership.membershipStatus === "HOLDING") {
    const text = membership.activeHoldStatus === "ACTIVE" ? "홀딩 중" : "홀딩";
    return (
      <Space size={4}>
        <Tag color="warning">{text}</Tag>
        {isBypassed && <Tag color="error">강제 승인됨</Tag>}
      </Space>
    );
  }
  switch (membership.membershipStatus) {
    case "ACTIVE":
      return (
        <Space size={4}>
          <Tag color="success">활성</Tag>
          {isBypassed && <Tag color="error">강제 승인됨</Tag>}
        </Space>
      );
    case "REFUNDED":
      return <Tag color="error">환불됨</Tag>;
    case "EXPIRED":
      return <Tag color="default">만료</Tag>;
    default:
      return <Tag>{membership.membershipStatus}</Tag>;
  }
}

function paymentLabel(payment: MembershipPaymentRecord) {
  return `${payment.paymentType} · ${payment.paymentStatus} · ${payment.paymentMethod}`;
}

export default function MembershipsPage() {
  const { token } = theme.useToken();
  const { selectedMember, selectedMemberId, clearSelectedMember } = useSelectedMemberStore();
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
  
  const { products, productsLoading, productsQueryError, refetchProducts } = useProductsQuery({
    ...createDefaultProductFilters(),
    status: "ACTIVE"
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
    buildHoldLimitsSummary,
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
    void refetchProducts();
    void loadTrainerOptions();
    return () => {
      resetTrainerOptions();
    };
  }, [refetchProducts, loadTrainerOptions, resetTrainerOptions]);

  const handleCloseModal = () => {
    setActiveModal(null);
    setTargetMembership(null);
    clearPanelFeedback();
  };

  const currentDraft = targetMembership ? getMembershipActionDraft(targetMembership.membershipId) : null;

  const membershipColumns: ColumnsType<PurchasedMembership> = [
    {
      title: "ID",
      dataIndex: "membershipId",
      key: "membershipId",
      width: 80,
      render: (id) => <Text strong>{id}</Text>
    },
    {
      title: "상품",
      key: "product",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.productNameSnapshot}</Text>
          <Text type="secondary" style={{ fontSize: '0.8rem' }}>{record.productTypeSnapshot}</Text>
        </Space>
      )
    },
    {
      title: "상태",
      key: "status",
      render: (_, record) => buildStatusTag(record)
    },
    {
      title: "유효 기간",
      key: "validity",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '0.85rem' }}>{record.startDate} ~</Text>
          <Text type="secondary" style={{ fontSize: '0.8rem' }}>{record.endDate ?? "무기한"}</Text>
        </Space>
      )
    },
    {
      title: "이용 횟수",
      dataIndex: "remainingCount",
      key: "remainingCount",
      render: (count) => count != null ? <Text strong>{count}회 남음</Text> : <Text type="secondary">-</Text>
    },
    {
      title: "액션",
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Space size="small">
          {record.membershipStatus === 'ACTIVE' && (
            <>
              <Button 
                size="small" 
                onClick={() => {
                  setTargetMembership(record);
                  setActiveModal('hold');
                }}
              >
                홀딩
              </Button>
              <Button 
                size="small" 
                danger
                onClick={() => {
                  setTargetMembership(record);
                  setActiveModal('refund');
                  // Trigger initial preview calculation
                  void handleRefundPreview(record);
                }}
              >
                환불
              </Button>
            </>
          )}
          {record.membershipStatus === 'HOLDING' && record.activeHoldStatus === 'ACTIVE' && (
            <Button 
              size="small" 
              type="primary"
              onClick={() => {
                setTargetMembership(record);
                setActiveModal('resume');
              }}
            >
              재개
            </Button>
          )}
        </Space>
      )
    }
  ];

  if (!selectedMember) {
    return (
      <MemberContextFallback
        title="회원권 업무"
        description="회원권 업무는 회원 단위로 진행됩니다. 구매, 홀딩, 환불 작업을 시작하려면 먼저 회원을 선택해 주세요."
        submitLabel="회원 선택 후 시작"
      />
    );
  }

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="start" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1677ff' }}>생애주기 콘솔</Text>
            <Title level={2} style={{ margin: 0 }}>회원권 업무</Title>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
              구매, 홀딩, 재개, 환불을 한 화면에서 처리하며 선택된 회원 컨텍스트를 유지합니다.
            </Paragraph>
            <Space className="mt-xs">
              <Tag>구매 우선</Tag>
              <Tag>모달 액션</Tag>
              <Tag>결제 연동</Tag>
            </Space>
          </Space>
          <Space>
            <Button onClick={() => clearSelectedMember()}>다른 회원 선택</Button>
            <Button type="primary" onClick={() => setActiveModal('purchase')}>신규 등록</Button>
          </Space>
        </Flex>

        <Divider />

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Statistic 
              title="선택된 회원" 
              valueStyle={{ fontSize: '1.25rem', fontWeight: 800 }}
              value={`#${selectedMember.memberId}`} 
              suffix={<Text type="secondary" style={{ fontSize: '0.9rem' }}>{selectedMember.memberName}</Text>} 
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic 
              title="회원권 건수" 
              valueStyle={{ fontSize: '1.25rem', fontWeight: 800 }}
              value={selectedMemberMemberships.length} 
              suffix={<Text type="secondary" style={{ fontSize: '0.9rem' }}>구독 내역 수</Text>} 
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic 
              title="세션 결제" 
              valueStyle={{ fontSize: '1.25rem', fontWeight: 800 }}
              value={payments.length} 
              suffix={<Text type="secondary" style={{ fontSize: '0.9rem' }}>이번 세션 건수</Text>} 
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space direction="vertical" size={2}>
                <Title level={5} style={{ margin: 0 }}>활성 회원권</Title>
                <Text type="secondary" style={{ fontSize: '0.84rem' }}>현재 선택된 회원의 구독 상태와 가능한 액션을 확인합니다.</Text>
              </Space>
            }
          >
            <Table<PurchasedMembership>
              rowKey="membershipId"
              loading={selectedMemberMembershipsLoading}
              columns={membershipColumns}
              dataSource={selectedMemberMemberships}
              pagination={false}
              locale={{
                emptyText: "이 회원의 활성 또는 과거 회원권을 찾을 수 없습니다."
              }}
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space direction="vertical" size={2}>
                <Title level={5} style={{ margin: 0 }}>결제 이력 (세션 한정)</Title>
                <Text type="secondary" style={{ fontSize: '0.84rem' }}>방금 실행한 작업의 결제 결과를 즉시 확인합니다.</Text>
              </Space>
            }
          >
            {payments.length === 0 ? (
              <Empty description="이번 세션 내역이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Flex vertical gap={12}>
                {payments.map((payment) => (
                  <Card key={payment.paymentId} size="small" className={styles.paymentCard}>
                    <Flex justify="space-between" align="start">
                      <Space direction="vertical" size={2}>
                        <Text type="secondary" style={{ fontSize: '0.75rem' }}>ID: #{payment.paymentId}</Text>
                        <Text strong style={{ fontSize: '0.875rem' }}>{paymentLabel(payment)}</Text>
                        <Text type="secondary" style={{ fontSize: '0.75rem' }}>연결 회원권: #{payment.membershipId}</Text>
                      </Space>
                      <Flex vertical align="end">
                        <Tag color="success">{payment.paymentStatus}</Tag>
                        <Title level={5} style={{ margin: '8px 0 0' }}>{formatCurrency(payment.amount)}</Title>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            )}
          </Card>
        </Col>
      </Row>

      {membershipPanelMessage && <Alert type="success" message={membershipPanelMessage} showIcon style={{ marginTop: 16 }} />}
      {membershipPanelError && <Alert type="error" message={membershipPanelError} showIcon style={{ marginTop: 16 }} />}
      {selectedMemberMembershipsError && <Alert type="error" message={selectedMemberMembershipsError} showIcon style={{ marginTop: 16 }} />}

      {/* PURCHASE MODAL */}
      <AntdModal
        title="신규 회원권 등록"
        open={activeModal === 'purchase'}
        onCancel={handleCloseModal}
        width={600}
        footer={[
          <Button key="cancel" onClick={handleCloseModal}>취소</Button>,
          <Button 
            key="submit" 
            type="primary" 
            disabled={!purchaseForm.productId || (purchasePreview?.product.productCategory === "PT" && !purchaseForm.assignedTrainerId)}
            onClick={async () => {
              const res = await handlePurchaseSubmit();
              if (res) handleCloseModal();
            }}
          >
            구매 확정
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="상품 선택" required>
            <Select
              placeholder="상품을 선택하세요"
              value={purchaseForm.productId}
              onChange={(value) => {
                clearPanelFeedback();
                setPurchaseForm((prev) => ({ ...prev, productId: value, assignedTrainerId: "" }));
              }}
              options={products.map((product) => ({
                label: `${product.productName} (${product.productType}) · ${formatCurrency(product.priceAmount)}`,
                value: String(product.productId)
              }))}
            />
          </Form.Item>

          {purchasePreview?.product.productCategory === "PT" && (
            <Form.Item label="담당 트레이너" required extra={trainerOptionsError}>
              <Select
                placeholder={trainerOptionsLoading ? "트레이너를 불러오는 중..." : "담당 트레이너를 선택하세요"}
                loading={trainerOptionsLoading}
                value={purchaseForm.assignedTrainerId}
                onChange={(value) => setPurchaseForm((prev) => ({ ...prev, assignedTrainerId: value }))}
                options={trainerOptions.map((trainer) => ({
                  label: trainer.userName,
                  value: String(trainer.userId)
                }))}
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="시작일" required>
                <DatePicker 
                  style={{ width: '100%' }} 
                  value={purchaseForm.startDate ? dayjs(purchaseForm.startDate) : null}
                  onChange={(date) => {
                    clearPanelFeedback();
                    setPurchaseForm((prev) => ({ ...prev, startDate: date ? date.format("YYYY-MM-DD") : "" }));
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="결제 수단" required>
                <Select
                  value={purchaseForm.paymentMethod}
                  onChange={(value) => setPurchaseForm((prev) => ({ ...prev, paymentMethod: value }))}
                  options={[
                    { label: '현금', value: 'CASH' },
                    { label: '카드', value: 'CARD' },
                    { label: '계좌이체', value: 'TRANSFER' },
                    { label: '기타', value: 'ETC' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="결제 금액">
            <Input
              value={purchaseForm.paidAmount}
              onChange={(event) => setPurchaseForm((prev) => ({ ...prev, paidAmount: event.target.value }))}
              placeholder="비워두면 정가로 처리됩니다"
            />
          </Form.Item>

          {purchasePreview && (
            <Card size="small" className={styles.previewCard}>
              <Text strong type="secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>구매 미리보기</Text>
              <Flex vertical gap={8} style={{ marginTop: 12 }}>
                <Flex justify="space-between">
                  <Text>기간</Text>
                  <Text strong>{purchasePreview.startDate} ~ {purchasePreview.endDate ?? "-"}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text>청구 금액</Text>
                  <Text strong type="danger" style={{ fontSize: '1.1rem' }}>{formatCurrency(purchasePreview.chargeAmount)}</Text>
                </Flex>
              </Flex>
            </Card>
          )}
        </Form>
      </AntdModal>

      {/* HOLD MODAL */}
      <AntdModal
        title={targetMembership ? `회원권 #${targetMembership.membershipId} 홀딩` : "홀딩"}
        open={activeModal === 'hold' && targetMembership != null}
        onCancel={handleCloseModal}
        footer={[
          <Button key="cancel" onClick={handleCloseModal}>취소</Button>,
          <Button 
            key="submit" 
            type="primary"
            onClick={async () => {
              if (targetMembership) {
                const product = products.find(p => p.productId === targetMembership.productId);
                const limits = product ? buildHoldLimitsSummary(targetMembership, product) : { isExceeded: false };
                
                await handleHoldSubmit(targetMembership, limits.isExceeded);
                handleCloseModal();
              }
            }}
          >
            {(() => {
              if (!targetMembership) return "홀딩 처리";
              const product = products.find(p => p.productId === targetMembership.productId);
              const limits = product ? buildHoldLimitsSummary(targetMembership, product) : { isExceeded: false };
              return limits.isExceeded ? "강제 홀딩 처리" : "홀딩 처리";
            })()}
          </Button>
        ]}
      >
        {targetMembership && currentDraft && (
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="시작일">
                  <DatePicker 
                    style={{ width: '100%' }}
                    value={currentDraft.holdStartDate ? dayjs(currentDraft.holdStartDate) : null}
                    onChange={(date) => 
                      updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                        ...prev,
                        holdStartDate: date ? date.format("YYYY-MM-DD") : ""
                      }))
                    }
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="종료일">
                  <DatePicker 
                    style={{ width: '100%' }}
                    value={currentDraft.holdEndDate ? dayjs(currentDraft.holdEndDate) : null}
                    onChange={(date) => 
                      updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                        ...prev,
                        holdEndDate: date ? date.format("YYYY-MM-DD") : ""
                      }))
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="사유">
              <Input
                placeholder="예: 여행, 부상"
                value={currentDraft.holdReason}
                onChange={(event) =>
                  updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                    ...prev,
                    holdReason: event.target.value
                  }))
                }
              />
            </Form.Item>
            <Flex vertical gap={12}>
              <Alert 
                type="info" 
                message={(() => {
                  const preview = buildHoldPreview(targetMembership);
                  return 'error' in preview ? preview.error : `영향: ${preview.plannedHoldDays}일 추가. 재계산된 만료일: ${preview.recalculatedEndDate ?? "-"}`;  
                })()}
              />

              {(() => {
                const product = products.find(p => p.productId === targetMembership.productId);
                if (!product) return null;
                const limits = buildHoldLimitsSummary(targetMembership, product);
                
                return (
                  <Flex vertical gap={12}>
                    <Card size="small" style={{ background: token.colorFillAlter }}>
                      <Text type="secondary" style={{ fontSize: '0.75rem' }}>홀딩 잔여량 (상품 기준)</Text>
                      <Row gutter={16} style={{ marginTop: 8 }}>
                        <Col span={12}>
                          <Statistic 
                            title="잔여 일수" 
                            value={limits.remainingDays} 
                            suffix={`/ ${limits.maxDays}일`} 
                            valueStyle={{ fontSize: '1rem', color: limits.isDaysExceeded ? token.colorError : undefined }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic 
                            title="잔여 횟수" 
                            value={limits.remainingCount} 
                            suffix={`/ ${limits.maxCount}회`} 
                            valueStyle={{ fontSize: '1rem', color: limits.isCountExceeded ? token.colorError : undefined }}
                          />
                        </Col>
                      </Row>
                    </Card>

                    {limits.isExceeded && (
                      <Alert
                        type="warning"
                        showIcon
                        message="홀딩 제한 초과"
                        description={
                          <Flex vertical gap={4}>
                            {limits.isDaysExceeded && (
                              <Text>- 잔여 홀딩 일수({limits.remainingDays}일)를 초과했습니다. (요청: {limits.plannedHoldDays}일)</Text>
                            )}
                            {limits.isCountExceeded && (
                              <Text>- 최대 홀딩 횟수({limits.maxCount}회)를 모두 사용했습니다. (사용: {limits.usedCount}회)</Text>
                            )}
                            <Text strong style={{ marginTop: 4 }}>관리자 권한으로 강제 진행하시겠습니까?</Text>
                          </Flex>
                        }
                      />
                    )}
                  </Flex>
                );
              })()}
            </Flex>
          </Form>
        )}
      </AntdModal>

      {/* RESUME MODAL */}
      <AntdModal
        title="회원권 홀딩 해제"
        open={activeModal === 'resume' && targetMembership != null}
        onCancel={handleCloseModal}
        footer={[
          <Button key="cancel" onClick={handleCloseModal}>취소</Button>,
          <Button 
            key="submit" 
            type="primary"
            onClick={async () => {
              if (targetMembership) {
                await handleResumeSubmit(targetMembership);
                handleCloseModal();
              }
            }}
          >
            지금 재개
          </Button>
        ]}
      >
        {targetMembership && currentDraft && (
          <Form layout="vertical">
            <Form.Item label="재개일">
              <DatePicker 
                style={{ width: '100%' }}
                value={currentDraft.resumeDate ? dayjs(currentDraft.resumeDate) : null}
                onChange={(date) => 
                  updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                    ...prev,
                    resumeDate: date ? date.format("YYYY-MM-DD") : ""
                  }))
                }
              />
            </Form.Item>
            <Alert 
              type="info" 
              message={(() => {
                const preview = buildResumePreview(targetMembership);
                return 'error' in preview ? preview.error : `재개 계산 완료. 새 만료일: ${preview.recalculatedEndDate ?? "-"}`;  
              })()}
            />
          </Form>
        )}
      </AntdModal>

      {/* REFUND MODAL */}
      <AntdModal
        title="회원권 환불 처리"
        open={activeModal === 'refund' && targetMembership != null}
        onCancel={handleCloseModal}
        width={600}
        footer={[
          <Button key="cancel" onClick={handleCloseModal}>취소</Button>,
          <Button 
            key="submit" 
            type="primary" 
            danger
            onClick={async () => {
              if (targetMembership) {
                await handleRefundSubmit(targetMembership);
                handleCloseModal();
              }
            }}
          >
            환불 확정
          </Button>
        ]}
      >
        {targetMembership && currentDraft && (
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="환불 기준일">
                  <DatePicker 
                    style={{ width: '100%' }}
                    value={currentDraft.refundDate ? dayjs(currentDraft.refundDate) : null}
                    onChange={(date) => {
                      const newDate = date ? date.format("YYYY-MM-DD") : "";
                      updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                        ...prev,
                        refundDate: newDate
                      }));
                      // Re-trigger preview if a valid date is selected
                      if (newDate) {
                        void handleRefundPreview(targetMembership, newDate);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="환불 수단">
                  <Select
                    value={currentDraft.refundPaymentMethod}
                    onChange={(value) =>
                      updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                        ...prev,
                        refundPaymentMethod: value
                      }))
                    }
                    options={[
                      { label: '현금', value: 'CASH' },
                      { label: '카드', value: 'CARD' },
                      { label: '계좌이체', value: 'TRANSFER' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="메모">
              <Input
                value={currentDraft.refundMemo}
                onChange={(event) =>
                  updateMembershipActionDraft(targetMembership.membershipId, (prev) => ({
                    ...prev,
                    refundMemo: event.target.value
                  }))
                }
              />
            </Form.Item>


            {membershipRefundPreviewById[targetMembership.membershipId] && (
              <Card size="small" className={styles.previewCard}>
                <Flex vertical gap={8}>
                  <Flex justify="space-between">
                    <Text>결제 금액</Text>
                    <span>{formatCurrency(membershipRefundPreviewById[targetMembership.membershipId].originalAmount)}</span>
                  </Flex>
                  <Flex justify="space-between">
                    <Text>이용 금액 (이용분 공제)</Text>
                    <span>- {formatCurrency(membershipRefundPreviewById[targetMembership.membershipId].usedAmount)}</span>
                  </Flex>
                  <Flex justify="space-between">
                    <Text>위약금 (결제액의 10%)</Text>
                    <span>- {formatCurrency(membershipRefundPreviewById[targetMembership.membershipId].penaltyAmount)}</span>
                  </Flex>
                  <Divider style={{ margin: '8px 0' }} />
                  <Flex justify="space-between">
                    <Text strong>최종 환불 합계</Text>
                    <Text strong style={{ fontSize: '1.2rem', color: token.colorError }}>
                      {formatCurrency(membershipRefundPreviewById[targetMembership.membershipId].refundAmount)}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            )}
          </Form>
        )}
      </AntdModal>
    </Flex>
  );
}
