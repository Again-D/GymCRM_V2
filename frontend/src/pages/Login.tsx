import { useState } from "react";

import { useAuthState } from "../app/auth";

export default function Login() {
  const { authError, authStatusMessage, isMockMode, login, loginSubmitting, setRuntimeAuthPreset } = useAuthState();
  const [loginId, setLoginId] = useState("center-admin");
  const [password, setPassword] = useState("dev-admin-1234!");

  return (
    <section style={{ maxWidth: 540 }}>
      <h1>로그인</h1>
      {isMockMode ? (
        <>
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
        </>
      ) : (
        <>
          <p>live API parity 검증을 위해 실제 JWT 로그인 경로를 사용합니다.</p>
          <form
            style={{ display: "grid", gap: 12, marginTop: 24 }}
            onSubmit={(event) => {
              event.preventDefault();
              void login(loginId, password);
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span>로그인 ID</span>
              <input value={loginId} onChange={(event) => setLoginId(event.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>비밀번호</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button type="submit" className="primary-button" disabled={loginSubmitting}>
              {loginSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </>
      )}
      {authStatusMessage ? <p style={{ color: "#2f6f5e", marginTop: 16 }}>{authStatusMessage}</p> : null}
      {authError ? <p style={{ color: "#a23d4b", marginTop: 12 }}>{authError}</p> : null}
    </section>
  );
}
