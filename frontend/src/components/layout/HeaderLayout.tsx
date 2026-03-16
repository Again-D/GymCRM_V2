import { PropsWithChildren } from "react";
import { useAuthState } from "../../app/auth";
import { useThemeStore } from "../../app/theme";
import styles from "./HeaderLayout.module.css";

const HeaderLayout = ({ children }: PropsWithChildren) => {
  const consts = useAuthState();
  const { authUser, isMockMode, securityMode, logout, setRuntimeAuthPreset, clearRuntimeSession } = consts;
  const { themePreference, setThemePreference } = useThemeStore();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {children}
      </div>
      
      <div className={styles.right}>
        {/* Auth Section */}
        <div className={styles.authPanel}>
          <div className={styles.authInfo}>
            <div className={styles.userProfile}>
              <span className={styles.authLabel}>
                {isMockMode ? "런타임 프로필" : "라이브 세션"}
              </span>
              <span className={styles.authUser}>
                {securityMode === "prototype" ? "시스템 프로토타입" : authUser?.username ?? "익명 운영자"}
              </span>
            </div>

            <div className={styles.authActions}>
              {isMockMode ? (
                <>
                  <button 
                    type="button" 
                    className={styles.sessionButton}
                    onClick={() => setRuntimeAuthPreset("prototype-admin")}
                  >
                    데모
                  </button>
                  <button 
                    type="button" 
                    className={styles.sessionButton}
                    onClick={() => setRuntimeAuthPreset("jwt-admin")}
                  >
                    관리자
                  </button>
                  <button 
                    type="button" 
                    className={styles.sessionButton}
                    onClick={clearRuntimeSession}
                  >
                    초기화
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  className={styles.logoutButton}
                  onClick={() => void logout()}
                >
                  로그아웃
                </button>
              )}
            </div>
          </div>
          
          {(authUser || isMockMode) && (
            <div className={styles.authFeedback}>
              {consts.authStatusMessage && <span className="text-success text-xs">{consts.authStatusMessage}</span>}
              {consts.authError && <span className="text-danger text-xs">{consts.authError}</span>}
            </div>
          )}
        </div>

        {/* Theme Control */}
        <div className={styles.themeControl}>
          <span className={styles.themeLabel}>화면 모드</span>
          <div className={styles.themeGroup}>
            <button
              type="button"
              className={`${styles.themeButton} ${themePreference === "light" ? styles.themeButtonActive : ""}`}
              onClick={() => setThemePreference("light")}
            >
              라이트
            </button>
            <button
              type="button"
              className={`${styles.themeButton} ${themePreference === "dark" ? styles.themeButtonActive : ""}`}
              onClick={() => setThemePreference("dark")}
            >
              다크
            </button>
            <button
              type="button"
              className={`${styles.themeButton} ${themePreference === "system" ? styles.themeButtonActive : ""}`}
              onClick={() => setThemePreference("system")}
            >
              자동
            </button>
          </div>
        </div>

        {/* System Info (from DashboardLayout footer) */}
        <div className={styles.systemInfo}>
          <span className={styles.systemLabel}>운영 쉘 인터페이스</span>
          <span className={styles.systemMode}>
            모드: {securityMode === "prototype" ? "프로토타입 데모" : "JWT 세션"}
          </span>
        </div>
      </div>
    </header>
  );
}

export default HeaderLayout;