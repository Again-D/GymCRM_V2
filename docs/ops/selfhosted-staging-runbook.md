# Self-hosted Staging Runbook (Windows + Docker + Nginx + WireGuard VPN)

이 문서는 **집 Windows PC 1대**에서 `staging`을 Docker Compose로 상시 구동하고, GitHub Actions(self-hosted runner)로 `develop` 변경을 자동 반영하는 절차를 정리한다.

## 0) Scope / 보안 전제

- 서비스는 **인터넷에 직접 노출하지 않는다 (VPN only)**.
- 외부 QA는 ipTime **WireGuard VPN** 접속 후에만 수행한다.
- 비밀정보(DB 비밀번호 등)는 **repo에 커밋하지 않는다**. GitHub Environment secrets/vars로 주입한다.

## 1) 구성 개요

- Reverse proxy: `nginx` (단일 진입점)
  - `/` → frontend 정적 자산
  - `/api/*` → backend proxy
- backend: Spring Boot (`PORT=8080`)
- postgres / redis: compose 내부 네트워크 전용

관련 파일:
- `compose.selfhosted-staging.yaml`
- `deploy/selfhosted/nginx/nginx.conf`
- `deploy/selfhosted/nginx/Dockerfile`
- `backend/Dockerfile`
- `.github/workflows/deploy-staging-selfhosted.yml`

기본 포트:
- HTTPS(nginx): `443` (host) → `443` (container)

## 2) Windows PC 준비 (1회)

### 2.1 Docker Desktop

- Docker Desktop 설치 + WSL2 기반 권장
- `docker compose version` 이 동작해야 한다.

### 2.2 GitHub Self-hosted runner

- Repo Settings → Actions → Runners → New self-hosted runner (Windows)
- runner labels에 다음을 포함:
  - `windows`
  - `gymcrm-staging`

> workflow `deploy-staging-selfhosted.yml`은 `runs-on: [self-hosted, windows, gymcrm-staging]` 로 제한한다.

### 2.3 GitHub Environment 구성

GitHub repo에 Environment `staging-selfhosted` 를 만들고 다음을 설정한다.

**Secrets**
- `STAGING_SELFHOSTED_POSTGRES_PASSWORD`: staging DB password

**Variables (optional)**
- `STAGING_SELFHOSTED_HOSTNAME` (**필수**): canonical DDNS 호스트명. 예: `ajw0831.iptime.org`. Nginx `server_name` 및 스모크 검증에 사용된다. 설정하지 않으면 배포가 실패한다.
- `STAGING_SELFHOSTED_ALLOWED_ORIGINS`: CORS 허용 origin 목록 (쉼표 구분). 기본값: `https://localhost,https://127.0.0.1`. DDNS 호스트명 origin을 추가할 때만 설정한다.
  - 예: `https://ajw0831.iptime.org`

### 2.4 TLS Bootstrap (1회)

Windows PC 초기 설정 시, 또는 호스트를 새로 교체할 때 1회 실행한다.

**1. 환경변수 설정 후 스크립트 실행**

PowerShell **관리자 권한** 터미널에서:

```powershell
$env:STAGING_HOSTNAME = "ajw0831.iptime.org"  # 실제 DDNS 호스트명으로 교체
.\docs\observability\tools\bootstrap_selfhosted_staging_tls.ps1
```

스크립트는 PowerShell 7 이상이 필요하다. 이미 인증서가 존재하는 상태에서 재발급이 필요하면 `-Force` 옵션을 추가한다.

> **주의:** `-Force` 로 CA를 교체하면 모든 클라이언트(MacBook 포함)에서 CA를 다시 가져와야 한다.

**2. 인증서 번들 위치**

스크립트 실행 후 다음 파일이 생성된다.

| 파일 | 형식 | 용도 |
|------|------|------|
| `C:\ProgramData\gymcrm-staging-tls\ca.crt` | DER | 클라이언트 신뢰 저장소 가져오기, Docker 볼륨 마운트 |
| `C:\ProgramData\gymcrm-staging-tls\server.crt` | PEM | Nginx SSL 인증서 |
| `C:\ProgramData\gymcrm-staging-tls\server.key` | PEM | Nginx SSL 개인키 |

> 인증서 파일은 **git에 커밋하지 않는다**. 호스트를 교체하거나 분실한 경우 `-Force` 옵션으로 재생성한다.

**3. MacBook에 CA 인증서 가져오기**

`ca.crt`를 Windows PC에서 MacBook으로 복사한 뒤 아래 중 하나를 실행한다.

