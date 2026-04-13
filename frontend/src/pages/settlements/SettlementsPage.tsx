import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  theme
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BarChartOutlined,
  CalendarOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  TeamOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { apiDownload, apiPost, isMockApiMode } from "../../api/client";
import { useAuthState } from "../../app/auth";
import { hasRole } from "../../app/roles";
import { toUserFacingErrorMessage } from "../../app/uiError";
import { addDaysToLocalDate, addMonthsToLocalDate, startOfMonthLocalDate, todayLocalDate } from "../../shared/date";
import { usePagination } from "../../shared/hooks/usePagination";
import styles from "./SettlementsPage.module.css";
import { SettlementSalesTrendChart } from "./components/SettlementSalesTrendChart";
import { DEFAULT_SETTLEMENT_TAB, settlementTabs } from "./modules/settlementTabs";
import { buildSettlementSalesTrendChartData } from "./modules/buildSettlementSalesTrendChartData";
import { useSalesDashboardQuery } from "./modules/useSalesDashboardQuery";
import { useSettlementPrototypeState } from "./modules/useSettlementPrototypeState";
import { useSettlementRecentAdjustmentsQuery } from "./modules/useSettlementRecentAdjustmentsQuery";
import { useSettlementReportQuery } from "./modules/useSettlementReportQuery";
import { useTrainerSettlementPreviewQuery } from "./modules/useTrainerSettlementPreviewQuery";
import { useTrainerSettlementWorkspaceState } from "./modules/useTrainerSettlementWorkspaceState";
import { useTrainerOptionsQuery } from "../memberships/modules/useTrainerOptionsQuery";
import { buildTrainerSettlementScopeOptions } from "./modules/buildTrainerSettlementScopeOptions";
import type {
  SalesDashboard,
  SettlementAdjustmentType,
  SettlementPaymentMethod,
  SettlementReportFilters,
  SettlementTabKey,
  SettlementTrendPoint,
  TrainerSettlementPreviewRow,
  TrainerSettlementScope,
  TrainerSettlementWorkspace
} from "./modules/types";

const { Paragraph, Text, Title } = Typography;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatCompactDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function formatRateAmount(value: number | null) {
  if (value == null) {
    return "미설정";
  }
  return formatCurrency(value);
}

function formatTrendHint(point: SettlementTrendPoint | undefined) {
  if (!point) {
    return "데이터 없음";
  }
  return `${point.bucketLabel} · ${formatCurrency(point.netSales)}`;
}

function toTrainerSettlementWorkspace(payload: TrainerSettlementWorkspace | {
  settlementId: number;
  trainer: { trainerId: string; name: string };
  period: { start: string; end: string };
  summary: {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    noShowSessions: number;
    ptSessions: number;
    gxSessions: number;
  };
  calculation: TrainerSettlementWorkspace["calculation"];
  status: "DRAFT" | "CONFIRMED";
  createdAt: string;
}): TrainerSettlementWorkspace {
  if ("confirmedAt" in payload) {
    return payload;
  }
  return {
    ...payload,
    confirmedAt: null
  };
}

const paymentMethodLabel: Record<string, string> = {
  CASH: "현금",
  CARD: "카드",
  TRANSFER: "계좌이체",
  ETC: "기타"
};

const adjustmentTypeMeta: Record<SettlementAdjustmentType, { label: string; color: string }> = {
  REFUND: { label: "환불", color: "error" }
};

type SettlementReportRow = NonNullable<ReturnType<typeof useSettlementReportQuery>["settlementReport"]>["rows"][number];
type RecentAdjustmentRow = ReturnType<typeof useSettlementRecentAdjustmentsQuery>["recentAdjustments"][number];
function createDashboardStats(dashboard: SalesDashboard | null, token: ReturnType<typeof theme.useToken>["token"]) {
  return [
    {
      label: "오늘 순매출",
      value: formatCurrency(dashboard?.todayNetSales ?? 0),
      hint: "오늘 기준 실매출 흐름",
      icon: <DollarOutlined />,
      color: token.colorSuccess
    },
    {
      label: "이번 달 순매출",
      value: formatCurrency(dashboard?.monthNetSales ?? 0),
      hint: "이번 달 누적 순매출",
      icon: <BarChartOutlined />
    },
    {
      label: "신규 회원",
      value: dashboard?.newMemberCount ?? 0,
      hint: "오늘 가입 회원 수",
      icon: <TeamOutlined />
    },
    {
      label: "만료 예정",
      value: dashboard?.expiringMemberCount ?? 0,
      hint: `${dashboard?.expiringWithinDays ?? 7}일 이내 만료`,
      icon: <CalendarOutlined />
    },
    {
      label: "환불 신호",
      value: dashboard?.refundCount ?? 0,
      hint: "오늘 확인이 필요한 환불 건수",
      icon: <ReloadOutlined />,
      color: token.colorError
    }
  ];
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
}

