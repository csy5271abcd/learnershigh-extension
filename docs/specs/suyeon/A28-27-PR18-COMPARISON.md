# A28-27 — PR #18(완규님 분석기·학교알리미) vs 현재 Assessment 통합 코드 비교

- 작성: 2026-11-22 · 계정 A(Suyeon). 비교 기준 브랜치 `integration/assessment-studentcare-20261116`.
- PR #18: https://github.com/csy5271abcd/learnershigh-extension/pull/18 · 작성자 `beans3142` · head `feat/perf-assess-plan-extraction` `e161f1541ba9f6303e17f3afcada44dfc0c7bcb0`(2026-11-22 20:3x `git fetch` 재확인) → base `integration/assessment-studentcare-20261116` · 22 커밋 · 149 파일(A 108 · M 30 · D 11) · Open · mergeable `clean` · CI 성공(Harness · Frontend · Backend · E2E).
- 현재 코드 = PR #18 의 base(`9755581`) 위에서 A27-UX 부록 D(2026-11-19)로 PR #18 을 **작업 트리에 흡수**한 뒤 A27·A28 작업을 더한 것(이 비교 시점에는 미커밋).
- 비교 방법: PR head 의 각 파일과 현재 작업 트리 파일을 바이트 비교(줄바꿈 LF 정규화 후). 수치 비교는 같은 원본·같은 실행 조건(`TmpCorpusDump`, 사용자 Storage 원본 396개, 읽기 전용)만 적었다.

## 1. 요약 (5~10줄 — 완규님 공유용)

1. PR #18 의 서버 안 분석기(`LocalPlanAnalyzer`·`PlanTableReader`·`extract/*` 12개)는 **그대로 채택**했다. 이번 A28-27 에서 바꾼 것은 `TeachingPlanRules`·`PlanExtractor` 2개뿐이다(표 밖 월 제목 + '주' 열 진도표).
2. 학교알리미 불러오기(학교 이름 → 비동기 작업)는 채택하고, 동명 학교 차단(409)·3개 학년도 자동 확인·학년 공통 공시 분류를 더했다.
3. Railway HTTP 분석기 퇴역은 PR 과 같은 방향. 단 `HttpPlanAnalyzerClient` 는 E2E loopback Stub 전용으로 남겼다(원격 주소 금지).
4. **채택하지 않은 것**: `V202611180100`(기존 검토 표 2개 DROP·이관)과 그에 딸린 엔티티·Service 병합, 검토 '일괄 확인' 버튼(A27 '일괄 승인 없음' 정책과 충돌). 연구 도구·자료 77개(`scripts/perf-assess-extract/**`, `docs/design/perf-assess-*`)는 런타임에 필요 없어 작업 트리에 넣지 않았다(병합 시 이력은 보존 — §5).
5. A28-27 결과: 보라고 공시 PDF 4개에서 운영계획 0행(또는 6행) → 79·195·255·350행. 실제 원본 396개 재분석에서 **기존 운영계획 37,073행·과목·항목·지필 출력은 한 줄도 바뀌지 않았다**(해시 396/396 동일).
6. 남은 한계: 2학기 '■ 12월, 1월' 묶음 표의 주는 어느 달 주인지 원문만으로 정할 수 없어 12~1월 범위(주 위치 없음)로 둔다. 표 사이에 다른 조각 표가 끼면 월을 이어받지 않는다(보라고 소인수 PDF 화학 실험 p.60 표 1개 — 빠뜨림 쪽을 택함).

## 2. 기능별 비교표

