type SidebarNavItem = {
  key: string;
  label: string;
  description: string;
};

type SidebarNavProps = {
  items: SidebarNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  isJwtMode: boolean;
  selectedMemberLabel: string;
  currentUserLabel: string;
};

export function SidebarNav({
  items,
  activeKey,
  onSelect,
  isJwtMode,
  selectedMemberLabel,
  currentUserLabel
}: SidebarNavProps) {
  return (
    <aside className="sidebar" aria-label="관리자 기능 사이드바">
      <div className="sidebar-header">
        <h3>관리자 메뉴</h3>
        <p>{isJwtMode ? "로그인 세션 기반 운영 화면" : "프로토타입 모드 탐색 화면"}</p>
      </div>
      <nav className="sidebar-nav" aria-label="관리자 기능 탭">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeKey === item.key ? "sidebar-tab is-active" : "sidebar-tab"}
            aria-pressed={activeKey === item.key}
            aria-current={activeKey === item.key ? "page" : undefined}
            onClick={() => onSelect(item.key)}
          >
            <span className="sidebar-tab-label">{item.label}</span>
            <span className="sidebar-tab-desc">{item.description}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-meta">
        <div>
          <span>현재 모드</span>
          <strong>{isJwtMode ? "JWT" : "PROTOTYPE"}</strong>
        </div>
        <div>
          <span>선택 회원</span>
          <strong>{selectedMemberLabel}</strong>
        </div>
        <div>
          <span>현재 사용자</span>
          <strong>{currentUserLabel}</strong>
        </div>
      </div>
    </aside>
  );
}
