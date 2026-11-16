# [계정 A] A8 — 실제 analysis-import-0.3(계정 B B6) 통합 및 전체 E2E (2026-11-15)

> 시작 HEAD `802402a` → `8985208`(+ 이 보고서). 계정 B 기준: `fefc45b`, 인계 `curriculum-analysis/runs/b5-integration-20261115/ACCOUNT-B-TO-A-CONTRACT03-AND-3YEAR-READY.md`(읽기만). Push 없음 · 기존 Migration 수정 없음 · 시연 DB·Volume·Storage 접근 없음 · Student Care·AdminShell·계정 B 코드 변경 없음.
> 표기: **[실제]** = 실제 B6 분석 서비스(로컬, 합성·공개 문서, 외부 전송 없음) · **[Stub]** = 합성 응답. 증거 화면 `account-a-a8-20261115/`(Commit 안 함).

## 1. 변경 파일

| Commit | 파일 |
|---|---|
| `3f8e654` | `integration/analysis/PlanAnalyzerClient.java`(Request.contract, Result.httpStatus·contractVersion·analyzerStatus) · `HttpPlanAnalyzerClient.java`(multipart `contract`, 0.3 422 Envelope 읽기) · `service/plan/PlanAnalysisService.java`(Gate별 계약·프로필 짝, 기동 검사, contract_mismatch) · `EvaluationPlanQueryService.java`(학생 공개 보강) · `TeachingPlanReviewRepository.java` · 시험 `PlanAnalysisContract03ClientApiTest`(신규 5), `HttpPlanAnalyzerClientTest`(+1), `TeachingPlanReviewApiTest`(+1) |
| `4cfdf56` | `MonthlyPlanner.tsx` — 학기 달 밖 행 표시(실제 데이터로 발견한 정보 손실 수정) |
| `8985208` | `e2e/assessment/stub-analyzer.mjs`, `tests/analysis-failure.spec.ts` — E2E가 0.3 Gate ON이라 요청 계약대로 응답 |
| 미커밋 | `api-contract.md`(§10-1 공개 보강, §39-3 서버 분석 연결 규칙), 증거 화면 |

## 2. Backend 0.3 요청

- Gate `assessment.analysis-import.contract03-enabled`(기본 **false** 유지) ON → multipart `contract=0.3` + `analyzerVersion=v21.4-dev`(설정 `assessment.analyzer.contract03-version`). OFF → 이전 그대로 `v21.1`, `contract` 미전송 [Stub·실제 확인].
- 짝 검사: 0.2·0.3 프로필이 같거나 0.2 프로필이 `-dev`면 기동 중단.
- 응답 계약이 요청과 다르면 `502 contract_mismatch`, 분석기가 0.3을 거절하면 `422 analyzer_rejected:<code>` — **0.2로 대체하지 않음**.
- `backendImport.payload`만 검증·저장(`localValidation`·`adapterReport`·`documentCandidates`는 저장하지 않음). `document{}`·`sectionCount`·`relatedItemKeys`는 DTO에 추가하지 않음(B6도 보내지 않음).

## 3. B6 서비스 실행·HTTP [실제]

- `.venv-llm` Python으로 `analysis_service.py --enable-contract03`(8765) + Flag 없는 인스턴스(8766)를 이번에 띄웠다가 종료(기존 실행 프로세스 없음 확인 후 기동, 다른 프로세스 종료 없음).
- 직접 호출: 합성 일반 PDF → HTTP 200, Envelope PARTIAL, `contractVersion 0.3`, `variant CONTRACT03_DEV`, `localValidation ok`, dropped = `document{}`·`relatedItemKeys`. 운영계획만 있는 PDF → 200, Envelope PARTIAL(`analyzerStatus NO_ASSESSMENTS_EXTRACTED`), payload PARTIAL.

## 4. 상태별 처리

| 경우 | 결과 | 근거 |
|---|---|---|
| payload REVIEW_REQUIRED / PARTIAL (HTTP 200) | Run 저장, 검토 가능 | [실제] |
| 0.3 FAILED + PARSE_FAILED·UNSUPPORTED_FORMAT (HTTP 422 본문 Envelope) | FAILED Run 저장, 확정 400 `analysis_failed` | [Stub IT] |
| 0.3 FAILED + NO_ASSESSMENTS_EXTRACTED 등 (HTTP 200) | FAILED Run, 확정 불가 | [Stub IT·E2E] |
| 0.2 '결과 없음' | 422 `PLAN_ANALYSIS_NO_RESULT`, 저장 안 함(A7 그대로) | [IT] |
| A Gate ON + B6 Flag OFF | 422 `analyzer_rejected:contract03_disabled`, 저장 안 함 | [실제] |
| 0.3 요청에 0.2 응답 | 502 `contract_mismatch`, 저장 안 함 | [Stub IT] |
| 분석기 400 `CONTRACT_PROFILE_MISMATCH` | 422, 재요청 없음 | [Stub IT] |
| 연결 실패·토큰 오류·SHA 불일치·모르는 필드·상태 모순 | 503/503/502/502/502, 저장 안 함 | [기존 IT] |
| 잘못된 프로필 짝 | 기동 중단 | [IT] |

## 5. 정상 PDF 전체 E2E [실제 B6 + 브라우저]

