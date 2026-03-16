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
          <span className="ops-eyebrow">Field Ops Access</span>
          <h1 className={styles["brand-title"]}>GymCRM</h1>
          <p className={styles["brand-subtitle"]}>Fast, high-clarity workspace for desk and floor operations.</p>
        </header>

        <section>
          {isMockMode ? (
            <div className={styles["mock-presets"]}>
              <h2 className={styles["mock-title"]}>Developer Presets</h2>
              <p className={styles["mode-description"]}>Use runtime profiles to rehearse shell, role, and workspace flows without hitting the live auth gate.</p>
              <div className={styles["mock-grid"]}>
                <button 
                  type="button" 
                  className="primary-button" 
                  onClick={() => setRuntimeAuthPreset("prototype-admin")}
                >
                  Prototype Admin Mode
                </button>
                <button 
                  type="button" 
                  className="secondary-button" 
                  onClick={() => setRuntimeAuthPreset("jwt-admin")}
                >
                  JWT Admin Session
                </button>
                <button 
                  type="button" 
                  className="secondary-button" 
                  onClick={() => setRuntimeAuthPreset("jwt-trainer")}
                >
                  JWT Trainer Session
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className={styles["login-title"]}>Login to System</h2>
              <p className={styles["mode-description"]}>Authenticate with your assigned operator account to enter the live operations console.</p>
              <form className={styles["form-group"]} onSubmit={handleSubmit}>
                <label className={styles.field}>
                  <span className={styles["field-label"]}>Operator ID</span>
                  <input 
                    className={styles.input}
                    value={loginId} 
                    onChange={(e) => setLoginId(e.target.value)} 
                    placeholder="Enter login ID"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles["field-label"]}>Password</span>
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
                  {loginSubmitting ? "Authenticating..." : "Sign In"}
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
