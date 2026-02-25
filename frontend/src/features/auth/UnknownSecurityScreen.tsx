import { NoticeText } from "../../shared/ui/NoticeText";

type UnknownSecurityScreenProps = {
  authError: string | null;
  onReload: () => void;
};

export function UnknownSecurityScreen({ authError, onReload }: UnknownSecurityScreenProps) {
  return (
    <main className="app-shell">
      <section className="hero-card auth-card" aria-live="polite">
        <div>
          <h2>연결 상태 확인 필요</h2>
          <p>서버 보안 모드를 확인하지 못했습니다. 백엔드 서버/프록시 설정을 확인한 뒤 다시 시도해주세요.</p>
          {authError ? <NoticeText tone="error">{authError}</NoticeText> : null}
        </div>
        <div className="auth-form">
          <button type="button" className="primary-button" onClick={onReload}>
            새로고침
          </button>
        </div>
      </section>
    </main>
  );
}
