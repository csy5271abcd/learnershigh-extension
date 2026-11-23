# A27-UX 실제 화면 데이터 흐름 복구 보고서 (2026-11-21)

- 지시: `%USERPROFILE%\Downloads\LearnersHigh_A27_UX_Mock_HTTP_DataFlow_Recovery_ClaudeCode_20261121.md`
- 작업 위치: `C:\learnershigh-assessment-integration`. 원본 Worktree·Railway·분석기는 변경하지 않았다.
- 비밀값(DB 계정·암호)은 출력하지 않았다.
- 표기: **USER DB**(사용자 DB `lh_local_run`, 실제 화면) · **EPHEMERAL DB**(일회용 MySQL, 자동 시험) · **REPLAY**(저장된 실측 학교알리미 자료) · **HTTP/Mock**(화면 데이터 출처).

## 1. 원인 — 왜 Mock 이었고, 왜 이전 보고와 화면이 달랐나

| 증상 | 원인 (코드·실행 근거) |
|---|---|
| 관리자 우상단 '시연 데이터 · 서버 저장 안 됨' | `frontend/admin/src/features/assessment/api/mock/adminMockRuntime.ts`: `isAdminMockDataSource = configured === 'mock' \|\| (configured !== 'http' && import.meta.env.DEV)`. 이전 실행(`npm run dev:admin`)에는 `VITE_ASSESSMENT_DATA_SOURCE`가 없었다(Vite가 주입한 `VITE_` 변수 0개 확인) → **개발 서버 기본값 = Mock**. 학생 앱(`dataSource.ts`)도 같은 규칙 |
| 이전 보고 '관리자 Backend 연결됨'과 모순 | 이전 보고는 `/api` **Proxy가 8080에 닿는지만** 확인했다(401 본문 일치). 화면 코드가 Mock 출처를 쓰면 `/api` 요청 자체를 하지 않는다. **Proxy 연결 = 화면 연결로 판정한 것이 잘못**이었다 |
| 학교 콤보 '학교 없음' · '등록된 학년도 없음' | Mock 모드라 서버의 학교 목록을 읽지 않았다. 실제 서버 `GET /api/admin/assessment/schools`는 **학교 2곳**(가좌고등학교 평가계획서 2건, 운정고등학교 1건)을 돌려준다 |
| 학교 이름 없음 | 사용자 DB의 평가계획서가 시연 명단 학교(`sch_demo_gajwa`·`sch_demo_unjeong`)에 있는데, Backend 실행에 시연 명단(`ASSESSMENT_DEMO_ROSTER_ENABLED`)이 꺼져 있어 학교 이름·학적이 null 이었다 |
| 학생 '학업 정보를 불러오지 못했어요 (C-2)' (HTTP 전환 후 발견) | 서버 계약에 '현재 학기' 기준이 없어 개발 서버는 `VITE_ASSESSMENT_DEV_CURRENT_TERM`(예 `2026-2`)이 필요하다. E2E 설정에만 있었다 |
| 학생 HTTP 모드에서 `/api` 가 HTML 로 돌아옴 | `frontend/student/vite.config.ts`에 `/api` Proxy 가 없었다(E2E 전용 설정에만 있었음) |
| 분석·검토 화면 '미리보기를 불러오지 못했어요 — 저장된 파일이 등록 당시와 달라 열 수 없어요'(409 `FILE_INTEGRITY_FAILED`) (HTTP 전환 후 발견) | 사용자 DB 평가계획서 6개 Revision 원본은 `%USERPROFILE%\.learnershigh-extension\local-run-storage`에 있다(6/6 크기·SHA 일치). 이번 실행 스크립트는 `ASSESSMENT_STORAGE_ROOT` 를 주지 않아 기본 경로(`dev-artifact-storage`, 해당 원본 없음)를 읽었다 |
| 학생 공식 평가계획서 미노출 | 사용자 DB 학교알리미 원본 **0행**, 학교 매핑 0, 확인 기록 0 — 학교알리미 자동 수집이 사용자 DB 에서 **한 번도 실행되지 않았다**(Mock 화면이라 실행될 수 없었음). 수집 코드는 그대로 있다(REPLAY E2E 통과) |

## 2. 수정