*CLI (권장):*

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt
```

*Keychain Access (UI):*

1. `ca.crt` 파일을 더블클릭 → Keychain Access에서 **시스템** 키체인에 추가
2. 추가된 인증서를 선택 → 정보 보기 → **신뢰** → "이 인증서 사용 시" → **항상 신뢰**로 변경

CA SHA-256 지문은 스크립트 출력 마지막에 표시된다. 가져온 뒤 지문이 일치하는지 확인한다.

**4. VPN 내 DNS 확인**

WireGuard VPN 연결 상태에서 다음을 실행해 DDNS 호스트명이 Windows 호스트 IP를 반환하는지 확인한다.

```powershell
Resolve-DnsName <STAGING_HOSTNAME>
```

반환된 IP가 Windows 호스트 IP와 일치해야 한다. 일치하지 않으면 ipTime DDNS / VPN DNS 설정을 점검한다.

## 3) 수동 구동 (로컬에서 바로 확인)

Windows PC에서(또는 동일 머신에서) 다음을 실행한다.

```bash
set STAGING_POSTGRES_PASSWORD=...  # PowerShell이면 $env:STAGING_POSTGRES_PASSWORD="..."
set STAGING_HOSTNAME=ajw0831.iptime.org   REM 실제 DDNS 호스트명으로 교체

docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml up -d --build
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml ps
```

만약 runner/PC에 `COMPOSE_FILE` 같은 전역 환경변수가 세팅되어 있으면, 의도치 않게 다른 compose 파일이 합쳐질 수 있다. 그 경우 아래처럼 환경변수를 제거한 뒤 실행한다.

```bash
set COMPOSE_FILE=
set COMPOSE_PROJECT_NAME=
```

Smoke check:
- `https://<STAGING_HOSTNAME>/`
- `https://<STAGING_HOSTNAME>/api/v1/health`

> Windows 호스트에서 `validate_selfhosted_staging_https.ps1` 스크립트를 실행하면 동일한 canonical hostname 검증을 수행할 수 있다.

JWT 기본 관리자(빈 DB 최초 기동 시 자동 생성):
- loginId: `center-admin`
- initial password: `dev-admin-1234!`

> 초기 비밀번호는 GitHub Environment secret로 교체하는 것을 권장한다. (`app.security.dev-admin.initial-password`)

로그:
```bash
docker logs gymcrm-staging-nginx
docker logs gymcrm-staging-backend
```

중지:
```bash
docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml down
```

DB 데이터는 `gymcrm-staging-postgres-data` 볼륨에 유지된다.

## 4) 자동 배포 (GitHub Actions)

- `develop` 브랜치에 push → `deploy-staging-selfhosted` workflow가 실행된다.
- Windows runner에서 다음을 수행한다:
  - `docker compose -f compose.selfhosted-staging.yaml up -d --build`
  - smoke test: `/` + `/api/v1/health`

실패 시 확인:
- Actions 로그에서 실패 단계 확인
- runner에서 `docker compose ... ps` / `docker logs ...` 로 원인 파악

## 5) 외부 QA (MacBook → WireGuard VPN)

### 5.1 ipTime WireGuard + DDNS (개념)

세부 설정은 ipTime UI에 따르되, 목표는 다음 2가지다.

- MacBook이 외부망(LTE 등)에서도 WireGuard로 집 네트워크에 붙는다.
- VPN 연결 후 Windows PC의 **VPN 내부 IP**로 접근 가능하다.

### 5.2 접속 URL

VPN 연결 후:
- `https://<STAGING_HOSTNAME>/`
- `https://<STAGING_HOSTNAME>/api/v1/health`

`<STAGING_HOSTNAME>`은 GitHub Environment variable `STAGING_SELFHOSTED_HOSTNAME`에 설정된 DDNS 호스트명이다.
예: `https://ajw0831.iptime.org/`

로그인/리프레시 요청이 403으로 막히면, GitHub Environment variable `STAGING_SELFHOSTED_ALLOWED_ORIGINS`에 해당 HTTPS origin을 추가한다.

### 5.3 Windows 방화벽 체크

접속이 안 되면 우선 다음을 확인한다.

- Windows 방화벽에서 `443/tcp` 인바운드가 VPN 인터페이스/사설망에서 허용되는지
- Docker Desktop 네트워크가 정상인지 (`docker ps`, `docker compose ps`)

## 6) 재부팅 / 네트워크 변동 시 복구 체크

1. Docker Desktop 실행 상태 확인
2. `docker compose -f compose.selfhosted-staging.yaml ps`
3. `https://<STAGING_HOSTNAME>/api/v1/health` 확인 (또는 `.\docs\observability\tools\validate_selfhosted_staging_https.ps1` 실행)
4. 필요 시 재기동:
   - `docker compose -p gymcrm-staging -f compose.selfhosted-staging.yaml up -d --build --remove-orphans`
