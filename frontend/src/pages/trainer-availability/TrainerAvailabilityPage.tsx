import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  Checkbox,
  List,
  Empty
} from "antd";
import { CalendarOutlined, SaveOutlined, ReloadOutlined } from "@ant-design/icons";

import {
  apiDelete,
  apiPut,
  isMockApiMode,
} from "../../api/client";
import { useAuthState } from "../../app/auth";
import { toUserFacingErrorMessage } from "../../app/uiError";
import { TrainerAvailabilityMonthView } from "./TrainerAvailabilityMonthView";
import {
  buildWeeklyRulesPayload,
  createDefaultWeeklyRuleDrafts,
  createExceptionDraftForDate,
  createWeeklyRuleDraftsFromSnapshot,
  formatAvailabilityTimeRange,
  getAvailabilityStatusLabel,
  getCurrentMonthValue,
  getWeekdayLabel,
  type ExceptionDraft,
  type TrainerAvailabilitySnapshot,
  type WeeklyRuleDraft,
} from "./modules/types";
import { useTrainerAvailabilityQuery } from "./modules/useTrainerAvailabilityQuery";

import styles from "./TrainerAvailabilityPage.module.css";

const { Title, Text, Paragraph } = Typography;

function getErrorMessage(error: unknown, fallback: string) {
  return toUserFacingErrorMessage(error, fallback);
}

