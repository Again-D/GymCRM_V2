import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import {
  MANAGEABLE_ROLE_OPTIONS,
  createDefaultUserAccountFilters,
  getCreateRoleOptions,
  type UserAccountFilters,
  type UserAccountCreateRequest,
  type UserAccountRecord,
  type UserRoleCode,
  USER_ROLE_FILTER_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
} from "./modules/types";
import { useAuthState } from "../../app/auth";
import { hasAnyRole, hasRole } from "../../app/roles";
import { useAccountOpsMutations } from "./modules/useAccountOpsMutations";
import { useUserAccountsQuery } from "./modules/useUserAccountsQuery";

const { Title, Paragraph, Text } = Typography;

const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_POLICY_MESSAGE = "8자 이상이며 문자, 숫자, 특수문자를 모두 포함해야 합니다.";
type UserAccountCreateFormValues = UserAccountCreateRequest;

const PAGE_SIZE_OPTIONS = ["10", "20", "50"];

export default function UserAccountsPage() {
  const { authUser } = useAuthState();
  const [createForm] = Form.useForm<UserAccountCreateFormValues>();
  const [draftFilters, setDraftFilters] = useState<UserAccountFilters>(
    createDefaultUserAccountFilters(),
  );
  const [appliedFilters, setAppliedFilters] = useState<UserAccountFilters>(
    createDefaultUserAccountFilters(),
  );
  const [roleEditorUser, setRoleEditorUser] = useState<UserAccountRecord | null>(
    null,
  );
  const [roleDraft, setRoleDraft] = useState<UserRoleCode>("ROLE_MANAGER");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { userAccounts, userAccountsPage, userAccountsLoading, userAccountsError } =
    useUserAccountsQuery(appliedFilters);
  const { createAccount, revokeAccess, changeRole, changeStatus } = useAccountOpsMutations();
  const canEditAdminUsers = hasRole(authUser, "ROLE_SUPER_ADMIN");
  const canCreateAccounts = hasAnyRole(authUser, ["ROLE_SUPER_ADMIN", "ROLE_ADMIN"]);
  const isSuperAdmin = hasRole(authUser, "ROLE_SUPER_ADMIN");
  const createRoleOptions = useMemo(() => getCreateRoleOptions(isSuperAdmin), [isSuperAdmin]);

  const columns = useMemo<ColumnsType<UserAccountRecord>>(
    () => [
      {
        title: "로그인 ID",
        dataIndex: "loginId",
        key: "loginId",
        width: 160,
      },
      {
        title: "이름",
        dataIndex: "userName",
        key: "userName",
        width: 160,
      },
      {
        title: "역할",
        dataIndex: "roleCode",
        key: "roleCode",
        render: (roleCode: UserRoleCode) => <Tag color="blue">{roleCode}</Tag>,
        width: 140,
      },
      {
        title: "상태",
        dataIndex: "userStatus",
        key: "userStatus",
        render: (userStatus: string) => (
          <Tag color={userStatus === "ACTIVE" ? "green" : "default"}>
            {userStatus}
          </Tag>
        ),
        width: 120,
      },
      {
        title: "비밀번호 상태",
        dataIndex: "passwordChangeRequired",
        key: "passwordChangeRequired",
        render: (passwordChangeRequired: boolean) => (
          <Tag color={passwordChangeRequired ? "warning" : "green"}>
            {passwordChangeRequired ? "임시 비밀번호" : "정상"}
          </Tag>
        ),
        width: 150,
      },
      {
        title: "최근 로그인",
        dataIndex: "lastLoginAt",
        key: "lastLoginAt",
        render: (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-"),
        width: 180,
      },
      {
        title: "접속 제한 시점",
        dataIndex: "accessRevokedAfter",
        key: "accessRevokedAfter",
        render: (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-"),
        width: 180,
      },
      {
        title: "작업",
        key: "actions",
        fixed: "right",
        width: 260,
        render: (_: unknown, user: UserAccountRecord) => (
          <Space size="small" wrap>
            <Button
              size="small"
              onClick={() => openRoleEditor(user)}
              disabled={user.roleCode === "ROLE_ADMIN" && !canEditAdminUsers}
            >
              역할 변경
            </Button>
            <Button size="small" onClick={() => void confirmRevokeAccess(user)}>
              접속 취소
            </Button>
            <Button size="small" onClick={() => void confirmStatusToggle(user)}>
              {user.userStatus === "ACTIVE" ? "비활성화" : "활성화"}
            </Button>
          </Space>
        ),
      },
    ],
    [canEditAdminUsers, confirmRevokeAccess, confirmStatusToggle, openRoleEditor],
  );

  function applyFilters() {
    setAppliedFilters({ ...draftFilters, page: 1 });
  }

  function resetFilters() {
    const defaultFilters = createDefaultUserAccountFilters();
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }

  function openRoleEditor(user: UserAccountRecord) {
    setRoleEditorUser(user);
    setRoleDraft(user.roleCode === "ROLE_ADMIN" ? "ROLE_MANAGER" : user.roleCode);
  }

  function openCreateDialog() {
    setCreateError(null);
    createForm.resetFields();
    createForm.setFieldsValue({
      loginId: "",
      userName: "",
      roleCode: createRoleOptions[0]?.value ?? "ROLE_MANAGER",
      temporaryPassword: "",
    });
    setCreateDialogOpen(true);
  }

  function closeCreateDialog() {
    setCreateDialogOpen(false);
    setCreateError(null);
    createForm.resetFields();
  }

  function passwordPolicyValidator(_: unknown, value: string | undefined) {
    if (!value || PASSWORD_POLICY_REGEX.test(value)) {
      return Promise.resolve();
    }
    return Promise.reject(new Error(PASSWORD_POLICY_MESSAGE));
  }

  async function confirmRevokeAccess(user: UserAccountRecord) {
    Modal.confirm({
      title: "접속 권한을 취소할까요?",
      content: `${user.userName} (${user.loginId})의 기존 토큰을 무효화합니다.`,
      okText: "접속 취소",
      cancelText: "닫기",
      onOk: async () => {
        try {
          await revokeAccess(user);
          message.success("접속 권한을 취소했습니다.");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "접속 권한을 취소하지 못했습니다.");
        }
      },
    });
  }

  async function confirmStatusToggle(user: UserAccountRecord) {
    const nextStatus = user.userStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    Modal.confirm({
      title: `사용자 상태를 ${nextStatus === "ACTIVE" ? "활성" : "비활성"}으로 변경할까요?`,
      content: `${user.userName} (${user.loginId})의 상태를 변경합니다.`,
      okText: "변경",
      cancelText: "닫기",
      onOk: async () => {
        try {
          await changeStatus(user, nextStatus);
          message.success("사용자 상태를 변경했습니다.");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "사용자 상태를 변경하지 못했습니다.");
        }
      },
    });
  }

  async function saveRoleChange() {
    if (!roleEditorUser) {
      return;
    }
    try {
      await changeRole(roleEditorUser, roleDraft);
      message.success("사용자 역할을 변경했습니다.");
      setRoleEditorUser(null);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "사용자 역할을 변경하지 못했습니다.");
    }
  }

  async function saveCreateAccount(values: UserAccountCreateFormValues) {
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createAccount({
        centerId: authUser?.centerId ?? 1,
        loginId: values.loginId.trim(),
        userName: values.userName.trim(),
        roleCode: values.roleCode,
        temporaryPassword: values.temporaryPassword,
      });
      message.success("사용자 계정을 생성했습니다.");
      closeCreateDialog();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "사용자 계정을 생성하지 못했습니다.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space direction="vertical" size={4}>
        <Title level={2} style={{ margin: 0 }}>
          사용자 계정 관리
        </Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          센터 스태프 목록을 검색하고 역할, 상태, 접속 권한을 관리합니다.
        </Paragraph>
      </Space>

      {userAccountsError ? (
        <Alert type="error" showIcon message={userAccountsError} />
      ) : null}

      <Card title="검색 조건">
        <Space wrap style={{ width: "100%" }}>
          <Input
            allowClear
            placeholder="이름 또는 로그인 ID"
            value={draftFilters.q}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, q: event.target.value }))
            }
            style={{ width: 220 }}
          />
          <Select
            value={draftFilters.roleCode}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, roleCode: value }))
            }
            options={USER_ROLE_FILTER_OPTIONS}
            style={{ width: 180 }}
          />
          <Select
            value={draftFilters.userStatus}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, userStatus: value }))
            }
            options={USER_STATUS_FILTER_OPTIONS}
            style={{ width: 140 }}
          />
          <Space>
            <Button type="primary" onClick={applyFilters}>
              조회
            </Button>
            <Button onClick={resetFilters}>초기화</Button>
          </Space>
        </Space>
      </Card>

      <Card
        title="사용자 목록"
        extra={
          <Space>
            <Text type="secondary">
              총 {userAccountsPage.totalItems.toLocaleString()}명
            </Text>
            {canCreateAccounts ? (
              <Button type="primary" onClick={openCreateDialog}>
                계정 생성
              </Button>
            ) : null}
          </Space>
        }
      >
        <Table
          rowKey="userId"
          dataSource={userAccounts}
          columns={columns}
          loading={userAccountsLoading}
          scroll={{ x: 1260 }}
          pagination={{
            current: userAccountsPage.page,
            pageSize: userAccountsPage.size,
            total: userAccountsPage.totalItems,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            onChange: (page, pageSize) => {
              setAppliedFilters((current) => ({
                ...current,
                page,
                size: pageSize,
              }));
            },
          }}
        />
      </Card>

      <Modal
        title="계정 생성"
        open={createDialogOpen}
        onCancel={closeCreateDialog}
        onOk={() => void createForm.submit()}
        okText="생성"
        cancelText="닫기"
        confirmLoading={createSubmitting}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary">새 계정은 생성 직후 비밀번호 변경 필요 상태로 시작합니다.</Text>
          {createError ? <Alert type="error" showIcon message={createError} /> : null}
          <Form<UserAccountCreateFormValues>
            form={createForm}
            layout="vertical"
            requiredMark={false}
            initialValues={{ roleCode: createRoleOptions[0]?.value }}
            onFinish={(values) => void saveCreateAccount(values)}
          >
            <Form.Item
              label="로그인 ID"
              name="loginId"
              rules={[{ required: true, message: "로그인 ID를 입력하세요." }]}
            >
              <Input placeholder="로그인 ID" />
            </Form.Item>

            <Form.Item
              label="이름"
              name="userName"
              rules={[{ required: true, message: "이름을 입력하세요." }]}
            >
              <Input placeholder="이름" />
            </Form.Item>

            <Form.Item
              label="역할"
              name="roleCode"
              rules={[{ required: true, message: "역할을 선택하세요." }]}
            >
              <Select options={createRoleOptions} />
            </Form.Item>

            <Form.Item
              label="임시 비밀번호"
              name="temporaryPassword"
              rules={[
                { required: true, message: "임시 비밀번호를 입력하세요." },
                { validator: passwordPolicyValidator },
              ]}
            >
              <Input.Password placeholder="8자 이상, 문자/숫자/특수문자 포함" />
            </Form.Item>
          </Form>
        </Space>
      </Modal>

      <Modal
        title="역할 변경"
        open={roleEditorUser != null}
        onCancel={() => setRoleEditorUser(null)}
        onOk={() => void saveRoleChange()}
        okText="변경"
        cancelText="닫기"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text type="secondary">
            {roleEditorUser?.userName} ({roleEditorUser?.loginId})
          </Text>
          <Select
            value={roleDraft}
            onChange={(value) => setRoleDraft(value)}
            options={MANAGEABLE_ROLE_OPTIONS}
            style={{ width: "100%" }}
          />
        </Space>
      </Modal>
    </Space>
  );
}
