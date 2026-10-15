---
name: local-qa
description: Backend, MySQL, 화면을 로컬에서 띄우고 Playwright E2E를 돌린 뒤, Agent가 바뀐 화면을 직접 캡처해서 보며 QA한다. "QA 해", "화면 확인", "E2E 돌려" 요청이나 UI 변경 완료 보고 전에 사용.
---

# Local QA

Test 통과만으로 끝내지 않는다. 바뀐 화면을 상태별로 직접 보고 판단한다. 기준은 `.claude/rules/testing.md` §10, §17과 관련 Feature Spec, 디자인 문서다.

## 1. 띄우기

CI의 E2E Job(`.github/workflows/ci.yml`)과 같은 구성을 쓴다. 이미 떠 있으면 다시 띄우지 않는다.

```bash
# Docker (클라우드 컨테이너에서 꺼져 있으면)
docker info >/dev/null 2>&1 || (dockerd > /tmp/dockerd.log 2>&1 &)
docker compose up -d                       # mysql:8.4, localhost:3306

# Backend (e2e Profile + Test 전용 Endpoint)
cd backend && ./gradlew bootJar
SPRING_PROFILES_ACTIVE=e2e LEARNERSHIGH_TEST_ENDPOINTS_ENABLED=true \
DB_URL=jdbc:mysql://127.0.0.1:3306/learnershigh_extension DB_USERNAME=learnershigh DB_PASSWORD=learnershigh \
  nohup java -jar $(ls build/libs/*.jar | grep -v plain | head -n 1) > /tmp/backend-e2e.log 2>&1 &
# 준비 확인: curl -sf http://localhost:8080/api/admin/student-care/branches

# Admin preview
cd frontend && npm ci && npm run build --workspace=@learnershigh/admin
nohup npm run preview --workspace=@learnershigh/admin -- --strictPort > /tmp/admin-preview.log 2>&1 &
# 준비 확인: curl -sf http://localhost:4174/
```

- DB 계정은 `.env.example`과 CI 값을 쓴다. `.env`는 읽지 않는다.
- 프로세스를 끌 때 `pkill -f` 패턴을 쓰지 않는다. 자기 셸이 같이 죽는다. `ps -eo pid,args | grep backend | grep -v grep`으로 PID를 찾아 그 PID만 끈다.

## 2. E2E

```bash
cd e2e && npm ci
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run typecheck && npm test
```

- 로컬 Chromium 경로가 다르면 `PLAYWRIGHT_CHROMIUM_PATH`만 바꾼다. `playwright install`은 클라우드 컨테이너에서 실행하지 않는다.
- 실패하면 `e2e/test-results/`의 trace와 screenshot부터 본다. Test를 skip하거나 기대값을 약화하지 않는다.

## 3. 화면 직접 보기

E2E가 통과해도 바뀐 화면은 직접 본다. 스크래치 디렉터리에 Playwright 스크립트를 하나 쓰고 상태별로 캡처한다. 스크립트는 repo에 커밋하지 않는다.

- 기준일과 데이터는 Test 전용 Endpoint로 통제한다: `POST /api/test/reset`, `PUT /api/test/clock {date}`, `PUT /api/test/integration {studyDataAvailable}` (`e2e/tests/support.ts` 참고).
- Viewport는 1440×1000과 390×844 두 가지로 찍는다.
- 캡처한 PNG는 Read로 열어서 직접 확인한다.

상태별로 확인할 것:

| 상태 | 확인 |
|---|---|
| 정상 | Mockup 핵심 구조, 용어, 숫자와 단위 |
| Empty | Empty 문구가 Error와 구분되는지 |
| Error | 연동 실패가 빈 목록으로 보이지 않는지, 다시 시도가 동작하는지 |
| Loading / Disabled | 버튼이 막힌 이유가 보이는지, 중복 제출이 막히는지 |
| 긴 Text | 이름, 메모, 파일명이 넘칠 때 잘리거나 겹치지 않는지 |
| Keyboard | Tab 순서, Focus 표시, Dialog Esc 닫기 |
| 좁은 화면 | 가로 스크롤이 없는지, 버튼 높이 44px 이상인지 |

클라우드 컨테이너에서는 외부 CDN 폰트가 막혀 대체 폰트로 보일 수 있다. 폰트 문제는 실제 결함과 구분해서 적는다.

## 4. 보고

```text
E2E        N passed / N failed
화면 QA    확인한 화면과 상태, 발견한 문제 (file:line 또는 캡처 파일)
미확인      띄우지 못했거나 보지 못한 것과 이유
```

문제가 있는 캡처만 첨부한다. 실행하지 않은 확인을 통과로 적지 않는다. 띄운 프로세스는 사용자가 계속 쓸 것이 아니면 PID로 정리한다.
