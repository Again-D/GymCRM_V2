import { ArrowRightOutlined, CompassOutlined, DeploymentUnitOutlined, RadarChartOutlined, DashboardOutlined, RocketOutlined } from "@ant-design/icons";
import { Button, Card, Col, Empty, Flex, Row, Space, Statistic, Tag, Typography, theme } from "antd";
import { Link } from "react-router-dom";

import { useAuthState } from "../app/auth";
import { getDashboardRoutes, getSidebarRoutes } from "../app/routes";
import { useThemeStore } from "../app/theme";

import styles from "./Dashboard.module.css";

const { Paragraph, Text, Title } = Typography;

export default function Dashboard() {
  const { token } = theme.useToken();
  const { authUser, isMockMode } = useAuthState();
  const { resolvedTheme } = useThemeStore();
  const dashboardRoutes = getDashboardRoutes(authUser, isMockMode);
  const sidebarRoutes = getSidebarRoutes(authUser, isMockMode);

  const metrics = [
    {
      key: "modules",
      label: "활성 모듈",
      value: dashboardRoutes.length,
      suffix: "개",
      help: "대시보드 주요 업무 수"
    },
    {
      key: "sidebar",
      label: "사이드바 메뉴",
      value: sidebarRoutes.length,
      suffix: "개",
      help: "셸 접근 가능 업무 경로"
    },
    {
      key: "mode",
      label: "콘솔 모드",
      value: resolvedTheme === "dark" ? "야간" : "주간",
      help: "운영 화면 시각 환경"
    }
  ] as const;

  return (
    <Flex vertical gap={24}>
      <Card bordered={false} className={styles.heroCard}>
        <Flex vertical gap={24}>
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} lg={16}>
              <Space direction="vertical" size={12}>
                <Space size={8} wrap>
                  <Tag color="blue" bordered={false} style={{ fontWeight: 600 }}>OPERATIONS HUB</Tag>
                  <Tag color="gold" bordered={false}>DASHBOARD</Tag>
                </Space>
                <Title level={1} style={{ margin: 0, letterSpacing: "-0.02em" }}>운영 대시보드</Title>
                <Paragraph type="secondary" style={{ fontSize: "1.05rem", margin: 0, maxWidth: 640 }}>
                  현재 근무 시간대의 운영 상황을 빠르게 파악하고 회원, 회원권, 예약, 상품 업무로 즉시 이동할 수 있습니다.
                </Paragraph>
              </Space>
            </Col>

            <Col xs={24} lg={8}>
              <Card size="small" style={{ background: token.colorBgLayout, border: "none" }}>
                <Flex vertical gap={12}>
                  <Text strong style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: token.colorTextSecondary }}>
                    Console Identity
                  </Text>
                  <Space direction="vertical" size={8}>
                    <Flex gap={8} align="center">
                      <CompassOutlined style={{ color: token.colorPrimary }} />
                      <Text style={{ fontSize: "0.85rem" }}>활성 테마: {resolvedTheme === "dark" ? "다크" : "라이트"}</Text>
                    </Flex>
                    <Flex gap={8} align="center">
                      <DeploymentUnitOutlined style={{ color: token.colorPrimary }} />
                      <Text style={{ fontSize: "0.85rem" }}>셸 경로: {sidebarRoutes.length}개</Text>
                    </Flex>
                    <Flex gap={8} align="center">
                      <RadarChartOutlined style={{ color: token.colorPrimary }} />
                      <Text style={{ fontSize: "0.85rem" }}>{isMockMode ? "프로토타입 런타임" : "라이브 JWT 세션"}</Text>
                    </Flex>
                  </Space>
                </Flex>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            {metrics.map((metric) => (
              <Col key={metric.key} xs={24} md={8}>
                <Card bordered={false} size="small" style={{ background: token.colorBgContainer, padding: "12px 4px" }}>
                  <Statistic 
                    title={<Text type="secondary" style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>{metric.label}</Text>} 
                    value={metric.value} 
                    valueStyle={{ fontWeight: 800, color: token.colorPrimary }}
                    suffix={"suffix" in metric ? metric.suffix : undefined} 
                  />
                  <Text type="secondary" style={{ fontSize: "0.72rem" }}>{metric.help}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </Flex>
      </Card>

      <Card 
        title={
          <Space>
            <RocketOutlined />
            <Text strong style={{ fontSize: "1.1rem" }}>빠른 진입 경로</Text>
          </Space>
        }
        extra={<Text type="secondary">자주 쓰는 업무로 곧바로 이동합니다.</Text>}
        bordered={false}
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
                className={styles.moduleCard}
                actions={[
                  <Link key={`${route.key}-link`} to={route.path} style={{ fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    업무 열기 <ArrowRightOutlined />
                  </Link>
                ]}
              >
                <Flex vertical gap={16}>
                  <Flex justify="space-between" align="start">
                    <Title level={4} style={{ margin: 0, fontSize: "1.15rem" }}>{route.label}</Title>
                    <Tag color="blue" bordered={false} style={{ margin: 0 }}>{route.key.toUpperCase()}</Tag>
                  </Flex>
                  <Paragraph type="secondary" style={{ minHeight: 48, margin: 0 }}>
                    {route.description}
                  </Paragraph>
                  <Space size={4} wrap>
                    <Tag bordered={false} style={{ fontSize: "0.7rem" }}>보호 경로</Tag>
                    <Tag bordered={false} style={{ fontSize: "0.7rem" }}>셸 진입 가능</Tag>
                  </Space>
                </Flex>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Flex justify="center" style={{ marginTop: 24 }}>
        <Card bordered={false} size="small" style={{ background: "transparent" }}>
          <Text type="secondary" style={{ fontSize: "0.75rem" }}>
            <DashboardOutlined style={{ marginRight: 6 }} />
            GymCRM 가상 한정 대시보드 화면 &middot; {isMockMode ? "Prototype Runtime" : "Live AWS"}
          </Text>
        </Card>
      </Flex>
    </Flex>
  );
}
