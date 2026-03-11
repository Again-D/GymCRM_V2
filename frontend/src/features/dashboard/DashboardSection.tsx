import type { NavSectionKey, RoutePreviewItem, ShellRoute } from "../../app/routes";

type DashboardQuickAction = Pick<ShellRoute, "key" | "label">;

type DashboardSectionProps = {
  routePreview: RoutePreviewItem[];
  quickActions: DashboardQuickAction[];
  selectedMemberLabel: string;
  hasSelectedMember: boolean;
  isDeskRole: boolean;
  securityMode: string;
  isAuthenticated: boolean;
  membersCount: number;
  productsCount: number;
  sessionMembershipCount: number;
  onNavigate: (sectionKey: NavSectionKey) => void;
};

export function DashboardSection(props: DashboardSectionProps) {
  const {
    routePreview,
    quickActions,
    selectedMemberLabel,
    hasSelectedMember,
    isDeskRole,
    securityMode,
    isAuthenticated,
    membersCount,
    productsCount,
    sessionMembershipCount,
    onNavigate
  } = props;

  const metricCards = [
    {
      title: "총 회원",
      value: membersCount.toLocaleString(),
      delta: hasSelectedMember ? "선택 회원 컨텍스트 활성" : "선택 회원 없음",
      tone: hasSelectedMember ? "ok" : "muted"
    },
    {
      title: "상품 수",
      value: productsCount.toLocaleString(),
      delta: "현재 조회 캐시 기준",
      tone: "neutral"
    },
    {
      title: "세션 회원권",
      value: sessionMembershipCount.toLocaleString(),
      delta: hasSelectedMember ? selectedMemberLabel : "회원 선택 후 집계",
      tone: hasSelectedMember ? "ok" : "muted"
    },
    {
      title: "인증 상태",
      value: isAuthenticated ? "AUTH" : "UNAUTH",
      delta: `보안 모드 ${securityMode}`,
      tone: isAuthenticated ? "ok" : "muted"
    }
  ] as const;

  return (
    <section className="dashboard-ref-shell" aria-label="대시보드 화면">
      <div className="dashboard-metric-grid">
        {metricCards.map((item) => (
          <article key={item.title} className={`dashboard-metric-card tone-${item.tone}`}>
            <p className="dashboard-metric-title">{item.title}</p>
            <strong className="dashboard-metric-value">{item.value}</strong>
            <p className="dashboard-metric-delta">{item.delta}</p>
          </article>
        ))}
      </div>

      <div className="dashboard-main-grid">
        <article className="panel dashboard-trend-panel">
          <div className="panel-header">
            <h3>운영 트렌드 개요</h3>
            <span className="table-meta">최근 세션 기준</span>
          </div>
          <p className="muted-text">선택 회원과 핵심 업무 진입 상태를 한 번에 확인합니다.</p>

          <div className="dashboard-trend-placeholder" aria-hidden="true">
            <div className="dashboard-trend-axis">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>

          <div className="quick-actions-grid dashboard-actions-grid">
            {quickActions.map((action) => (
              <button
                key={action.key}
                type="button"
                className="secondary-button"
                onClick={() => onNavigate(action.key)}
              >
                {action.label}
              </button>
            ))}
          </div>

          {!hasSelectedMember ? (
            <p className="notice compact">회원권/예약 업무는 바로 진입할 수 있으며, 탭 안에서 회원을 선택해 시작할 수 있습니다.</p>
          ) : (
            <p className="notice success compact">선택된 회원: {selectedMemberLabel}</p>
          )}
          {isDeskRole ? (
            <p className="notice compact">DESK 권한은 상품 변경이 제한됩니다.</p>
          ) : null}
        </article>

        <article className="panel dashboard-activity-panel">
          <div className="panel-header">
            <h3>최근 활동</h3>
            <span className="table-meta">API 라우트 프리뷰</span>
          </div>
          <ul className="dashboard-activity-list">
            {routePreview.map((route) => (
              <li key={route.path}>
                <code>{route.path}</code>
                <span>{route.label}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
