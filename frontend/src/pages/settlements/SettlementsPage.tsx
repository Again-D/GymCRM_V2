import { useCallback, useEffect } from "react";
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
  Tag,
  Typography,
  theme
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { 
  FileSearchOutlined, 
  BarChartOutlined, 
  DollarOutlined, 
  ReloadOutlined,
  DashboardOutlined 
} from "@ant-design/icons";
import dayjs from "dayjs";

import { usePagination } from "../../shared/hooks/usePagination";
import { createDefaultSettlementFilters } from "./modules/types";
import { useSettlementPrototypeState } from "./modules/useSettlementPrototypeState";
import { useSettlementReportQuery } from "./modules/useSettlementReportQuery";

const { Paragraph, Text, Title } = Typography;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

const paymentMethodLabel: Record<string, string> = {
  CASH: "현금",
  CARD: "카드",
  TRANSFER: "계좌이체",
  ETC: "기타"
};

export default function SettlementsPage() {
  const { token } = theme.useToken();
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
    loadSettlementReport,
    resetSettlementReportQuery
  } = useSettlementReportQuery({
    getDefaultFilters: createDefaultSettlementFilters
  });

  const rowsPagination = usePagination(settlementReport?.rows ?? [], {
    initialPageSize: 10,
    resetDeps: [
      settlementReport?.rows.length ?? 0,
      settlementFilters.startDate,
      settlementFilters.endDate,
      settlementFilters.paymentMethod,
      settlementFilters.productKeyword
    ]
  });

  useEffect(() => {
    void loadSettlementReport(settlementFilters);
    return () => {
      resetSettlementReportQuery();
    };
  }, [loadSettlementReport, resetSettlementReportQuery, settlementFilters]);

  useEffect(() => {
    if (settlementReportMessage) {
      setSettlementPanelMessage(settlementReportMessage);
    }
  }, [settlementReportMessage, setSettlementPanelMessage]);

  useEffect(() => {
    setSettlementPanelError(settlementReportError);
  }, [setSettlementPanelError, settlementReportError]);

  const reloadReport = useCallback(async (filters = settlementFilters) => {
    clearSettlementFeedback();
    await loadSettlementReport(filters);
  }, [clearSettlementFeedback, loadSettlementReport, settlementFilters]);

  const rows = settlementReport?.rows ?? [];
  const totalTransactionCount = rows.reduce((acc, row) => acc + row.transactionCount, 0);

  const reportColumns: ColumnsType<(typeof rows)[number]> = [
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
      render: (paymentMethod) => (
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
      render: (netSales) => (
        <Text strong style={{ color: token.colorSuccess, fontSize: "1rem" }}>
          {formatCurrency(netSales)}
        </Text>
      )
    }
  ];

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="start" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1677ff" }}>
              Settlement Console
            </Text>
            <Title level={2} style={{ margin: 0 }}>
              정산 리포트
            </Title>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
              매출, 환불, 결제 수단별 집계를 빠르게 확인할 수 있는 정산 작업 화면입니다.
            </Paragraph>
            <Space wrap className="mt-xs">
              <Tag color="blue">매출 집계</Tag>
              <Tag color="cyan">필터 기반 분석</Tag>
              <Tag color="purple">실시간 동기화</Tag>
            </Space>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            size="large"
            onClick={() => {
              resetSettlementWorkspace();
              const nextFilters = createDefaultSettlementFilters();
              void loadSettlementReport(nextFilters);
            }}
          >
            필터 초기화
          </Button>
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        {[
          { label: "총 매출", value: formatCurrency(settlementReport?.totalGrossSales ?? 0), hint: "환불 차감 전 합계", icon: <BarChartOutlined /> },
          { label: "총 환불", value: formatCurrency(settlementReport?.totalRefundAmount ?? 0), hint: "기간 내 환불 총액", color: token.colorError, icon: <ReloadOutlined /> },
          { label: "순 매출액", value: formatCurrency(settlementReport?.totalNetSales ?? 0), hint: "매출 실익 합계", color: token.colorSuccess, icon: <DollarOutlined /> },
          { label: "거래 건수", value: totalTransactionCount, hint: "집계된 거래 총수", icon: <DashboardOutlined /> }
        ].map((stat) => (
          <Col xs={12} sm={6} key={stat.label}>
            <Card>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>{stat.label}</Text>}
                value={stat.value}
                valueStyle={{ fontWeight: 800, color: stat.color }}
                prefix={stat.icon}
                suffix={<Text type="secondary" style={{ fontSize: "0.75rem", display: "block" }}>{stat.hint}</Text>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space direction="vertical" size={2}>
                <Title level={5} style={{ margin: 0 }}><FileSearchOutlined /> 리포트 조건</Title>
                <Text type="secondary" style={{ fontSize: "0.84rem" }}>조회 기간 및 대상을 설정합니다.</Text>
              </Space>
            }
          >
            <Form
              layout="vertical"
              onFinish={() => void reloadReport()}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="시작일">
                    <DatePicker
                      style={{ width: "100%" }}
                      value={settlementFilters.startDate ? dayjs(settlementFilters.startDate) : null}
                      onChange={(date) =>
                        setSettlementFilters((prev) => ({ ...prev, startDate: date ? date.format("YYYY-MM-DD") : "" }))
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="종료일">
                    <DatePicker
                      style={{ width: "100%" }}
                      value={settlementFilters.endDate ? dayjs(settlementFilters.endDate) : null}
                      onChange={(date) =>
                        setSettlementFilters((prev) => ({ ...prev, endDate: date ? date.format("YYYY-MM-DD") : "" }))
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item label="결제 수단">
                <Select
                  value={settlementFilters.paymentMethod}
                  onChange={(val) => setSettlementFilters(prev => ({ ...prev, paymentMethod: val as any }))}
                  options={[
                    { label: "전체 결제 수단", value: "" },
                    { label: "현금", value: "CASH" },
                    { label: "카드", value: "CARD" },
                    { label: "계좌이체", value: "TRANSFER" },
                    { label: "기타", value: "ETC" }
                  ]}
                />
              </Form.Item>
              
              <Form.Item label="상품 검색">
                <Input
                  value={settlementFilters.productKeyword}
                  onChange={(e) => setSettlementFilters(prev => ({ ...prev, productKeyword: e.target.value }))}
                  placeholder="상품명 키워드"
                />
              </Form.Item>

              <Button type="primary" block size="large" htmlType="submit" loading={settlementReportLoading}>
                리포트 조회 적용
              </Button>
            </Form>

            <Flex vertical gap={8} style={{ marginTop: 24 }}>
              {settlementPanelMessage && <Alert type="success" showIcon message={settlementPanelMessage} closable />}
              {settlementPanelError && <Alert type="error" showIcon message={settlementPanelError} closable />}
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space direction="vertical" size={2}>
                <Title level={5} style={{ margin: 0 }}>거래 집계 결과</Title>
                <Text type="secondary" style={{ fontSize: "0.84rem" }}>상품/결제수단별 총매출과 순매출 상세</Text>
              </Space>
            }
          >
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
                  ? "데이터를 집계하고 있습니다..."
                  : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="집계된 거래 데이터가 없습니다." />
              }}
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}
