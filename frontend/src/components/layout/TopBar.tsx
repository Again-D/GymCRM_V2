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
  const isDark = resolvedTheme === "dark";

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
          className={`theme-toggle-button ${isDark ? "is-dark" : "is-light"}`}
          role="switch"
          aria-checked={isDark}
          aria-label={`현재 ${isDark ? "다크" : "라이트"} 모드, 클릭하여 전환`}
          onClick={onThemeToggle}
        >
          <span className="theme-switch-track" aria-hidden="true">
            <span className="theme-glyph theme-glyph-sun">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <circle cx="12" cy="12" r="4.2" />
                <path d="M12 2.8v2.3M12 18.9v2.3M21.2 12h-2.3M5.1 12H2.8M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6M18.5 18.5l-1.6-1.6M7.1 7.1 5.5 5.5" />
              </svg>
            </span>
            <span className="theme-glyph theme-glyph-moon">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M14.9 3.1a8.7 8.7 0 1 0 6 14.8 9.1 9.1 0 0 1-6.8-14.8h.8Z" />
              </svg>
            </span>
            <span className="theme-switch-thumb">
              {isDark ? (
                <svg className="theme-icon-moon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M14.9 3.1a8.7 8.7 0 1 0 6 14.8 9.1 9.1 0 0 1-6.8-14.8h.8Z" />
                </svg>
              ) : (
                <svg className="theme-icon-sun" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2.8v2.3M12 18.9v2.3M21.2 12h-2.3M5.1 12H2.8M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6M18.5 18.5l-1.6-1.6M7.1 7.1 5.5 5.5" />
                </svg>
              )}
            </span>
          </span>
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
