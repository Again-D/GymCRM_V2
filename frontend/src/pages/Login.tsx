import { useState } from "react";

import { useAuthState } from "../app/auth";

export default function Login() {
  const { authError, authStatusMessage, isMockMode, login, loginSubmitting, setRuntimeAuthPreset } = useAuthState();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="login-shell">
      <h1>로그인</h1>
      {isMockMode ? (
        <>
          <p>JWT route parity를 브라우저에서 직접 확인할 수 있도록 runtime auth preset을 전환합니다.</p>
          <div className="stack-md mt-lg">
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
            className="stack-md mt-lg"
            onSubmit={(event) => {
              event.preventDefault();
              void login(loginId, password);
            }}
          >
            <label className="field-stack">
              <span>로그인 ID</span>
              <input value={loginId} onChange={(event) => setLoginId(event.target.value)} />
            </label>
            <label className="field-stack">
              <span>비밀번호</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button type="submit" className="primary-button" disabled={loginSubmitting}>
              {loginSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </>
      )}
      {authStatusMessage ? <p className="text-success mt-md">{authStatusMessage}</p> : null}
      {authError ? <p className="text-danger mt-sm">{authError}</p> : null}
    </section>
  );
}
