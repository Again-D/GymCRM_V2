import type { ShellRoute } from "../../app/routes";
import { NavLink } from "react-router-dom";

type SidebarNavProps = {
  items: Array<Pick<ShellRoute, "key" | "path" | "label" | "description">>;
  activeKey: string;
  isJwtMode: boolean;
  selectedMemberLabel: string;
  currentUserLabel: string;
};

export function SidebarNav({
  items,
  activeKey,
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
          <NavLink
            key={item.key}
            to={item.path}
            className={activeKey === item.key ? "sidebar-tab is-active" : "sidebar-tab"}
            aria-current={activeKey === item.key ? "page" : undefined}
          >
            <span className="sidebar-tab-label">{item.label}</span>
            <span className="sidebar-tab-desc">{item.description}</span>
          </NavLink>
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