| 구분 | 내용 |
|---|---|
| 실행 스크립트(저장소 밖) `C:\learnershigh-local-run\start-backend.ps1` | `ASSESSMENT_DEMO_ROSTER_ENABLED=true`(시연 명단 학교 이름·학적), `ASSESSMENT_STORAGE_ROOT=%USERPROFILE%\.learnershigh-extension\local-run-storage`(원본 위치). DB 값은 기존대로 프로세스 안에서만(미출력) |
| `start-admin.ps1` | `VITE_ASSESSMENT_DATA_SOURCE=http`, `VITE_API_TARGET=http://localhost:8080`, `VITE_ASSESSMENT_DEV_CURRENT_TERM=2026-2`, `VITE_ASSESSMENT_DEV_ADMIN_ID=adm_plan_operator`(개발용 Mock 관리자, 비밀값 아님) |
| `start-student.ps1` | 같은 HTTP·학기 설정 + `VITE_ASSESSMENT_DEV_STUDENT_ID=stu_demo_037`(시연 명단 가좌고 2026 1학년, `?devStudent=`로 바꿀 수 있음) |
| 저장소 `frontend/student/vite.config.ts` | 개발 서버 `/api` Proxy 1줄(`VITE_API_TARGET` → 기본 `http://localhost:8080`, 관리자 설정과 같음). Build 영향 없음 |
| 저장소 `frontend/student/.../routes/AssessmentLayout.tsx` | **부록 M 미실행 확인**(보고서에 부록 M 없음, 지시 파일 없음) → 지시대로 데스크톱 전체 접기 버튼·상태 제거, 고정 너비 Shell 로 복원. 좁은 화면 Drawer·홈 흰 바탕 유지. 예전 접힘 기억 무시 |
| 저장소 `e2e/assessment/tests/a27-student-shell.spec.ts` | 접기 시험 3곳을 '고정 Shell(접기 버튼 없음·11메뉴 글자·같은 너비·가로 넘침 0)'·'예전 접힘 기억 무시'로 바꾸고, Drawer·흰 홈 시험 유지 |

- Backend 코드·Migration·사용자 DB 변경은 0이다.
- 확인 방법:
  - Vite가 주입한 값: `http://localhost:5173|5174/src/.../dataSource.ts`(관리자 `adminMockRuntime.ts`)에서 `"VITE_ASSESSMENT_DATA_SOURCE": "http"`, `"VITE_ASSESSMENT_DEV_CURRENT_TERM": "2026-2"`
  - 화면에 Mock 배지 0

## 3. 서비스 (현재 실행 중, 사용자 확인용)

| 서비스 | 주소 | LISTEN PID | 실행 창 PID | 실행 |
|---|---|---|---|---|
| Backend | `http://localhost:8080` | java **20340** | 39308 | `start-backend.ps1`(`local-run`, 시연 명단 ON, 저장소 `local-run-storage`) |
| 학생 | `http://localhost:5173/assessment` | node **25636** | 31540 | `start-student.ps1`(HTTP, `/api`→8080) |
| 관리자 | `http://localhost:5174/assessment` | node **45748** | 18176 | `start-admin.ps1`(HTTP, `/api`→8080) |

- Backend 로그: `The following 1 profile is active: "local-run"`, Hikari 연결, `Schema lh_local_run is up to date. No migration necessary.`(202611190300), `schoolinfo year-query-verified=true`.
- 시작 시 세 서버는 모두 꺼져 있었다(이전 실행 창 종료). 이 작업이 띄운 Backend 창만 설정 반영을 위해 2번 다시 시작했다.

## 4. 서버 데이터 (USER DB, 읽기 전용)

| 항목 | 결과 |
|---|---|
| `GET /api/admin/assessment/schools` (개발 관리자) | 200 · 학교 **2곳** — 가좌고등학교(평가계획서 2, 최근 학년도 2026) · 운정고등학교(1) · `coverage=REGISTERED_PLANS_ONLY`, `masterConnected=false`(학교 Master 미연결 — 평가계획서가 등록된 학교만 목록에 나온다) |
| 평가계획서 | 가좌고 2026 고1 2학기 4건(삭제 2) · 운정고 2026 고1 2학기 1건(삭제) · 고2 2학기 1건 / Revision 6(모두 검토 전) |
| 학생 `stu_demo_037` 학적 | 가좌고등학교 · 2026 · 1학년 · 1·2학기(과목 9) |
| 학교알리미 원본 · 학교 매핑 · 확인 기록 | **0 · 0 · 0** — 사용자 DB 에서 자동 수집이 실행된 적 없음 |