| 기능 | 파일 | PR #18 동작 | 현재(수정 후) 동작 | 변경 이유 | 호환성·시험·소유권 | 판정 |
|---|---|---|---|---|---|---|
| 서버 안 분석(표 읽기 PDF·HWP·HWPX) | `PlanTableReader`, `extract/PdfTables`, `SourceTable`, `LocalPlanAnalyzer` | 백엔드 안에서 표·문맥(ctx 400자) 추출, LRU 캐시 8 | **동일**(바이트 같음) | — | analysis-import 0.3 계약 그대로 | 채택 |
| 비율·항목·채점기준·지필 회차 | `extract/RatioRules`, `RubricRules`, `ExamRules`, `SubjectRules`, `ImportPayload` | 과목·비율·항목·채점기준·정기시험 회차 | **동일** | — | 코퍼스 396개 출력 해시 동일 | 채택 |
| 월별 운영계획(머리에 월 열) | `extract/TeachingPlanRules.rows(g)` | 머리 줄에 월·시기 열 + 단원/성취기준 열이 있는 표만 | **동일**(같은 결과 — `rows(g)` = `rows(g, null)`) | — | 기존 시험 `ExamAndTeachingPlanRulesTest` 9개 통과 | 유지 |
| 월별 운영계획(표 밖 월 제목 + 주 열) | `TeachingPlanRules.rows(g, MonthHeading)`, `heading()`, `weekOnlyPlanTable()`, `headSignature()`, `otherMonthLine()` · `PlanExtractor.contextMonths()` | 월 열이 없으면 표 전체를 버림(보라고 0행) | 표 바로 앞 마지막 본문 줄이 월 제목('■ 8월', '8월', '2026년 8월', '[9월] 교수·학습 운영 계획', 두 달 '■ 12월, 1월')일 때만 그 월. 쪽을 넘긴 같은 과목·같은 머리 표는 앞 표 월 이어받음(과목 전환·새 머리 표·쪽 건너뜀·사이 다른 표·다른 월 표시가 있으면 안 함). 주 칸 월 우선('9월 1주'), 다음 달로 넘어가는 주 칸('5 - 1월 2주')·두 달 제목은 월 범위·주 위치 없음. 숫자 없는 주 칸 줄 제외, 같은 표 안 완전 중복·나뉜 줄(같은 주·단원·성취기준) 합침. 날짜 생성 없음 | A28-25 진단(보라고 0행) | 새 시험 `TeachingPlanMonthHeadingTest` 12 · `LocalAnalyzerMonthHeadingPlanTest` 1(합성 PDF). DB·API 변경 없음(`monthBasis`=MONTH, `MONTH_RANGE` 기존 값) | **개선(A28-27)** |
| 진도표 과목 연결 | `PlanExtractor` (5) | 표마다 `subjAt` 과목에 붙임 | 같은 방식 + 표별 월 문맥 계산 | 위와 같음 | 과목명 미확인 과목에 붙은 새 행 0 | 개선 |
| 분석기 모드 | `PlanAnalyzerConfig`, `application.yml` | `local`·`http`·`none` | `local`(기본)·`none` + E2E 전용 `loopback-stub`(127.0.0.1만). `http`(Railway) 없음 | Railway 퇴역 승인(2026-11-19) | `PlanAnalyzerYamlConfigTest` 원격 주소 거부 | 대체 |
| 외부 분석기 클라이언트 | `HttpPlanAnalyzerClient`(+Test) | 삭제 | loopback Stub 전용으로 보존 | E2E 고정 합성 결과 | 원격 주소로 생성 불가 | 대체(일부 보존) |
| Railway 토큰·E2E | `AnalyzerTokenSource`(+Test), `PlanAnalyzerEnvBindingTest`, `e2e/assessment-railway/*`, `playwright.assessment-railway.config.ts` | 삭제 | 삭제 | 같은 방향 | — | 채택 |
| OCR | `extract/ScanOcr`, `ocr_win.ps1` | Windows OCR / Tesseract | **동일** | — | 실제 스캔본 OCR 은 이번 미측정 | 채택 |
| 학교알리미 불러오기 | `SchoolInfoImportService`, `integration/schoolinfo/*`, `AdminSchoolInfoImportController`, DTO | 학교 이름 → 첫 검색 결과 학교 · 202 작업 · 진행바 | + 동명 학교 2곳 이상 `409 SCHOOLINFO_SCHOOL_AMBIGUOUS`(등록 0) · 학교 선택 매핑 · 3개 학년도 자동 확인(TTL 24h) · 원본 보관·개정 이력 | 다른 학교 문서 섞임 방지(A27 D6), A27·A28 수집 요구 | `SchoolInfoImportApiTest`, `SchoolInfoSync*` IT | 개선 |
| 여러 학년 공통 문서 | `SchoolInfoImportService.gradesOf`, `SchoolInfoSourceClassifier` | 파일 이름 '1,2,3학년' → 학년마다 등록 | + 과별 통합 공시의 원문 전체 과목 단원 학년(A28-24), 범위 제한 보정 실행기 | 가정고 6·2·2 → 6·6·6 | `SchoolInfoSourceClassifierTest` | 개선 |
| 검토 테이블 병합 | `V202611180100__assessment_review_tables_merge.sql`, `PlanReview`·`PlanReviewDraft`·`TeachingPlanReview`, `PlanReviewDraftEvent`(+Repository) 삭제, `PlanReviewDraftService` | 운영계획 확정 표·초안 이벤트 표 DROP 후 이관(9 → 7표) | **미채택** — 기존 표 유지(비파괴), 현재 엔티티·Service 는 A27 기준 | 기존 표 2개 DROP, A27 과목 제외·재검토와 충돌, `190100` 이후 순서 문제(Flyway) | 사용자 DB 미적용. 병합 시 이 파일은 저장소에서 제거(§5) | **미채택(보류)** |
| 검토 화면 '후보 그대로 일괄 확인' | `PerformanceStep`, `TeachingPlanStep` | 버튼 있음 | 없음 | A27 [15] '일괄 승인 없음' | — | 미채택 |
| 다른 학년 과목 접기 | `ReviewWorkspace`, `TeachingPlanStep` | 접기 | 첫 선택만 이 문서 학년 과목, 접기는 A27 과목 제외와 겹쳐 미채택 | 화면 정책 | — | 부분 채택 |
| 채점기준 요소별 목록 | `PerformanceStep`, `review.module.css` | 좁은 칸 요소별 묶음 | 채택 | — | `a27-pr18` E2E | 채택 |
| 학교알리미 버튼 위치 | `EvaluationPlansRoute` | '학년도별 열람' 옆 | A27 6칸 화면(`PlanSlotsRoute`) | A27 화면 구조 | — | 대체 |
| API 계약 | `docs/api/api-contract.md` §38-11·§39-1 | 불러오기 계약 | + 동명 학교 409, 자동 확인·분류(A28-24), 표 밖 월 제목 규칙(A28-27) | — | 신규 Endpoint·필드 없음(A28-27) | 병합 |
| 연구 도구·자료 | `scripts/perf-assess-extract/**`(41), `docs/design/perf-assess-*`(36+2) | Python 실측 도구·113곳 결과·스크린샷·보고서 | 작업 트리에 없음 | 런타임 불필요, `analyzer_server.py`(HTTP) 포함 | 병합 시 PR 커밋 그대로 이력·파일 보존 | 보존(이력) |
| 학생 화면 | — | 변경 0 | A27·A28 학생 홈·달력·공식 원본 | PR 범위 밖 | — | 해당 없음 |
| Student Care·상담 | — | 변경 0 | 변경 0 | — | — | 해당 없음 |

