import type { FormEvent } from "react";
import { NoticeText } from "../../shared/ui/NoticeText";

type LoginScreenProps = {
  subtitle: string;
  modeBadgeText: string;
  authStatusMessage: string | null;
  authError: string | null;
  loginIdInput: string;
  loginPasswordInput: string;
  loginSubmitting: boolean;
  onLoginIdChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginScreen(props: LoginScreenProps) {
  const {
    subtitle,
    modeBadgeText,
    authStatusMessage,
    authError,
    loginIdInput,
    loginPasswordInput,
    loginSubmitting,
    onLoginIdChange,
    onLoginPasswordChange,
    onSubmit
  } = props;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>GYM CRM</h1>
          <p>{subtitle}</p>
        </div>
        <div className="prototype-badge" role="status" aria-live="polite">
          {modeBadgeText}
        </div>
      </header>

      <section className="hero-card auth-card" aria-label="관리자 로그인">
        <div>
          <h2>관리자 로그인</h2>
          <p>JWT 모드에서는 로그인 후에만 회원/상품/회원권 기능 화면에 접근할 수 있습니다.</p>
          {authStatusMessage ? <NoticeText tone="success">{authStatusMessage}</NoticeText> : null}
          {authError ? <NoticeText tone="error">{authError}</NoticeText> : null}
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            로그인 ID
            <input value={loginIdInput} onChange={(event) => onLoginIdChange(event.target.value)} autoComplete="username" />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              value={loginPasswordInput}
              onChange={(event) => onLoginPasswordChange(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="primary-button" disabled={loginSubmitting}>
            {loginSubmitting ? "로그인 중..." : "로그인"}
          </button>
          <p className="muted-text">
            개발 기본 계정: <code>center-admin</code> / <code>dev-admin-1234!</code>
          </p>
        </form>
      </section>
    </main>
  );
}