export default function TrainerAvailabilityPage() {
  const { authUser } = useAuthState();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [weeklyDrafts, setWeeklyDrafts] = useState<WeeklyRuleDraft[]>(() =>
    createDefaultWeeklyRuleDrafts(),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [exceptionDraft, setExceptionDraft] = useState<ExceptionDraft | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [savingException, setSavingException] = useState(false);
  const { snapshot, loading, error, loadSnapshot, applySnapshot } =
    useTrainerAvailabilityQuery();

  useEffect(() => {
    if (!authUser) {
      return;
    }
    void loadCurrentSnapshot(selectedMonth);
  }, [authUser, selectedMonth]);

  async function loadCurrentSnapshot(month: string) {
    if (!authUser) {
      return null;
    }

    try {
      setPanelError(null);
      const nextSnapshot = isMockApiMode()
        ? await loadMockSnapshot(authUser.userId, month)
        : await loadSnapshot({ type: "me", userId: authUser.userId }, month);
      if (nextSnapshot) {
        applySnapshot(nextSnapshot);
        setWeeklyDrafts(createWeeklyRuleDraftsFromSnapshot(nextSnapshot));
      }
      return nextSnapshot;
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "내 스케줄을 불러오지 못했습니다."));
      return null;
    }
  }

  async function loadMockSnapshot(userId: number, month: string) {
    const { getMockTrainerAvailabilitySnapshot } = await import("../../api/mockData");
    return getMockTrainerAvailabilitySnapshot(userId, month);
  }

  async function saveWeeklyRules() {
    if (!authUser) {
      return;
    }
    setSavingWeekly(true);
    setPanelMessage(null);
    setPanelError(null);

    try {
      const rules = buildWeeklyRulesPayload(weeklyDrafts);
      let nextSnapshot: TrainerAvailabilitySnapshot;
      if (isMockApiMode()) {
        const { replaceMockTrainerAvailabilityWeeklyRules } = await import(
          "../../api/mockData"
        );
        nextSnapshot = replaceMockTrainerAvailabilityWeeklyRules(
          authUser.userId,
          selectedMonth,
          rules,
        );
      } else {
        const response = await apiPut<TrainerAvailabilitySnapshot>(
          `/api/v1/trainers/me/availability/weekly?month=${selectedMonth}`,
          { rules },
        );
        nextSnapshot = response.data;
      }
      setWeeklyDrafts(createWeeklyRuleDraftsFromSnapshot(nextSnapshot));
      setPanelMessage("기본 주간 스케줄을 저장했습니다.");
      setSelectedDate(null);
      setExceptionDraft(null);
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "기본 주간 스케줄을 저장하지 못했습니다."));
    } finally {
      setSavingWeekly(false);
      await loadCurrentSnapshot(selectedMonth);
    }
  }

  function openExceptionEditor(date: string) {
    setSelectedDate(date);
    setExceptionDraft(createExceptionDraftForDate(snapshot, date));
  }

  async function saveException() {
    if (!authUser || !selectedDate || !exceptionDraft) {
      return;
    }

    setSavingException(true);
    setPanelMessage(null);
    setPanelError(null);

    try {
      if (exceptionDraft.mode === "DEFAULT") {
        if (isMockApiMode()) {
          const { deleteMockTrainerAvailabilityException } = await import(
            "../../api/mockData"
          );
          deleteMockTrainerAvailabilityException(
            authUser.userId,
            selectedMonth,
            selectedDate,
          );
        } else {
          await apiDelete<TrainerAvailabilitySnapshot>(
            `/api/v1/trainers/me/availability/exceptions/${selectedDate}?month=${selectedMonth}`,
          );
        }
        setPanelMessage("해당 날짜 예외를 삭제했습니다.");
      } else if (isMockApiMode()) {
        const { upsertMockTrainerAvailabilityException } = await import(
          "../../api/mockData"
        );
        upsertMockTrainerAvailabilityException(
          authUser.userId,
          selectedMonth,
          selectedDate,
          {
            exceptionType: exceptionDraft.mode,
            overrideStartTime:
              exceptionDraft.mode === "OVERRIDE"
                ? exceptionDraft.overrideStartTime
                : null,
            overrideEndTime:
              exceptionDraft.mode === "OVERRIDE"
                ? exceptionDraft.overrideEndTime
                : null,
            memo: exceptionDraft.memo.trim() || null,
          },
        );
        setPanelMessage("예외 스케줄을 저장했습니다.");
      } else {
        await apiPut<TrainerAvailabilitySnapshot>(
          `/api/v1/trainers/me/availability/exceptions/${selectedDate}?month=${selectedMonth}`,
          {
            exceptionType: exceptionDraft.mode,
            overrideStartTime:
              exceptionDraft.mode === "OVERRIDE"
                ? exceptionDraft.overrideStartTime
                : null,
            overrideEndTime:
              exceptionDraft.mode === "OVERRIDE"
                ? exceptionDraft.overrideEndTime
                : null,
            memo: exceptionDraft.memo.trim() || null,
          },
        );
        setPanelMessage("예외 스케줄을 저장했습니다.");
      }
      setSelectedDate(null);
      setExceptionDraft(null);
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "예외 스케줄을 저장하지 못했습니다."));
    } finally {
      setSavingException(false);
      await loadCurrentSnapshot(selectedMonth);
    }
  }

  const currentDay = selectedDate
    ? snapshot?.effectiveDays.find((day) => day.date === selectedDate) ?? null
    : null;

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1677ff" }}>
              Trainer Self-Service
            </Text>
            <Title level={2} style={{ margin: 0 }}>내 스케줄</Title>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
              주간 가능 시간과 날짜별 휴무/예외를 직접 관리하고, 월별 가용 상태를 캘린더로 확인합니다.
            </Paragraph>
            <Space wrap>
              <Tag color="blue">주간 반복 규칙</Tag>
              <Tag color="cyan">날짜별 예외</Tag>
              <Tag color="purple">관리자 조회 연동</Tag>
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

      <Card
        title={
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>기본 주간 가능 시간</Title>
            <Text type="secondary" style={{ fontSize: "0.84rem" }}>요일별 단일 시간 범위를 저장합니다. 비활성 요일은 예약 불가 기간이 됩니다.</Text>
          </Space>
        }
        extra={
          <Button
            aria-label="주간 스케줄 저장"
            type="primary"
            icon={<SaveOutlined />}
            loading={savingWeekly}
            disabled={loading}
            onClick={() => void saveWeeklyRules()}
          >
            주간 스케줄 저장
          </Button>
        }
      >
        <Flex vertical gap={12}>
          <div className={styles.weeklyGrid}>
            {weeklyDrafts.map((draft) => (
              <div key={draft.dayOfWeek} className={styles.weeklyRow}>
                <Checkbox
                  checked={draft.enabled}
                  onChange={(e) =>
                    setWeeklyDrafts((current) =>
                      current.map((item) =>
                        item.dayOfWeek === draft.dayOfWeek
                          ? { ...item, enabled: e.target.checked }
                          : item,
                      ),
                    )
                  }
                >
                  <Text strong style={{ minWidth: 60, display: "inline-block" }}>
                    {getWeekdayLabel(draft.dayOfWeek)}
                  </Text>
                </Checkbox>
                <div className={styles.weeklyTimeGroup}>
                  <Input
                    type="time"
                    value={draft.startTime}
                    disabled={!draft.enabled}
                    onChange={(e) =>
                      setWeeklyDrafts((current) =>
                        current.map((item) =>
                          item.dayOfWeek === draft.dayOfWeek
                            ? { ...item, startTime: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <Input
                    type="time"
                    value={draft.endTime}
                    disabled={!draft.enabled}
                    onChange={(e) =>
                      setWeeklyDrafts((current) =>
                        current.map((item) =>
                          item.dayOfWeek === draft.dayOfWeek
                            ? { ...item, endTime: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <Alert
            message="초기 버전은 하루당 하나의 시간 범위만 지원합니다."
            type="info"
            showIcon
            style={{ marginTop: 12 }}
          />
        </Flex>
      </Card>

      <Card
        title={
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>월간 가용 캘린더</Title>
            <Text type="secondary" style={{ fontSize: "0.84rem" }}>날짜를 선택하면 휴무 또는 단일 시간 예외를 등록할 수 있습니다.</Text>
          </Space>
        }
        extra={
          <Button
            aria-label="새로고침"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadCurrentSnapshot(selectedMonth)}
          >
            새로고침
          </Button>
        }
      >
        {snapshot ? (
          <TrainerAvailabilityMonthView
            snapshot={snapshot}
            selectedDate={selectedDate}
            onSelectDate={openExceptionEditor}
            interactive
          />
        ) : (
          <Flex align="center" justify="center" style={{ minHeight: 200 }}>
            <Text type="secondary">스케줄 정보를 불러오는 중입니다...</Text>
          </Flex>
        )}
      </Card>

      <Card
        title={
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>등록된 날짜별 예외</Title>
            <Text type="secondary" style={{ fontSize: "0.84rem" }}>현재 월에 저장된 휴무와 시간 변경 메상을 확인합니다.</Text>
          </Space>
        }
      >
        {!snapshot || snapshot.exceptions.length === 0 ? (
          <Empty description="등록된 예외 일정이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
            dataSource={snapshot.exceptions}
            renderItem={(exception) => (
              <List.Item>
                <Card
                  size="small"
                  hoverable
                  onClick={() => openExceptionEditor(exception.exceptionDate)}
                >
                  <Flex vertical gap={4}>
                    <Text strong><CalendarOutlined /> {exception.exceptionDate}</Text>
                    <Text type="secondary" style={{ fontSize: "0.84rem" }}>
                      {exception.exceptionType === "OFF"
                        ? <Tag color="error">하루 휴무</Tag>
                        : <Tag color="warning">{formatAvailabilityTimeRange(exception.overrideStartTime, exception.overrideEndTime)}</Tag>}
                    </Text>
                    <Text type="secondary" style={{ fontSize: "0.78rem" }}>{exception.memo ?? "메모 없음"}</Text>
                  </Flex>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 예외 스케줄 모달 */}
      <Modal
        open={selectedDate != null && exceptionDraft != null}
        title={selectedDate ? `${selectedDate} 예외 스케줄` : "예외 스케줄"}
        onCancel={() => {
          setSelectedDate(null);
          setExceptionDraft(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => { setSelectedDate(null); setExceptionDraft(null); }}>
            닫기
          </Button>,
          <Button key="submit" type="primary" loading={savingException} onClick={() => void saveException()}>
            저장
          </Button>
        ]}
        destroyOnClose
      >
        {selectedDate && exceptionDraft && (
          <Flex vertical gap={16} style={{ marginTop: 16 }}>
            {currentDay && (
              <Alert
                message={
                  <Flex vertical>
                    <Text strong>현재 상태: {getAvailabilityStatusLabel(currentDay.availabilityStatus)}</Text>
                    <Text style={{ fontSize: "0.84rem" }}>기존 시간: {formatAvailabilityTimeRange(currentDay.startTime, currentDay.endTime)}</Text>
                  </Flex>
                }
                type="info"
              />
            )}

            <Form layout="vertical">
              <Form.Item label="예외 유형">
                <Select
                  value={exceptionDraft.mode}
                  onChange={(val) => setExceptionDraft(curr => curr ? ({ ...curr, mode: val }) : curr)}
                  options={[
                    { label: "기본 스케줄 따름 (예외 없음)", value: "DEFAULT" },
                    { label: "하루 휴무", value: "OFF" },
                    { label: "시간 변경", value: "OVERRIDE" }
                  ]}
                />
              </Form.Item>

              {exceptionDraft.mode === "OVERRIDE" && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="시작 시간">
                      <Input
                        type="time"
                        value={exceptionDraft.overrideStartTime}
                        onChange={(e) => setExceptionDraft(curr => curr ? ({ ...curr, overrideStartTime: e.target.value }) : curr)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="종료 시간">
                      <Input
                        type="time"
                        value={exceptionDraft.overrideEndTime}
                        onChange={(e) => setExceptionDraft(curr => curr ? ({ ...curr, overrideEndTime: e.target.value }) : curr)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Form.Item label="메모">
                <Input.TextArea
                  rows={4}
                  placeholder="세미나, 외부 수업, 반차 등 운영 메모"
                  value={exceptionDraft.memo}
                  onChange={(e) => setExceptionDraft(curr => curr ? ({ ...curr, memo: e.target.value }) : curr)}
                />
              </Form.Item>
            </Form>
          </Flex>
        )}
      </Modal>
    </Flex>
  );
}
