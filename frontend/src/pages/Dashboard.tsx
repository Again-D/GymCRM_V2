import { DashboardOutlined, RocketOutlined } from "@ant-design/icons";
import { Card, Col, Empty, Flex, Row, Space, Tag, Typography, theme } from "antd";
import { Link } from "react-router-dom";

import { useAuthState } from "../app/auth";
import { getDashboardRoutes } from "../app/routes";
import { useThemeStore } from "../app/theme";
import type { DashboardWidgetConfig } from "./dashboard/widgets/types";
import { getDashboardWidgetConfig } from "./dashboard/widgets/dashboardConfig";

import styles from "./Dashboard.module.css";

const { Paragraph, Text, Title } = Typography;

export default function Dashboard() {
  const { token } = theme.useToken();
  const { authUser, isMockMode } = useAuthState();
  const { resolvedTheme } = useThemeStore();
  
  // Get role-based widgets
  const widgets = getDashboardWidgetConfig(authUser);
  
  // Get existing dashboard routes for the quick links section
  const dashboardRoutes = getDashboardRoutes(authUser, isMockMode);

  return (
    <Flex vertical gap={24}>
      {/* Hero Section */}
      <Card variant="borderless" className={styles.heroCard}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={12}>
              <Space size={8} wrap>
                <Tag color="blue" bordered={false} style={{ fontWeight: 600 }}>OPERATIONS HUB</Tag>
                <Tag color="gold" bordered={false}>DASHBOARD</Tag>
                {isMockMode && <Tag color="purple" bordered={false}>MOCK MODE</Tag>}
              </Space>
              <Title level={1} style={{ margin: 0, letterSpacing: "-0.02em" }}>운영 대시보드</Title>
              <Paragraph type="secondary" style={{ fontSize: "1.05rem", margin: 0, maxWidth: 640 }}>
                {authUser?.username ? `${authUser.username}님, ` : ""}
                현재 근무 시간대의 운영 상황을 실시간으로 파악하고 주요 업무를 처리할 수 있습니다.
              </Paragraph>
            </Space>
          </Col>

          <Col xs={24} lg={8}>
            <Card size="small" style={{ background: token.colorBgLayout, border: "none" }}>
              <Flex vertical gap={8}>
                <Text strong style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: token.colorTextSecondary }}>
                  System Context
                </Text>
                <Text style={{ fontSize: "0.85rem" }}>
                  <Tag color={resolvedTheme === "dark" ? "purple" : "orange"} bordered={false} style={{ marginRight: 8 }}>
                    {resolvedTheme === "dark" ? "다크 모드" : "라이트 모드"}
                  </Tag>
                  <Tag color="cyan" bordered={false}>
                    {authUser?.primaryRole?.replace("ROLE_", "") || "GUEST"}
                  </Tag>
                </Text>
              </Flex>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Real-time Insights (Widgets) */}
      {widgets.length > 0 && (
        <div className={styles.widgetGrid}>
          {widgets.map((widget: DashboardWidgetConfig) => {
            const WidgetComponent = widget.component;
            return (
              <WidgetComponent key={widget.id} />
            );
          })}
        </div>
      )}

      {/* Quick Links Section (Keeping existing functionality as a separate section) */}
      <Card 
        title={
          <Space>
            <RocketOutlined />
            <Text strong style={{ fontSize: "1.1rem" }}>빠른 진입 경로</Text>
          </Space>
        }
        extra={<Text type="secondary">자주 쓰는 업무로 곧바로 이동합니다.</Text>}
        variant="borderless"
      >
        {dashboardRoutes.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="현재 역할에서 빠른 진입 경로로 노출되는 업무가 없습니다."
          />
        ) : (
          <div className={styles.moduleGrid}>
            {dashboardRoutes.map((route) => (
              <Card
                key={route.key}
                hoverable
                size="small"
                className={styles.moduleCard}
                onClick={() => window.location.hash = route.path} // Simple fallback navigation
              >
                <Link to={route.path}>
                  <Flex justify="space-between" align="center">
                    <Title level={5} style={{ margin: 0 }}>{route.label}</Title>
                    <Tag color="blue" bordered={false} style={{ margin: 0, fontSize: "0.65rem" }}>{route.key.toUpperCase()}</Tag>
                  </Flex>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Footer info */}
      <Flex justify="center" style={{ marginTop: 24, paddingBottom: 24 }}>
        <Text type="secondary" style={{ fontSize: "0.75rem" }}>
          <DashboardOutlined style={{ marginRight: 6 }} />
          GymCRM 가상 한정 대시보드 화면 &middot; {isMockMode ? "Prototype Runtime" : "Live Production"}
        </Text>
      </Flex>
    </Flex>
  );
}
