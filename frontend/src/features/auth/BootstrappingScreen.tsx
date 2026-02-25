export function BootstrappingScreen() {
  return (
    <main className="app-shell">
      <section className="hero-card auth-card" aria-live="polite">
        <div>
          <h2>초기 환경 확인 중</h2>
          <p>서버 보안 모드와 세션 상태를 확인하고 있습니다.</p>
        </div>
        <div className="auth-card-side">
          <div className="prototype-badge">Bootstrapping...</div>
        </div>
      </section>
    </main>
  );
}