function TrainerSettlementsMiniView() {
  const {
    trainerSettlementFilters,
    setTrainerSettlementFilters,
    submittedTrainerSettlementQuery,
    trainerSettlementPanelError,
    setTrainerSettlementPanelError,
    clearTrainerSettlementFeedback,
    submitTrainerSettlementFilters,
    applyTrainerSettlementPreset
  } = useTrainerSettlementWorkspaceState(todayLocalDate(), "self");
  const {
    trainerSettlementPreview,
    trainerSettlementPreviewLoading,
    trainerSettlementPreviewError
  } = useTrainerSettlementPreviewQuery(
    "trainer",
    submittedTrainerSettlementQuery
  );

  const handlePreviewSubmit = useCallback(async () => {
    const nextQuery = submitTrainerSettlementFilters();
    if (!nextQuery) {
      return;
    }
  }, [submitTrainerSettlementFilters]);

  const trainerSummaryRow = trainerSettlementPreview?.rows[0] ?? null;

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="start" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text className={styles.eyebrow}>Settlement Console</Text>
            <Title level={2} className={styles.heroTitle}>내 월 정산 미리보기</Title>
            <Paragraph type="secondary" className={styles.heroDescription}>
              트레이너 계정에서는 본인 월 기준 실적과 예상 정산 금액만 조회할 수 있습니다. 생성, 확정, 문서 출력은 운영 권한에서 처리합니다.
            </Paragraph>
          </Space>
          <Tag color="purple">트레이너 전용 미니뷰</Tag>
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title="조회 기준"
            extra={<Tag color="blue">내 preview</Tag>}
          >
            <Form layout="vertical" onFinish={() => void handlePreviewSubmit()}>
              <div className={styles.formGrid}>
                <Form.Item label="정산 월">
                  <DatePicker
                    picker="month"
                    className={styles.fullWidth}
                    value={trainerSettlementFilters.settlementMonth ? dayjs(trainerSettlementFilters.settlementMonth, "YYYY-MM") : null}
                    onChange={(date) => {
                      setTrainerSettlementFilters((prev) => ({
                        ...prev,
                        settlementMonth: date ? date.format("YYYY-MM") : ""
                      }));
                    }}
                  />
                </Form.Item>
              </div>
              <Space wrap>
                <Button onClick={() => applyTrainerSettlementPreset("thisMonth")}>이번 달</Button>
                <Button onClick={() => applyTrainerSettlementPreset("lastMonth")}>지난달</Button>
              </Space>
              <Space style={{ marginTop: 12 }}>
                <Button htmlType="submit" type="primary" loading={trainerSettlementPreviewLoading}>
                  미리보기 조회
                </Button>
                <Button onClick={clearTrainerSettlementFeedback}>
                  안내 지우기
                </Button>
              </Space>
            </Form>
            {(trainerSettlementPanelError || trainerSettlementPreviewError) && (
              <Alert
                style={{ marginTop: 16 }}
                type="error"
                showIcon
                message={trainerSettlementPanelError ?? trainerSettlementPreviewError}
              />
            )}
            <Alert
              style={{ marginTop: 16 }}
              type="info"
              showIcon
              message="프리셋으로 빠르게 정산 월을 바꾸고, 조회된 결과는 저장되지 않습니다."
            />
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="내 월 기준 정산 preview">
            <Flex vertical gap={16}>
              <Row gutter={[12, 12]} className={styles.statsGridCompact}>
                <Col xs={12} md={8}>
                  <Card size="small">
                    <Statistic
                      title="정산 월"
                      value={trainerSettlementPreview?.settlementMonth ?? trainerSettlementFilters.settlementMonth}
                      valueStyle={{ fontSize: "0.92rem", fontWeight: 700 }}
                    />
                  </Card>
                </Col>
                <Col xs={12} md={8}>
                  <Card size="small" loading={trainerSettlementPreviewLoading}>
                    <Statistic
                      title="완료 수업"
                      value={trainerSettlementPreview?.summary.completedSessions ?? 0}
                      valueStyle={{ fontSize: "1rem", fontWeight: 700 }}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card size="small" loading={trainerSettlementPreviewLoading}>
                    <Statistic
                      title="예상 정산 금액"
                      value={trainerSettlementPreview?.summary.totalAmount != null ? formatCurrency(trainerSettlementPreview.summary.totalAmount) : "단가 확인 필요"}
                      valueStyle={{ fontSize: "1rem", fontWeight: 700 }}
                    />
                  </Card>
                </Col>
              </Row>

              {trainerSummaryRow && (
                <Flex vertical gap={8}>
                  <Table
                    rowKey={(row) => row.trainerUserId}
                    size="small"
                    pagination={false}
                    dataSource={[trainerSummaryRow]}
                    columns={[
                      {
                        title: "트레이너",
                        dataIndex: "trainerName",
                        key: "trainerName"
                      },
                      {
                        title: "PT / GX",
                        key: "lessonSplit",
                        render: (_, row: TrainerSettlementPreviewRow) => `${row.ptSessions} / ${row.gxSessions}`
                      },
                      {
                        title: "PT 단가",
                        key: "ptRatePerSession",
                        align: "right",
                        render: (_, row: TrainerSettlementPreviewRow) => formatRateAmount(row.ptRatePerSession)
                      },
                      {
                        title: "GX 단가",
                        key: "gxRatePerSession",
                        align: "right",
                        render: (_, row: TrainerSettlementPreviewRow) => formatRateAmount(row.gxRatePerSession)
                      },
                      {
                        title: "취소 / 노쇼",
                        key: "riskSignals",
                        render: (_, row: TrainerSettlementPreviewRow) => `${row.cancelledSessions} / ${row.noShowSessions}`
                      },
                      {
                        title: "예상 금액",
                        key: "totalAmount",
                        align: "right",
                        render: (_, row: TrainerSettlementPreviewRow) =>
                          row.totalAmount == null ? "단가 확인 필요" : formatCurrency(row.totalAmount)
                      }
                    ]}
                  />
                  <Text type="secondary" style={{ fontSize: "0.82rem" }}>
                    적용 단가: PT {formatRateAmount(trainerSummaryRow.ptRatePerSession)} / GX {formatRateAmount(trainerSummaryRow.gxRatePerSession)}
                  </Text>
                </Flex>
              )}

              {trainerSummaryRow?.hasRateWarning && trainerSummaryRow.rateWarningMessage && (
                <Alert type="warning" showIcon message={trainerSummaryRow.rateWarningMessage} />
              )}

              <Alert
                type="info"
                showIcon
                message="조회 결과는 저장되지 않으며, 운영자 화면의 정산 작업 패널과는 별개입니다."
              />
            </Flex>
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}

