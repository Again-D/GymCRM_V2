import { QRCode, Button, Alert, Spin, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { apiPost, ApiClientError } from "../../api/client";

import styles from "./MemberQrPage.module.css";

type MemberQrSessionResponse = {
  memberId: number;
  memberName: string;
  qrToken: string;
  issuedAt: string;
  expiresAt: string;
  ttlSeconds: number;
  bootstrapExpiresAt: string;
};

const SESSION_ENDPOINT = "/api/v1/access/qr/member-session";

export default function MemberQrPage() {
  const location = useLocation();
  const bootstrapToken = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("token") ?? "";
  }, [location.search]);

  const [session, setSession] = useState<MemberQrSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchSession = useCallback(async () => {
    const response = await apiPost<MemberQrSessionResponse>(SESSION_ENDPOINT, {
      bootstrapToken,
    });
    return response.data;
  }, [bootstrapToken]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!bootstrapToken) {
      setIsLoading(false);
      setErrorMessage("회원 QR 링크 토큰이 없습니다. 다시 열어주세요.");
      return;
    }

    let cancelled = false;

    async function loadSession() {
      setIsLoading(true);
      try {
        const nextSession = await fetchSession();
        if (!cancelled) {
          setSession(nextSession);
          setErrorMessage(null);
          setNow(Date.now());
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setSession(null);
          setErrorMessage(resolveErrorMessage(error));
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [bootstrapToken, fetchSession]);

  const remainingSeconds = useMemo(() => {
    if (!session) {
      return 0;
    }
    const expiresAt = Date.parse(session.expiresAt);
    return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }, [session, now]);

  useEffect(() => {
    if (!session || !bootstrapToken || isLoading || isRefreshing) {
      return;
    }

    if (remainingSeconds > 1) {
      return;
    }

    let cancelled = false;

    async function refreshSession() {
      setIsRefreshing(true);
      try {
        const nextSession = await fetchSession();
        if (!cancelled) {
          setSession(nextSession);
          setErrorMessage(null);
          setNow(Date.now());
          setIsRefreshing(false);
        }
      } catch (error) {
        if (!cancelled) {
          setSession(null);
          setErrorMessage(resolveErrorMessage(error));
          setIsRefreshing(false);
        }
      }
    }

    void refreshSession();

    return () => {
      cancelled = true;
    };
  }, [bootstrapToken, fetchSession, isLoading, isRefreshing, remainingSeconds, session]);

  const statusLabel = session
    ? isRefreshing
      ? "QR 갱신 중"
      : remainingSeconds > 0
        ? "QR 활성"
        : "QR 만료"
    : errorMessage
      ? "재시도 필요"
      : "연결 대기";

  const memberTitle = session ? `${session.memberName}님의 출입 QR` : "회원 QR";
  const expiryText = session ? formatRemainingTime(remainingSeconds) : "--:--";
  const bootstrapExpiryText = session ? formatClock(session.bootstrapExpiresAt) : "--:--";

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.kicker}>Member Access</p>
          <h1 className={styles.title}>{memberTitle}</h1>
          <p className={styles.description}>
            휴대폰에서 이 화면을 열어 두면 QR이 자동으로 갱신됩니다.
          </p>
        </header>

        {errorMessage ? (
          <Alert
            className={styles.alert}
            type="error"
            showIcon
            message="회원 QR을 불러올 수 없습니다"
            description={errorMessage}
            action={
              bootstrapToken ? (
                <Button onClick={() => window.location.reload()} type="primary">
                  다시 시도
                </Button>
              ) : null
            }
          />
        ) : null}

        <section className={styles.card} aria-live="polite">
          <div className={styles.qrFrame}>
            {isLoading && !session ? (
              <Spin size="large" />
            ) : session ? (
              <QRCode
                className={styles.qrCode}
                value={session.qrToken}
                size={250}
                bordered={false}
                status={isRefreshing ? "loading" : remainingSeconds > 0 ? "active" : "expired"}
              />
            ) : errorMessage ? (
              <div className={styles.retryState}>
                <strong className={styles.retryTitle}>QR을 다시 불러와야 합니다</strong>
                <p className={styles.retryDescription}>오류를 확인한 뒤 새로고침을 눌러주세요.</p>
              </div>
            ) : null}
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>상태</span>
              <strong className={styles.metaValue}>{statusLabel}</strong>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>남은 시간</span>
              <strong className={styles.metaValue}>{expiryText}</strong>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>링크 만료</span>
              <strong className={styles.metaValue}>{bootstrapExpiryText}</strong>
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              type="primary"
              size="large"
              onClick={() => {
                void (async () => {
                  setIsRefreshing(true);
                  try {
                    const nextSession = await fetchSession();
                    setSession(nextSession);
                    setErrorMessage(null);
                    setNow(Date.now());
                  } catch (error) {
                    setSession(null);
                    setErrorMessage(resolveErrorMessage(error));
                  } finally {
                    setIsRefreshing(false);
                  }
                })();
              }}
              loading={isRefreshing}
              disabled={!bootstrapToken}
              block
            >
              QR 새로고침
            </Button>
          </div>

          <Typography.Paragraph className={styles.helperText}>
            출입 게이트가 응답하지 않으면 페이지를 잠깐 내려놓고 다시 열어주세요.
          </Typography.Paragraph>
        </section>

        {session ? (
          <span className={styles.visuallyHidden} data-testid="member-qr-token">
            {session.qrToken}
          </span>
        ) : null}
      </section>
    </main>
  );
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.detail ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

function formatRemainingTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatClock(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
