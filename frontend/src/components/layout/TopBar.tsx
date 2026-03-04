type TopBarProps = {
  subtitle: string;
  modeBadgeText: string;
  authStatusMessage: string | null;
  resolvedTheme: "light" | "dark";
  onThemeToggle: () => void;
  showLogout: boolean;
  onLogout: () => void;
};

export function TopBar({
  subtitle,
  modeBadgeText,
  authStatusMessage,
  resolvedTheme,
  onThemeToggle,
  showLogout,
  onLogout
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <h1>GYM CRM</h1>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-actions">
        {authStatusMessage ? (
          <div className="inline-status-text" role="status" aria-live="polite">
            {authStatusMessage}
          </div>
        ) : null}
        <div className="prototype-badge" role="status" aria-live="polite">
          {modeBadgeText}
        </div>
        <button
          type="button"
          className="theme-toggle-button"
          role="switch"
          aria-checked={resolvedTheme === "dark"}
          aria-label={`현재 ${resolvedTheme === "dark" ? "다크" : "라이트"} 모드, 클릭하여 전환`}
          onClick={onThemeToggle}
        >
          <span aria-hidden="true">{resolvedTheme === "dark" ? "DARK" : "LIGHT"}</span>
          <span>{resolvedTheme === "dark" ? "다크 모드" : "라이트 모드"}</span>
        </button>
        {showLogout ? (
          <button type="button" className="secondary-button" onClick={onLogout}>
            로그아웃
          </button>
        ) : null}
      </div>
    </header>
  );
}