function SettlementsManagerView() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const dashboardBaseDate = todayLocalDate();
  const [activeTab, setActiveTab] = useState<SettlementTabKey>(DEFAULT_SETTLEMENT_TAB);
  const {
    trainerOptions,
    trainerOptionsLoading,
    trainerOptionsError
  } = useTrainerOptionsQuery();
  const {
    settlementFilters,
    setSettlementFilters,
    settlementPanelMessage,
    setSettlementPanelMessage,
    settlementPanelError,
    setSettlementPanelError,
    clearSettlementFeedback,
    resetSettlementWorkspace
  } = useSettlementPrototypeState();

  const {
    settlementReport,
    settlementReportLoading,
    settlementReportError,
    settlementReportMessage,
    refetchSettlementReport
  } = useSettlementReportQuery(settlementFilters);

  const {
    salesDashboard,
    salesDashboardLoading,
    salesDashboardError,
    refetchSalesDashboard
  } = useSalesDashboardQuery({
    baseDate: dashboardBaseDate,
    expiringWithinDays: 7
  });

  const {
    recentAdjustments,
    recentAdjustmentsLoading,
    recentAdjustmentsError,
    refetchRecentAdjustments
  } = useSettlementRecentAdjustmentsQuery(settlementFilters, 5);
  const trainerSettlementBaseDate = settlementFilters.endDate || todayLocalDate();
  const {
    trainerSettlementFilters,
    setTrainerSettlementFilters,
    submittedTrainerSettlementQuery,
    trainerSettlementPanelMessage,
    setTrainerSettlementPanelMessage,
    trainerSettlementPanelError,
    setTrainerSettlementPanelError,
    clearTrainerSettlementFeedback,
    submitTrainerSettlementFilters,
    applyTrainerSettlementPreset,
    activeSettlement,
    syncCreatedSettlement,
    markSettlementConfirmed,
    resetTrainerSettlementWorkspace
  } = useTrainerSettlementWorkspaceState(trainerSettlementBaseDate);
  const {
    trainerSettlementPreview,
    trainerSettlementPreviewLoading,
    trainerSettlementPreviewError,
    trainerSettlementPreviewMessage,
    refetchTrainerSettlementPreview
  } = useTrainerSettlementPreviewQuery("manager", submittedTrainerSettlementQuery);
  const [salesReportDownloading, setSalesReportDownloading] = useState(false);
  const [trainerSettlementCreating, setTrainerSettlementCreating] = useState(false);
  const [trainerSettlementConfirming, setTrainerSettlementConfirming] = useState(false);
  const [trainerSettlementDownloading, setTrainerSettlementDownloading] = useState(false);

  const rowsPagination = usePagination(settlementReport?.rows ?? [], {
    initialPageSize: 10,
    resetDeps: [
      settlementReport?.rows.length ?? 0,
      settlementFilters.startDate,
      settlementFilters.endDate,
      settlementFilters.paymentMethod,
      settlementFilters.productKeyword,
      settlementFilters.trendGranularity
    ]
  });

  useEffect(() => {
    if (settlementReportMessage) {
      setSettlementPanelMessage(settlementReportMessage);
    }
  }, [setSettlementPanelMessage, settlementReportMessage]);

  useEffect(() => {
    setSettlementPanelError(settlementReportError ?? salesDashboardError ?? recentAdjustmentsError);
  }, [recentAdjustmentsError, salesDashboardError, settlementReportError, setSettlementPanelError]);

  useEffect(() => {
    if (trainerSettlementPreviewMessage) {
      setTrainerSettlementPanelMessage(trainerSettlementPreviewMessage);
    }
  }, [setTrainerSettlementPanelMessage, trainerSettlementPreviewMessage]);

  useEffect(() => {
    setTrainerSettlementPanelError(trainerSettlementPreviewError);
  }, [setTrainerSettlementPanelError, trainerSettlementPreviewError]);

  const reloadAll = useCallback(async () => {
    clearSettlementFeedback();
    clearTrainerSettlementFeedback();
    await Promise.all([
      refetchSalesDashboard(),
      refetchSettlementReport(),
      refetchRecentAdjustments(),
      submittedTrainerSettlementQuery ? refetchTrainerSettlementPreview() : Promise.resolve()
    ]);
  }, [
    clearSettlementFeedback,
    clearTrainerSettlementFeedback,
    refetchRecentAdjustments,
    refetchSalesDashboard,
    refetchSettlementReport,
    refetchTrainerSettlementPreview,
    submittedTrainerSettlementQuery
  ]);

  const reportRows = settlementReport?.rows ?? [];
  const totalTransactionCount = reportRows.reduce((acc, row) => acc + row.transactionCount, 0);
  const trendPoints = settlementReport?.trend ?? [];
  const settlementSalesTrendChartData = useMemo(
    () => buildSettlementSalesTrendChartData(trendPoints),
    [trendPoints]
  );
  const latestTrendPoint = trendPoints[trendPoints.length - 1];
  const previousTrendPoint = trendPoints.length > 1 ? trendPoints[trendPoints.length - 2] : undefined;

  const reportColumns: ColumnsType<SettlementReportRow> = [
    {
      title: "상품 / 분류",
      key: "product",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: "0.95rem" }}>{row.productName}</Text>
          <Text type="secondary" style={{ fontSize: "0.75rem" }}>
            {row.transactionCount}건 거래
          </Text>
        </Space>
      )
    },
    {
      title: "결제 수단",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (paymentMethod: SettlementPaymentMethod) => (
        <Tag color="cyan">{paymentMethodLabel[paymentMethod] || paymentMethod}</Tag>
      )
    },
    {
      title: "총매출",
      key: "grossSales",
      align: "right",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: "0.9rem" }}>{formatCurrency(row.grossSales)}</Text>
          {row.refundAmount > 0 && (
            <Text type="danger" style={{ fontSize: "0.72rem" }}>
              -{formatCurrency(row.refundAmount)} 환불
            </Text>
          )}
        </Space>
      )
    },
    {
      title: "순매출",
      dataIndex: "netSales",
      key: "netSales",
      align: "right",
      render: (netSales: number) => (
        <Text strong style={{ color: token.colorSuccess, fontSize: "1rem" }}>
          {formatCurrency(netSales)}
        </Text>
      )
    }
  ];

  const recentAdjustmentColumns: ColumnsType<RecentAdjustmentRow> = [
    {
      title: "조정 유형",
      dataIndex: "adjustmentType",
      key: "adjustmentType",
      render: (adjustmentType: SettlementAdjustmentType) => (
        <Tag color={adjustmentTypeMeta[adjustmentType].color}>{adjustmentTypeMeta[adjustmentType].label}</Tag>
      )
    },
    {
      title: "회원 / 상품",
      key: "subject",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{row.memberName}</Text>
          <Text type="secondary" style={{ fontSize: "0.78rem" }}>{row.productName}</Text>
        </Space>
      )
    },
    {
      title: "금액",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (amount: number) => <Text>{formatCurrency(amount)}</Text>
    },
    {
      title: "발생 시각",
      dataIndex: "paidAt",
      key: "paidAt",
      render: (paidAt: string) => <Text type="secondary">{formatCompactDateTime(paidAt)}</Text>
    }
  ];

  const trainerSettlementPreviewColumns: ColumnsType<TrainerSettlementPreviewRow> = [
    {
      title: "트레이너",
      key: "trainerName",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{row.trainerName}</Text>
          <Text type="secondary" style={{ fontSize: "0.76rem" }}>
            USER #{row.trainerUserId}
          </Text>
        </Space>
      )
    },
    {
      title: "완료 / 전체",
      key: "sessionSummary",
      align: "right",
      render: (_, row) => `${row.completedSessions} / ${row.totalSessions}`
    },
    {
      title: "PT / GX",
      key: "lessonSplit",
      align: "right",
      render: (_, row) => `${row.ptSessions} / ${row.gxSessions}`
    },
    {
      title: "PT 단가",
      key: "ptRatePerSession",
      align: "right",
      render: (_, row) => formatRateAmount(row.ptRatePerSession)
    },
    {
      title: "GX 단가",
      key: "gxRatePerSession",
      align: "right",
      render: (_, row) => formatRateAmount(row.gxRatePerSession)
    },
    {
      title: "예상 정산 금액",
      key: "totalAmount",
      align: "right",
      render: (_, row) => row.totalAmount == null ? "단가 확인 필요" : formatCurrency(row.totalAmount)
    },
    {
      title: "경고",
      key: "warning",
      render: (_, row) => row.hasRateWarning ? <Tag color="warning">단가 확인 필요</Tag> : <Tag color="success">생성 가능</Tag>
    }
  ];

  const trainerSettlementIntro = "월 기준 preview와 실제 정산 작업을 분리합니다. 먼저 정산 월을 조회하고, 검토가 끝난 뒤에만 DRAFT 생성과 확정을 진행합니다.";
  const trainerSelectOptions = useMemo(
    () => buildTrainerSettlementScopeOptions(trainerOptions),
    [trainerOptions]
  );

  const dashboardStats = useMemo(() => createDashboardStats(salesDashboard, token), [salesDashboard, token]);

  const submitTrainerSettlementQuery = useCallback(async () => {
    const nextQuery = submitTrainerSettlementFilters();
    if (!nextQuery) {
      return;
    }
    if (
      submittedTrainerSettlementQuery &&
      submittedTrainerSettlementQuery.trainerId === nextQuery.trainerId &&
      submittedTrainerSettlementQuery.settlementMonth === nextQuery.settlementMonth
    ) {
      await refetchTrainerSettlementPreview();
    }
  }, [refetchTrainerSettlementPreview, submitTrainerSettlementFilters, submittedTrainerSettlementQuery]);

  const handleTrainerSettlementCreate = useCallback(async () => {
    if (!submittedTrainerSettlementQuery || !trainerSettlementPreview) {
      setTrainerSettlementPanelError("정산 월과 대상을 선택한 뒤 먼저 미리보기를 조회해 주세요.");
      return;
    }
    if (!trainerSettlementPreview.conflict.createAllowed) {
      setTrainerSettlementPanelError("현재 preview 상태에서는 정산 초안을 생성할 수 없습니다.");
      return;
    }

    clearTrainerSettlementFeedback();
    setTrainerSettlementCreating(true);
    try {
      const result = isMockApiMode()
        ? await import("../../api/mockData").then(({ createMockTrainerSettlementCreate }) =>
            createMockTrainerSettlementCreate(submittedTrainerSettlementQuery)
          )
        : await apiPost<TrainerSettlementWorkspace>("/api/v1/settlements", submittedTrainerSettlementQuery);

      if ("ok" in (result as Record<string, unknown>) && !(result as { ok: boolean }).ok) {
        setTrainerSettlementPanelError((result as { message?: string }).message ?? "정산 초안 생성에 실패했습니다.");
        return;
      }

      const workspace = toTrainerSettlementWorkspace((result as { data: TrainerSettlementWorkspace }).data);
      syncCreatedSettlement(workspace);
      setTrainerSettlementPanelMessage((result as { message?: string }).message ?? "정산 초안을 생성했습니다.");
    } catch (error) {
      setTrainerSettlementPanelError(toUserFacingErrorMessage(error, "정산 초안 생성에 실패했습니다."));
    } finally {
      setTrainerSettlementCreating(false);
    }
  }, [
    clearTrainerSettlementFeedback,
    setTrainerSettlementPanelError,
    setTrainerSettlementPanelMessage,
    submittedTrainerSettlementQuery,
    syncCreatedSettlement,
    trainerSettlementPreview
  ]);

  const handleTrainerSettlementConfirm = useCallback(async () => {
    if (!activeSettlement) {
      setTrainerSettlementPanelError("먼저 생성된 정산 초안을 선택해야 합니다.");
      return;
    }
    if (activeSettlement.status === "CONFIRMED") {
      setTrainerSettlementPanelError("이미 확정된 정산입니다.");
      return;
    }

    clearTrainerSettlementFeedback();
    setTrainerSettlementConfirming(true);
    try {
      const result = isMockApiMode()
        ? await import("../../api/mockData").then(({ confirmMockTrainerSettlement }) =>
            confirmMockTrainerSettlement(activeSettlement.settlementId)
          )
        : await apiPost<{ settlementId: number; status: string; confirmedAt: string }>(
            `/api/v1/settlements/${activeSettlement.settlementId}/confirm`
          );

      if ("ok" in (result as Record<string, unknown>) && !(result as { ok: boolean }).ok) {
        setTrainerSettlementPanelError((result as { message?: string }).message ?? "정산 확정에 실패했습니다.");
        return;
      }

      const confirmedAt = (result as { data: { confirmedAt: string } }).data.confirmedAt;
      markSettlementConfirmed(confirmedAt);
      setTrainerSettlementPanelMessage((result as { message?: string }).message ?? "정산을 확정했습니다.");
      await refetchTrainerSettlementPreview();
    } catch (error) {
      setTrainerSettlementPanelError(toUserFacingErrorMessage(error, "정산 확정에 실패했습니다."));
    } finally {
      setTrainerSettlementConfirming(false);
    }
  }, [
    activeSettlement,
    clearTrainerSettlementFeedback,
    markSettlementConfirmed,
    refetchTrainerSettlementPreview,
    setTrainerSettlementPanelError,
    setTrainerSettlementPanelMessage
  ]);

  const handleTrainerSettlementDocumentDownload = useCallback(async () => {
    if (!activeSettlement || activeSettlement.status !== "CONFIRMED") {
      setTrainerSettlementPanelError("확정된 정산만 출력할 수 있습니다.");
      return;
    }

    clearTrainerSettlementFeedback();
    setTrainerSettlementDownloading(true);
    try {
      if (activeSettlement.trainer.trainerId !== "ALL") {
        if (isMockApiMode()) {
          const result = await import("../../api/mockData").then(({ downloadMockCanonicalTrainerSettlementDocument }) =>
            downloadMockCanonicalTrainerSettlementDocument(activeSettlement.settlementId, activeSettlement.trainer.trainerId)
          );
          if (!result.ok || result.content == null || result.fileName == null) {
            setTrainerSettlementPanelError(result.message ?? "정산서 출력에 실패했습니다.");
            return;
          }
          triggerBrowserDownload(new Blob([result.content], { type: "application/pdf" }), result.fileName);
        } else {
          const result = await apiDownload(
            `/api/v1/settlements/${activeSettlement.settlementId}/trainers/${activeSettlement.trainer.trainerId}/document`
          );
          triggerBrowserDownload(
            result.blob,
            result.filename ?? `settlement-${activeSettlement.settlementId}-trainer-${activeSettlement.trainer.trainerId}.pdf`
          );
        }
      } else {
        const fullMonthStart = startOfMonthLocalDate(activeSettlement.period.start);
        const fullMonthEnd = `${activeSettlement.period.start.slice(0, 8)}${new Date(
          Number(activeSettlement.period.start.slice(0, 4)),
          Number(activeSettlement.period.start.slice(5, 7)),
          0
        ).getDate().toString().padStart(2, "0")}`;
        if (activeSettlement.period.start !== fullMonthStart || activeSettlement.period.end !== fullMonthEnd) {
          setTrainerSettlementPanelError("전체 트레이너 정산서는 현재 월 전체 기간에서만 출력할 수 있습니다.");
          return;
        }
        if (isMockApiMode()) {
          const result = await import("../../api/mockData").then(({ downloadMockTrainerSettlementDocument }) =>
            downloadMockTrainerSettlementDocument(activeSettlement.period.start.slice(0, 7))
          );
          if (!result.ok || result.content == null || result.fileName == null) {
            setTrainerSettlementPanelError(result.message ?? "정산서 출력에 실패했습니다.");
            return;
          }
          triggerBrowserDownload(new Blob([result.content], { type: "application/pdf" }), result.fileName);
        } else {
          const result = await apiDownload(
            `/api/v1/settlements/trainer-payroll/document?settlementMonth=${activeSettlement.period.start.slice(0, 7)}`
          );
          triggerBrowserDownload(result.blob, result.filename ?? `trainer-settlement-${activeSettlement.period.start.slice(0, 7)}.pdf`);
        }
      }
      setTrainerSettlementPanelMessage("PDF 정산서 다운로드를 시작했습니다.");
    } catch (error) {
      setTrainerSettlementPanelError(toUserFacingErrorMessage(error, "정산서 출력에 실패했습니다."));
    } finally {
      setTrainerSettlementDownloading(false);
    }
  }, [
    activeSettlement,
    clearTrainerSettlementFeedback,
    setTrainerSettlementPanelError,
    setTrainerSettlementPanelMessage
  ]);

  const handleSalesReportDownload = useCallback(async () => {
    clearSettlementFeedback();
    setSalesReportDownloading(true);
    try {
      if (isMockApiMode()) {
        const result = await import("../../api/mockData").then(({ downloadMockSalesSettlementReport }) =>
          downloadMockSalesSettlementReport(settlementFilters)
        );
        if (!result.ok || result.content == null || result.fileName == null) {
          setSettlementPanelError("매출 리포트 다운로드에 실패했습니다.");
          return;
        }
        triggerBrowserDownload(
          new Blob([result.content], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          }),
          result.fileName
        );
      } else {
        const query = new URLSearchParams({
          startDate: settlementFilters.startDate,
          endDate: settlementFilters.endDate,
          trendGranularity: settlementFilters.trendGranularity
        });
        if (settlementFilters.paymentMethod) {
          query.set("paymentMethod", settlementFilters.paymentMethod);
        }
        if (settlementFilters.productKeyword) {
          query.set("productKeyword", settlementFilters.productKeyword);
        }
        const result = await apiDownload(`/api/v1/settlements/sales-report/export?${query.toString()}`);
        triggerBrowserDownload(
          result.blob,
          result.filename ?? `sales-report-${settlementFilters.startDate}-to-${settlementFilters.endDate}.xlsx`
        );
      }
      setSettlementPanelMessage("Excel 리포트 다운로드를 시작했습니다.");
    } catch (error) {
      setSettlementPanelError(toUserFacingErrorMessage(error, "매출 리포트 다운로드에 실패했습니다."));
    } finally {
      setSalesReportDownloading(false);
    }
  }, [
    clearSettlementFeedback,
    settlementFilters,
    setSettlementPanelError,
    setSettlementPanelMessage
  ]);

  const tabItems = settlementTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    children: tab.key === "salesAnalytics" ? (
      <Flex vertical gap={24}>
        <Row gutter={[16, 16]}>
          {dashboardStats.map((stat) => (
            <Col xs={12} lg={Math.floor(24 / dashboardStats.length)} key={stat.label}>
              <Card loading={salesDashboardLoading}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase" }}>{stat.label}</Text>}
                  value={stat.value}
                  valueStyle={{ fontWeight: 800, color: stat.color }}
                  prefix={stat.icon}
                  suffix={<Text type="secondary" style={{ fontSize: "0.73rem", display: "block" }}>{stat.hint}</Text>}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[24, 24]}>
          <Col xs={24} xl={8}>
            <Card
              title={
                <Space direction="vertical" size={2}>
                  <Title level={5} style={{ margin: 0 }}>운영 방향성</Title>
                  <Text type="secondary" style={{ fontSize: "0.84rem" }}>최근 추이에서 현재 흐름을 빠르게 읽습니다.</Text>
                </Space>
              }
              loading={settlementReportLoading}
            >
              <Flex vertical gap={12}>
                <div className={styles.trendHero}>
                  <Text type="secondary">현재 버킷</Text>
                  <Title level={3} style={{ margin: 0 }}>{formatTrendHint(latestTrendPoint)}</Title>
                  <Text type="secondary">
                    직전 버킷 {previousTrendPoint ? formatTrendHint(previousTrendPoint) : "비교 데이터 없음"}
                  </Text>
                  <Text type="secondary" style={{ fontSize: "0.82rem" }}>
                    차트와 표에서 최근 흐름을 함께 확인합니다.
                  </Text>
                </div>
              </Flex>
            </Card>
          </Col>

          <Col xs={24} xl={16}>
            <Card
              title={
                <Space direction="vertical" size={2}>
                  <Title level={5} style={{ margin: 0 }}><FileSearchOutlined /> 리포트 조건</Title>
                  <Text type="secondary" style={{ fontSize: "0.84rem" }}>조회 기간과 분석 단위를 조정합니다.</Text>
                </Space>
              }
              extra={
                <Button icon={<ReloadOutlined />} onClick={resetSettlementWorkspace}>
                  필터 초기화
                </Button>
              }
            >
              <Form layout="vertical" onFinish={() => void reloadAll()}>
                <div className={styles.formGrid}>
                  <Form.Item label="시작일" className={styles.formItem}>
                    <DatePicker
                      className={styles.fullWidth}
                      value={settlementFilters.startDate ? dayjs(settlementFilters.startDate) : null}
                      onChange={(date) => {
                        setSettlementFilters((prev) => ({
                          ...prev,
                          startDate: date ? date.format("YYYY-MM-DD") : ""
                        }));
                      }}
                    />
                  </Form.Item>
                  <Form.Item label="종료일" className={styles.formItem}>
                    <DatePicker
                      className={styles.fullWidth}
                      value={settlementFilters.endDate ? dayjs(settlementFilters.endDate) : null}
                      onChange={(date) => {
                        setSettlementFilters((prev) => ({
                          ...prev,
                          endDate: date ? date.format("YYYY-MM-DD") : ""
                        }));
                      }}
                    />
                  </Form.Item>
                  <Form.Item label="결제 수단" className={styles.formItem}>
                    <Select
                      value={settlementFilters.paymentMethod}
                      onChange={(value) => {
                        setSettlementFilters((prev) => ({
                          ...prev,
                          paymentMethod: value as SettlementPaymentMethod
                        }));
                      }}
                      options={[
                        { label: "전체 결제 수단", value: "" },
                        { label: "현금", value: "CASH" },
                        { label: "카드", value: "CARD" },
                        { label: "계좌이체", value: "TRANSFER" },
                        { label: "기타", value: "ETC" }
                      ]}
                    />
                  </Form.Item>
                  <Form.Item label="추이 단위" className={styles.formItem}>
                    <Select
                      value={settlementFilters.trendGranularity}
                      onChange={(value) => {
                        setSettlementFilters((prev) => ({
                          ...prev,
                          trendGranularity: value
                        }));
                      }}
                      options={[
                        { label: "일별", value: "DAILY" },
                        { label: "주별", value: "WEEKLY" },
                        { label: "월별", value: "MONTHLY" },
                        { label: "연도별", value: "YEARLY" }
                      ]}
                    />
                  </Form.Item>
                </div>

                <Form.Item label="상품 검색">
                  <Input
                    value={settlementFilters.productKeyword}
                    onChange={(event) => {
                      setSettlementFilters((prev) => ({
                        ...prev,
                        productKeyword: event.target.value
                      }));
                    }}
                    placeholder="상품명 키워드"
                  />
                </Form.Item>

                <Button type="primary" block size="large" htmlType="submit" loading={settlementReportLoading}>
                  매출 분석 새로 조회
                </Button>
              </Form>

              <Flex vertical gap={8} style={{ marginTop: 24 }}>
                {settlementPanelMessage && <Alert type="success" showIcon message={settlementPanelMessage} closable />}
                {settlementPanelError && <Alert type="error" showIcon message={settlementPanelError} closable />}
              </Flex>
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          <Col xs={24} xl={15}>
            <Card
              title={
                <Space direction="vertical" size={2}>
                  <Title level={5} style={{ margin: 0 }}>기간 추이 리포트</Title>
                  <Text type="secondary" style={{ fontSize: "0.84rem" }}>
                    {settlementFilters.trendGranularity === "DAILY" ? "일" : settlementFilters.trendGranularity === "WEEKLY" ? "주" : settlementFilters.trendGranularity === "MONTHLY" ? "월" : "연"} 단위 흐름과 상품별 집계를 함께 봅니다.
                  </Text>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  onClick={() => void handleSalesReportDownload()}
                  loading={salesReportDownloading}
                >
                  Excel 다운로드
                </Button>
              }
            >
              <Row gutter={[12, 12]} className={styles.statsGridCompact}>
                {[
                  { label: "순매출", value: formatCurrency(settlementReport?.totalNetSales ?? 0), color: token.colorSuccess },
                  { label: "총 매출", value: formatCurrency(settlementReport?.totalGrossSales ?? 0) },
                  { label: "총 환불", value: formatCurrency(settlementReport?.totalRefundAmount ?? 0), color: token.colorError },
                  { label: "거래 건수", value: totalTransactionCount }
                ].map((stat) => (
                  <Col xs={12} md={6} key={stat.label}>
                    <Card size="small">
                      <Statistic
                        title={stat.label}
                        value={stat.value}
                        valueStyle={{ fontSize: "1rem", fontWeight: 700, color: stat.color }}
                      />
                    </Card>
                  </Col>
                  ))}
              </Row>

              <div style={{ marginTop: 16 }}>
                <SettlementSalesTrendChart
                  chartData={settlementSalesTrendChartData}
                  loading={settlementReportLoading}
                />
              </div>

              <div className={styles.trendTableWrap}>
                <Table
                  rowKey={(row) => row.bucketStartDate}
                  size="small"
                  pagination={false}
                  loading={settlementReportLoading}
                  dataSource={trendPoints}
                  columns={[
                    { title: "버킷", dataIndex: "bucketLabel", key: "bucketLabel" },
                    { title: "총매출", dataIndex: "grossSales", key: "grossSales", align: "right", render: (value: number) => formatCurrency(value) },
                    { title: "환불", dataIndex: "refundAmount", key: "refundAmount", align: "right", render: (value: number) => formatCurrency(value) },
                    { title: "순매출", dataIndex: "netSales", key: "netSales", align: "right", render: (value: number) => <Text strong>{formatCurrency(value)}</Text> },
                    { title: "거래 수", dataIndex: "transactionCount", key: "transactionCount", align: "right" }
                  ]}
                  locale={{
                    emptyText: settlementReportLoading ? "추이 데이터를 집계하고 있습니다..." : "표시할 추이 데이터가 없습니다."
                  }}
                />
              </div>

              <div className={styles.reportTableWrap}>
                <Table
                  rowKey={(row) => `${row.productName}-${row.paymentMethod}`}
                  loading={settlementReportLoading}
                  columns={reportColumns}
                  dataSource={rowsPagination.pagedItems}
                  pagination={{
                    current: rowsPagination.page,
                    pageSize: rowsPagination.pageSize,
                    total: rowsPagination.totalItems,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50"],
                    onChange: (page, pageSize) => {
                      rowsPagination.setPage(page);
                      rowsPagination.setPageSize(pageSize);
                    }
                  }}
                  locale={{
                    emptyText: settlementReportLoading
                      ? "거래 데이터를 집계하고 있습니다..."
                      : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="집계된 거래 데이터가 없습니다." />
                  }}
                  scroll={{ x: 600 }}
                />
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={9}>
            <Card
              title={
                <Space direction="vertical" size={2}>
                  <Title level={5} style={{ margin: 0 }}>최근 환불</Title>
                  <Text type="secondary" style={{ fontSize: "0.84rem" }}>선택 조건 안에서 숫자 변화의 원인을 최근 환불 기준으로 확인합니다.</Text>
                </Space>
              }
            >
              <Table
                rowKey={(row) => row.paymentId}
                loading={recentAdjustmentsLoading}
                pagination={false}
                size="small"
                columns={recentAdjustmentColumns}
                dataSource={recentAdjustments}
                locale={{
                  emptyText: recentAdjustmentsLoading
                    ? "최근 조정 목록을 불러오는 중입니다..."
                    : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="최근 환불 내역이 없습니다." />
                }}
              />
            </Card>
          </Col>
        </Row>
      </Flex>
    ) : (
      <Card>
        <Flex vertical gap={24}>
          <Space direction="vertical" size={4}>
            <Title level={4} style={{ margin: 0 }}>트레이너 정산</Title>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              {trainerSettlementIntro}
            </Paragraph>
          </Space>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card size="small" title="월 조회 패널">
                <Form layout="vertical" onFinish={() => void submitTrainerSettlementQuery()}>
                  <Flex vertical gap={12}>
                    <Form.Item label="정산 범위">
                      <Select
                        value={trainerSettlementFilters.trainerId}
                        loading={trainerOptionsLoading}
                        onChange={(value) => {
                          setTrainerSettlementFilters((prev) => ({
                            ...prev,
                            trainerId: value as TrainerSettlementScope
                          }));
                        }}
                        options={trainerSelectOptions}
                      />
                    </Form.Item>
                    <Form.Item label="정산 월">
                      <DatePicker
                        picker="month"
                        className={styles.fullWidth}
                        value={trainerSettlementFilters.settlementMonth ? dayjs(trainerSettlementFilters.settlementMonth, "YYYY-MM") : null}
                        onChange={(date) => {
                          setTrainerSettlementFilters((prev) => ({
                            ...prev,
                            settlementMonth: date ? date.format("YYYY-MM") : ""
                          }));
                        }}
                      />
                    </Form.Item>
                    <Space wrap>
                      <Button onClick={() => applyTrainerSettlementPreset("thisMonth")}>이번 달</Button>
                      <Button onClick={() => applyTrainerSettlementPreset("lastMonth")}>지난달</Button>
                    </Space>
                    <Space>
                      <Button htmlType="submit" type="primary" loading={trainerSettlementPreviewLoading}>
                        preview 조회
                      </Button>
                      <Button onClick={resetTrainerSettlementWorkspace}>
                        기준 초기화
                      </Button>
                    </Space>
                  </Flex>
                </Form>
                <Flex vertical gap={8} style={{ marginTop: 16 }}>
                  {trainerSettlementPanelMessage && <Alert type="success" showIcon message={trainerSettlementPanelMessage} closable />}
                  {trainerSettlementPanelError && <Alert type="error" showIcon message={trainerSettlementPanelError} closable />}
                  {trainerOptionsError && <Alert type="warning" showIcon message={trainerOptionsError} closable />}
                  <Alert type="info" showIcon message="조회는 저장되지 않습니다. 생성된 정산 작업은 오른쪽 패널에서 별도로 관리합니다." />
                </Flex>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card
                size="small"
                title="정산 작업 패널"
                extra={
                  <Space>
                    <Button
                      onClick={() => void handleTrainerSettlementCreate()}
                      loading={trainerSettlementCreating}
                      disabled={!trainerSettlementPreview || !trainerSettlementPreview.conflict.createAllowed}
                    >
                      정산 초안 생성
                    </Button>
                    <Button
                      onClick={() => void handleTrainerSettlementConfirm()}
                      loading={trainerSettlementConfirming}
                      disabled={!activeSettlement || activeSettlement.status === "CONFIRMED"}
                    >
                      정산 확정
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => void handleTrainerSettlementDocumentDownload()}
                      loading={trainerSettlementDownloading}
                      disabled={!activeSettlement || activeSettlement.status !== "CONFIRMED"}
                    >
                      정산서 출력
                    </Button>
                  </Space>
                }
              >
                <Flex vertical gap={16}>
                  <Row gutter={[12, 12]} className={styles.statsGridCompact}>
                    {[
                      {
                        label: "현재 정산 월",
                        value: trainerSettlementPreview?.settlementMonth ?? trainerSettlementFilters.settlementMonth
                      },
                      { label: "preview 완료 수업", value: trainerSettlementPreview?.summary.completedSessions ?? 0 },
                      {
                        label: "preview 총액",
                        value: trainerSettlementPreview?.summary.totalAmount != null
                          ? formatCurrency(trainerSettlementPreview.summary.totalAmount)
                          : "단가 확인 필요"
                      },
                      { label: "작업 상태", value: activeSettlement?.status === "CONFIRMED" ? "확정됨" : activeSettlement?.status === "DRAFT" ? "초안 생성됨" : "미생성" }
                    ].map((stat) => (
                      <Col xs={12} md={6} key={stat.label}>
                        <Card size="small">
                          <Statistic title={stat.label} value={stat.value} valueStyle={{ fontSize: "1rem", fontWeight: 700 }} />
                        </Card>
                      </Col>
                    ))}
                  </Row>

                  {trainerSettlementPreview?.conflict.hasConflict && (
                    <Alert
                      type="warning"
                      showIcon
                      message="이미 확정된 월 정산이 있어 새 초안을 생성하거나 확정할 수 없습니다."
                    />
                  )}

                  {trainerSettlementPreview?.summary.hasRateWarnings && (
                    <Alert
                      type="warning"
                      showIcon
                      message="저장된 트레이너 단가가 누락되었습니다. 트레이너 관리에서 PT/GX 단가를 설정하세요."
                      action={
                        <Button size="small" type="primary" onClick={() => navigate("/trainers")}>
                          트레이너 관리로 이동
                        </Button>
                      }
                    />
                  )}

                  {activeSettlement?.status === "CONFIRMED" && activeSettlement.confirmedAt && (
                    <Alert
                      type="info"
                      showIcon
                      message={`이 정산은 ${formatCompactDateTime(activeSettlement.confirmedAt)}에 확정되었습니다.`}
                    />
                  )}

                  {activeSettlement && (
                    <Alert
                      type={activeSettlement.status === "CONFIRMED" ? "success" : "info"}
                      showIcon
                      message={`${activeSettlement.trainer.name} · ${activeSettlement.period.start} ~ ${activeSettlement.period.end}`}
                      description={
                        activeSettlement.status === "CONFIRMED"
                          ? "이 작업은 저장된 canonical settlement입니다."
                          : "이 작업은 저장된 DRAFT settlement입니다. 정산 월을 바꾸면 preview와 분리되어 보입니다."
                      }
                    />
                  )}

                  <Table
                    rowKey={(row) => row.trainerUserId}
                    loading={trainerSettlementPreviewLoading}
                    columns={trainerSettlementPreviewColumns}
                    dataSource={trainerSettlementPreview?.rows ?? []}
                    pagination={false}
                    locale={{
                      emptyText: trainerSettlementPreviewLoading
                        ? "트레이너 정산 preview를 집계하고 있습니다..."
                        : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="선택한 정산 월에 표시할 수업 데이터가 없습니다." />
                    }}
                  />
                </Flex>
              </Card>
            </Col>
          </Row>
        </Flex>
      </Card>
    )
  }));

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="start" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text className={styles.eyebrow}>Settlement Console</Text>
            <Title level={2} className={styles.heroTitle}>정산 운영 센터</Title>
            <Paragraph type="secondary" className={styles.heroDescription}>
              운영 판단이 필요한 매출 분석과 월 기준 트레이너 정산 preview/workspace 흐름을 한 화면에서 다룹니다.
            </Paragraph>
            <Space wrap className="mt-xs">
              <Tag color="blue">매출 분석</Tag>
              <Tag color="cyan">운영 상황판</Tag>
              <Tag color="purple">트레이너 정산</Tag>
            </Space>
          </Space>
          <Button icon={<ReloadOutlined />} size="large" onClick={() => void reloadAll()}>
            전체 동기화
          </Button>
        </Flex>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as SettlementTabKey)}
        items={tabItems}
      />
    </Flex>
  );
}

export default function SettlementsPage() {
  const { authUser } = useAuthState();

  if (hasRole(authUser, "ROLE_TRAINER")) {
    return <TrainerSettlementsMiniView />;
  }

  return <SettlementsManagerView />;
}
