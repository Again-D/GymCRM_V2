import { useEffect, useState } from "react";
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
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Checkbox
} from "antd";
import { PlusOutlined, SearchOutlined, RestOutlined, UserOutlined, ContactsOutlined, SolutionOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import { formatDate } from "../../../shared/format";
import { usePagination } from "../../../shared/hooks/usePagination";
import { MembershipPeriodFilter } from "./MembershipPeriodFilter";
import { SelectedMemberContextBadge } from "./SelectedMemberContextBadge";
import { SelectedMemberSummaryCard } from "./SelectedMemberSummaryCard";
import { useMembershipDateFilter } from "../modules/useMembershipDateFilter";
import { useMemberManagementState } from "../modules/useMemberManagementState";
import { useMembersQuery } from "../modules/useMembersQuery";
import { useSelectedMemberStore } from "../modules/SelectedMemberContext";
import type { MemberSummary } from "../modules/types";

const { Title, Text, Paragraph } = Typography;

function operationalStatusColor(status: "정상" | "홀딩중" | "만료임박" | "만료" | "없음" | string) {
  if (status === "정상") return "success";
  if (status === "홀딩중") return "processing";
  if (status === "만료임박") return "warning";
  if (status === "만료") return "error";
  return "default";
}

export function MemberListSection() {
  const navigate = useNavigate();
  const { dateFilter, applyPreset, setDateFrom, setDateTo, reset } = useMembershipDateFilter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [memberStatus, setMemberStatus] = useState("");
  const [membershipOperationalStatus, setMembershipOperationalStatus] = useState("");
  const { selectedMemberId, selectedMember, selectedMemberLoading, clearSelectedMember, selectMember } = useSelectedMemberStore();
  
  const {
    modalState,
    memberForm,
    setMemberForm,
    memberFormSubmitting,
    memberFormError,
    memberFormMessage,
    canManageMembers,
    closeMemberModal,
    startCreateMember,
    openMemberDetail,
    openMemberEdit,
    openMemberDeactivate,
    submitMemberForm,
    deactivateMember
  } = useMemberManagementState({
    selectedMemberId,
    selectMember
  });

  const { members, membersLoading, membersQueryError } = useMembersQuery({
    name,
    phone,
    memberStatus,
    membershipOperationalStatus,
    dateFrom: dateFilter.dateFrom,
    dateTo: dateFilter.dateTo
  });

  const pagination = usePagination(members, {
    initialPageSize: 20,
    resetDeps: [name, phone, memberStatus, membershipOperationalStatus, dateFilter.presetRange, dateFilter.dateFrom, dateFilter.dateTo, members.length]
  });

  useEffect(() => {
    if (!selectedMemberId && !selectedMemberLoading && modalState.kind === "detail") {
      closeMemberModal();
    }
  }, [closeMemberModal, modalState.kind, selectedMemberId, selectedMemberLoading]);

  async function openSelectedMemberSummary(memberId: number) {
    const loaded = await selectMember(memberId);
    if (loaded) {
      openMemberDetail(memberId);
    }
  }

  async function goToMemberContext(path: "/memberships" | "/reservations", memberId: number) {
    const loaded = await selectMember(memberId);
    if (loaded) {
      navigate(path);
    }
  }

  function goToSelectedMemberContext(path: "/memberships" | "/reservations") {
    if (!selectedMemberId) {
      return;
    }
    closeMemberModal();
    navigate(path);
  }

  const memberFormModalTitle = modalState.kind === "create"
    ? "신규 회원 등록"
    : modalState.kind === "edit"
      ? `회원 #${modalState.memberId} 수정`
      : "회원 정보";
  const deactivationMemberId = modalState.kind === "deactivate" ? modalState.memberId : null;

  const columns: ColumnsType<MemberSummary> = [
    {
      title: "ID",
      dataIndex: "memberId",
      key: "memberId",
      width: 70,
      render: (id) => <Text strong>{id}</Text>
    },
    {
      title: "이름",
      dataIndex: "memberName",
      key: "memberName",
      render: (name) => <Text>{name}</Text>
    },
    {
      title: "연락처",
      dataIndex: "phone",
      key: "phone",
      render: (phone) => <Text type="secondary" style={{ fontSize: "0.84rem" }}>{phone}</Text>
    },
    {
      title: "상태",
      dataIndex: "memberStatus",
      key: "memberStatus",
      render: (status) => (
        <Tag color={status === "ACTIVE" ? "success" : "default"} bordered={false} style={{ fontWeight: 600 }}>
          {status === "ACTIVE" ? "활성" : "비활성"}
        </Tag>
      )
    },
    {
      title: "운영 상태",
      dataIndex: "membershipOperationalStatus",
      key: "membershipOperationalStatus",
      render: (status) => (
        <Tag color={operationalStatusColor(status)} bordered={false} style={{ fontWeight: 600 }}>
          {status}
        </Tag>
      )
    },
    {
      title: "만료일",
      dataIndex: "membershipExpiryDate",
      key: "membershipExpiryDate",
      render: (date) => <Text style={{ fontSize: "0.84rem" }}>{formatDate(date)}</Text>
    },
    {
      title: "PT 잔여",
      dataIndex: "remainingPtCount",
      key: "remainingPtCount",
      align: "center",
      render: (count) => <Text strong>{count != null && count > 0 ? count : "-"}</Text>
    },
    {
      title: "가입일",
      dataIndex: "joinDate",
      key: "joinDate",
      render: (date) => <Text type="secondary" style={{ fontSize: "0.84rem" }}>{formatDate(date)}</Text>
    },
    {
      title: "액션",
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              void goToMemberContext("/memberships", record.memberId);
            }}
          >
            회원권
          </Button>
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              void goToMemberContext("/reservations", record.memberId);
            }}
          >
            예약
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1677ff" }}>
              운영 디렉터리
            </Text>
            <Title level={2} style={{ margin: 0 }}>회원 디렉터리</Title>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
              회원 상태를 빠르게 확인하고, 선택한 회원을 다른 업무 화면으로 자연스럽게 넘길 수 있습니다.
            </Paragraph>
            <Space wrap>
              <Tag color="blue">목록 중심</Tag>
              <Tag color="cyan">업무 간 컨텍스트 연동</Tag>
              <Tag color="purple">데스크 + 현장 대응</Tag>
            </Space>
          </Space>
          {canManageMembers && (
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={startCreateMember}>
              회원 등록
            </Button>
          )}
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: "0.75rem", fontWeight: 700 }}>현재 조회 결과</Text>}
              value={members.length}
              suffix={<Text type="secondary" style={{ fontSize: "0.75rem", display: "block" }}>현재 필터 기준 회원 수</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: "0.75rem", fontWeight: 700 }}>선택된 컨텍스트</Text>}
              value={selectedMemberId ?? "-"}
              valueStyle={{ color: selectedMemberId ? "#1677ff" : undefined }}
              suffix={<Text type="secondary" style={{ fontSize: "0.75rem", display: "block" }}>{selectedMemberId ? "업무 연동 중" : "회원 미선택"}</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card style={{ height: "100%" }}>
            <Flex justify="space-between" align="center" style={{ height: "100%" }}>
              <SelectedMemberContextBadge />
              <Space direction="vertical" align="end" size={0}>
                <Text type="secondary" style={{ fontSize: "0.75rem" }}>
                  {selectedMemberId ? "회원 정보를 모달에서 확인할 수 있습니다." : "회원을 선택하면 상세 모달이 열립니다."}
                </Text>
                <Button
                  type="link"
                  icon={<UserOutlined />}
                  disabled={!selectedMemberId}
                  onClick={() => selectedMemberId && openMemberDetail(selectedMemberId)}
                >
                  선택 정보 보기
                </Button>
              </Space>
            </Flex>
          </Card>
        </Col>
      </Row>

      <Card title="검색 및 필터">
        <Form
          layout="vertical"
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={4}>
              <Form.Item label="회원명">
                <Input
                  prefix={<UserOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름 검색"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Form.Item label="연락처">
                <Input
                  prefix={<ContactsOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-..."
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Form.Item label="회원상태">
                <Select
                  value={memberStatus}
                  onChange={setMemberStatus}
                  options={[
                    { label: "전체 상태", value: "" },
                    { label: "활성", value: "ACTIVE" },
                    { label: "비활성", value: "INACTIVE" }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Form.Item label="회원권 상태">
                <Select
                  value={membershipOperationalStatus}
                  onChange={setMembershipOperationalStatus}
                  options={[
                    { label: "전체 상태", value: "" },
                    { label: "정상", value: "정상" },
                    { label: "홀딩중", value: "홀딩중" },
                    { label: "만료임박", value: "만료임박" },
                    { label: "만료", value: "만료" },
                    { label: "회원권 없음", value: "없음" }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={8}>
              <MembershipPeriodFilter
                value={dateFilter}
                onPresetChange={applyPreset}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
            </Col>
          </Row>
          <Flex justify="flex-end" gap={8} style={{ marginTop: 16 }}>
            <Button
              icon={<RestOutlined />}
              onClick={() => {
                setName("");
                setPhone("");
                setMemberStatus("");
                setMembershipOperationalStatus("");
                reset();
              }}
            >
              초기화
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={membersLoading}
            >
              조회
            </Button>
          </Flex>
        </Form>
      </Card>

      {membersQueryError && <Alert message={membersQueryError} type="error" showIcon closable style={{ marginBottom: 16 }} />}

      <Card
        title={
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>회원 작업 리스트</Title>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: "0.84rem" }}>회원을 클릭하면 상세 모달이 열립니다.</Paragraph>
          </Space>
        }
      >
        <Table<MemberSummary>
          rowKey="memberId"
          columns={columns}
          dataSource={pagination.pagedItems}
          loading={membersLoading}
          rowClassName={(record) => record.memberId === selectedMemberId ? "ant-table-row-selected" : ""}
          onRow={(record) => ({
            onClick: () => void openSelectedMemberSummary(record.memberId),
            style: { cursor: "pointer" }
          })}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.totalItems,
            showSizeChanger: true,
            pageSizeOptions: ["20", "50", "100"],
            onChange: (page, pageSize) => {
              pagination.setPage(page);
              pagination.setPageSize(pageSize);
            }
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 상세 모달 */}
      <Modal
        open={modalState.kind === "detail"}
        onCancel={closeMemberModal}
        title={selectedMember ? <Space><SolutionOutlined />{selectedMember.memberName} 회원 정보</Space> : "회원 상세"}
        width={800}
        footer={[
          <Button key="close" onClick={closeMemberModal}>닫기</Button>,
          selectedMemberId && (
            <Button key="deselect" onClick={() => { clearSelectedMember(); closeMemberModal(); }}>선택 해제</Button>
          ),
          canManageMembers && selectedMember && (
            <Button key="edit" onClick={() => openMemberEdit(selectedMember)}>수정</Button>
          ),
          canManageMembers && selectedMemberId && (
            <Button key="deactivate" danger onClick={() => openMemberDeactivate(selectedMemberId)}>비활성화</Button>
          ),
          <Button key="membership" onClick={() => goToSelectedMemberContext("/memberships")}>회원권</Button>,
          <Button key="reservation" type="primary" onClick={() => goToSelectedMemberContext("/reservations")}>예약</Button>
        ].filter(Boolean)}
      >
        <SelectedMemberSummaryCard surface="plain" />
      </Modal>

      {/* 등록/수정 모달 */}
      <Modal
        open={modalState.kind === "create" || modalState.kind === "edit"}
        onCancel={closeMemberModal}
        title={memberFormModalTitle}
        width={800}
        confirmLoading={memberFormSubmitting}
        onOk={() => void submitMemberForm()}
        okText="저장"
        cancelText="닫기"
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          {memberFormMessage && <Alert message={memberFormMessage} type="success" showIcon style={{ marginBottom: 16 }} />}
          {memberFormError && <Alert message={memberFormError} type="error" showIcon style={{ marginBottom: 16 }} />}
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="회원명" required>
                <Input
                  autoFocus
                  value={memberForm.memberName}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, memberName: e.target.value }))}
                  placeholder="회원 이름"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="연락처" required>
                <Input
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="010-1234-5678"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="이메일">
                <Input
                  value={memberForm.email}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="선택 입력"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="성별">
                <Select
                  value={memberForm.gender}
                  onChange={(val) => setMemberForm(prev => ({ ...prev, gender: val }))}
                  options={[
                    { label: "선택 안 함", value: "" },
                    { label: "남성", value: "MALE" },
                    { label: "여성", value: "FEMALE" },
                    { label: "기타", value: "OTHER" }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="생년월일">
                <DatePicker
                  style={{ width: "100%" }}
                  value={memberForm.birthDate ? dayjs(memberForm.birthDate) : null}
                  onChange={(date) => setMemberForm(prev => ({ ...prev, birthDate: date ? date.format("YYYY-MM-DD") : "" }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="가입일">
                <DatePicker
                  style={{ width: "100%" }}
                  value={memberForm.joinDate ? dayjs(memberForm.joinDate) : null}
                  onChange={(date) => setMemberForm(prev => ({ ...prev, joinDate: date ? date.format("YYYY-MM-DD") : "" }))}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item label="수신 동의">
            <Space size="large">
              <Checkbox
                checked={memberForm.consentSms}
                onChange={(e) => setMemberForm(prev => ({ ...prev, consentSms: e.target.checked }))}
              >
                SMS 수신 동의
              </Checkbox>
              <Checkbox
                checked={memberForm.consentMarketing}
                onChange={(e) => setMemberForm(prev => ({ ...prev, consentMarketing: e.target.checked }))}
              >
                마케팅 수신 동의
              </Checkbox>
            </Space>
          </Form.Item>
          
          <Form.Item label="메모">
            <Input.TextArea
              rows={4}
              value={memberForm.memo}
              onChange={(e) => setMemberForm(prev => ({ ...prev, memo: e.target.value }))}
              placeholder="회원 메모를 남길 수 있습니다."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 비활성화 모달 */}
      <Modal
        open={modalState.kind === "deactivate"}
        onCancel={closeMemberModal}
        title={selectedMember ? `${selectedMember.memberName} 비활성화` : "회원 비활성화"}
        confirmLoading={memberFormSubmitting}
        onOk={() => {
          if (deactivationMemberId != null) {
            void deactivateMember(deactivationMemberId);
          }
        }}
        okText="비활성화"
        okButtonProps={{ danger: true }}
        cancelText="취소"
      >
        <Flex vertical gap={16} style={{ marginTop: 16 }}>
          {memberFormError && <Alert message={memberFormError} type="error" showIcon />}
          <Text strong>선택한 회원을 삭제하지 않고 비활성 상태로 전환합니다.</Text>
          <Text type="secondary">
            비활성 회원은 목록에 계속 남고, 운영 상태는 유지되지만 신규 업무 진입 전 상태 확인이 필요합니다.
          </Text>
          <Alert
            message="확인 필요"
            description={selectedMember ? `${selectedMember.memberName} (#${selectedMember.memberId}) 회원을 비활성화합니다.` : "이 회원을 비활성화합니다."}
            type="warning"
            showIcon
          />
        </Flex>
      </Modal>
    </Flex>
  );
}
