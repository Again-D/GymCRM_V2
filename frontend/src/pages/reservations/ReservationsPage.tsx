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
  Modal,
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
  CalendarOutlined,
  UserOutlined,
  SearchOutlined,
  PlusOutlined,
  SolutionOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useAuthState } from "../../app/auth";
import { hasRole } from "../../app/roles";
import { todayLocalDate } from "../../shared/date";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";
import { createDefaultTrainerFilters } from "../trainers/modules/types";
import { useTrainersQuery } from "../trainers/modules/useTrainersQuery";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { PurchasedMembership } from "../members/modules/types";
import { getReservationPanelErrorMessage } from "./modules/getReservationPanelErrorMessage";
import { isMembershipReservableOn } from "./modules/reservableMemberships";
import { usePtReservationCandidatesQuery } from "./modules/usePtReservationCandidatesQuery";
import { useReservationSchedulesQuery } from "./modules/useReservationSchedulesQuery";
import { useReservationTargetsQuery } from "./modules/useReservationTargetsQuery";
import { useSelectedMemberReservationsState } from "./modules/useSelectedMemberReservationsState";

import styles from "./ReservationsPage.module.css";

const { Paragraph, Text, Title } = Typography;

type ReservationCreateForm = {
  membershipId: string;
  scheduleId: string;
  trainerUserId: string;
  reservationDate: string;
  ptCandidateStartAt: string;
  memo: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function buildReservationStatusTag(status: string) {
  if (status === "CONFIRMED") return <Tag color="success">예약 확정</Tag>;
  if (status === "ATTENDED") return <Tag color="processing">출석</Tag>;
  if (status === "CANCELLED") return <Tag>취소</Tag>;
  if (status === "NO_SHOW") return <Tag color="error">노쇼</Tag>;
  return <Tag>{status}</Tag>;
}

function createEmptyReservationCreateForm(businessDateText: string): ReservationCreateForm {
  return {
    membershipId: "",
    scheduleId: "",
    trainerUserId: "",
    reservationDate: businessDateText,
    ptCandidateStartAt: "",
    memo: "",
  };
}

function getMembershipReservationKind(membership: Pick<PurchasedMembership, "productCategorySnapshot"> | null | undefined) {
  return membership?.productCategorySnapshot === "PT" ? "PT" : "GX";
}

function describeMembershipOption(membership: PurchasedMembership) {
  const reservationKind = getMembershipReservationKind(membership);
  const remainingText = membership.productTypeSnapshot === "COUNT"
    ? `잔여 ${membership.remainingCount ?? 0}회`
    : membership.endDate
      ? `${membership.endDate}까지`
      : "기간형";
  return `${reservationKind} · ${membership.productNameSnapshot} (${remainingText})`;
}

export default function ReservationsPage() {
  const { token } = theme.useToken();
  const { authUser } = useAuthState();
  const { selectedMember, selectedMemberId, selectMember, selectedMemberLoading } = useSelectedMemberStore();
  const isTrainerActor = hasRole(authUser, "ROLE_TRAINER");
  
  const {
    reservationTargets,
    reservationTargetsKeyword,
    setReservationTargetsKeyword,
    loadReservationTargets
  } = useReservationTargetsQuery();
  const debouncedReservationTargetsKeyword = useDebouncedValue(reservationTargetsKeyword, 250);
  
  const {
    selectedMemberMemberships,
    selectedMemberMembershipsLoading,
    selectedMemberMembershipsError,
    loadSelectedMemberMemberships,
    resetSelectedMemberMembershipsQuery
  } = useSelectedMemberMembershipsQuery();
  
  const {
    reservationSchedules,
    reservationSchedulesLoading,
    reservationSchedulesError,
    loadReservationSchedules,
    resetReservationSchedulesQuery
  } = useReservationSchedulesQuery();
  
  const {
    trainers,
    trainersLoading,
    trainersQueryError,
    refetchTrainers,
  } = useTrainersQuery({
    ...createDefaultTrainerFilters(authUser?.centerId ?? 1),
    status: "ACTIVE",
  });
  
  const {
    ptReservationCandidates,
    ptReservationCandidatesLoading,
    ptReservationCandidatesError,
    loadPtReservationCandidates,
    resetPtReservationCandidatesQuery,
  } = usePtReservationCandidatesQuery();
  
  const {
    selectedMemberReservations,
    loadSelectedMemberReservations,
    resetSelectedMemberReservationsState,
    createReservation,
    createPtReservation,
    checkInReservation,
    completeReservation,
    cancelReservation,
  } = useSelectedMemberReservationsState();

  const businessDateText = todayLocalDate();
  const [reservationCreateForm, setReservationCreateForm] = useState<ReservationCreateForm>(
    () => createEmptyReservationCreateForm(businessDateText)
  );
  const [reservationPanelMessage, setReservationPanelMessage] = useState<string | null>(null);
  const [reservationPanelError, setReservationPanelError] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);

  const targetsPagination = usePagination(reservationTargets, {
    initialPageSize: 10,
    resetDeps: [reservationTargetsKeyword, reservationTargets.length]
  });
  const reservationsPagination = usePagination(selectedMemberReservations, {
    initialPageSize: 10,
    resetDeps: [selectedMemberId, selectedMemberReservations.length]
  });

  const reservableMemberships = selectedMemberMemberships.filter((membership) =>
    isMembershipReservableOn(membership, businessDateText)
  );
  
  const selectedCreateMembership = useMemo(
    () => reservableMemberships.find((membership) => membership.membershipId === Number(reservationCreateForm.membershipId)) ?? null,
    [reservationCreateForm.membershipId, reservableMemberships],
  );
  
  const selectedCreateMode = getMembershipReservationKind(selectedCreateMembership);
  
  const gxReservationSchedules = useMemo(
    () => reservationSchedules.filter((schedule) => schedule.scheduleType === "GX"),
    [reservationSchedules],
  );
  
  const trainerOptions = useMemo(() => {
    if (isTrainerActor && authUser) {
      return [{
        userId: authUser.userId,
        displayName: authUser.username,
      }];
    }
    return trainers.map((trainer) => ({
      userId: trainer.userId,
      displayName: trainer.displayName,
    }));
  }, [authUser, isTrainerActor, trainers]);
  
  const selectedTrainerOption = useMemo(
    () => trainerOptions.find((trainer) => String(trainer.userId) === reservationCreateForm.trainerUserId) ?? null,
    [reservationCreateForm.trainerUserId, trainerOptions],
  );
  
  const canSubmitReservation = useMemo(() => {
    if (!selectedMemberId || !selectedCreateMembership || selectedMemberMembershipsLoading) {
      return false;
    }
    if (selectedCreateMode === "PT") {
      return Boolean(
        reservationCreateForm.trainerUserId &&
        reservationCreateForm.reservationDate &&
        reservationCreateForm.ptCandidateStartAt &&
        !ptReservationCandidatesLoading,
      );
    }
    return Boolean(
      reservationCreateForm.scheduleId &&
      !reservationSchedulesLoading,
    );
  }, [
    ptReservationCandidatesLoading,
    reservationCreateForm.ptCandidateStartAt,
    reservationCreateForm.reservationDate,
    reservationCreateForm.scheduleId,
    reservationCreateForm.trainerUserId,
    reservationSchedulesLoading,
    selectedCreateMembership,
    selectedCreateMode,
    selectedMemberId,
    selectedMemberMembershipsLoading,
  ]);

  useEffect(() => {
    void loadReservationTargets(debouncedReservationTargetsKeyword);
  }, [debouncedReservationTargetsKeyword, loadReservationTargets]);

  useEffect(() => {
    void loadReservationSchedules();
    return () => {
      resetReservationSchedulesQuery();
    };
  }, [loadReservationSchedules, resetReservationSchedulesQuery]);

  useEffect(() => {
    if (selectedMemberId == null) {
      resetSelectedMemberMembershipsQuery();
      resetSelectedMemberReservationsState();
      resetPtReservationCandidatesQuery();
      setReservationCreateForm(createEmptyReservationCreateForm(businessDateText));
      setReservationPanelMessage(null);
      setReservationPanelError(null);
      return;
    }

    void loadSelectedMemberMemberships(selectedMemberId);
    void loadSelectedMemberReservations(selectedMemberId);
    resetPtReservationCandidatesQuery();
    setReservationCreateForm(createEmptyReservationCreateForm(businessDateText));
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, [
    businessDateText,
    loadSelectedMemberMemberships,
    loadSelectedMemberReservations,
    resetSelectedMemberMembershipsQuery,
    resetPtReservationCandidatesQuery,
    resetSelectedMemberReservationsState,
    selectedMemberId
  ]);

  const clearPanelFeedback = useCallback(() => {
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, []);

  const resetCreateForm = useCallback(() => {
    resetPtReservationCandidatesQuery();
    setReservationCreateForm(createEmptyReservationCreateForm(todayLocalDate()));
  }, [resetPtReservationCandidatesQuery]);

  const closeNewReservationModal = useCallback(() => {
    setIsNewModalOpen(false);
    if (selectedMemberId != null) {
      setIsWorkbenchOpen(true);
    }
    resetCreateForm();
  }, [resetCreateForm, selectedMemberId]);

  const openNewReservationModal = useCallback(() => {
    clearPanelFeedback();
    resetCreateForm();
    setIsWorkbenchOpen(false);
    setIsNewModalOpen(true);
  }, [clearPanelFeedback, resetCreateForm]);

  const handleReservationCreateSubmit = async () => {
    clearPanelFeedback();

    if (!selectedMemberId) {
      setReservationPanelError("회원이 선택되지 않았습니다.");
      return;
    }

    const membershipId = Number(reservationCreateForm.membershipId);
    const membership = reservableMemberships.find((item) => item.membershipId === membershipId);
    if (!membership) {
      setReservationPanelError("예약 회원권을 선택해 주세요.");
      return;
    }
    if (selectedCreateMode === "PT") {
      if (!reservationCreateForm.trainerUserId || !reservationCreateForm.ptCandidateStartAt) {
        setReservationPanelError("담당 트레이너와 가능한 PT 시간을 선택해 주세요.");
        return;
      }
    } else if (!reservationCreateForm.scheduleId) {
      setReservationPanelError("수업 일정을 선택해 주세요.");
      return;
    }

    try {
      const reservation = selectedCreateMode === "PT"
        ? await createPtReservation({
            memberId: selectedMemberId,
            membershipId,
            trainerUserId: Number(reservationCreateForm.trainerUserId),
            startAt: reservationCreateForm.ptCandidateStartAt,
            memo: reservationCreateForm.memo,
          })
        : await createReservation({
            memberId: selectedMemberId,
            membershipId,
            scheduleId: Number(reservationCreateForm.scheduleId),
            memo: reservationCreateForm.memo,
          });
      await Promise.all([
        loadSelectedMemberReservations(selectedMemberId),
        loadSelectedMemberMemberships(selectedMemberId),
        loadReservationTargets(debouncedReservationTargetsKeyword)
      ]);
      resetCreateForm();
      setReservationPanelMessage(`예약 #${reservation.reservationId}이(가) 생성되었습니다.`);
      setIsNewModalOpen(false);
      setIsWorkbenchOpen(true);
    } catch (error) {
      setReservationPanelError(getReservationPanelErrorMessage(error, "예약 생성에 실패했습니다."));
    }
  };

  const mutateReservation = useCallback(async (
    actionLabel: string,
    mutate: () => Promise<void>,
    canMutate: boolean,
    errorMessage: string
  ) => {
    clearPanelFeedback();
    if (!canMutate) {
      setReservationPanelError(errorMessage);
      return;
    }
    if (!selectedMemberId) return;

    try {
      await mutate();
      await Promise.all([
        loadSelectedMemberReservations(selectedMemberId),
        loadSelectedMemberMemberships(selectedMemberId),
        loadReservationTargets(debouncedReservationTargetsKeyword)
      ]);
      setReservationPanelMessage(`완료: ${actionLabel}`);
    } catch (error) {
      setReservationPanelError(getReservationPanelErrorMessage(error, `${actionLabel} 처리 실패.`));
    }
  }, [
    clearPanelFeedback,
    debouncedReservationTargetsKeyword,
    loadReservationTargets,
    loadSelectedMemberMemberships,
    loadSelectedMemberReservations,
    selectedMemberId
  ]);

  useEffect(() => {
    if (!isNewModalOpen || selectedCreateMode !== "PT" || isTrainerActor) {
      return;
    }
    void refetchTrainers();
  }, [isNewModalOpen, isTrainerActor, refetchTrainers, selectedCreateMode]);

  useEffect(() => {
    if (!selectedCreateMembership) {
      return;
    }
    if (selectedCreateMode === "PT") {
      const nextTrainerUserId = isTrainerActor
        ? String(authUser?.userId ?? "")
        : selectedCreateMembership.assignedTrainerId
          ? String(selectedCreateMembership.assignedTrainerId)
          : reservationCreateForm.trainerUserId;
      setReservationCreateForm((current) => {
        const nextReservationDate = current.reservationDate || todayLocalDate();
        if (
          current.scheduleId === "" &&
          current.trainerUserId === nextTrainerUserId &&
          current.reservationDate === nextReservationDate &&
          current.ptCandidateStartAt === ""
        ) {
          return current;
        }
        return {
          ...current,
          scheduleId: "",
          trainerUserId: nextTrainerUserId,
          reservationDate: nextReservationDate,
          ptCandidateStartAt: "",
        };
      });
      return;
    }
    setReservationCreateForm((current) => {
      if (current.trainerUserId === "" && current.ptCandidateStartAt === "") {
        return current;
      }
      return {
        ...current,
        trainerUserId: "",
        ptCandidateStartAt: "",
      };
    });
  }, [
    authUser?.userId,
    isTrainerActor,
    reservationCreateForm.trainerUserId,
    selectedCreateMembership,
    selectedCreateMode,
  ]);

  useEffect(() => {
    if (
      !isNewModalOpen ||
      selectedCreateMode !== "PT" ||
      !selectedCreateMembership ||
      !reservationCreateForm.trainerUserId ||
      !reservationCreateForm.reservationDate
    ) {
      resetPtReservationCandidatesQuery();
      return;
    }
    void loadPtReservationCandidates({
      membershipId: selectedCreateMembership.membershipId,
      trainerUserId: Number(reservationCreateForm.trainerUserId),
      date: reservationCreateForm.reservationDate,
    });
  }, [
    isNewModalOpen,
    loadPtReservationCandidates,
    reservationCreateForm.reservationDate,
    reservationCreateForm.trainerUserId,
    resetPtReservationCandidatesQuery,
    selectedCreateMembership,
    selectedCreateMode,
  ]);

  const targetColumns: ColumnsType<(typeof reservationTargets)[number]> = [
    {
      title: "회원",
      key: "member",
      render: (_, target) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: "0.95rem" }}>{target.memberName}</Text>
          <Text type="secondary" style={{ fontSize: "0.75rem" }}>{target.phone}</Text>
        </Space>
      )
    },
    {
      title: "확정 예약",
      dataIndex: "confirmedReservationCount",
      key: "confirmedReservationCount",
      align: "center",
      render: (count) => <Tag color="blue" bordered={false} style={{ fontWeight: 600 }}>{count}건</Tag>
    },
    {
      title: "액션",
      key: "actions",
      align: "right",
      render: (_, target) => {
        const isSelected = selectedMember?.memberId === target.memberId;
        return (
          <Button
            type={isSelected ? "primary" : "default"}
            disabled={selectedMemberLoading}
            onClick={async () => {
              setIsWorkbenchOpen(true);
              const success = await selectMember(target.memberId);
              if (!success) {
                setIsWorkbenchOpen(false);
              }
            }}
          >
            {isSelected ? "워크벤치 열기" : "선택 후 조회"}
          </Button>
        );
      }
    }
  ];

  const reservationColumns: ColumnsType<(typeof selectedMemberReservations)[number]> = [
    {
      title: "일정 정보",
      key: "reservedAt",
      render: (_, reservation) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: "0.9rem" }}>{formatDateTime(reservation.reservedAt)}</Text>
          <Text type="secondary" style={{ fontSize: "0.75rem" }}>ID: #{reservation.reservationId}</Text>
        </Space>
      )
    },
    {
      title: "상태",
      dataIndex: "reservationStatus",
      key: "reservationStatus",
      render: (status) => buildReservationStatusTag(status)
    },
    {
      title: "운영 액션",
      key: "actions",
      align: "right",
      render: (_, reservation) => {
        const canMutate = reservation.reservationStatus === "CONFIRMED";
        const canCheckIn = canMutate && !reservation.checkedInAt;
        return (
          <Space wrap>
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              disabled={!canCheckIn}
              onClick={() =>
                mutateReservation(
                  "체크인 처리",
                  () => checkInReservation(selectedMemberId!, reservation.reservationId).then(() => undefined),
                  canCheckIn,
                  "이미 체크인되었거나 유효하지 않은 상태입니다."
                )
              }
            >
              체크인
            </Button>
            <Button
              size="small"
              disabled={!canMutate}
              onClick={() =>
                mutateReservation(
                  "완료 처리",
                  () => completeReservation(selectedMemberId!, reservation.reservationId).then(() => undefined),
                  canMutate,
                  "확정된 예약만 완료 처리할 수 있습니다."
                )
              }
            >
              완료
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              disabled={!canMutate}
              onClick={() =>
                mutateReservation(
                  "예약 취소",
                  () => cancelReservation(selectedMemberId!, reservation.reservationId).then(() => undefined),
                  canMutate,
                  "확정된 예약만 취소할 수 있습니다."
                )
              }
            >
              취소
            </Button>
          </Space>
        );
      }
    }
  ];

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="start" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1677ff" }}>
              RESERVATION OPS
            </Text>
            <Title level={2} style={{ margin: 0 }}>
              예약 관리
            </Title>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
              회원을 선택하고 현재 예약을 확인하며 서비스 화면을 벗어나지 않고 신규 예약을 등록합니다.
            </Paragraph>
            <Space wrap className="mt-xs">
              <Tag color="blue">워크벤치 모달</Tag>
              <Tag color="cyan">PT/GX 통합 예약</Tag>
              <Tag color="purple">실시간 상태 처리</Tag>
            </Space>
          </Space>
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        {[
          { label: "예약 대상 회원", value: reservationTargets.length, hint: "디렉터리 검색 결과", icon: <UserOutlined /> },
          { 
            label: "선택된 회원", 
            value: selectedMember ? selectedMember.memberName : "없음", 
            hint: selectedMember ? `#${selectedMember.memberId}` : "조회 대상을 선택하세요", 
            color: selectedMember ? "#1677ff" : undefined,
            icon: <SolutionOutlined />,
            extra: selectedMember && <Button size="small" type="primary" ghost onClick={() => setIsWorkbenchOpen(true)}>열기</Button>
          },
          { label: "전체 확정 예약", value: reservationTargets.reduce((acc, target) => acc + target.confirmedReservationCount, 0), hint: "시스템 전체 활성 통계", icon: <CalendarOutlined /> }
        ].map((stat) => (
          <Col xs={24} sm={8} key={stat.label}>
            <Card>
              <Flex justify="space-between" align="start">
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>{stat.label}</Text>}
                  value={stat.value}
                  valueStyle={{ fontWeight: 800, color: stat.color, fontSize: typeof stat.value === 'string' ? '1.2rem' : undefined }}
                  prefix={stat.icon}
                  suffix={<Text type="secondary" style={{ fontSize: "0.75rem", display: "block" }}>{stat.hint}</Text>}
                />
                {stat.extra}
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={
          <Space>
            <SearchOutlined />
            <Text strong>예약 디렉터리</Text>
          </Space>
        }
        extra={<Text type="secondary">회원을 찾아 예약 워크벤치로 고정합니다.</Text>}
      >
        <Flex vertical gap={16}>
          <Form layout="inline" onFinish={() => void loadReservationTargets(reservationTargetsKeyword)}>
            <Form.Item style={{ flex: 1, marginRight: 8 }}>
              <Input
                size="large"
                prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
                value={reservationTargetsKeyword}
                onChange={(e) => setReservationTargetsKeyword(e.target.value)}
                placeholder="이름 또는 전화번호 입력"
              />
            </Form.Item>
            <Button size="large" type="primary" htmlType="submit">조회</Button>
          </Form>

          <Table
            rowKey="memberId"
            columns={targetColumns}
            dataSource={targetsPagination.pagedItems}
            pagination={{
              current: targetsPagination.page,
              pageSize: targetsPagination.pageSize,
              total: targetsPagination.totalItems,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              onChange: (page, pageSize) => {
                targetsPagination.setPage(page);
                targetsPagination.setPageSize(pageSize);
              }
            }}
            rowClassName={(target) => selectedMember?.memberId === target.memberId ? styles.selectedRow : ""}
            loading={selectedMemberLoading}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="조회된 회원이 없습니다." />
            }}
          />
        </Flex>
      </Card>

      {/* 워크벤치 모달 */}
      <Modal
        open={isWorkbenchOpen}
        onCancel={() => setIsWorkbenchOpen(false)}
        title={
          <Space>
            <CalendarOutlined />
            <Text strong style={{ fontSize: "1.1rem" }}>
              예약 워크벤치: {selectedMember?.memberName ?? "회원"} (#{selectedMember?.memberId ?? "-"})
            </Text>
          </Space>
        }
        width={900}
        footer={[<Button key="close" onClick={() => setIsWorkbenchOpen(false)}>워크벤치 닫기</Button>]}
      >
        <Flex vertical gap={24} style={{ marginTop: 16 }}>
          <Card 
            size="small" 
            title={<Space><ClockCircleOutlined /> 현재 예약 내역</Space>}
            extra={selectedMember && <Button type="primary" onClick={openNewReservationModal}>신규 예약 등록</Button>}
          >
            <Flex vertical gap={16}>
              <Table
                size="small"
                rowKey="reservationId"
                columns={reservationColumns}
                dataSource={reservationsPagination.pagedItems}
                pagination={{
                  current: reservationsPagination.page,
                  pageSize: reservationsPagination.pageSize,
                  total: reservationsPagination.totalItems,
                  size: "small",
                  onChange: (page, pageSize) => {
                    reservationsPagination.setPage(page);
                    reservationsPagination.setPageSize(pageSize);
                  }
                }}
                locale={{
                  emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="확정된 예약 내역이 없습니다." />
                }}
              />
            </Flex>
          </Card>

          {reservationPanelMessage && <Alert type="success" showIcon message={reservationPanelMessage} closable />}
          {reservationPanelError && <Alert type="error" showIcon message={reservationPanelError} closable />}
        </Flex>
      </Modal>

      {/* 신규 예약 등록 모달 */}
      <Modal
        open={isNewModalOpen}
        onCancel={closeNewReservationModal}
        title={selectedMember ? `신규 예약 등록: ${selectedMember.memberName}` : "신규 예약 등록"}
        width={600}
        footer={[
          <Button key="cancel" onClick={closeNewReservationModal}>취소</Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => void handleReservationCreateSubmit()} 
            disabled={!canSubmitReservation}
          >
            예약 등록
          </Button>
        ]}
      >
        <Flex vertical gap={16} style={{ marginTop: 16 }}>
          <Alert 
            type="info" 
            showIcon 
            message={selectedMember ? `${selectedMember.memberName} 회원을 위한 예약 설정` : "회원을 먼저 선택하세요"}
            description={selectedCreateMode === "PT" ? "PT는 트레이너 가능 시간에서 60분 블록으로 예약합니다." : "GX는 운영 중인 고정 수업 슬롯에 예약합니다."}
          />

          {selectedMemberMembershipsError && <Alert type="error" showIcon message={selectedMemberMembershipsError} />}
          {reservationSchedulesError && selectedCreateMode !== "PT" && <Alert type="error" showIcon message={reservationSchedulesError} />}
          {trainersQueryError && selectedCreateMode === "PT" && <Alert type="error" showIcon message={trainersQueryError} />}
          {ptReservationCandidatesError && selectedCreateMode === "PT" && <Alert type="error" showIcon message={ptReservationCandidatesError} />}
          
          <Form layout="vertical">
            <Form.Item label="예약 회원권" required>
              <Select
                placeholder={selectedMemberId ? "회원권 선택" : "먼저 회원을 조회하세요"}
                value={reservationCreateForm.membershipId || undefined}
                loading={selectedMemberMembershipsLoading}
                disabled={!selectedMemberId || selectedMemberMembershipsLoading || reservableMemberships.length === 0}
                onChange={(val) => setReservationCreateForm(prev => ({
                  ...prev,
                  membershipId: val,
                  scheduleId: "",
                  trainerUserId: "",
                  ptCandidateStartAt: "",
                }))}
                options={reservableMemberships.map(m => ({
                  label: describeMembershipOption(m),
                  value: String(m.membershipId)
                }))}
              />
              {selectedCreateMembership && (
                <Text type="secondary" style={{ fontSize: "0.75rem", marginTop: 4, display: "block" }}>
                  {selectedCreateMode === "PT" ? "PT 횟수제 검증 후 예약됩니다." : "GX 고정 슬롯 기준으로 예약됩니다."}
                </Text>
              )}
            </Form.Item>

            {selectedCreateMode === "PT" ? (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="담당 트레이너" required>
                      <Select
                        placeholder="트레이너 선택"
                        value={reservationCreateForm.trainerUserId || undefined}
                        disabled={isTrainerActor || trainersLoading}
                        loading={trainersLoading}
                        onChange={(val) => setReservationCreateForm(prev => ({
                          ...prev,
                          trainerUserId: val,
                          ptCandidateStartAt: "",
                        }))}
                        options={trainerOptions.map(t => ({
                          label: t.displayName,
                          value: String(t.userId)
                        }))}
                      />
                      {selectedTrainerOption ? (
                        <Text type="secondary" style={{ fontSize: "0.75rem", marginTop: 4, display: "block" }}>
                          담당 트레이너 기본값: {selectedTrainerOption.displayName}
                        </Text>
                      ) : null}
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="예약 날짜" required>
                      <DatePicker
                        style={{ width: "100%" }}
                        value={reservationCreateForm.reservationDate ? dayjs(reservationCreateForm.reservationDate) : null}
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                        onChange={(date) => setReservationCreateForm(prev => ({
                          ...prev,
                          reservationDate: date ? date.format("YYYY-MM-DD") : "",
                          ptCandidateStartAt: "",
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="가능 시간 선택" required>
                  <Select
                    placeholder="시간 선택"
                    value={reservationCreateForm.ptCandidateStartAt || undefined}
                    loading={ptReservationCandidatesLoading}
                    disabled={ptReservationCandidatesLoading || !reservationCreateForm.trainerUserId || !reservationCreateForm.reservationDate}
                    onChange={(val) => setReservationCreateForm(prev => ({ ...prev, ptCandidateStartAt: val }))}
                    options={(ptReservationCandidates?.items ?? []).map(c => ({
                      label: `${dayjs(c.startAt).format("HH:mm")} ~ ${dayjs(c.endAt).format("HH:mm")}`,
                      value: c.startAt
                    }))}
                  />
                  {!ptReservationCandidatesLoading && reservationCreateForm.reservationDate && (ptReservationCandidates?.items.length ?? 0) === 0 && (
                    <Text type="danger" style={{ fontSize: "0.75rem" }}>선택한 날짜에 가능한 PT 시간이 없습니다.</Text>
                  )}
                </Form.Item>
              </>
            ) : (
              <Form.Item label="수업 일정 선택" required>
                <Select
                  placeholder="GX 일정 선택"
                  value={reservationCreateForm.scheduleId || undefined}
                  loading={reservationSchedulesLoading}
                  disabled={reservationSchedulesLoading || gxReservationSchedules.length === 0}
                  onChange={(val) => setReservationCreateForm(prev => ({ ...prev, scheduleId: val }))}
                  options={gxReservationSchedules.map(s => ({
                    label: `${s.slotTitle} (${s.trainerName})`,
                    value: String(s.scheduleId)
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item label="메모" style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={3}
                placeholder="예약 관련 특이사항 입력"
                value={reservationCreateForm.memo}
                onChange={(e) => setReservationCreateForm(prev => ({ ...prev, memo: e.target.value }))}
              />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>
    </Flex>
  );
}
