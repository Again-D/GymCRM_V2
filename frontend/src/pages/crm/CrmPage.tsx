import { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  InputNumber,
  Pagination,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, NotificationOutlined, PlayCircleOutlined } from "@ant-design/icons";

import { useAuthState } from "../../app/auth";
import { hasAnyRole } from "../../app/roles";
import { usePagination } from "../../shared/hooks/usePagination";
import { createDefaultCrmFilters } from "./modules/types";
import { useCrmHistoryQuery } from "./modules/useCrmHistoryQuery";
import { useCrmPrototypeState } from "./modules/useCrmPrototypeState";

const { Title, Text, Paragraph } = Typography;

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

const statusMap: Record<string, { label: string; color: string }> = {
  "SENT": { label: "발송 완료", color: "success" },
  "PENDING": { label: "대기 중", color: "processing" },
  "RETRY_WAIT": { label: "재시도 예정", color: "warning" },
  "DEAD": { label: "실패", color: "error" }
};

type CrmHistoryRow = {
  crmMessageEventId: number;
  memberId: number;
  eventType: string;
  sendStatus: string;
  attemptCount: number;
  lastErrorMessage: string | null;
  createdAt: string;
};

export default function CrmPage() {
  const { authUser, isMockMode } = useAuthState();
  const {
    crmFilters,
    setCrmFilters,
    crmTriggerDaysAhead,
    setCrmTriggerDaysAhead,
    crmTriggerSubmitting,
    crmProcessSubmitting,
    crmPanelMessage,
    crmPanelError,
    clearCrmFeedback,
    triggerCrmExpiryReminder,
    processCrmQueue
  } = useCrmPrototypeState();
  
  const {
    crmHistoryRows,
    crmHistoryLoading,
    crmHistoryError,
    refetchCrmHistory
  } = useCrmHistoryQuery(crmFilters);
  
  const isLiveCrmRoleSupported =
    isMockMode || hasAnyRole(authUser, ["ROLE_CENTER_ADMIN", "ROLE_DESK"]);

  const historyPagination = usePagination(crmHistoryRows, {
    initialPageSize: 10,
    resetDeps: [crmHistoryRows.length, crmFilters.sendStatus, crmFilters.limit]
  });

  const pendingCount = crmHistoryRows.filter((row) => row.sendStatus === "PENDING" || row.sendStatus === "RETRY_WAIT").length;
  const failedCount = crmHistoryRows.filter((row) => row.sendStatus === "DEAD").length;
  const sentCount = crmHistoryRows.filter((row) => row.sendStatus === "SENT").length;

  useEffect(() => {
    if (!isLiveCrmRoleSupported) {
      clearCrmFeedback();
      return;
    }
  }, [clearCrmFeedback, isLiveCrmRoleSupported]);

  async function runTrigger() {
    await triggerCrmExpiryReminder();
  }

  async function runProcess() {
    await processCrmQueue();
  }

  const columns: ColumnsType<CrmHistoryRow> = [
    {
      title: "대상 / 로그",
      key: "target",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: "0.84rem" }}>회원 #{record.memberId}</Text>
          <Text type="secondary" style={{ fontSize: "0.75rem" }}>로그 #{record.crmMessageEventId}</Text>
        </Space>
      )
    },
    {
      title: "이벤트",
      dataIndex: "eventType",
      key: "eventType",
      render: (type) => <Text strong style={{ fontSize: "0.84rem" }}>{type}</Text>
    },
    {
      title: "상태",
      dataIndex: "sendStatus",
      key: "sendStatus",
      render: (status) => {
        const config = statusMap[status as string] || { label: status as string, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: "시도 횟수",
      key: "attempt",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: "0.84rem" }}>{record.attemptCount} / 3 시도</Text>
          {record.lastErrorMessage && (
            <Text type="danger" style={{ fontSize: "0.75rem" }}>실패 사유는 운영 로그 확인</Text>
          )}
        </Space>
      )
    },
    {
      title: "기록 시각",
      dataIndex: "createdAt",
      key: "createdAt",
      align: "right",
      render: (time) => <Text type="secondary" style={{ fontSize: "0.84rem" }}>{formatDateTime(time)}</Text>
    }
  ];

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1677ff" }}>
              메시지 큐
            </Text>
            <Title level={2} style={{ margin: 0 }}>CRM 운영</Title>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
              만료 안내 대상자를 적재하고 메시지 발송 상태를 한 화면에서 점검할 수 있습니다.
            </Paragraph>
            <Space wrap>
              <Tag color="blue">큐 자동화</Tag>
              <Tag color="cyan">발송 감사</Tag>
              <Tag color="purple">권한 기반 제한</Tag>
            </Space>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            disabled={!isLiveCrmRoleSupported}
            onClick={() => {
              clearCrmFeedback();
              const nextFilters = createDefaultCrmFilters();
              setCrmFilters(nextFilters);
              void refetchCrmHistory();
            }}
          >
            로그 새로고침
          </Button>
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        {[
          { label: "전체 로그", value: crmHistoryRows.length, hint: "조회 조건 내 전체 이력" },
          { label: "대기 중인 큐", value: pendingCount, hint: "발송 대기 및 재시도", color: "#1677ff" },
          { label: "발송 성공", value: sentCount, hint: "최종 발송 완료", color: "#52c41a" },
          { label: "최종 실패", value: failedCount, hint: "DEAD 상태(수동 확인 필요)", color: "#ff4d4f" }
        ].map((stat) => (
          <Col xs={12} sm={6} key={stat.label}>
            <Card>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>{stat.label}</Text>}
                value={stat.value}
                valueStyle={{ fontWeight: 800, color: stat.color }}
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
                <Title level={5} style={{ margin: 0 }}>큐 자동화 제어</Title>
                <Text type="secondary" style={{ fontSize: "0.84rem" }}>만료 안내 기준 및 메시지 큐 실행</Text>
              </Space>
            }
          >
            <Flex vertical gap={16}>
              <Form layout="vertical">
                <Form.Item label={<Text strong style={{ fontSize: "0.84rem" }}>만료 안내 기준 (D-Day)</Text>}>
                  <Flex vertical gap={8}>
                    <InputNumber
                      min={0}
                      max={30}
                      style={{ width: "100%" }}
                      value={Number(crmTriggerDaysAhead)}
                      disabled={!isLiveCrmRoleSupported}
                      onChange={(val) => setCrmTriggerDaysAhead(String(val || 0))}
                      placeholder="일수 입력"
                    />
                    <Text type="secondary" style={{ fontSize: "0.75rem" }}>
                      입력한 일수만큼 만료가 남은 회원을 추출합니다.
                    </Text>
                  </Flex>
                </Form.Item>
                <Flex vertical gap={8}>
                  <Button
                    type="primary"
                    block
                    icon={<NotificationOutlined />}
                    onClick={() => void runTrigger()}
                    loading={crmTriggerSubmitting}
                    disabled={crmTriggerSubmitting || !isLiveCrmRoleSupported}
                  >
                    안내 대상 적재
                  </Button>
                  <Button
                    block
                    icon={<PlayCircleOutlined />}
                    onClick={() => void runProcess()}
                    loading={crmProcessSubmitting}
                    disabled={crmProcessSubmitting || !isLiveCrmRoleSupported}
                  >
                    메시지 큐 실행
                  </Button>
                </Flex>
              </Form>

              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: "0.84rem", display: "block", marginBottom: 12 }}>
                  운영 피드백 및 상태
                </Text>
                {!isLiveCrmRoleSupported && (
                  <Alert
                    message="운영 권한 제한"
                    description="현재 관리자 권한이 없어 CRM 발송 작업을 실행할 수 없습니다."
                    type="error"
                    showIcon
                  />
                )}
                {crmPanelMessage && <Alert message={crmPanelMessage} type="success" showIcon style={{ marginBottom: 8 }} />}
                {crmPanelError && <Alert message={crmPanelError} type="error" showIcon style={{ marginBottom: 8 }} />}
                {!crmPanelMessage && !crmPanelError && isLiveCrmRoleSupported && (
                  <Empty
                    description={<Text type="secondary">실행 대기 중입니다.<br />작업을 선택해 주세요.</Text>}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title={
              <Space direction="vertical" size={2}>
                <Title level={5} style={{ margin: 0 }}>발송 로그 및 이력</Title>
                <Text type="secondary" style={{ fontSize: "0.84rem" }}>상태, 재시도, 실패 이력을 확인합니다.</Text>
              </Space>
            }
            extra={
              <Select
                aria-label="발송 상태 필터"
                style={{ width: 140 }}
                value={crmFilters.sendStatus}
                disabled={!isLiveCrmRoleSupported}
                onChange={(value) =>
                  setCrmFilters((prev) => ({
                    ...prev,
                    sendStatus: value as typeof prev.sendStatus
                  }))
                }
                options={[
                  { label: "전체 상태", value: "" },
                  { label: "대기 중", value: "PENDING" },
                  { label: "재시도 예정", value: "RETRY_WAIT" },
                  { label: "발송 완료", value: "SENT" },
                  { label: "실패", value: "DEAD" }
                ]}
              />
            }
          >
            <Table<CrmHistoryRow>
              rowKey="crmMessageEventId"
              loading={crmHistoryLoading}
              columns={columns}
              dataSource={historyPagination.pagedItems}
              pagination={{
                current: historyPagination.page,
                pageSize: historyPagination.pageSize,
                total: historyPagination.totalItems,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20"],
                onChange: (page, pageSize) => {
                  historyPagination.setPage(page);
                  historyPagination.setPageSize(pageSize);
                }
              }}
              locale={{ emptyText: crmHistoryLoading ? "로그를 불러오는 중..." : "발송 이력이 없습니다." }}
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}