## 3. 파일 단위 집계 (PR #18 149개 기준, LF 정규화 후)

| 상태 | 수 | 내용 |
|---|---:|---|
| PR 과 동일 | 25 | `LocalPlanAnalyzer`, `PlanTableReader`, `extract/{ExamRules, ImportPayload, PdfTables, RatioRules, RubricRules, ScanOcr, SourceTable, SubjectRules}`, 학교알리미 Controller·DTO 2, `ocr_win.ps1`, 분석기 시험 10, README, 시험 `application.yml` |
| 내용 다름(병합·개선) | 33 | `TeachingPlanRules`·`PlanExtractor`(A28-27), 학교알리미 Client·Config·Service, `PlanAnalyzerConfig`, `AssessmentErrorCode`, 관리자 화면 9, 시험 9, 계약·설정 문서 등 |
| PR 삭제 → 현재도 삭제 | 7 | Railway 토큰·E2E 파일 |
| PR 삭제 → 현재 보존 | 4 | `HttpPlanAnalyzerClient`(+Test, loopback Stub), `PlanReviewDraftEvent`(+Repository, 검토 표 병합 미채택) |
| 현재 작업 트리에 없음 | 80 | 연구 도구 41 · `docs/design` 자료 38 · `V202611180100` 1 |

- 파일 목록: `C:\learnershigh-local-run\a28-27-20261122\pr18-vs-local-final.tsv`.

## 4. 같은 조건 수치 (A28-27 전후, 실제 원본 396개)

