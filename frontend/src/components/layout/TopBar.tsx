type TopBarProps = {
  subtitle: string;
  modeBadgeText: string;
  authStatusMessage: string | null;
  showLogout: boolean;
  onLogout: () => void;
};

export function TopBar({ subtitle, modeBadgeText, authStatusMessage, showLogout, onLogout }: TopBarProps) {
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
        {showLogout ? (
          <button type="button" className="secondary-button" onClick={onLogout}>
            로그아웃
          </button>
        ) : null}
      </div>
    </header>
  );
}