## 5. 실제 화면 판정 (HTTP 모드)

USER DB 확인은 브라우저에서 `/api`의 GET 이 아닌 요청을 **모두 차단한 안전장치** 안에서만 했다. 학교알리미 외부 요청과 DB 쓰기는 0이다. 화면이 자동 확인(`schoolinfo-sync` 5회, 학생 `official/ensure` 2회)을 시도했으나 차단·기록됐다.

| 항목 | USER DB (실제 화면) | EPHEMERAL DB (자동 시험) | 판정 |
|---|---|---|---|
| Mock 배지 제거 · 두 화면 Backend 연결 | 배지 0. GET 17종 모두 200(학생 `academic-context`·`official`·`school-assessments` 등, 관리자 `schools`·`evaluation-plans`·`review-draft` 등) | — | **PASS** |
| 관리자 학교 선택 | 콤보 '가좌고등학교 · 평가계획서 2건', '운정고등학교 · 평가계획서 1건', 학년도 2026 | — | **PASS** |
| 관리자 평가계획서 6칸 · 등록 원본 | 가좌고 2026 고1 2학기 문서 2개(과학과·수학과 HWP), 원본 보기·내려받기·분석 결과·개정 이력. 원본 다운로드 200(HWP), 미리보기 200(HWP→PDF 변환, 142쪽) | 기본 E2E 통과 | **PASS** |
| 학교알리미 자동 수집 18구간 · 동명 학교 · 4월/9월 · 통합 파일 · 보류 · 삭제 | **실행 안 함**(사용자 DB 0건, 외부 요청 미승인 — 사용자가 직접 실행할 범위) | REPLAY E2E **7/7**(관리자 2학교 × 18칸·동명 선택·force 2회·삭제 보호 · 학생 먼저 자동 수집 · 한빛고 실명 · 학생 화면 보기) | 기능 **PASS(EPHEMERAL)** / 실데이터 **NOT RUN** |
| 분석 탭 → 4단계 검토(분석 요약·과목 확인·수행평가·월별 운영계획·최종 확정) | 분석 탭에 2문서('일부 항목 확인 필요', 검토 시작·AI 결과 보기). 검토 화면 5단계 모두 표시: 과목 11·수행평가 34·확인 항목 173, 수행평가(통합과학2 평가 비율 30%·100점·10월 3주), 월별 운영계획(2026 2학기 달력, 후보 298행). 원본 2패널 미리보기 정상. 확정 동작은 실행 안 함(사용자 데이터) | 기본 E2E(검토·확정·재확정·학생 공개) 통과 | **PASS**(표시) / 확정은 EPHEMERAL 만 |
| 학생 본인 원본 | 학적 '가좌고등학교 · 2026학년도 1학년 2학기' 표시. 공식 원본 카드는 '공식 원본을 가져오지 못했어요'(USER DB 원본 0 + 확인 차단) | 학생 공식 원본 E2E·IT 통과 | **PARTIAL** — 사용자 DB 원본 0건 |
| 학생 Shell 복원(부록 M) | 데스크톱 접기 버튼 없음·고정 너비 | Shell E2E 4/4 | **PASS** |

