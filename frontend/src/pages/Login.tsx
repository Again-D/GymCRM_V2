import { useState } from "react";
import { 
  Alert, 
  Button, 
  Card, 
  Divider, 
  Flex, 
  Form, 
  Input, 
  Layout, 
  Space, 
  Tag, 
  Typography,
  theme 
} from "antd";
import { LockOutlined, UserOutlined, DeploymentUnitOutlined, SafetyCertificateOutlined, TeamOutlined } from "@ant-design/icons";

import { useAuthState } from "../app/auth";

const { Title, Paragraph, Text } = Typography;
const { Content } = Layout;

type LoginFormValues = {
  loginId: string;
  password: string;
};

export default function Login() {
  const { token } = theme.useToken();
  const { authError, authStatusMessage, isMockMode, login, loginSubmitting, setRuntimeAuthPreset } = useAuthState();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (values: LoginFormValues) => {
    void login(values.loginId, values.password);
  };

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgContainer }}>
      <Content>
        <Flex align="center" justify="center" style={{ height: "100%", padding: "24px" }}>
          <Card 
            bordered={false}
            style={{ 
              maxWidth: 480, 
              width: "100%", 
              boxShadow: "0 12px 48px rgba(0,0,0,0.08)",
              borderRadius: 16
            }}
          >
            <Flex vertical gap={32}>
              <header style={{ textAlign: "center" }}>
                <Tag color="blue" bordered={false} style={{ marginBottom: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Operations Console
                </Tag>
                <Title level={1} style={{ margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>GymCRM</Title>
                <Paragraph type="secondary" style={{ margin: 0, fontSize: "0.95rem" }}>
                  데스크와 현장 업무를 빠르게 처리할 수 있는 고가독성 운영 콘솔입니다.
                </Paragraph>
              </header>

              <section>
                {isMockMode ? (
                  <Flex vertical gap={20}>
                    <div>
                      <Title level={4} style={{ margin: "0 0 4px 0" }}>개발용 프리셋</Title>
                      <Paragraph type="secondary" style={{ fontSize: "0.875rem" }}>
                        인증 없이 셸, 권한, 업무 화면 흐름을 바로 점검할 수 있습니다.
                      </Paragraph>
                    </div>
                    
                    <Flex vertical gap={12}>
                      <Button 
                        size="large" 
                        type="primary" 
                        icon={<DeploymentUnitOutlined />} 
                        block 
                        onClick={() => setRuntimeAuthPreset("prototype-admin")}
                      >
                        프로토타입 관리자 모드
                      </Button>
                      <Button 
                        size="large" 
                        icon={<SafetyCertificateOutlined />} 
                        block 
                        onClick={() => setRuntimeAuthPreset("jwt-admin")}
                      >
                        JWT 관리자 세션
                      </Button>
                      <Button 
                        size="large" 
                        icon={<TeamOutlined />} 
                        block 
                        onClick={() => setRuntimeAuthPreset("jwt-trainer")}
                      >
                        JWT 트레이너 세션
                      </Button>
                    </Flex>
                  </Flex>
                ) : (
                  <Flex vertical gap={24}>
                    <div>
                      <Title level={4} style={{ margin: "0 0 4px 0" }}>시스템 로그인</Title>
                      <Paragraph type="secondary" style={{ fontSize: "0.875rem" }}>
                        운영자 계정으로 로그인해 실서비스 운영 콘솔에 진입합니다.
                      </Paragraph>
                    </div>

                    <Form<LoginFormValues> layout="vertical" onFinish={handleSubmit} requiredMark={false}>
                      <Form.Item 
                        label={<Text strong style={{ fontSize: "0.8rem" }}>로그인 ID</Text>}
                        name="loginId"
                        rules={[{ required: true, message: "아이디를 입력하세요." }]}
                      >
                        <Input 
                          size="large" 
                          prefix={<UserOutlined style={{ color: token.colorTextQuaternary }} />} 
                          placeholder="아이디" 
                        />
                      </Form.Item>

                      <Form.Item 
                        label={<Text strong style={{ fontSize: "0.8rem" }}>비밀번호</Text>}
                        name="password"
                        rules={[{ required: true, message: "비밀번호를 입력하세요." }]}
                      >
                        <Input.Password 
                          size="large" 
                          prefix={<LockOutlined style={{ color: token.colorTextQuaternary }} />} 
                          placeholder="••••••••" 
                        />
                      </Form.Item>

                      <Button 
                        size="large" 
                        type="primary" 
                        htmlType="submit" 
                        block 
                        loading={loginSubmitting}
                        style={{ marginTop: 8 }}
                      >
                        운영 콘솔 로그인
                      </Button>
                    </Form>
                  </Flex>
                )}

                <Flex vertical gap={12} style={{ marginTop: 24 }}>
                  {authStatusMessage && <Alert type="success" showIcon message={authStatusMessage} />}
                  {authError && <Alert type="error" showIcon message={authError} />}
                </Flex>
              </section>

              <Divider style={{ margin: 0 }} />
              
              <footer style={{ textAlign: "center" }}>
                <Text type="secondary" style={{ fontSize: "0.75rem" }}>
                  &copy; {new Date().getFullYear()} GymCRM Systems. All rights reserved.
                </Text>
              </footer>
            </Flex>
          </Card>
        </Flex>
      </Content>
    </Layout>
  );
}
