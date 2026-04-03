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

import { usePagination } from "../../shared/hooks/usePagination";
import styles from "./SettlementsPage.module.css";
import { DEFAULT_SETTLEMENT_TAB, settlementTabs } from "./modules/settlementTabs";
import { useSalesDashboardQuery } from "./modules/useSalesDashboardQuery";
import { useSettlementPrototypeState } from "./modules/useSettlementPrototypeState";
import { useSettlementRecentAdjustmentsQuery } from "./modules/useSettlementRecentAdjustmentsQuery";
import { useSettlementReportQuery } from "./modules/useSettlementReportQuery";
import type {
  SalesDashboard,
  SettlementAdjustmentType,
  SettlementPaymentMethod,
  SettlementReportFilters,
  SettlementTabKey,
  SettlementTrendPoint
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

function formatTrendHint(point: SettlementTrendPoint | undefined) {
  if (!point) {
    return "데이터 없음";
  }
  return `${point.bucketLabel} · ${formatCurrency(point.netSales)}`;
}

const paymentMethodLabel: Record<string, string> = {
  CASH: "현금",
  CARD: "카드",
  TRANSFER: "계좌이체",
  ETC: "기타"
};

const adjustmentTypeMeta: Record<SettlementAdjustmentType, { label: string; color: string }> = {
  REFUND: { label: "환불", color: "error" },
  CANCELED: { label: "취소", color: "warning" }
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
      label: "환불/취소 신호",
      value: dashboard?.refundCount ?? 0,
      hint: "오늘 확인이 필요한 조정 건수",
      icon: <ReloadOutlined />,
      color: token.colorError
    }
  ];
}

export default function SettlementsPage() {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState<SettlementTabKey>(DEFAULT_SETTLEMENT_TAB);
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
    baseDate: settlementFilters.endDate,
    expiringWithinDays: 7
  });

  const {
    recentAdjustments,
    recentAdjustmentsLoading,
    recentAdjustmentsError,
    refetchRecentAdjustments
  } = useSettlementRecentAdjustmentsQuery(settlementFilters, 5);

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

  const reloadAll = useCallback(async () => {
    clearSettlementFeedback();
    await Promise.all([
      refetchSalesDashboard(),
      refetchSettlementReport(),
      refetchRecentAdjustments()
    ]);
  }, [clearSettlementFeedback, refetchRecentAdjustments, refetchSalesDashboard, refetchSettlementReport]);

  const reportRows = settlementReport?.rows ?? [];
  const totalTransactionCount = reportRows.reduce((acc, row) => acc + row.transactionCount, 0);
  const trendPoints = settlementReport?.trend ?? [];
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

  const dashboardStats = useMemo(() => createDashboardStats(salesDashboard, token), [salesDashboard, token]);

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
                </div>
                <div className={styles.trendList}>
                  {trendPoints.slice(-4).map((point) => (
                    <div key={point.bucketStartDate} className={styles.trendListItem}>
                      <Text strong>{point.bucketLabel}</Text>
                      <Text>{formatCurrency(point.netSales)}</Text>
                    </div>
                  ))}
                  {trendPoints.length === 0 && (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="표시할 추이 데이터가 없습니다." />
                  )}
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
                <Button icon={<ReloadOutlined />} onClick={() => {
                  resetSettlementWorkspace();
                  void reloadAll();
                }}>
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
                  <Title level={5} style={{ margin: 0 }}>최근 환불/취소</Title>
                  <Text type="secondary" style={{ fontSize: "0.84rem" }}>숫자 변화의 원인을 최근 건 기준으로 확인합니다.</Text>
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
                    : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="최근 환불/취소 내역이 없습니다." />
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
              월 선택, 세션 단가, 결과 테이블, 일괄 액션 구조를 먼저 준비했습니다. 이후 Unit 5부터 조회/확정/정산서 출력 흐름을 이어갑니다.
            </Paragraph>
          </Space>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card size="small" title="정산 기준">
                <Flex vertical gap={12}>
                  <Select
                    aria-label="정산 월 선택"
                    value={dayjs(settlementFilters.endDate).format("YYYY-MM")}
                    options={[{ label: dayjs(settlementFilters.endDate).format("YYYY년 MM월"), value: dayjs(settlementFilters.endDate).format("YYYY-MM") }]}
                  />
                  <Input aria-label="세션 단가 입력" placeholder="세션 단가를 입력할 예정입니다." disabled />
                </Flex>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card
                size="small"
                title="정산 결과"
                extra={
                  <Space>
                    <Button disabled>월 정산 확정</Button>
                    <Button type="primary" disabled>정산서 출력</Button>
                  </Space>
                }
              >
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="트레이너 정산 조회 기능은 다음 구현 단위에서 연결됩니다." />
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
              운영 판단이 필요한 매출 분석과 월 단위 트레이너 정산 준비 흐름을 한 화면에서 다룹니다.
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