**스크린샷** (`C:\learnershigh-local-run\recovery-20261121\`, 모두 HTTP 모드·USER DB, 1600×900)

| 파일 | 내용 |
|---|---|
| `admin-home-1600.png` | 관리자 홈 |
| `admin-plans-noschool-1600.png` | 학교 콤보 2곳 |
| `admin-plans-gajwa-2026-1600.png` / `-1366.png` | 6칸·등록 원본 2. 자동 확인 실패 문구는 안전장치 차단 때문 |
| `admin-analysis-1600.png` | 분석 탭 |
| `admin-review-{overview,subjects,performance,teaching,confirm}-1600.png` | 4단계 검토 |
| `student-home-1600.png` | 학생 홈 |
| `student-plans-1600.png` | 학교 평가 정보 |
| `student-list-1600.png` | 학교 수행평가 |

- 자동 시험 캡처(EPHEMERAL·REPLAY)는 `recovery-20261121\e2e-screens\`에 있다.
- Network/Console 근거: `userdb-ui-check.json`, `userdb-review-check.json`(GET 응답 코드·차단 목록).
- Console 오류 7건은 모두 안전장치가 차단한 요청의 `net::ERR_FAILED`다.

## 6. 시험 (이번 실행)

| 시험 | 결과 |
|---|---|
| 학생 Shell E2E (EPHEMERAL) | 4/4 |
| Assessment 기본 E2E 전체 (EPHEMERAL) | **60/60 1회차 통과**(간헐 실패 0) |
| REPLAY E2E (EPHEMERAL, 부록 L manifest SHA `1802759c…`) | **7/7** |
| `scripts/verify-frontend.ps1` | PASS |
| Node 전체 | 147/147 |
| Backend Unit/IT | NOT RUN — Backend 코드 변경 없음(부록 L 수치 유지) |

- 실행 중 가용 RAM은 약 1.1GB였다(사용자 서버 3개 동시 실행).
- REPLAY E2E는 결과 JSON을 manifest 옆(부록 L 백업 폴더)에 다시 썼다.

## 7. 남은 조건 · 사용자가 직접 할 일

1. **학교알리미 실제 수집은 사용자 화면에서 직접 시작해야 한다.**
   - 관리자: `http://localhost:5174/assessment/evaluation-plans`에서 학교(예: 가좌고등학교) 선택 → 서버가 실제 학교알리미를 검색한다.
     - '가좌고등학교'는 인천·경기 고양 2곳이 같은 이름이라 **학교 선택 창**이 뜬다(선택 전 다운로드·등록 0) → 지역·주소로 선택 → 2026·2025·2024 × 4월/9월 수집 → 18칸 연결.
     - 실제 외부 요청과 사용자 DB 쓰기(원본·칸 연결·확인 기록)가 생긴다.
   - 학생 홈 진입도 같은 자동 확인을 시작한다(같은 이름 학교는 관리자 선택 전 '학교 확인 필요').
2. 시연 명단 학교 이름이 실제 학교 이름과 같다(예: `sch_demo_gajwa` = '가좌고등학교'). 실제 수집 원본은 이 **시연 학교 ID 아래**에 저장된다(시연 환경 특성).
3. 학교 콤보는 '평가계획서가 등록된 학교'만 보인다(학교 Master 미연결, `masterConnected=false`). 등록이 없는 학교는 분석 탭의 '학교 코드로 열기'로 연다.
4. 검토·확정은 사용자 데이터라 실행하지 않았다(화면 표시까지만 확인). 분석기 정확도(과목 0·HWPX·동명 수행평가)는 범위 밖(완규님)이다.
5. 개발용 로그인: 관리자 `adm_plan_operator`, 학생 `stu_demo_037`(실제 로그인 아님). 다른 계정은 `?devAdmin=`·`?devStudent=`로 바꾼다.

## 8. 재실행 · 종료

```powershell
powershell -NoExit -ExecutionPolicy Bypass -File C:\learnershigh-local-run\start-backend.ps1   # 8080
powershell -NoExit -ExecutionPolicy Bypass -File C:\learnershigh-local-run\start-student.ps1   # 5173 (HTTP)
powershell -NoExit -ExecutionPolicy Bypass -File C:\learnershigh-local-run\start-admin.ps1     # 5174 (HTTP)
```

- 접속: 학생 `http://localhost:5173/assessment`, 관리자 `http://localhost:5174/assessment`
- Vite 변수는 시작할 때만 읽는다. 다른 창에서 `$env:`를 바꿔도 실행 중인 서버에는 적용되지 않으니, 스크립트로 다시 시작해야 한다.
- 종료: 각 창 `Ctrl+C` 또는 `Stop-Process -Id 20340`(Backend) · `25636`(학생) · `45748`(관리자).

## 9. 보존

- USER DB: 30표 체크섬 작업 전과 동일, Flyway `202611190300`(24), 학교알리미 0행. 직접 INSERT/UPDATE/DELETE·시드 0.
- 백업: `C:\learnershigh-local-run-backup-20261121\`(오늘 덤프, 복원 검증 OK).
- Git: staged 0, Commit·Push 0. Railway·분석기·HWP 변환기 변경 0.
- 저장소 변경:
  - 코드: `frontend/student/vite.config.ts`, `frontend/student/src/features/assessment/routes/AssessmentLayout.tsx`
  - 시험: `e2e/assessment/tests/a27-student-shell.spec.ts`
  - 문서: 이 보고서
