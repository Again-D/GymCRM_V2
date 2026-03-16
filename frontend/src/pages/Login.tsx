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
          <h1 className={styles["brand-title"]}>GymCRM</h1>
          <p className={styles["brand-subtitle"]}>Field Operations Console v2</p>
        </header>

        <section>
          {isMockMode ? (
            <div className={styles["mock-presets"]}>
              <h2 className={styles["mock-title"]}>Developer Presets</h2>
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
            <div className="pill ok full-span mt-md" style={{ justifyContent: 'center' }}>
              {authStatusMessage}
            </div>
          )}
          
          {authError && (
            <div className="pill danger full-span mt-md" style={{ justifyContent: 'center' }}>
              {authError}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
