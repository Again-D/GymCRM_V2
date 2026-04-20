import { useState } from "react";
import { Alert, Button, Card, Descriptions, Form, Input, Layout, Space, Tag, Typography, message } from "antd";
import { Navigate, useNavigate } from "react-router-dom";

import { apiPatch } from "../../api/client";
import { useAuthState } from "../../app/auth";

import styles from "./MyAccountPage.module.css";

const { Content } = Layout;
const { Text } = Typography;

type MyAccountFormValues = {
  currentPassword?: string;
  newPassword: string;
  newPasswordConfirmation: string;
};

const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_POLICY_MESSAGE = "8자 이상이며 문자, 숫자, 특수문자를 모두 포함해야 합니다.";

function passwordPolicyValidator(_: unknown, value: string | undefined) {
  if (!value || PASSWORD_POLICY_REGEX.test(value)) {
    return Promise.resolve();
  }
  return Promise.reject(new Error(PASSWORD_POLICY_MESSAGE));
}

export default function MyAccountPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<MyAccountFormValues>();
  const { authUser, logout } = useAuthState();
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const passwordChangeRequired = Boolean(authUser?.passwordChangeRequired);
  const requiresCurrentPassword = !passwordChangeRequired;

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  async function handleFinish(values: MyAccountFormValues) {
    setSubmitting(true);
    setPageError(null);

    try {
      await apiPatch("/api/v1/auth/password", {
        ...(requiresCurrentPassword ? { currentPassword: values.currentPassword } : {}),
        newPassword: values.newPassword,
        newPasswordConfirmation: values.newPasswordConfirmation,
      });
      message.success("비밀번호를 변경했습니다.");
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout className={styles.page}>
      <Content className={styles.stack}>
        <Card variant="borderless" className={styles.heroCard}>
          <div className={styles.hero}>
            <Text className={styles.eyebrow}>Account workspace</Text>
            <Tag color={passwordChangeRequired ? "warning" : "blue"} bordered={false} style={{ width: "fit-content" }}>
              {passwordChangeRequired ? "임시 비밀번호 사용 중" : "일반 비밀번호 변경"}
            </Tag>
            <h1 className={styles.title}>내 계정</h1>
            <p className={styles.subtitle}>
              {passwordChangeRequired
                ? "임시 비밀번호로 로그인했습니다. 새 비밀번호를 설정한 뒤 계속 이용할 수 있습니다."
                : "현재 비밀번호를 확인하고 새 비밀번호로 변경할 수 있습니다."}
            </p>
          </div>
        </Card>

        <Card className={styles.sectionCard} title="계정 정보">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="사용자명">{authUser.username}</Descriptions.Item>
            <Descriptions.Item label="사용자 ID">{authUser.userId}</Descriptions.Item>
            <Descriptions.Item label="센터 ID">{authUser.centerId ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="역할">{authUser.primaryRole}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card className={styles.sectionCard} title="비밀번호 변경">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>새 비밀번호를 입력하세요</h2>
            <p className={styles.sectionDescription}>
              {passwordChangeRequired
                ? "현재 비밀번호 없이 새 비밀번호만 설정하면 됩니다."
                : "현재 비밀번호를 확인한 뒤 새 비밀번호를 입력하세요."}
            </p>
          </div>

          {pageError ? <Alert type="error" showIcon message={pageError} style={{ marginBottom: 20 }} /> : null}

          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Alert
              type={passwordChangeRequired ? "warning" : "info"}
              showIcon
              message={passwordChangeRequired ? "임시 비밀번호 상태" : "일반 비밀번호 변경"}
              description={
                passwordChangeRequired
                  ? "새 비밀번호를 저장하면 현재 세션은 정리되고, 다음 로그인부터 새 비밀번호를 사용합니다."
                  : "변경 후에는 현재 세션이 정리되고 로그인 화면으로 돌아갑니다."
              }
            />

            <Form<MyAccountFormValues>
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={(values) => void handleFinish(values)}
              className={styles.form}
            >
              {requiresCurrentPassword ? (
                <Form.Item
                  label="현재 비밀번호"
                  name="currentPassword"
                  rules={[{ required: true, message: "현재 비밀번호를 입력하세요." }]}
                >
                  <Input.Password placeholder="현재 비밀번호" size="large" />
                </Form.Item>
              ) : null}

              <Form.Item
                label="새 비밀번호"
                name="newPassword"
                rules={[
                  { required: true, message: "새 비밀번호를 입력하세요." },
                  { validator: passwordPolicyValidator },
                ]}
              >
                <Input.Password placeholder="새 비밀번호" size="large" />
              </Form.Item>

              <Form.Item
                label="새 비밀번호 확인"
                name="newPasswordConfirmation"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "새 비밀번호를 다시 입력하세요." },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("새 비밀번호 확인이 일치하지 않습니다."));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="새 비밀번호 확인" size="large" />
              </Form.Item>

              <div className={styles.formActions}>
                <Button type="primary" htmlType="submit" size="large" loading={submitting}>
                  비밀번호 변경
                </Button>
              </div>
            </Form>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}