| 항목 | PR #18 규칙(수정 전) | 현재(수정 후) |
|---|---:|---:|
| 문서 · 오류 | 396 · 0 | 396 · 0 |
| 과목·항목·지필·비율·채점기준 출력 해시 | — | 396/396 동일 |
| 운영계획 행 합계 | 37,073 | 37,946 |
| 수정 전 행 중 그대로 남은 행 | — | 37,073 / 37,073 |
| 보라고 2026 2학기 1학년(197쪽, 11과목) | 0 | 195 (WEEK_IN_MONTH 155 · MONTH_RANGE 40) |
| 보라고 2026 2학기 2학년 | 0 | 255 |
| 보라고 2026 2학기 3학년 | 6 | 350 |
| 보라고 2026 2학기 소인수·공동교육과정 | 0 | 79 |
| 표본 학교 | 보라 20 · 대신 60(357 중 표본) · 가정 25 · 가좌 56 · 경일 23 · 한림 20 · 현대 90 · 삼각산 18 · 운정 18 · 학교알리미 선택 학교 66 | 같음 |

- PR #18 보고의 113곳 corpus 는 이 PC 에 없어(PR 에 결과만 있음) 다시 재지 못했다 — 위 표본은 사용자 Storage 원본.

## 5. 통합(병합) 방식

- PR #18 의 base 는 현재 통합 브랜치 head(`9755581`)이고 통합 브랜치 쪽 새 커밋이 없어 **3-way 충돌이 없다**(merge-base = `9755581`).
- 방식: 깨끗한 임시 worktree 에서 `git merge --no-ff` 로 PR #18 22 커밋을 그대로 합친 뒤(완규님 커밋·작성자 보존), 그 위에 현재 작업(A27·A28·A28-27)을 커밋한다. 이 커밋에서 `V202611180100`(미채택)을 제거하고 검토 엔티티·Service 는 현재 코드로 둔다 — 사용자·E2E·CI DB 어디에도 적용된 적 없음. 연구 도구·자료 80개 중 Migration 1개를 뺀 79개는 그대로 남긴다.
- 결과를 통합 브랜치에 fast-forward push 하면 GitHub 가 PR #18 을 merged 로 표시한다(PR #18 은 close 하지 않는다).
- 그다음 PR #17(통합 → `main`): `main`(`c03a1a4`)은 통합 브랜치의 조상이라 충돌이 없다. 새 head 의 CI 통과 확인 뒤 병합.

## 6. 완규님께 보낼 메시지(초안 — 사용자가 직접 전달)

> 완규님, PR #18(서버 안 분석기·학교알리미 불러오기) 정말 감사합니다. 통합 브랜치에 커밋 이력 그대로 합쳤습니다.
> - 분석기 본체(`LocalPlanAnalyzer`·`PlanTableReader`·`extract/*`)는 그대로 쓰고, `TeachingPlanRules`·`PlanExtractor`만 고쳤어요: 표 밖 월 제목('■ 8월')+'주' 열만 있는 진도표(보라고 공시 PDF)를 읽게 했습니다. 기존 월 열 진도표 결과는 실제 원본 396개에서 한 줄도 바뀌지 않았어요.
> - 학교알리미 불러오기에는 동명 학교 차단(409), 3개 학년도 자동 확인, 학년 공통 공시 분류를 더했습니다.
> - `V202611180100`(검토 표 2개 DROP·이관)과 검토 '일괄 확인' 버튼은 A27 검토 구조·정책과 맞지 않아 이번에는 넣지 않았어요(저장소에서도 제외). 검토 표 단순화는 다음에 같이 설계하면 좋겠습니다.
> - Railway HTTP 분석기는 퇴역했고, `HttpPlanAnalyzerClient`는 E2E 로컬 Stub 전용으로만 남겼습니다.
> - 연구 스크립트·113곳 결과 자료는 PR 커밋 그대로 저장소에 남아 있어요.
> - 비교표: `docs/specs/suyeon/A28-27-PR18-COMPARISON.md`. 보라고 '■ 12월, 1월' 묶음 표처럼 주가 어느 달인지 애매한 경우는 범위로만 두었는데, 더 좋은 규칙이 있으면 알려 주세요.