합성 PDF(B6 `synthetic-c03-full.pdf`) → 관리자 등록 → Backend 0.3 요청 → B6 분석 → 201 **PARTIAL**, `contractVersion 0.3`·`profile v21.4-dev`, **원문 SHA 일치**, 과목 1·수행 2·운영계획 6행(정밀도 WEEK_IN_MONTH×2·DATE_RANGE·MONTH·MONTH_RANGE·EXACT_DATE, `2099.7.15.`만 calendarYear 2099), issue `FIELD_REVIEW_REQUIRED`×2 보존 → 관리자 과목 선택·수행평가 확인(초안 저장) → 운영계획 5행 확인·1행 제외(운영계획 초안 저장) → **평가 정보 확정**(확정값 11개, PARTIAL 확인 포함) → 평가 확정 **뒤** 운영계획 확정(공개 5·제외 1) → 학생 '학교 평가 정보'에 확정값만(수행 60%, 항목·만점·시기, 근거 1쪽) → 학생 '월별 운영계획' 확정 5행.
- 발견·수정: 이 합성 문서의 운영계획은 3~7월인데 2학기 문서로 등록되어 학생 Planner(9~2월)에서 **어디에도 보이지 않았다** → '이 학기 달 밖의 계획' 줄 추가(`4cfdf56`) 후 5행 모두 표시 확인.

## 6. 운영계획만 있는 문서 E2E [실제 B6 + 브라우저]

B6 `synthetic-c03-teaching.pdf` → 201 PARTIAL, `MISSING_SECTION` + `ASSESSMENT_LIST_NOT_EXTRACTED`, 수행평가 0·운영계획 6행 **보존**. 관리자 최종 확정 버튼 **비활성**(확정할 항목 없음 — 공식 평가정보 잘못된 확정 방지), 운영계획 단계에 issue 표시·검토 가능 → 초안 동안 학생 404 → 운영계획 확정 → 학생 운영계획 200 CONFIRMED 6행, 문서 상세 확정값 0개.
- 이 공개를 위해 학생 공개 규칙을 보강했다(평가 확정본이 없는 문서만 운영계획 확정본 공개, DRAFT — **승인 필요** D-A8-1).

## 7. PDF/HWP/HWPX 실제 지원 범위 [실제]

| 형식 | 0.3 수신·저장 | 원문 보관·내려받기 | 앱 안 미리보기 | 확정 |
|---|---|---|---|---|
| PDF | 됨(위) | 됨 | 됨(PDF Viewer) | 됨 |
| HWP (로컬 공개 문서 1건) | 201 REVIEW_REQUIRED, 0.3, 수행 2·운영계획 5, `documentLocator` | 됨 | **없음**(415, `previewAvailable=false`) | 운영 기본 거절(`structured-confirm-dev=false`) |
| HWPX (로컬 공개 문서 1건) | 201 REVIEW_REQUIRED, 0.3, 수행 2·운영계획 5 | 됨 | **없음**(415) | 운영 기본 거절 |

HWP·HWPX 분석에는 계정 A 실험 Flag(`assessment.multiformat.experimental=true`)가 필요하다(기본 꺼짐).

## 8. 학생 Planner

[실제] §5·§6. [Stub E2E] 운영계획 시나리오(수정값 반영·제외 행 비공개·확정 전 비공개) 통과.

## 9. 기존 0.2 회귀

- [실제] A Gate OFF Backend → v21.1 `backend-adapter-0.2`로 PARTIAL 저장, 운영계획 없음, `contract` 미전송.
- Backend 전체 Unit **297/0**, Integration **188/0**(0.2 경로 시험 포함, Student Care 145·77).

## 10. 3개년 비교 계약 검토

`ACCOUNT-A-B-THREE-YEAR-COMPARE-CONNECTION-20261115.md`: A7 공식 비교(`CONFIRMED_ONLY`) 유지, B `three-year-compare-0.1`은 관리자 검토용 후보로만(별도 영역·저장, `humanConfirmed:false`), 계정 A Backend에서 Python 실행 안 함, 실행 위치·API는 결정 대기. 계정 A 비교의 한계(같은 이름·다른 내용 C06, 채점표·운영계획 변화) 기록. **실제 학교 3개년 비교는 하지 않았다**(같은 학교 3개 학년도 확정 자료 없음) — 합성만.

## 11. 테스트·증거

| 범위 | 결과 |
|---|---|
| Backend Unit / Integration | 297/0 · 188/0 |
| Frontend typecheck·lint·build | 통과 |
| Assessment E2E (`npm run test:assessment`, Stub) | **7/7** |
| 실제 B6 E2E (API + 브라우저 Edge) | 정상 PDF·운영계획만 PDF·HWP·HWPX·Gate 2종 — 위 표 |
| 화면 | `a8-admin-full-teaching-draft/confirmed`, `a8-admin-teaching-only-confirmed`, `a8-student-evaluation`, `a8-student-planner` |
| 실행 안 함 | Student Care E2E(해당 코드·AdminShell 변경 없음), 실제 학교 3개년 비교, 실제 학교 PDF 0.3 대량 검증 |

## 12. Git

`3f8e654`, `4cfdf56`, `8985208` + 이 보고서. 원격 대비 42 Commit 앞섬(Push 없음).

## 13. 승인·외부 의존

- D-A8-1 학생 공개 보강(평가 확정본 없는 문서 → 운영계획 확정본 공개) 승인.
- D-A8-2 0.3 운영 기본 활성화(현재 기본 OFF, B6도 EXPERIMENTAL/DEV).
- D-A8-3 0.3 FAILED Run 저장 유지 여부(§39-3) / 0.2 '결과 없음' FAILED 저장(D-A7-3).
- 계정 B: 3개년 비교 실행 위치·API, B6 인계 §7 미결정(failureReason Enum, `document{}`, `sectionCount`, issue 코드 목록).
- 이전 결정 대기 유지: 시연 DB Migration 4건 적용 시점, `api-contract.md` Commit 방식, 재확정 정책, HWP/HWPX Viewer 엔진.
