import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Pagination,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Row,
  Col
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  UserOutlined,
  SolutionOutlined,
  CalendarOutlined,
  TeamOutlined,
  SettingOutlined,
  ReloadOutlined
} from "@ant-design/icons";

import { apiGet, apiPatch, apiPost, isMockApiMode } from "../../api/client";
import { invalidateQueryDomains } from "../../api/queryInvalidation";
import { useAuthState } from "../../app/auth";
import { hasAnyRole, hasRole } from "../../app/roles";
import { toUserFacingErrorMessage } from "../../app/uiError";
import { usePagination } from "../../shared/hooks/usePagination";
import { TrainerAvailabilityMonthView } from "../trainer-availability/TrainerAvailabilityMonthView";
import {
  formatAvailabilityTimeRange,
  getAvailabilityStatusLabel,
  getCurrentMonthValue,
} from "../trainer-availability/modules/types";
import { useTrainerAvailabilityQuery } from "../trainer-availability/modules/useTrainerAvailabilityQuery";
import {
  createDefaultTrainerFilters,
  createEmptyTrainerForm,
  createTrainerFormFromDetail,
  type TrainerDetail,
} from "./modules/types";
import { useTrainersQuery } from "./modules/useTrainersQuery";

import styles from "./TrainersPage.module.css";

const { Title, Text, Paragraph } = Typography;

function asNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function TrainersPage() {
  const { authUser, isMockMode } = useAuthState();
  const defaultCenterId = authUser?.centerId ?? 1;
  const canReadLiveTrainers =
    isMockMode ||
    hasAnyRole(authUser, ["ROLE_SUPER_ADMIN", "ROLE_CENTER_ADMIN", "ROLE_DESK"]);
  const isSuperAdmin = hasRole(authUser, "ROLE_SUPER_ADMIN");
  const canMutateTrainers =
    isMockMode ||
    hasAnyRole(authUser, ["ROLE_SUPER_ADMIN", "ROLE_CENTER_ADMIN"]);

  const [trainerFilters, setTrainerFilters] = useState(() =>
    createDefaultTrainerFilters(defaultCenterId),
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerDetail | null>(null);
  const [availabilityMonth, setAvailabilityMonth] = useState(getCurrentMonthValue);
  const [trainerFormOpen, setTrainerFormOpen] = useState(false);
  const [trainerFormMode, setTrainerFormMode] = useState<"create" | "edit">("create");
  const [trainerForm, setTrainerForm] = useState(() =>
    createEmptyTrainerForm(defaultCenterId),
  );
  const [trainerFormSubmitting, setTrainerFormSubmitting] = useState(false);
  const [trainerPanelMessage, setTrainerPanelMessage] = useState<string | null>(null);
  const [trainerPanelError, setTrainerPanelError] = useState<string | null>(null);
  const [trainerFormError, setTrainerFormError] = useState<string | null>(null);

  const { trainers, trainersLoading, trainersQueryError, loadTrainers, resetTrainersQuery } =
    useTrainersQuery({
      getDefaultFilters: () => trainerFilters,
    });
  const {
    snapshot: trainerAvailabilitySnapshot,
    loading: trainerAvailabilityLoading,
    error: trainerAvailabilityError,
    loadSnapshot: loadTrainerAvailability,
    reset: resetTrainerAvailability,
  } = useTrainerAvailabilityQuery();

  const pagination = usePagination(trainers, {
    initialPageSize: 10,
    resetDeps: [trainers.length, trainerFilters.centerId, trainerFilters.keyword, trainerFilters.status],
  });

  useEffect(() => {
    if (!canReadLiveTrainers) {
      resetTrainersQuery();
      return;
    }
    void loadTrainers(trainerFilters);
    return () => {
      resetTrainersQuery();
    };
  }, [canReadLiveTrainers, loadTrainers, resetTrainersQuery, trainerFilters]);

  useEffect(() => {
    if (!canMutateTrainers && trainerFormOpen) {
      setTrainerFormOpen(false);
    }
  }, [canMutateTrainers, trainerFormOpen]);

  useEffect(() => {
    if (isSuperAdmin) {
      return;
    }
    setTrainerFilters((current) =>
      current.centerId === defaultCenterId
        ? current
        : { ...current, centerId: defaultCenterId },
    );
    setTrainerForm((current) =>
      current.centerId === defaultCenterId
        ? current
        : { ...current, centerId: defaultCenterId },
    );
  }, [defaultCenterId, isSuperAdmin]);

  useEffect(() => {
    if (!detailOpen || !selectedTrainer) {
      resetTrainerAvailability();
      return;
    }
    void loadTrainerAvailabilitySnapshot(selectedTrainer.userId, availabilityMonth);
  }, [
    availabilityMonth,
    detailOpen,
    loadTrainerAvailability,
    resetTrainerAvailability,
    selectedTrainer,
  ]);

  function clearFeedback() {
    setTrainerPanelMessage(null);
    setTrainerPanelError(null);
    setTrainerFormError(null);
  }

  async function loadTrainerAvailabilitySnapshot(userId: number, month: string) {
    return loadTrainerAvailability({ type: "trainer", trainerUserId: userId }, month);
  }

  async function loadTrainerDetail(userId: number) {
    clearFeedback();
    setDetailLoading(true);
    try {
      if (isMockApiMode()) {
        const { getMockTrainerDetail } = await import("../../api/mockData");
        const detail = getMockTrainerDetail(userId);
        if (!detail) {
          throw new Error("트레이너 상세를 찾을 수 없습니다.");
        }
        setSelectedTrainer(detail);
      } else {
        const response = await apiGet<TrainerDetail>(`/api/v1/trainers/${userId}`);
        setSelectedTrainer(response.data);
      }
      setDetailOpen(true);
    } catch (error) {
      setTrainerPanelError(toUserFacingErrorMessage(error, "트레이너 상세를 불러오지 못했습니다."));
    } finally {
      setDetailLoading(false);
    }
  }

  function startCreateTrainer() {
    clearFeedback();
    setTrainerFormMode("create");
    setTrainerForm(createEmptyTrainerForm(defaultCenterId));
    setTrainerFormOpen(true);
  }

  async function startEditTrainer(userId: number) {
    clearFeedback();
    setDetailLoading(true);
    try {
      let detail: TrainerDetail | null = null;
      if (isMockApiMode()) {
        const { getMockTrainerDetail } = await import("../../api/mockData");
        detail = getMockTrainerDetail(userId);
      } else {
        const response = await apiGet<TrainerDetail>(`/api/v1/trainers/${userId}`);
        detail = response.data;
      }
      if (!detail) {
        throw new Error("트레이너 상세를 찾을 수 없습니다.");
      }
      setSelectedTrainer(detail);
      setTrainerFormMode("edit");
      setTrainerForm(createTrainerFormFromDetail(detail));
      setTrainerFormOpen(true);
    } catch (error) {
      setTrainerPanelError(toUserFacingErrorMessage(error, "트레이너 상세를 불러오지 못했습니다."));
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitTrainerForm() {
    clearFeedback();
    const loginId = trainerForm.loginId.trim();
    const displayName = trainerForm.displayName.trim();

    if (!loginId) {
      setTrainerFormError("로그인 ID를 입력해야 합니다.");
      return;
    }
    if (!displayName) {
      setTrainerFormError("트레이너 이름을 입력해야 합니다.");
      return;
    }
    if (trainerFormMode === "create" && !trainerForm.password.trim()) {
      setTrainerFormError("초기 비밀번호를 입력해야 합니다.");
      return;
    }

    setTrainerFormSubmitting(true);
    try {
      let detail: TrainerDetail | null = null;
      if (isMockApiMode()) {
        if (trainerFormMode === "create") {
          const { createMockTrainer } = await import("../../api/mockData");
          detail = createMockTrainer({
            centerId: trainerForm.centerId,
            loginId,
            password: trainerForm.password,
            displayName,
            phone: asNullableText(trainerForm.phone),
          });
          setTrainerPanelMessage("트레이너 계정을 등록했습니다.");
        } else {
          const { updateMockTrainer } = await import("../../api/mockData");
          detail = selectedTrainer
            ? updateMockTrainer(selectedTrainer.userId, {
                loginId,
                displayName,
                phone: asNullableText(trainerForm.phone),
              })
            : null;
          setTrainerPanelMessage("트레이너 정보를 수정했습니다.");
        }
      } else if (trainerFormMode === "create") {
        const response = await apiPost<TrainerDetail>("/api/v1/trainers", {
          centerId: trainerForm.centerId,
          loginId,
          password: trainerForm.password,
          displayName,
          phone: asNullableText(trainerForm.phone),
        });
        detail = response.data;
        setTrainerPanelMessage(response.message);
      } else {
        const response = await apiPatch<TrainerDetail>(
          `/api/v1/trainers/${selectedTrainer?.userId}`,
          {
            loginId,
            displayName,
            phone: asNullableText(trainerForm.phone),
          },
        );
        detail = response.data;
        setTrainerPanelMessage(response.message);
      }

      if (!detail) {
        throw new Error("트레이너 정보를 저장하지 못했습니다.");
      }

      setSelectedTrainer(detail);
      setTrainerForm(createTrainerFormFromDetail(detail));
      setTrainerFormOpen(false);
      invalidateQueryDomains(["trainers"]);
      await loadTrainers(trainerFilters);
    } catch (error) {
      setTrainerFormError(toUserFacingErrorMessage(error, "트레이너 정보를 저장하지 못했습니다."));
    } finally {
      setTrainerFormSubmitting(false);
    }
  }

  async function toggleTrainerStatus(userId: number, nextStatus: "ACTIVE" | "INACTIVE") {
    clearFeedback();
    try {
      let detail: TrainerDetail | null = null;
      if (isMockApiMode()) {
        const { updateMockTrainerStatus } = await import("../../api/mockData");
        detail = updateMockTrainerStatus(userId, nextStatus);
      } else {
        const response = await apiPatch<TrainerDetail>(
          `/api/v1/trainers/${userId}/status`,
          { userStatus: nextStatus },
        );
        detail = response.data;
        setTrainerPanelMessage(response.message);
      }
      if (!detail) {
        throw new Error("트레이너 상태를 변경하지 못했습니다.");
      }
      if (selectedTrainer?.userId === userId) {
        setSelectedTrainer(detail);
      }
      if (isMockApiMode()) {
        setTrainerPanelMessage(
          nextStatus === "ACTIVE"
            ? "트레이너 계정을 활성화했습니다."
            : "트레이너 계정을 비활성화했습니다.",
        );
      }
      invalidateQueryDomains(["trainers"]);
      await loadTrainers(trainerFilters);
    } catch (error) {
      setTrainerPanelError(toUserFacingErrorMessage(error, "트레이너 상태를 변경하지 못했습니다."));
    }
  }

  const activeTrainerCount = useMemo(
    () => trainers.filter((trainer) => trainer.userStatus === "ACTIVE").length,
    [trainers],
  );
  const confirmedReservationCount = useMemo(
    () =>
      trainers.reduce(
        (sum, trainer) => sum + trainer.todayConfirmedReservationCount,
        0,
      ),
    [trainers],
  );

  const trainerColumns: ColumnsType<(typeof trainers)[number]> = [
    {
      title: "이름",
      key: "displayName",
      render: (_, trainer) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: "0.95rem" }}>{trainer.displayName}</Text>
          <Text type="secondary" style={{ fontSize: "0.75rem" }}>
            #{trainer.userId}
          </Text>
        </Space>
      ),
    },
    {
      title: "상태",
      dataIndex: "userStatus",
      key: "userStatus",
      render: (status) => (
        <Tag color={status === "ACTIVE" ? "success" : "default"}>
          {status === "ACTIVE" ? "활성" : "비활성"}
        </Tag>
      ),
    },
    {
      title: "연락처",
      dataIndex: "phone",
      key: "phone",
      render: (phone) => <Text type="secondary" style={{ fontSize: "0.84rem" }}>{phone ?? "미등록"}</Text>,
    },
    {
      title: "담당 회원",
      dataIndex: "assignedMemberCount",
      key: "assignedMemberCount",
      align: "center",
      render: (count) => <Text strong>{count}</Text>
    },
    {
      title: "오늘 예약",
      dataIndex: "todayConfirmedReservationCount",
      key: "todayConfirmedReservationCount",
      align: "center",
      render: (count) => <Text strong style={{ color: count > 0 ? "#1677ff" : undefined }}>{count}</Text>
    },
    {
      title: "액션",
      key: "actions",
      align: "right",
      render: (_, trainer) => (
        <Space wrap>
          <Button size="small" onClick={() => void loadTrainerDetail(trainer.userId)}>
            상세
          </Button>
          {canMutateTrainers && (
            <Button size="small" onClick={() => void startEditTrainer(trainer.userId)}>
              수정
            </Button>
          )}
          {canMutateTrainers && (
            <Button
              size="small"
              danger={trainer.userStatus === "ACTIVE"}
              onClick={() =>
                void toggleTrainerStatus(
                  trainer.userId,
                  trainer.userStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                )
              }
            >
              {trainer.userStatus === "ACTIVE" ? "비활성화" : "활성화"}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1677ff" }}>
              Trainer Ops
            </Text>
            <Title level={2} style={{ margin: 0 }}>
              트레이너 관리
            </Title>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
              트레이너 계정 상태와 담당 회원 수, 오늘 예약 현황을 한 화면에서 확인합니다.
            </Paragraph>
            <Space wrap>
              <Tag color="blue">계정 운영</Tag>
              <Tag color="cyan">담당 현황</Tag>
              <Tag color="purple">데스크 조회 전용</Tag>
            </Space>
          </Space>
          {canMutateTrainers ? (
            <Button type="primary" size="large" onClick={startCreateTrainer}>
              트레이너 등록
            </Button>
          ) : null}
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        {[
          { label: "조회 결과", value: trainers.length, hint: "센터 기준 트레이너 수" },
          { label: "활성 트레이너", value: activeTrainerCount, hint: "예약 배정 가능", color: "#52c41a" },
          { label: "오늘 확정 예약", value: confirmedReservationCount, hint: "CONFIRMED 예약 합계", color: "#1677ff" },
          { label: "운영 권한", value: canMutateTrainers ? "편집 가능" : "조회 전용", hint: "작업 범위 안내" }
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

      <Card
        title={
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>
              트레이너 디렉터리
            </Title>
            <Text type="secondary" style={{ fontSize: "0.84rem" }}>
              이름, 상태, 연락처, 담당 회원 수 기준 운영 점검
            </Text>
          </Space>
        }
      >
        <Flex vertical gap={16}>
          {!canMutateTrainers && canReadLiveTrainers ? (
            <Alert
              message="조회 전용 모드"
              description="데스크 권한에서는 상세 조회만 가능하며 계정 생성, 수정, 상태 변경은 숨겨집니다."
              type="info"
              showIcon
            />
          ) : null}

          {!canReadLiveTrainers ? (
            <Alert
              message="운영 권한 제한"
              description="현재 권한에서는 트레이너 관리 화면에 접근할 수 없습니다."
              type="warning"
              showIcon
            />
          ) : null}

          {trainerPanelMessage && <Alert message={trainerPanelMessage} type="success" showIcon closable />}
          {(trainerPanelError || trainersQueryError) && (
            <Alert message={trainerPanelError ?? trainersQueryError} type="error" showIcon closable />
          )}

          <Form layout="vertical">
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item label="검색어" style={{ marginBottom: 0 }}>
                  <Input
                    value={trainerFilters.keyword}
                    onChange={(e) =>
                      setTrainerFilters((prev) => ({ ...prev, keyword: e.target.value }))
                    }
                    placeholder="이름 / 로그인 ID / 연락처"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8} lg={4}>
                <Form.Item label="상태" style={{ marginBottom: 0 }}>
                  <Select
                    value={trainerFilters.status || ""}
                    onChange={(val) =>
                      setTrainerFilters((prev) => ({ ...prev, status: val as any }))
                    }
                    options={[
                      { value: "", label: "전체 상태" },
                      { value: "ACTIVE", label: "활성" },
                      { value: "INACTIVE", label: "비활성" },
                    ]}
                  />
                </Form.Item>
              </Col>
              {isSuperAdmin && (
                <Col xs={24} sm={8} lg={4}>
                  <Form.Item label="센터 ID" style={{ marginBottom: 0 }}>
                    <Input
                      type="number"
                      min={1}
                      value={trainerFilters.centerId}
                      onChange={(e) =>
                        setTrainerFilters((prev) => ({ ...prev, centerId: Number(e.target.value || "1") }))
                      }
                    />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} sm={16} lg={isSuperAdmin ? 8 : 12}>
                <Flex justify="flex-end" gap={8} style={{ height: "100%", alignItems: "flex-end" }}>
                  <Button
                    disabled={!canReadLiveTrainers}
                    onClick={() => {
                      const nextFilters = createDefaultTrainerFilters(defaultCenterId);
                      setTrainerFilters(nextFilters);
                      void loadTrainers(nextFilters);
                    }}
                  >
                    초기화
                  </Button>
                  <Button
                    type="primary"
                    loading={trainersLoading}
                    disabled={!canReadLiveTrainers}
                    onClick={() => void loadTrainers(trainerFilters)}
                  >
                    조회 적용
                  </Button>
                </Flex>
              </Col>
            </Row>
          </Form>

          <Table
            rowKey="userId"
            columns={trainerColumns}
            dataSource={pagination.pagedItems}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.totalItems,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              onChange: (page, pageSize) => {
                pagination.setPage(page);
                pagination.setPageSize(pageSize);
              }
            }}
            loading={trainersLoading}
            scroll={{ x: 800 }}
            locale={{
              emptyText: canReadLiveTrainers
                ? "조건에 맞는 트레이너가 없습니다."
                : "트레이너 정보를 조회할 수 없습니다.",
            }}
          />
        </Flex>
      </Card>

      {/* 상세 모달 */}
      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title={selectedTrainer ? <Space><SolutionOutlined />{selectedTrainer.displayName} 상세 정보</Space> : "트레이너 상세"}
        width={900}
        footer={[<Button key="close" onClick={() => setDetailOpen(false)}>닫기</Button>]}
      >
        <Flex vertical gap={24} style={{ marginTop: 16 }}>
          {detailLoading ? (
            <Empty description="상세 정보를 불러오는 중입니다..." />
          ) : selectedTrainer ? (
            <>
              <Card size="small">
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="이름">{selectedTrainer.displayName}</Descriptions.Item>
                  <Descriptions.Item label="상태">
                    <Tag color={selectedTrainer.userStatus === "ACTIVE" ? "success" : "default"}>
                      {selectedTrainer.userStatus === "ACTIVE" ? "활성" : "비활성"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="연락처">{selectedTrainer.phone ?? "미등록"}</Descriptions.Item>
                  <Descriptions.Item label="담당 회원">{selectedTrainer.assignedMemberCount}명</Descriptions.Item>
                  <Descriptions.Item label="오늘 예약">{selectedTrainer.todayConfirmedReservationCount}건</Descriptions.Item>
                  <Descriptions.Item label="로그인 ID">{selectedTrainer.loginId || "-"}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Row gutter={24}>
                <Col xs={24} lg={10}>
                  <Card
                    size="small"
                    title={<Space><TeamOutlined />담당 회원 요약</Space>}
                    style={{ height: "100%" }}
                  >
                    {selectedTrainer.assignedMembers.length === 0 ? (
                      <Empty description="배정된 회원이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <List
                        size="small"
                        dataSource={selectedTrainer.assignedMembers}
                        renderItem={(member) => (
                          <List.Item>
                            <Flex justify="space-between" align="center" style={{ width: "100%" }}>
                              <Space direction="vertical" size={0}>
                                <Text strong style={{ fontSize: "0.84rem" }}>{member.memberName}</Text>
                                <Text type="secondary" style={{ fontSize: "0.72rem" }}>
                                  #{member.memberId} · 회원권 #{member.membershipId}
                                </Text>
                              </Space>
                              <Tag color={member.membershipStatus === "ACTIVE" ? "success" : "warning"}>
                                {member.membershipStatus}
                              </Tag>
                            </Flex>
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                </Col>

                <Col xs={24} lg={14}>
                  <Card
                    size="small"
                    title={
                      <Flex justify="space-between" align="center">
                        <Title level={5} style={{ margin: 0 }}>가용 스케줄</Title>
                        <input
                          type="month"
                          value={availabilityMonth}
                          style={{ fontSize: "0.84rem", padding: "2px 8px" }}
                          onChange={(e) => setAvailabilityMonth(e.target.value)}
                        />
                      </Flex>
                    }
                  >
                    <Flex vertical gap={12}>
                      {trainerAvailabilityError && <Alert message={trainerAvailabilityError} type="error" showIcon />}
                      
                      {trainerAvailabilityLoading ? (
                        <Empty description="스케줄 불러오는 중..." />
                      ) : trainerAvailabilitySnapshot ? (
                        <Flex vertical gap={16}>
                          <Row gutter={8}>
                            <Col span={12}>
                              <Statistic
                                title={<Text type="secondary" style={{ fontSize: "0.72rem" }}>가용 일수</Text>}
                                value={trainerAvailabilitySnapshot.effectiveDays.filter(d => d.availabilityStatus === "AVAILABLE").length}
                                valueStyle={{ fontSize: "1.2rem", fontWeight: 700 }}
                                suffix={<Text style={{ fontSize: "0.84rem" }}>일</Text>}
                              />
                            </Col>
                            <Col span={12}>
                              <Statistic
                                title={<Text type="secondary" style={{ fontSize: "0.72rem" }}>예외 일정</Text>}
                                value={trainerAvailabilitySnapshot.exceptions.length}
                                valueStyle={{ fontSize: "1.2rem", fontWeight: 700 }}
                                suffix={<Text style={{ fontSize: "0.84rem" }}>건</Text>}
                              />
                            </Col>
                          </Row>

                          <TrainerAvailabilityMonthView snapshot={trainerAvailabilitySnapshot} />

                          {trainerAvailabilitySnapshot.exceptions.length > 0 && (
                            <List
                              size="small"
                              header={<Text strong style={{ fontSize: "0.75rem" }}>예외 리스트</Text>}
                              dataSource={trainerAvailabilitySnapshot.exceptions}
                              renderItem={(ex) => (
                                <List.Item>
                                  <Flex justify="space-between" align="center" style={{ width: "100%" }}>
                                    <Space direction="vertical" size={0}>
                                      <Text strong style={{ fontSize: "0.75rem" }}>{ex.exceptionDate}</Text>
                                      <Text type="secondary" style={{ fontSize: "0.72rem" }}>
                                        {ex.exceptionType === "OFF" ? "휴무" : formatAvailabilityTimeRange(ex.overrideStartTime, ex.overrideEndTime)}
                                      </Text>
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: "0.72rem" }}>{ex.memo ?? "-"}</Text>
                                  </Flex>
                                </List.Item>
                              )}
                            />
                          )}
                        </Flex>
                      ) : (
                        <Empty description="스케줄 소득 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      )}
                    </Flex>
                  </Card>
                </Col>
              </Row>
            </>
          ) : (
            <Empty description="정보가 없습니다." />
          )}
        </Flex>
      </Modal>

      {/* 등록/수정 모달 */}
      <Modal
        open={trainerFormOpen}
        onCancel={() => setTrainerFormOpen(false)}
        title={trainerFormMode === "create" ? "트레이너 계정 등록" : "트레이너 정보 수정"}
        onOk={() => void submitTrainerForm()}
        okText="저장"
        cancelText="닫기"
        confirmLoading={trainerFormSubmitting}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          {trainerFormError && <Alert message={trainerFormError} type="error" showIcon style={{ marginBottom: 16 }} />}
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="센터 ID" required>
                <Input
                  type="number"
                  min={1}
                  value={trainerForm.centerId}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setTrainerForm(prev => ({ ...prev, centerId: Number(e.target.value || "1") }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="로그인 ID" required>
                <Input
                  value={trainerForm.loginId}
                  onChange={(e) => setTrainerForm(prev => ({ ...prev, loginId: e.target.value }))}
                  placeholder="아이디 입력"
                />
              </Form.Item>
            </Col>
          </Row>

          {trainerFormMode === "create" && (
            <Form.Item label="초기 비밀번호" required>
              <Input.Password
                value={trainerForm.password}
                onChange={(e) => setTrainerForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="최소 8자 이상"
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="이름" required>
                <Input
                  value={trainerForm.displayName}
                  onChange={(e) => setTrainerForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="트레이너 성명"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="연락처">
                <Input
                  value={trainerForm.phone}
                  onChange={(e) => setTrainerForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="010-..."
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Flex>
  );
}
