# Admin 5174 화면 미표시 — 원인과 복구 (2026-11-11)

## 1. 기존 문제

`http://localhost:5174/assessment`가 HTTP 200을 주지만 화면이 하얗게 비어 있었다(`#root` 내용 0).

## 2. 조사 결과 (지시서 1-1의 10개 항목)

| # | 확인 | 결과 |
|---|---|---|
| 1 | Admin Vite 실행 여부 | 실행 중 (npx PID 27000 → vite PID 6604, `frontend/admin`에서 `npx vite`) |
| 2 | 5174를 다른 Node가 사용 | 아니오. 5174는 위 Admin Vite 하나 |
| 3 | 다른 포트(5175 등)로 이동 | 아니오. `frontend/admin/vite.config.ts`가 이미 `port: 5174, strictPort: true` |
| 4 | 실행 위치 | 정상 (`frontend/admin`) |
| 5·6 | Router·`/assessment` Route | 정상 (재시작 후 같은 코드로 렌더링됨) |
| 7 | **JavaScript 런타임 오류** | **있음 — 원인.** `SyntaxError: The requested module '/@fs/C:/learnershigh-extension/frontend/student/src/features/assessment/api/dev/analysisPreviewClient.ts?t=…' does not provide an export named 'isAnalysisPreviewEnabled'` |
| 8 | API Proxy 설정 | 정상 (`/api` → `VITE_API_TARGET=http://localhost:18080`) |
| 9 | 개발용 환경변수 | 정상. 변환된 모듈의 `import.meta.env`로 확인: `http`, `adm_plan_operator`, `school_001`, `2026-1` (DEMO-RUNBOOK §5와 같음) |
| 10 | 이전 Vite 프로세스 잔존 | 오래 떠 있던 Admin Vite가 **오래된 모듈 그래프**를 계속 제공 |

## 3. 발생 원인

1. Admin은 "학생 화면 보기"·공통 Fixture를 위해 Student 소스를 `canonicalSource.ts`·`canonicalUi.ts`로 import한다(Admin 루트 밖 `/@fs/` 파일).
2. 직전 작업(분석 미리보기)에서 제가 Student `analysisPreviewClient.ts`의 `isAnalysisPreviewEnabled` export를 지우고 사용처를 빌드 시점 상수로 바꿨다. **현재 소스에는 참조가 0건**이다(grep 확인).
3. 그런데 실행 중이던 Admin Vite는 Admin 루트 밖 파일의 변경을 일부만 반영해, 이전 import를 가진 변환 결과와 새 `analysisPreviewClient.ts`를 함께 내보냈다. 그래서 첫 모듈 로딩에서 `SyntaxError`가 나고 React가 전혀 렌더링되지 않았다.

즉 **제 직전 변경 + 오래 떠 있던 Admin Vite의 캐시**가 원인이다. 코드·설정 오류는 아니었다.

## 4. 변경한 것

- 이 프로젝트의 Admin Vite(PID 27000·6604, 명령줄로 확인)만 종료하고 **같은 환경값·같은 포트 5174**로 다시 띄웠다. 다른 Node·다른 프로젝트 프로세스는 건드리지 않았다.
- 같은 설정을 재현하는 실행 스크립트를 추가했다: `scripts/run-admin-http-dev.ps1` (기본 = 시연 설정, `-Analyzer`·`-Multiformat` 선택).
- `frontend/admin/vite.config.ts`(Shared 영향)·Admin Router·Sidebar는 **수정하지 않았다**.

## 5. 최종 접속 주소와 증거

| 주소 | 결과 (Headless Chrome, 콘솔 오류 0) |
|---|---|
| `http://localhost:5174/assessment` | `#root` 12,682자 렌더링, 기존 관리자 Sidebar(학원관리·문자관리·학생관리·학습관리·학생 케어·Feedback Dashboard·…·Assessment 관리)·Header 유지 |
| `http://localhost:5174/assessment/evaluation-plans` | `#root` 14,910자, "학교별 평가계획서" 탭 표시 |

캡처: `ANALYSIS-FULL-PAGE.md` §5, 시험 출력 `scratchpad/admin/b_assessment_evaluation-plans.png`(보고 시 확인).

## 6. 재발 방지

- Student 소스(특히 `canonicalSource.ts`가 가리키는 파일)를 바꾼 뒤에는 **Admin Vite도 재시작**한다. Admin Vite는 루트 밖 파일 변경을 안정적으로 반영하지 못한다.
- 증상 확인: 화면이 비면 브라우저 콘솔에서 `does not provide an export named` 오류를 본다.
