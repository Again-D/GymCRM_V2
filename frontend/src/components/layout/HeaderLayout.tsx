import { App, Button, Card, Segmented, Space, Tag, Typography } from "antd";

import { useAuthState } from "../../app/auth";
import { useThemeStore, type ThemePreference } from "../../app/theme";

import styles from "./HeaderLayout.module.css";

const { Text } = Typography;

export default function HeaderLayout() {
  const feedback = App.useApp();
  const {
    authError,
    authStatusMessage,
    authUser,
    clearRuntimeSession,
    isMockMode,
    logout,
    securityMode,
    setRuntimeAuthPreset
  } = useAuthState();
  const { themePreference, setThemePreference } = useThemeStore();

  async function handleLogout() {
    await logout();
    feedback.message.success("세션을 정리하고 로그인 화면으로 이동합니다.");
  }

  return (
    <Card variant="borderless" className={styles.headerCard}>
      <div className={styles.headerContent}>
        <div className={styles.identityBlock}>
          <Text className={styles.eyebrow}>Operations shell</Text>
          <div className={styles.identityRow}>
            <Text className={styles.identityName}>
              {securityMode === "prototype" ? "시스템 프로토타입" : authUser?.username ?? "익명 운영자"}
            </Text>
            <Tag color={isMockMode ? "processing" : "default"}>
              {isMockMode ? "런타임 프로필" : "라이브 세션"}
            </Tag>
            <Tag color={securityMode === "prototype" ? "gold" : "geekblue"}>
              {securityMode === "prototype" ? "프로토타입 데모" : "JWT 세션"}
            </Tag>
          </div>
          {(authStatusMessage || authError) && (
            <div className={styles.feedbackRow}>
              {authStatusMessage ? <Text type="success">{authStatusMessage}</Text> : null}
              {authError ? <Text type="danger">{authError}</Text> : null}
            </div>
          )}
        </div>

        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <Text className={styles.controlLabel}>화면 모드</Text>
            <Segmented
              options={[
                { label: "라이트", value: "light" },
                { label: "다크", value: "dark" },
                { label: "자동", value: "system" }
              ]}
              value={themePreference}
              onChange={(value) => setThemePreference(value as ThemePreference)}
            />
          </div>

          <div className={styles.controlGroup}>
            <Text className={styles.controlLabel}>{isMockMode ? "런타임 전환" : "세션 제어"}</Text>
            <Space wrap>
              {isMockMode ? (
                <>
                  <Button size="small" onClick={() => setRuntimeAuthPreset("prototype-admin")}>데모</Button>
                  <Button size="small" onClick={() => setRuntimeAuthPreset("jwt-admin")}>관리자</Button>
                  <Button size="small" onClick={clearRuntimeSession}>초기화</Button>
                </>
              ) : (
                <Button danger size="small" onClick={() => void handleLogout()}>로그아웃</Button>
              )}
            </Space>
          </div>
        </div>
      </div>
    </Card>
  );
}
