import { useAuthState } from "../app/auth";

export default function Login() {
  const { setRuntimeAuthPreset } = useAuthState();

  return (
    <section style={{ maxWidth: 540 }}>
      <h1>로그인</h1>
      <p>JWT route parity를 브라우저에서 직접 확인할 수 있도록 runtime auth preset을 전환합니다.</p>
      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        <button type="button" className="primary-button" onClick={() => setRuntimeAuthPreset("jwt-admin")}>
          JWT 관리자 세션으로 시작
        </button>
        <button type="button" className="secondary-button" onClick={() => setRuntimeAuthPreset("jwt-trainer")}>
          JWT 트레이너 세션으로 시작
        </button>
        <button type="button" className="secondary-button" onClick={() => setRuntimeAuthPreset("prototype-admin")}>
          프로토타입 모드로 전환
        </button>
      </div>
    </section>
  );
}
