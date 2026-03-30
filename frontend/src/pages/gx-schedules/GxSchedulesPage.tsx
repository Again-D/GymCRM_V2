import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  Checkbox,
  Empty,
  Popconfirm
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import {
  apiDelete,
  apiPost,
  apiPut,
  isMockApiMode,
} from "../../api/client";
import { useAuthState } from "../../app/auth";
import { hasRole } from "../../app/roles";
import { toUserFacingErrorMessage } from "../../app/uiError";
import { createDefaultTrainerFilters } from "../trainers/modules/types";
import { useTrainersQuery } from "../trainers/modules/useTrainersQuery";
import { useGxScheduleSnapshotQuery } from "./modules/useGxScheduleSnapshotQuery";
import {
  createEmptyRuleForm,
  createExceptionForm,
  createRuleFormFromRule,
  formatDateTime,
  getCurrentMonthValue,
  type GxScheduleSnapshot,
  type GxGeneratedSchedule,
  type GxScheduleExceptionForm,
  type GxScheduleRule,
  type GxScheduleRuleForm,
  WEEKDAY_OPTIONS,
} from "./modules/types";
import { usePagination } from "../../shared/hooks/usePagination";

const { Title, Text, Paragraph } = Typography;

function getErrorMessage(error: unknown, fallback: string) {
  return toUserFacingErrorMessage(error, fallback);
}

