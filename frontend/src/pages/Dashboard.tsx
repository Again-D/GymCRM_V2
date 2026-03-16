import { Link } from "react-router-dom";

import { shellRoutes } from "../app/routes";
import { useThemeStore } from "../app/theme";

import styles from "./Dashboard.module.css";

const dashboardRoutes = shellRoutes.filter((route) => route.showInDashboard);

export default function Dashboard() {
  const { themePreference, setThemePreference, resolvedTheme } = useThemeStore();

  return (
    <div className={styles.dashboard}>
      <section className={`panel-card ${styles.heroCard}`}>
        <div className={styles.heroHeader}>
          <div className={styles.heroCopy}>
            <span className="ops-eyebrow">운영 개요</span>
            <h1 className="ops-title">운영 대시보드</h1>
            <p className="ops-subtitle">현재 근무 시간대의 운영 상황을 한눈에 파악하고 회원, 회원권, 예약, 상품 업무로 빠르게 이동할 수 있습니다.</p>
            <div className="ops-meta">
              <span className="ops-meta__pill">대표 기준 화면</span>
              <span className="ops-meta__pill">테마 제어</span>
              <span className="ops-meta__pill">빠른 진입 경로</span>
            </div>
          </div>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>활성 모듈</span>
            <span className={styles.metricValue}>{dashboardRoutes.length}</span>
            <span className={styles.metricHint}>대시보드에서 바로 진입할 수 있는 주요 업무 수입니다.</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>사이드바 메뉴</span>
            <span className={styles.metricValue}>{shellRoutes.filter((route) => route.showInSidebar).length}</span>
            <span className={styles.metricHint}>셸에서 항상 접근 가능한 업무 경로입니다.</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>콘솔 모드</span>
            <span className={styles.metricValue}>{resolvedTheme === "dark" ? "야간" : "주간"}</span>
            <span className={styles.metricHint}>현재 운영 화면의 시각 환경입니다.</span>
          </div>
        </div>
      </section>

      <section className="ops-section">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">빠른 진입 경로</h2>
            <p className="ops-section__subtitle">자주 쓰는 업무로 곧바로 이동해 운영 흐름을 끊지 않습니다.</p>
          </div>
        </div>

        <div className={styles.moduleGrid}>
          {dashboardRoutes.map((route) => (
            <Link key={route.key} to={route.path} className={`panel-card ${styles.moduleCard}`}>
              <div className={styles.moduleHeader}>
                <div>
                  <h3 className={styles.moduleTitle}>{route.label}</h3>
                  <p className={styles.moduleDescription}>{route.description}</p>
                </div>
                <span className="pill info">{route.key.toUpperCase()}</span>
              </div>
              <div className={styles.moduleMeta}>
                <span className={styles.modulePill}>보호 경로</span>
                <span className={styles.modulePill}>셸 진입</span>
              </div>
              <span className={styles.moduleArrow}>업무 열기</span>
            </Link>
          ))}
        </div>
      </section>

      <footer className={`panel-card ${styles.footerCard}`}>
        <span className="text-xs text-muted">현장 운영 콘솔의 대표 대시보드 화면</span>
        <span className="text-xs text-muted">현재 적용 환경: {resolvedTheme === "dark" ? "다크" : "라이트"}</span>
      </footer>
    </div>
  );
}
