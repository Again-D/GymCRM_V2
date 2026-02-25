type RoutePreviewItem = {
  path: string;
  label: string;
};

type DashboardSectionProps = {
  routePreview: RoutePreviewItem[];
  selectedMemberLabel: string;
  hasSelectedMember: boolean;
  isDeskRole: boolean;
  securityMode: string;
  isAuthenticated: boolean;
  membersCount: number;
  productsCount: number;
  sessionMembershipCount: number;
  onOpenMembers: () => void;
  onOpenMemberships: () => void;
  onOpenReservations: () => void;
  onOpenProducts: () => void;
};

export function DashboardSection(props: DashboardSectionProps) {
  const {
    routePreview,
    selectedMemberLabel,
    hasSelectedMember,
    isDeskRole,
    securityMode,
    isAuthenticated,
    membersCount,
    productsCount,
    sessionMembershipCount,
    onOpenMembers,
    onOpenMemberships,
    onOpenReservations,
    onOpenProducts
  } = props;

  return (
    <section className="dashboard-grid" aria-label="대시보드 화면">
      <article className="panel">
        <div className="panel-header">
          <h3>빠른 진입</h3>
        </div>
        <div className="quick-actions-grid">
          <button type="button" className="secondary-button" onClick={onOpenMembers}>
            회원 관리 열기
          </button>
          <button type="button" className="secondary-button" onClick={onOpenMemberships} disabled={!hasSelectedMember}>
            회원권 업무 열기
          </button>
          <button type="button" className="secondary-button" onClick={onOpenReservations} disabled={!hasSelectedMember}>
            예약 관리 열기
          </button>
          <button type="button" className="secondary-button" onClick={onOpenProducts}>
            상품 관리 열기
          </button>
        </div>
        {!hasSelectedMember ? (
          <p className="notice compact">회원권 업무를 사용하려면 먼저 회원 관리에서 회원을 선택해주세요.</p>
        ) : (
          <p className="notice success compact">선택된 회원: {selectedMemberLabel}</p>
        )}
        {isDeskRole ? (
          <p className="notice compact">DESK 권한은 상품 조회와 회원권 업무는 가능하지만 상품 변경은 제한됩니다.</p>
        ) : null}
      </article>

      <article className="panel">
        <div className="panel-header">
          <h3>핵심 API 경로 미리보기</h3>
        </div>
        <ul className="inline-route-list" aria-label="prototype routes">
          {routePreview.map((route) => (
            <li key={route.path}>
              <code>{route.path}</code>
              <span>{route.label}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="panel wide-panel">
        <div className="panel-header">
          <h3>세션 현황</h3>
        </div>
        <dl className="detail-grid">
          <div>
            <dt>보안 모드</dt>
            <dd>{securityMode}</dd>
          </div>
          <div>
            <dt>인증 상태</dt>
            <dd>{isAuthenticated ? "AUTHENTICATED" : "UNAUTHENTICATED"}</dd>
          </div>
          <div>
            <dt>회원 수(조회 캐시)</dt>
            <dd>{membersCount}</dd>
          </div>
          <div>
            <dt>상품 수(조회 캐시)</dt>
            <dd>{productsCount}</dd>
          </div>
          <div>
            <dt>선택 회원</dt>
            <dd>{hasSelectedMember ? selectedMemberLabel : "-"}</dd>
          </div>
          <div>
            <dt>세션 회원권 수</dt>
            <dd>{sessionMembershipCount}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