export default function GxSchedulesPage() {
  const { authUser } = useAuthState();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [ruleForm, setRuleForm] = useState<GxScheduleRuleForm>(() => createEmptyRuleForm());
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleFormErrors, setRuleFormErrors] = useState<Partial<Record<keyof GxScheduleRuleForm, string>>>({});
  const [editingRule, setEditingRule] = useState<GxScheduleRule | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<GxGeneratedSchedule | null>(null);
  const [exceptionForm, setExceptionForm] = useState<GxScheduleExceptionForm | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [savingException, setSavingException] = useState(false);
  const canManageRules =
    hasRole(authUser, "ROLE_SUPER_ADMIN") ||
    hasRole(authUser, "ROLE_CENTER_ADMIN") ||
    hasRole(authUser, "ROLE_MANAGER");
  const isTrainer = hasRole(authUser, "ROLE_TRAINER");
  const canManageExceptions = canManageRules || hasRole(authUser, "ROLE_TRAINER");

  const { snapshot, loading, error, loadSnapshot, applySnapshot } =
    useGxScheduleSnapshotQuery();
  const { trainers, loadTrainers, trainersLoading } = useTrainersQuery({
    getDefaultFilters: () => ({
      ...createDefaultTrainerFilters(authUser?.centerId ?? 1),
      status: "ACTIVE",
    }),
  });

  useEffect(() => {
    void loadCurrentSnapshot(selectedMonth);
  }, [loadSnapshot, selectedMonth, authUser]);

  useEffect(() => {
    if (canManageRules) {
      void loadTrainers();
    }
  }, [canManageRules, loadTrainers]);

  async function loadCurrentSnapshot(month: string) {
    if (!authUser) {
      return null;
    }
    if (isMockApiMode()) {
      const { getMockGxScheduleSnapshot } = await import("../../api/mockData");
      const nextSnapshot = getMockGxScheduleSnapshot(month, {
        userId: authUser.userId,
        roles: authUser.roles,
      });
      applySnapshot(nextSnapshot);
      return nextSnapshot;
    }
    return loadSnapshot(month);
  }

  const trainerOptions = useMemo(() => {
    if (!authUser) {
      return [];
    }
    if (isTrainer) {
      return [{ userId: authUser.userId, displayName: authUser.username }];
    }
    return trainers.map((trainer) => ({
      userId: trainer.userId,
      displayName: trainer.displayName,
    }));
  }, [authUser, isTrainer, trainers]);

  const trainerNameByUserId = useMemo(
    () =>
      new Map(
        trainerOptions.map((trainer) => [trainer.userId, trainer.displayName] as const),
      ),
    [trainerOptions],
  );

  const rules = useMemo(() => {
    return [...(snapshot?.rules ?? [])].sort((left, right) => {
      if (left.dayOfWeek !== right.dayOfWeek) {
        return left.dayOfWeek - right.dayOfWeek;
      }
      const startTimeCompare = left.startTime.localeCompare(right.startTime);
      if (startTimeCompare !== 0) {
        return startTimeCompare;
      }
      return left.className.localeCompare(right.className, "ko-KR");
    });
  }, [snapshot?.rules]);

  const generatedSchedules = useMemo(() => {
    return [...(snapshot?.generatedSchedules ?? [])].sort((left, right) =>
      left.startAt.localeCompare(right.startAt),
    );
  }, [snapshot?.generatedSchedules]);

  const trainerNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const rule of rules) {
      const trainerName = trainerNameByUserId.get(rule.trainerUserId);
      if (!trainerName) {
        continue;
      }
      counts.set(trainerName, (counts.get(trainerName) ?? 0) + 1);
    }
    return counts;
  }, [rules, trainerNameByUserId]);

  const rulesPagination = usePagination(rules, {
    initialPageSize: 5,
    resetDeps: [selectedMonth, rules.length],
  });

  const generatedSchedulesPagination = usePagination(generatedSchedules, {
    initialPageSize: 5,
    resetDeps: [selectedMonth, generatedSchedules.length],
  });

  function startCreateRule() {
    setEditingRule(null);
    setRuleForm(createEmptyRuleForm());
    setRuleFormErrors({});
    setIsRuleModalOpen(true);
  }

  function startEditRule(rule: GxScheduleRule) {
    setEditingRule(rule);
    setRuleForm(createRuleFormFromRule(rule));
    setRuleFormErrors({});
    setIsRuleModalOpen(true);
  }

  function closeRuleModal() {
    setIsRuleModalOpen(false);
    setEditingRule(null);
    setRuleForm(createEmptyRuleForm());
    setRuleFormErrors({});
  }

  function formatRuleTrainerLabel(trainerUserId: number) {
    const trainerName = trainerNameByUserId.get(trainerUserId);
    if (!trainerName) {
      return `#${trainerUserId}`;
    }
    if ((trainerNameCounts.get(trainerName) ?? 0) > 1) {
      return `${trainerName} (#${trainerUserId})`;
    }
    return trainerName;
  }

  function updateRuleFormField<K extends keyof GxScheduleRuleForm>(field: K, value: GxScheduleRuleForm[K]) {
    setRuleForm((current) => ({ ...current, [field]: value }));
    setRuleFormErrors((current) => {
      if (!current[field]) {
        return current;
      }
      return {
        ...current,
        [field]: undefined,
      };
    });
  }

  function validateRuleForm() {
    const nextErrors: Partial<Record<keyof GxScheduleRuleForm, string>> = {};

    if (!ruleForm.className.trim()) {
      nextErrors.className = "수업명을 입력해 주세요.";
    }
    if (!ruleForm.trainerUserId) {
      nextErrors.trainerUserId = "담당 트레이너를 선택해 주세요.";
    }
    if (!ruleForm.dayOfWeek) {
      nextErrors.dayOfWeek = "요일을 선택해 주세요.";
    }
    if (!ruleForm.startTime) {
      nextErrors.startTime = "시작 시간을 입력해 주세요.";
    }
    if (!ruleForm.endTime) {
      nextErrors.endTime = "종료 시간을 입력해 주세요.";
    }
    if (
      ruleForm.startTime &&
      ruleForm.endTime &&
      ruleForm.startTime >= ruleForm.endTime
    ) {
      nextErrors.endTime = "종료 시간은 시작 시간보다 늦어야 합니다.";
    }
    if (!ruleForm.capacity || Number(ruleForm.capacity) < 1) {
      nextErrors.capacity = "정원은 1명 이상이어야 합니다.";
    }
    if (!ruleForm.effectiveStartDate) {
      nextErrors.effectiveStartDate = "적용 시작일을 입력해 주세요.";
    }

    setRuleFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function openExceptionModal(schedule: GxGeneratedSchedule) {
    setSelectedSchedule(schedule);
    setExceptionForm(
      createExceptionForm(
        snapshot?.exceptions.find(
          (exception) =>
            exception.ruleId === schedule.sourceRuleId &&
            exception.exceptionDate === schedule.startAt.slice(0, 10),
        ),
        schedule.trainerUserId,
        schedule.capacity,
      ),
    );
  }

  async function submitRule() {
    if (!validateRuleForm()) {
      return;
    }
    setSavingRule(true);
    setPanelMessage(null);
    setPanelError(null);

    try {
      const path = editingRule
        ? `/api/v1/reservations/gx/rules/${editingRule.ruleId}?month=${selectedMonth}`
        : `/api/v1/reservations/gx/rules?month=${selectedMonth}`;
      const payload = {
        className: ruleForm.className,
        trainerUserId: Number(ruleForm.trainerUserId),
        dayOfWeek: Number(ruleForm.dayOfWeek),
        startTime: ruleForm.startTime,
        endTime: ruleForm.endTime,
        capacity: Number(ruleForm.capacity),
        effectiveStartDate: ruleForm.effectiveStartDate,
        ...(editingRule ? { active: ruleForm.active } : {}),
      };
      const nextSnapshot = isMockApiMode()
        ? editingRule
          ? (await import("../../api/mockData")).updateMockGxScheduleRule(
              editingRule.ruleId,
              selectedMonth,
              payload as {
                className: string;
                trainerUserId: number;
                dayOfWeek: number;
                startTime: string;
                endTime: string;
                capacity: number;
                effectiveStartDate: string;
                active: boolean;
              },
              authUser
                ? { userId: authUser.userId, roles: authUser.roles }
                : undefined,
            )
          : (await import("../../api/mockData")).createMockGxScheduleRule(
              selectedMonth,
              payload as {
                className: string;
                trainerUserId: number;
                dayOfWeek: number;
                startTime: string;
                endTime: string;
                capacity: number;
                effectiveStartDate: string;
              },
              authUser
                ? { userId: authUser.userId, roles: authUser.roles }
                : undefined,
            )
        : (
            editingRule
              ? await apiPut<GxScheduleSnapshot>(path, payload)
              : await apiPost<GxScheduleSnapshot>(path, payload)
          ).data;
      applySnapshot(nextSnapshot);
      setPanelMessage(
        editingRule ? "GX 반복 규칙을 저장했습니다." : "GX 반복 규칙을 생성했습니다.",
      );
      closeRuleModal();
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "GX 반복 규칙을 저장하지 못했습니다."));
    } finally {
      setSavingRule(false);
    }
  }

  async function endRule(ruleId: number) {
    setPanelMessage(null);
    setPanelError(null);
    try {
      const nextSnapshot = isMockApiMode()
        ? (await import("../../api/mockData")).deleteMockGxScheduleRule(
            ruleId,
            selectedMonth,
            authUser ? { userId: authUser.userId, roles: authUser.roles } : undefined,
          )
        : (
            await apiDelete<GxScheduleSnapshot>(
              `/api/v1/reservations/gx/rules/${ruleId}?month=${selectedMonth}`,
            )
          ).data;
      applySnapshot(nextSnapshot);
      if (editingRule?.ruleId === ruleId) {
        setEditingRule(null);
        setRuleForm(createEmptyRuleForm());
      }
      setPanelMessage("GX 반복 규칙을 종료했습니다.");
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "GX 반복 규칙을 종료하지 못했습니다."));
    }
  }

  async function submitException() {
    if (!selectedSchedule || !exceptionForm) {
      return;
    }
    setSavingException(true);
    setPanelMessage(null);
    setPanelError(null);

    try {
      const date = selectedSchedule.startAt.slice(0, 10);
      const path = `/api/v1/reservations/gx/rules/${selectedSchedule.sourceRuleId}/exceptions/${date}?month=${selectedMonth}`;
      const payload =
        exceptionForm.exceptionType === "OFF"
          ? {
              exceptionType: "OFF" as const,
              overrideTrainerUserId: null,
              overrideStartTime: null,
              overrideEndTime: null,
              overrideCapacity: null,
              memo: exceptionForm.memo.trim() || null,
            }
          : {
              exceptionType: "OVERRIDE" as const,
              overrideTrainerUserId: exceptionForm.overrideTrainerUserId
                ? Number(exceptionForm.overrideTrainerUserId)
                : null,
              overrideStartTime: exceptionForm.overrideStartTime,
              overrideEndTime: exceptionForm.overrideEndTime,
              overrideCapacity: exceptionForm.overrideCapacity
                ? Number(exceptionForm.overrideCapacity)
                : null,
              memo: exceptionForm.memo.trim() || null,
            };
      const nextSnapshot = isMockApiMode()
        ? (await import("../../api/mockData")).upsertMockGxScheduleException(
            Number(selectedSchedule.sourceRuleId),
            date,
            selectedMonth,
            payload,
            authUser ? { userId: authUser.userId, roles: authUser.roles } : undefined,
          )
        : (await apiPut<GxScheduleSnapshot>(path, payload)).data;
      applySnapshot(nextSnapshot);
      setPanelMessage("GX 회차 예외를 저장했습니다.");
      setSelectedSchedule(null);
      setExceptionForm(null);
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "GX 회차 예외를 저장하지 못했습니다."));
    } finally {
      setSavingException(false);
    }
  }

  async function resetException() {
    if (!selectedSchedule) {
      return;
    }
    setSavingException(true);
    setPanelMessage(null);
    setPanelError(null);
    try {
      const date = selectedSchedule.startAt.slice(0, 10);
      const nextSnapshot = isMockApiMode()
        ? (await import("../../api/mockData")).deleteMockGxScheduleException(
            Number(selectedSchedule.sourceRuleId),
            date,
            selectedMonth,
            authUser ? { userId: authUser.userId, roles: authUser.roles } : undefined,
          )
        : (
            await apiDelete<GxScheduleSnapshot>(
              `/api/v1/reservations/gx/rules/${selectedSchedule.sourceRuleId}/exceptions/${date}?month=${selectedMonth}`,
            )
          ).data;
      applySnapshot(nextSnapshot);
      setPanelMessage("GX 회차 예외를 삭제했습니다.");
      setSelectedSchedule(null);
      setExceptionForm(null);
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "GX 회차 예외를 삭제하지 못했습니다."));
    } finally {
      setSavingException(false);
    }
  }

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1677ff" }}>
              GX Schedule Ops
            </Text>
            <Title level={2} style={{ margin: 0 }}>GX 스케줄</Title>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
              반복 규칙으로 GX 수업을 운영하고, 월별 생성 회차에 날짜별 예외를 적용합니다.
            </Paragraph>
            <Space wrap>
              <Tag color="blue">반복 규칙</Tag>
              <Tag color="cyan">4주 롤링 슬롯</Tag>
              <Tag color="purple">회차 예외</Tag>
            </Space>
          </Space>
          <Form layout="inline">
            <Form.Item label="조회 월">
              <input
                aria-label="조회 월"
                type="month"
                className="input"
                style={{ width: "160px", padding: "4px 11px", border: "1px solid #d9d9d9", borderRadius: 6 }}
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </Form.Item>
          </Form>
        </Flex>
      </Card>

      {(panelMessage || panelError || error) && (
        <Flex vertical gap={8}>
          {panelMessage && <Alert type="success" message={panelMessage} showIcon closable onClose={() => setPanelMessage(null)} />}
          {(panelError || error) && <Alert type="error" message={panelError ?? error} showIcon closable onClose={() => setPanelError(null)} />}
        </Flex>
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space direction="vertical" size={2}>
                <Title level={5} style={{ margin: 0 }}>반복 규칙</Title>
                <Text type="secondary" style={{ fontSize: "0.84rem" }}>센터 매니저는 GX 수업 반복 규칙을 관리합니다.</Text>
              </Space>
            }
            extra={canManageRules && (
              <Button aria-label="새 규칙" type="primary" icon={<PlusOutlined />} onClick={startCreateRule}>
                새 규칙
              </Button>
            )}
          >
            <Flex vertical gap={12}>
              {!canManageRules && (
                <Alert message="현재 권한은 조회 전용입니다." type="info" showIcon />
              )}
              
              {rulesPagination.pagedItems.map((rule) => (
                <Card key={rule.ruleId} size="small" variant="outlined" style={{ borderColor: rule.active ? undefined : "#f0f0f0" }}>
                  <Flex justify="space-between" align="start">
                    <Flex vertical gap={4}>
                      <Space>
                        <Text strong>{rule.className}</Text>
                        <Tag color={rule.active ? "success" : "default"}>
                          {rule.active ? "활성" : "종료"}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: "0.84rem" }}>
                        {WEEKDAY_OPTIONS.find((o) => o.value === String(rule.dayOfWeek))?.label} · {rule.startTime.slice(0, 5)} - {rule.endTime.slice(0, 5)} · 정원 {rule.capacity}
                      </Text>
                      <Text type="secondary" style={{ fontSize: "0.84rem" }}>
                        적용 시작일 {rule.effectiveStartDate} · 트레이너 {formatRuleTrainerLabel(rule.trainerUserId)}
                      </Text>
                    </Flex>
                    {canManageRules && (
                      <Space>
                        <Button size="small" icon={<EditOutlined />} onClick={() => startEditRule(rule)}>수정</Button>
                        {rule.active && (
                          <Popconfirm
                            title="규칙 종료"
                            description="정말로 이 반복 규칙을 종료하시겠습니까?"
                            onConfirm={() => void endRule(rule.ruleId)}
                            okText="종료"
                            cancelText="취소"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />}>종료</Button>
                          </Popconfirm>
                        )}
                      </Space>
                    )}
                  </Flex>
                </Card>
              ))}

              {!loading && rules.length === 0 && (
                <Empty description="등록된 GX 반복 규칙이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}

              {rules.length > 0 && (
                <Pagination
                  current={rulesPagination.page}
                  total={rulesPagination.totalItems}
                  pageSize={rulesPagination.pageSize}
                  onChange={(page, pageSize) => {
                    rulesPagination.setPage(page);
                    rulesPagination.setPageSize(pageSize);
                  }}
                  size="small"
                  showSizeChanger
                  pageSizeOptions={[5, 10, 20]}
                  align="center"
                  style={{ marginTop: 12 }}
                />
              )}
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space direction="vertical" size={2}>
                <Title level={5} style={{ margin: 0 }}>생성된 회차</Title>
                <Text type="secondary" style={{ fontSize: "0.84rem" }}>월별 생성된 GX 수업 회차와 예외를 관리합니다.</Text>
              </Space>
            }
          >
            <Flex vertical gap={12}>
              {generatedSchedulesPagination.pagedItems.map((schedule) => (
                <Card key={schedule.scheduleId} size="small" variant="outlined">
                  <Flex justify="space-between" align="start">
                    <Flex vertical gap={4}>
                      <Space>
                        <Text strong>{schedule.className}</Text>
                        <Tag color={schedule.currentCount > 0 ? "warning" : "processing"}>
                          {schedule.currentCount}/{schedule.capacity}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: "0.84rem" }}>
                        <CalendarOutlined /> {formatDateTime(schedule.startAt)} - {formatDateTime(schedule.endAt)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: "0.84rem" }}>
                        {schedule.trainerName}
                      </Text>
                    </Flex>
                    {canManageExceptions && (
                      <Button size="small" onClick={() => openExceptionModal(schedule)}>회차 예외</Button>
                    )}
                  </Flex>
                </Card>
              ))}

              {!loading && generatedSchedules.length === 0 && (
                <Empty description="선택한 월에 생성된 GX 회차가 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}

              {generatedSchedules.length > 0 && (
                <Pagination
                  current={generatedSchedulesPagination.page}
                  total={generatedSchedulesPagination.totalItems}
                  pageSize={generatedSchedulesPagination.pageSize}
                  onChange={(page, pageSize) => {
                    generatedSchedulesPagination.setPage(page);
                    generatedSchedulesPagination.setPageSize(pageSize);
                  }}
                  size="small"
                  showSizeChanger
                  pageSizeOptions={[5, 10, 20]}
                  align="center"
                  style={{ marginTop: 12 }}
                />
              )}
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* GX 규칙 모달 */}
      <Modal
        open={isRuleModalOpen}
        title={<Title level={4} style={{ margin: 0 }}>{editingRule ? "GX 규칙 수정" : "새 GX 규칙"}</Title>}
        onCancel={closeRuleModal}
        footer={[
          <Button key="cancel" onClick={closeRuleModal} disabled={savingRule}>
            {editingRule ? "수정 취소" : "취소"}
          </Button>,
          <Button key="submit" type="primary" loading={savingRule} onClick={() => void submitRule()}>
            {editingRule ? "규칙 저장" : "규칙 생성"}
          </Button>
        ]}
        destroyOnHidden
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Alert
            message="`*` 표시는 필수 항목입니다."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item label="수업명" required validateStatus={ruleFormErrors.className ? "error" : ""} help={ruleFormErrors.className}>
            <Input
              aria-label="수업명"
              placeholder="예: 저녁 요가"
              value={ruleForm.className}
              onChange={(e) => updateRuleFormField("className", e.target.value)}
            />
          </Form.Item>

          <Form.Item label="담당 트레이너" required validateStatus={ruleFormErrors.trainerUserId ? "error" : ""} help={ruleFormErrors.trainerUserId}>
            <Select
              aria-label="담당 트레이너"
              placeholder="담당 트레이너 선택"
              loading={trainersLoading}
              value={ruleForm.trainerUserId || undefined}
              onChange={(value) => updateRuleFormField("trainerUserId", value)}
              options={trainerOptions.map(t => ({ label: t.displayName, value: t.userId }))}
            />
          </Form.Item>

          <Form.Item label="요일" required validateStatus={ruleFormErrors.dayOfWeek ? "error" : ""} help={ruleFormErrors.dayOfWeek}>
            <Select
              aria-label="요일"
              value={ruleForm.dayOfWeek || undefined}
              onChange={(value) => updateRuleFormField("dayOfWeek", value)}
              options={WEEKDAY_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="시작 시간" required validateStatus={ruleFormErrors.startTime ? "error" : ""} help={ruleFormErrors.startTime}>
                <Input
                  aria-label="시작 시간"
                  type="time"
                  value={ruleForm.startTime}
                  onChange={(e) => updateRuleFormField("startTime", e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="종료 시간" required validateStatus={ruleFormErrors.endTime ? "error" : ""} help={ruleFormErrors.endTime}>
                <Input
                  aria-label="종료 시간"
                  type="time"
                  value={ruleForm.endTime}
                  onChange={(e) => updateRuleFormField("endTime", e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="정원" required validateStatus={ruleFormErrors.capacity ? "error" : ""} help={ruleFormErrors.capacity}>
                <Input
                  aria-label="정원"
                  type="number"
                  min={1}
                  placeholder="예: 20"
                  value={ruleForm.capacity}
                  onChange={(e) => updateRuleFormField("capacity", e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="적용 시작일" required validateStatus={ruleFormErrors.effectiveStartDate ? "error" : ""} help={ruleFormErrors.effectiveStartDate}>
                <Input
                  aria-label="적용 시작일"
                  type="date"
                  value={ruleForm.effectiveStartDate}
                  onChange={(e) => updateRuleFormField("effectiveStartDate", e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>

          {editingRule && (
            <Form.Item>
              <Checkbox
                checked={ruleForm.active}
                onChange={(e) => setRuleForm(curr => ({ ...curr, active: e.target.checked }))}
              >
                활성 상태 유지
              </Checkbox>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 회차 예외 모달 */}
      <Modal
        open={selectedSchedule != null && exceptionForm != null}
        title={<Title level={4} style={{ margin: 0 }}>GX 회차 예외</Title>}
        onCancel={() => {
          setSelectedSchedule(null);
          setExceptionForm(null);
        }}
        footer={[
          <Button
            key="reset"
            danger
            disabled={!snapshot?.exceptions.find(e => e.ruleId === selectedSchedule?.sourceRuleId && e.exceptionDate === selectedSchedule?.startAt.slice(0, 10)) || savingException}
            onClick={() => void resetException()}
          >
            예외 삭제
          </Button>,
          <Button key="cancel" onClick={() => { setSelectedSchedule(null); setExceptionForm(null); }}>
            취소
          </Button>,
          <Button key="submit" type="primary" loading={savingException} onClick={() => void submitException()}>
            예외 저장
          </Button>
        ]}
        destroyOnHidden
      >
        {selectedSchedule && exceptionForm && (
          <Flex vertical gap={16} style={{ marginTop: 16 }}>
            <div>
              <Text strong>{selectedSchedule.className}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: "0.84rem" }}>
                <CalendarOutlined /> {formatDateTime(selectedSchedule.startAt)}
              </Text>
            </div>

            <Form layout="vertical">
              <Form.Item label="예외 유형">
                <Select
                  value={exceptionForm.exceptionType}
                  onChange={(value) =>
                    setExceptionForm((curr) =>
                      curr ? { ...curr, exceptionType: value } : curr,
                    )
                  }
                  options={[
                    { label: "휴강", value: "OFF" },
                    ...(!isTrainer ? [{ label: "변경", value: "OVERRIDE" }] : [])
                  ]}
                />
              </Form.Item>

              {isTrainer && (
                <Alert
                  message="트레이너는 본인 회차의 휴강과 메모만 처리할 수 있습니다."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              {exceptionForm.exceptionType === "OVERRIDE" && (
                <>
                  <Form.Item label="변경 담당 트레이너">
                    <Select
                      placeholder="트레이너 선택"
                      value={exceptionForm.overrideTrainerUserId || undefined}
                      onChange={(value) =>
                        setExceptionForm((curr) =>
                          curr ? { ...curr, overrideTrainerUserId: value } : curr,
                        )
                      }
                      options={trainerOptions.map(t => ({ label: t.displayName, value: t.userId }))}
                      disabled={isTrainer}
                    />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="변경 시작 시간">
                        <Input
                          type="time"
                          value={exceptionForm.overrideStartTime || ""}
                          onChange={(e) =>
                            setExceptionForm((curr) =>
                              curr ? { ...curr, overrideStartTime: e.target.value } : curr,
                            )
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="변경 종료 시간">
                        <Input
                          type="time"
                          value={exceptionForm.overrideEndTime || ""}
                          onChange={(e) =>
                            setExceptionForm((curr) =>
                              curr ? { ...curr, overrideEndTime: e.target.value } : curr,
                            )
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="변경 정원">
                    <Input
                      type="number"
                      min={1}
                      value={exceptionForm.overrideCapacity || ""}
                      onChange={(e) =>
                        setExceptionForm((curr) =>
                          curr ? { ...curr, overrideCapacity: e.target.value } : curr,
                        )
                      }
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item label="메모">
                <Input.TextArea
                  rows={4}
                  placeholder="예외 사유 등을 입력하세요"
                  value={exceptionForm.memo}
                  onChange={(e) => setExceptionForm(curr => curr ? ({ ...curr, memo: e.target.value }) : curr)}
                />
              </Form.Item>
            </Form>
          </Flex>
        )}
      </Modal>
    </Flex>
  );
}
