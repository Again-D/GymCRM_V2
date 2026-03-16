import { useState } from "react";

import { useAuthState } from "../app/auth";

import styles from "./Login.module.css";

export default function Login() {
  const { authError, authStatusMessage, isMockMode, login, loginSubmitting, setRuntimeAuthPreset } = useAuthState();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void login(loginId, password);
  };

  return (
    <main className={styles["login-page"]}>
      <div className={styles["login-card"]}>
        <header className={styles["brand-section"]}>
          <span className="ops-eyebrow">현장 운영 진입</span>
          <h1 className={styles["brand-title"]}>GymCRM</h1>
          <p className={styles["brand-subtitle"]}>데스크와 현장 업무를 빠르게 처리할 수 있는 고가독성 운영 콘솔입니다.</p>
        </header>

        <section>
          {isMockMode ? (
            <div className={styles["mock-presets"]}>
              <h2 className={styles["mock-title"]}>개발용 프리셋</h2>
              <p className={styles["mode-description"]}>실제 인증 없이 셸, 권한, 업무 화면 흐름을 바로 점검할 수 있습니다.</p>
              <div className={styles["mock-grid"]}>
                <button 
                  type="button" 
                  className="primary-button" 
                  onClick={() => setRuntimeAuthPreset("prototype-admin")}
                >
                  프로토타입 관리자 모드
                </button>
                <button 
                  type="button" 
                  className="secondary-button" 
                  onClick={() => setRuntimeAuthPreset("jwt-admin")}
                >
                  JWT 관리자 세션
                </button>
                <button 
                  type="button" 
                  className="secondary-button" 
                  onClick={() => setRuntimeAuthPreset("jwt-trainer")}
                >
                  JWT 트레이너 세션
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className={styles["login-title"]}>시스템 로그인</h2>
              <p className={styles["mode-description"]}>운영자 계정으로 로그인해 실서비스 운영 콘솔에 진입합니다.</p>
              <form className={styles["form-group"]} onSubmit={handleSubmit}>
                <label className={styles.field}>
                  <span className={styles["field-label"]}>로그인 ID</span>
                  <input 
                    className={styles.input}
                    value={loginId} 
                    onChange={(e) => setLoginId(e.target.value)} 
                    placeholder="로그인 ID를 입력하세요"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles["field-label"]}>비밀번호</span>
                  <input 
                    className={styles.input}
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    required
                  />
                </label>
                
                <button 
                  type="submit" 
                  className="primary-button mt-md" 
                  disabled={loginSubmitting}
                >
                  {loginSubmitting ? "인증 중..." : "로그인"}
                </button>
              </form>
            </>
          )}

          {authStatusMessage && (
            <div className={`${styles["feedback-pill"]} pill ok full-span mt-md`}>
              {authStatusMessage}
            </div>
          )}
          
          {authError && (
            <div className={`${styles["feedback-pill"]} pill danger full-span mt-md`}>
              {authError}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
