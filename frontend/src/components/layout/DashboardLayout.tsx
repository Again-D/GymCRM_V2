import { Layout, Menu, Tag, Typography } from "antd";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import type { ShellRoute } from "../../app/routes";
import HeaderLayout from "./HeaderLayout";

import styles from "./DashboardLayout.module.css";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

export default function DashboardLayout({ routes }: { routes: ShellRoute[] }) {
  const location = useLocation();

  return (
    <Layout className={styles.shell}>
      <Sider breakpoint="lg" collapsedWidth={0} width={200} className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandKicker}>Field Ops</span>
          <span className={styles.brandName}>GymCRM Ops</span>
          <Text className={styles.brandDescription}>Secure center operations workspace</Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          className={styles.menu}
          items={routes.map((item) => ({
            key: item.path,
            label: <NavLink to={item.path}>{item.label}</NavLink>,
            extra: <Tag bordered={false} className={styles.menuTag}>{item.description}</Tag>
          }))}
        />
      </Sider>

      <Layout className={styles.main}>
        <Header className={styles.header}>
          <HeaderLayout />
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
