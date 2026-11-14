# [계정 A] Phase A3.5 + A4 — PARTIAL 저장·관리자 검토·Monthly Planner 설계 (2026-11-14)

> 기준: `ACCOUNT-A-GIT-A3-SERVER-ANALYSIS-20261113.md`(HEAD `a4bef06`에서 시작). 브랜치 `feature/assessment-student-integration-enhancement`.
> **Push 안 함 · Git 이력 재작성 없음 · 시연 DB/Volume/Storage 접근 없음 · 계정 B 분석기 코드 변경 없음 · Student Care 변경 없음.**
> 표기: [직접] 이번에 실행 확인 · [정적] 코드·문서 확인 · [설계] 구현하지 않은 설계안.

---

## 1. PARTIAL Migration 구현 결과 [직접]

| 항목 | 내용 |
|---|---|
| 신규 Migration | `database/migrations/V202611140100__assessment_plan_analysis_partial_status.sql` — `ck_assessment_plan_analysis_status` 제약을 `('REVIEW_REQUIRED','PARTIAL','FAILED')`로 다시 만든다. **기존 Migration 수정 없음**, 기존 행은 그대로 유효 |
| Enum | `PlanAnalysisStatus.PARTIAL` 추가 |
| 판정 매핑 | `PlanAnalysisService.runStatus`: Envelope `PARTIAL` + payload `REVIEW_REQUIRED` → **Run `PARTIAL`**. Envelope `PARTIAL` + payload `FAILED` → 모순, `502 status_conflict`(저장 안 함). 나머지는 A3와 같다 |
| 진단 정보 보존 | 분석기 Envelope `errors[].code`를 `warnings[]`에 `source=ANALYZER_ERROR`로 값 수정 없이 저장(기존 `ANALYZER`·`SERVER`와 구분) |
| 엄격성 유지 | payload `status`는 계속 `REVIEW_REQUIRED|FAILED`만(backend-adapter-0.2). `importable=false`·잘못된 JSON·모르는 필드·SHA 불일치는 A3대로 저장하지 않음 |
| 오류 코드 | A3의 `422 PLAN_ANALYSIS_PARTIAL_NOT_STORABLE` 삭제(더는 내지 않음) |
| 적용 검증 | Testcontainers MySQL(Integration Test 전체) + 일회용 MySQL 컨테이너(Volume 없음, 검증 뒤 삭제)에서 Flyway `v202611140100`까지 9개 적용 확인. **시연 DB에는 적용하지 않았다** — 다음 시연 Backend 기동 시 Flyway가 자동 적용하므로 적용 시점은 사용자가 정한다 |

## 2. PARTIAL DB 저장·재조회 [직접]

- Integration(`PlanServerAnalysisApiTest`, Stub 분석기 + Testcontainers): PARTIAL → `201`, `assessment_plan_analysis_run.status = 'PARTIAL'`, `GET .../analysis`·`GET {planId}` 재조회 `PARTIAL`, 같은 결과 재요청 `200`·Run 1개 유지, 분석기 경고·`ANALYZER_ERROR` 보존.
- 일회용 격리 DB + 실제 Backend(18083) + Stub 분석기(PARTIAL Envelope, 테스트 Fixture payload): API `201 PARTIAL`, DB `PARTIAL / SERVER_ANALYZER` 2건(문서 2개).

## 3. 실제 운정고 문서 검토 가능 여부

**이번에 실제 운정고 PDF로 재검증하지 못했다.** 로컬 분석기(8765)가 꺼져 있었고, 분석기 폴더를 찾으려던 홈 디렉터리 탐색이 권한 정책으로 거절되어 우회하지 않았다.
코드상 경로: 11-13 실측에서 운정고 PDF는 분석기 `PARTIAL`(payload `REVIEW_REQUIRED`, `importable=true`) → 이번 매핑으로 **PARTIAL Run으로 저장될 조건**이다(위 Stub 시험과 같은 경로). 확인 방법: 분석기를 켠 뒤 격리 Schema Backend에 `ASSESSMENT_ANALYZER_BASE_URL/TOKEN`을 주고 운정고 Revision에 `POST .../analysis`.

## 4. API 계약 변경·미합의

### 4-1. 이번 계약 변경 (작업 트리 `docs/api/api-contract.md`)

| 위치 | 내용 | 상태 |
|---|---|---|
| §39-1 | A3 서버 분석 실행 오류·재시도·멱등 표 (11-13 구현을 계약에 기록) | 구현됨 |
| §39-2 | `analysisStatus`에 `PARTIAL`, Envelope→Run 매핑표, `warnings[].source = ANALYZER_ERROR`, PARTIAL 확정 허용, `PLAN_ANALYSIS_PARTIAL_NOT_STORABLE` 폐기 | 구현됨(사용자 승인 A3.5) |
| §39-3 | 0.3 / `extensions` 합의 대상 목록 (DRAFT, 구현 안 함) | 계정 B 합의 대기 |
| §10-1 | 학생 상세 `confirmedFields[]` (확정값만, `documentLocator` 없음 — M-5) | **DRAFT · 구현됨** |
| `domain.md` §9-2 | 저장 상태 3종과 PARTIAL 규칙 한 문단 | Commit |

### 4-2. 계약 파일 Commit 문제 (결정 필요)

- Commit된 `api-contract.md`(HEAD, 3,446줄)는 구형(Mentor·School & Admissions) 계약이고, Assessment 계약 전체는 **미커밋 C8 재작성본**(2,209줄)에만 있다. 그래서 이번 변경도 작업 트리에만 있다.
- 조사 결과: C8 재작성본의 §65 Student Care(완규님)는 HEAD와 **내용이 같고 줄바꿈(CRLF)만 다르다**(`diff --strip-trailing-cr` 차이 0).
- 안전한 정리안 (선택 필요):
  - **안 A (권장)**: `api-contract.md` 한 파일만 LF로 정규화해 단독 Commit. Student Care 절은 내용 변경 0으로 Diff에서 확인 가능. 다른 C8 문서(CLAUDE.md·rules·ADR·architecture)는 그대로 미커밋. 단 이 파일이 ADR-0008(미커밋)을 참조하므로 ADR-0008·0009 두 파일도 함께 Commit할지 결정 필요.
  - 안 B: Assessment 절(§9~§64)만 HEAD 구형 절과 바꿔 끼우는 부분 Commit — 구형 절과 번호가 겹쳐 손이 많이 가고 오류 위험이 크다.
  - 안 C: C8 전체 승인 후 일괄 Commit.

### 4-3. 계정 B와 미합의 (임의 확정 안 함)

| 필드 | 계정 A 0.3 초안 | 계정 B `extensions` | 현재 Backend | 제안 |
|---|---|---|---|---|
| `contractVersion` | payload 최상위 `"0.3"`, 없으면 0.2 | `draft` 표시 | 없음(0.2 고정) | 최상위 `contractVersion`. Parser를 버전별 허용 필드 집합으로 나눈다 |
| `status: PARTIAL` | payload에 PARTIAL | — | **Envelope PARTIAL로 Run PARTIAL 저장(이번 구현)** | payload에도 PARTIAL을 내면 Envelope과 이중 정의 → 둘이 다르면 `status_conflict` 유지 |
| `subjects[].extraction` | `{status: COMPLETE|PARTIAL|MISSING_SECTION, issues[{code, fieldPath, message}]}` | `fieldPresence`·`detailCause`·`nameQuality`·`linkConfidence` | 없음 | 과목 단위 `extraction` + 필드 단위 `fieldPresence`를 한 객체로 병합(아래 §10) |
| 정보 없음·추출 실패·검토 필요 | issues code | 값별 상태 | `null` = 미확인 | `fieldPresence[path] ∈ NOT_IN_SOURCE | EXTRACTION_FAILED | NEEDS_REVIEW | PRESENT` |
| `rubric` | element·levels(description·score)·sources | `deliverables{confirmation,basis}`·`conditions{kind,asWritten,origin}`·`specialRules`·`baseScore` | element·levels·sources | 0.3에서 `baseScore`·`specialRules`만 선택 필드로 승격, 나머지는 후속 |
| `teachingPlan[]` | 월·주차·단원·성취기준… | 없음 | 없음 | §7 모델로 확정 요청(계정 B 출력 필요) |
| `source / documentLocator` | PDF `pdfPageNumber`, HWP/HWPX `documentLocator` | + `sourceRange` | PDF 공식, HWP/HWPX 실험 | HWP/HWPX를 0.3 정식 Shape로 승격(S-8) |
| `analyzer.version` | + `profile` | 동일 | `name`·`version` 저장 | `profile`·Envelope `requestId`·`elapsedMs` 저장은 Migration 필요(후속) |

## 5. 관리자 수정·검토·확정 [직접]

| 기능 | 상태 |
|---|---|
| 분석 후보 조회 | `GET .../analysis` (A3) |
| PARTIAL 경고 | 상태 배지 "부분 분석 · 검토 필요", 상단 안내(분석되지 않은 항목 ≠ 원문에 없음), 분석기 오류 코드 목록, 경고 배지 `분석기 오류` |
| 과목 매핑 | 확정 패널에서 분석 과목마다 학업 과목 ID 직접 입력(서버가 문서 슬롯 과목인지 검증). **과목 선택 목록 API는 없음**(이름 자동 매칭 안 함) |
| 수정·DB 저장 | 확정 패널에서 필드별 정정값·근거 쪽 입력 → `PUT .../review`(기존 API) → `assessment_plan_confirmed_value` 저장 → 화면이 서버를 다시 읽음 |
| PARTIAL 확정 | 허용. 화면에서 "부분 분석 결과 확인" 체크 전에는 확정 버튼이 꺼진다(서버 필드 아님 — 화면 안전장치) |
| 후보·확정 구분 | 후보(Run `subjects`)는 그대로, 확정값은 `confirmedFields` — 확정 뒤에도 후보 60, 확정 55로 따로 보임 [직접] |
| 학생 제공 | 확정 = 학생 공개. 학생 상세에 `confirmedFields`(확정값만) [직접] |
| `savePlanReviewHttp`('SAVE' 임시 저장) | **연결 안 함.** Backend에 임시 저장이 없고(계약에도 없음) 과목 ID 없는 Mock Shape다. 실제 저장 경로는 `confirmPlanReviewHttp`(PUT review). 임시 저장이 필요하면 `PlanReviewDraft` Table + `PUT .../review-draft` 계약을 먼저 정해야 한다(§16) |
| 재검토(이미 CONFIRMED) | 화면은 막아 둔 그대로(이전 확정 대체 정책 미결). Backend는 새 Review를 추가로 받는다 — 정책 결정 필요 |

Edge headless 실측(격리 Backend + Stub PARTIAL): 부분 분석 안내 표시 → 확인 체크 전 확정 비활성·사유 표시 → 체크 후 확정 → 확정값 `subj_02 · performanceEvaluation.weightPercent = 55 · PDF 1쪽` → 새로고침 뒤 동일(DB 재조회) → PDF Viewer canvas 렌더링 → 분석기 직접 요청 0건 → 콘솔 오류 0. 화면: `account-a-a35-a4-20261114/`(Commit 안 함, §15).

## 6. 수행평가 세부기준 UI 개선 현황

| 요구 | 현재 |
|---|---|
| 과목명·수행평가명·반영비율·평가 시기·만점 | 과목별 표(기존) + 확정 패널 편집 |
| 평가 방법·제출물·조건 | "수행 활동·제출물·조건" 표(기존) |
| **평가 요소 → 수행 수준 → 세부 배점 → 근거 쪽** | **신규 "채점기준표 (AI 후보 · 미확인)" 표** — 요소별 `rowSpan`, 수준·배점 없음은 "미확인"(0점 아님), 근거 쪽 클릭 시 원문 Viewer 이동 |
| 결과 영역 탭 | **신규** `수행평가 세부 기준 | 월별 교수·학습 운영 계획` 탭. 월별 탭은 "분석 계약 대기" 상태만 표시(가짜 데이터 없음) |
| 채점기준 확정 편집 | 미구현 — 배열 값 단위 fieldPath 규칙(`rubric[i].levels[j].score`)이 Backend 화이트리스트에 없다. 0.3 합의 후 |

AdminShell·Student Care 화면 변경 없음. 기존 레이아웃(왼쪽 원문 / 오른쪽 결과) 유지.

## 7. Monthly Planner 데이터 모델 [설계]

수행평가 세부기준(`performanceEvaluation`)과 **별도 모델**이다. 운영 계획 행에 "수행평가"라는 단어가 있어도 공식 수행평가 항목을 만들지 않는다.

### 7-1. 분석기 → Backend (`subjects[].teachingPlan[]`, 0.3 선택 필드 제안)

```jsonc
{
  "rowKey": "tp_03",                       // 문서 안 안정 키 (과목 내 유일)
  "period": {
    "precision": "WEEK_ONLY",              // EXACT_DATE | DATE_RANGE | WEEK_ONLY | MONTH_ONLY | UNKNOWN
    "month": 9,                            // 1~12, 원문에 있을 때만
    "monthTo": null,                       // "9~10월" 같은 월 범위
    "weekFrom": 2, "weekTo": 2,            // 원문 표기 주차 (학교 정의, ISO 주 아님)
    "dateFrom": null, "dateTo": null,      // YYYY-MM-DD, 원문에 날짜가 적혀 있을 때만
    "asWritten": "9월 2주"                 // 원문 그대로 (필수)
  },
  "unit": "…", "content": "…",             // 단원, 교수·학습 내용
  "achievementStandards": [{ "code": "[10통과1-01-01]", "text": "…" }],
  "inquiryProcess": "…", "teachingMethods": ["…"], "assessmentMethods": ["…"],
  "linkageFocus": "…",                     // 수업·평가 연계 주안점
  "specialSchedule": "1차 지필평가",        // 원문 표기 그대로
  "assessmentMentions": ["P01"],           // 원문에서 연결이 명시된 수행평가 itemKey 후보 (없으면 [])
  "fieldPresence": { "unit": "PRESENT", "inquiryProcess": "NOT_IN_SOURCE" },
  "sources": [ /* PDF pdfPageNumber 또는 HWP/HWPX documentLocator */ ]
}
```

학년도·학년·학기·과목은 상위 문서(Plan 슬롯)와 `subjects[]`에서 온다(행에 반복하지 않음). 정확도 수치는 넣지 않는다(기존 원칙).

### 7-2. 저장 (Backend) [설계, Migration 후속]

- 후보: 지금처럼 Run `result_json` 안에 그대로(별도 Table 없음).
- 확정: `assessment_plan_confirmed_value`의 `fieldPath = teachingPlan[i].<field>` 재사용(화이트리스트 `FIELD_PATH`에 이미 `teachingPlan` 접두가 있음) — 단, 행 단위 편집·추가·삭제가 필요하면 `assessment_plan_teaching_row`(revisionId, subjectId, rowKey, precision, month…, 확정자·시각) 신규 Table이 낫다. **결정 필요**(§16).
- 수행평가 연결: 확정 행의 `linkedEvaluationItemKeys[]` → 같은 Revision 확정 수행평가 `itemKey` 참조(복제 아님). 학생 개인 `SchoolAssessment.evaluationItemRef`와 같은 키 체계.

### 7-3. API [설계, 계약 DRAFT 후보]

```http
GET /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/teaching-plan   # 후보 + 확정 + 상태
PUT /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/review         # 기존 확정에 teachingPlan 필드 포함
GET /api/student/assessment/evaluation-plans/{planId}/teaching-plan?month=9&subjectId=…    # 확정 행만
```

응답 행: `{ rowKey, subjectId, subjectName, period{…}, unit, content, achievementStandards, teachingMethods, assessmentMethods, linkageFocus, specialSchedule, linkedEvaluationItems[{itemKey,label,timing}], source{pdfPageNumber}, status: CANDIDATE|CONFIRMED }`. 학생은 `CONFIRMED`만, `documentLocator` 없음(M-5).

## 8. Student/Admin Monthly Planner 화면 설계 [설계]

```text
┌─ 왼쪽 보조 영역 (데스크톱 240px / 태블릿 접힘 / 모바일 상단 시트) ─┐┌─ 월간 영역 ──────────────────────────────┐
│ 미니 월 선택 (3~2월, 학년도 기준)                              ││ ◀ 2026학년도 2학기 · 9월 ▶   [월|주차 목록] │
│ 과목 필터 (체크, 색 = 과목 고정색)                             ││ 월간 요약 띠: MONTH_ONLY 행 (예: "9월 전체")│
│ 범례: 정확한 날짜 / 기간 / 주차 / 월 / 날짜 미확인              ││ 주차 띠 1~5주: WEEK_ONLY 행 (원문 주차 그대로)│
│ (관리자) 상태 필터: 후보·확정·누락                             ││ 날짜 Grid 7열: EXACT_DATE 셀, DATE_RANGE 막대│
└──────────────────────────────────────────────────────┘│ "날짜 미확인" 목록: UNKNOWN 행               │
                                                        └──────────────────────────────────────────┘
일정 블록 클릭 → Popover: 과목·단원·핵심 활동 / 성취기준 / 수업방법 / 평가방법 / 연계 수행평가(→ 수행평가 상세) / "원문 n쪽 보기"
```

- **학생**: 확정 행만, 읽기 전용. 모바일은 "주차 목록" 기본(Grid는 7열이 좁음), 태블릿 이상은 Grid 기본.
- **관리자**: 학교·학년도·학년·학기 선택 → 같은 달력 + 후보/확정 배지, 누락·불확실(`fieldPresence`) 표시, 블록 클릭 시 오른쪽 Drawer 편집(원문 Viewer 나란히, 근거 쪽 이동), 저장=PUT review. 확정이 곧 학생 공유(§10-1 정책).
- **Component 구조**: `MonthlyPlanner`(상태: 학년도 월 목록·선택 월·과목 필터) → `PlannerSidebar` · `MonthHeader` · `MonthSummaryBand`(MONTH_ONLY) · `WeekBands`(WEEK_ONLY) · `CalendarGrid`(EXACT_DATE·DATE_RANGE) · `UndatedList`(UNKNOWN) · `PlanEntryPopover` / (Admin) `PlanEntryDrawer`. 순수 함수 `placeEntries(rows, yearMonth, termCalendar?) → { summary, weekBands, cells, ranges, undated }` 하나에 배치 규칙을 모아 시험 가능하게 한다. Student/Admin이 같은 Component를 쓰고 `mode`만 다르다(Entity 복제 없음). 공용 위치(`frontend/shared/`)는 실제 두 Surface에서 쓸 때 옮긴다.
- 참고 이미지는 배치(왼쪽 보조·월 이동·블록·Popover)만 따르고 LearnersHigh Assessment 토큰으로 다시 그린다.

## 9. 월·주·날짜 정밀도 표시 정책

| precision | 표시 위치 | 금지 |
|---|---|---|
| `EXACT_DATE` | 그 날짜 셀 | — |
| `DATE_RANGE` | 기간 막대(월 경계에서 잘라 이어 표시) | — |
| `WEEK_ONLY` | 그 달 **주차 띠**(원문 "n주" 그대로). 날짜 셀에 넣지 않음 | ISO 주·월요일 시작 주로 날짜 환산 |
| `MONTH_ONLY` | 월간 요약 띠 | 1일·말일 등 임의 날짜 배치 |
| `UNKNOWN` | "날짜 미확인" 목록 | 추측 배치 |

- 학년도 월 매핑: 학년도 Y의 3~12월 → Y년, **1~2월은 원문·학사일정으로 확인되기 전까지 연도를 붙이지 않는다**(예: 2026학년도 2학기 문서의 "2월"을 2026년 2월로 판단하지 않음). 달력은 "2026학년도 2월"로 표시.
- 주차 → 실제 날짜 변환은 **학교별 학사일정(주차 정의)**이 확인된 뒤에만, `termCalendar` 입력이 있을 때만 한다. 없으면 주차 띠에 둔다.
- 분석기 `asWritten`을 Popover에 항상 함께 보여 준다.

## 10. 계정 B에 전달할 요구사항

1. **R1 `teachingPlan[]`** — §7-1 Shape(`period.precision`·`asWritten` 필수, 원문 없는 날짜·연도 생성 금지, 주차는 원문 번호 그대로).
2. **R2 PARTIAL 판정 일관성** — 일부 과목·항목만 추출되면 Envelope `PARTIAL` + payload `REVIEW_REQUIRED`(현재 동작 유지). 후보가 0이면 `PARSE_FAILED`/`FAILED`. `PARTIAL`+`FAILED` 조합은 Backend가 거절한다.
3. **R3 누락 사유** — Envelope `errors[].code`는 관리자 화면에 그대로 보인다(`ANALYZER_ERROR`). 코드 목록(`SUBJECT_SECTION_NOT_FOUND`·`RUBRIC_NOT_LINKED`·`TABLE_COLUMN_MERGED`·`NAME_UNREADABLE`·`WEIGHT_SUM_MISMATCH` 후보)을 확정해 주고, 가능하면 과목·fieldPath를 함께.
4. **R4 과목·필드 상태 통합** — `subjects[].extraction{status, issues[]}` + `fieldPresence{path: PRESENT|NOT_IN_SOURCE|EXTRACTION_FAILED|NEEDS_REVIEW}` 한 모양으로(`extensions`의 `detailCause`·`nameQuality`·`linkConfidence`는 issues code로 흡수 제안). 신뢰도 숫자는 넣지 않음.
5. **R5 `contractVersion: "0.3"`** — 새 필드는 모두 선택, 0.2와 하위 호환. `extensions` 같은 자유 객체는 Backend 엄격 Parser가 거절하므로 이름 있는 필드로.
6. **R6 HWP/HWPX** — `EXPERIMENTAL_MULTIFORMAT` → 0.3 정식 Shape(`documentLocator`) 승격 시점.
7. **R7 범용성 시험 데이터** — "처음 보는 학교 양식" 정확도 측정 결과를 과목·필드 단위 `fieldPresence` 기준으로 공유(Backend PARTIAL 비율과 대조).

## 11. 전체 학교 선택 기능 준비도 [정적]

| 항목 | 현재 | 개선안 |
|---|---|---|
| 권한 | Backend: 인증된 관리자 = 모든 학교(OD-A08, §38-2) | 유지 |
| 학교 원천(SoT) | **없음.** 학교는 `MockAcademicContextProvider`(school_001 등)·시연 명단(15개교)에서만 나온다. 실제 학교 코드(NEIS 등)·기존 LearnersHigh 학교 Table은 미확인(API-OD-A01) | 1팀 통합 명세에 "학교 마스터 원천" 항목으로 넘긴다. 확장에서 학교 Table을 새로 만들지 않는다 |
| Admin UI 목록 | `listSchoolsHttp` = 담당 학생 학교 ∪ 개발 설정(`VITE_ASSESSMENT_DEV_PLAN_SCHOOLS`) | 학교 검색 API 연결 후 교체 |
| 학교 검색 API | 없음 | [설계] `GET /api/admin/assessment/schools?query=운정&region=…&page=` → `{schoolId, name, region, schoolKind, planCount}`. 원천은 `AcademicContextProvider` 뒤 Adapter(Existing 연동 시 교체) |
| 중복 학교명 | 처리 없음 | 이름 + 지역(시·군·구) + 학교급을 함께 표시, 선택은 `schoolId`로만 |
| ID 매핑 | `schoolId` 문자열(가상) | 실제 코드 ↔ 확장 `schoolId` 매핑은 Existing 통합(1팀) 결정 후 |

학생 기록·Student Care 권한은 바꾸지 않는다.

## 12. HWP/HWPX Viewer 진행 상황

**Viewer 미완성 — 이번에도 구현·설치하지 않았다.** HWP/HWPX preview는 `415 PREVIEW_UNAVAILABLE` 유지, 원문 저장·내려받기만 가능. 최종 필수 요구사항에서는 제외하지 않는다.

- 후보 조사(11-13 §11) 유지: LibreOffice + H2Orestart(1순위 무료·서버 가능, GPL-3.0 확장 — 법무 확인), 한컴 Hwp SDK(상용, 견적), 한컴오피스 데스크톱 자동화(운영 불가, 기준본 생성용), Polaris 등 상용 변환 서버, JS/WASM 렌더러(보조).
- **보존 기준(판정 체크리스트)**: ① 쪽 수 일치(±0) ② 표 행·열 수와 병합 셀 위치 일치 ③ 셀 안 줄바꿈·글머리 ④ 수식(분수·첨자)·특수문자(①, ※, ㉠) 손실 0 ⑤ 가로 쪽·여백 ⑥ 글꼴 대체 시 글자 넘침·잘림 없음 ⑦ 분석기 Locator 문장이 변환 PDF Text Layer에서 찾아지는 비율 ⑧ 100쪽+ 처리 시간·메모리.
- **대표 문서 선정 기준**: HWP·HWPX 각 10건 — 병합 셀 많은 평가 기준표, 수식 포함(수학·과학), 가로 쪽, 100쪽+ 통합본, 이미지 표, 암호/배포용(거절 확인). 원천은 로컬 Read-only `references/`·학교알리미 공개 문서, **외부 변환 서비스 업로드 금지**.
- **로컬 격리 시험 방안**: Portable LibreOffice + H2Orestart를 프로젝트 밖 격리 폴더에 두고, 네트워크 차단·임시 작업 폴더·Timeout 120초·동시 1건·크기 20MB로 `soffice --headless --convert-to pdf`. 기준본은 한컴오피스로 수동 PDF 저장. 결과는 쪽별 캡처 + 체크리스트 표로 기록.
- **필요한 승인(11-13부터 대기)**: 개발 PC 격리 설치 허용 여부, 한컴 Hwp SDK 평가판·견적 문의 여부.

## 13. 시험 결과

| 범위 | 결과 |
|---|---|
| Backend Unit (`gradlew test`, ArchUnit 포함) | 아래 §13-1 |
| Backend Integration (`gradlew integrationTest`, Testcontainers) | 아래 §13-1 |
| 신규·변경 시험 | `PlanAnalysisServiceTest` (PARTIAL→PARTIAL, PARTIAL+FAILED 거절) · `PlanServerAnalysisApiTest` 9개 중 신규 3개: PARTIAL 저장·재조회·경고 보존 / PARTIAL+FAILED payload `502 status_conflict` / PARTIAL 정정 확정 → 확정 전 학생 404·확정 후 학생 상세에 확정값만·목록엔 없음·Run 불변 |
| 회귀(같은 클래스) | REVIEW_REQUIRED 저장, 응답 오류 시 이전 Run 보존, SHA 불일치, BUSY/Timeout, 동시 409, HWPX 422, 401/404 — 모두 PASS |
| Frontend `typecheck` / `lint` / `build` (전체 workspace) | exit 0 / 0 / 0 |
| Admin 화면 (Edge headless, 격리 환경) | §5 시나리오 PASS, 콘솔 오류 0 (검증 중 기존 "원문 대조" 목록의 React key 중복 경고를 발견해 수정) |
| PDF Viewer 회귀 | 검토 화면 canvas 렌더링 PASS |
| **미실행** | 실제 분석기·운정고 PDF(§3), Student Care Playwright E2E(이번에 AdminShell·공통 CSS·Student Care 변경이 없어 재실행하지 않음 — 11-13 기준선 7/7), 학생 화면 UI(이번엔 API만 추가, 학생 화면은 `confirmedFields`를 아직 표시하지 않음) |

### 13-1. 전체 Backend 실행 수치 [직접, 2026-11-14]

| 범위 | 결과 |
|---|---|
| Unit (`gradlew test`) | **282 / 실패 0 / skip 0** (Student Care 145 포함) |
| Integration (`gradlew integrationTest`) | **159 / 실패 0 / skip 0** (11-13 기준 157 → PARTIAL 422 시험을 저장 시험으로 바꾸고 2개 추가, Student Care 77 포함) |

## 14. Student Care 보호 확인

- 이번 변경 파일에 `studentcare/`, `features/student-care/`, `frontend/admin/src/app/`(AdminShell), `e2e/`, `docs/specs/wangyu/`, Student Care Migration **0건** [직접 `git diff --name-only`].
- api-contract §65(Student Care)는 내용 변경 없음.
- Backend Student Care 시험은 전체 Unit·Integration 실행에 포함.

## 15. Git

- 이번 Commit은 최종 응답·부록에 Hash 기록(Backend / Admin / 문서).
- **미커밋 유지**: C8 하네스 문서 전체(`api-contract.md` 포함 — 이번 §10-1·§39-1~3 개정도 여기에만 있음, §4-2 결정 필요), `backend/bin/`, `references/**`, 보류 JSON·바이너리, 증거 화면 폴더 `account-a-a35-a4-20261114/`(이전과 같은 원칙으로 Commit 안 함).
- Push 없음. 미Push 이력의 로컬 사용자 경로 문자열 문제(11-13 §12)는 그대로 — Push 전 처리 필요.
- Docker Desktop을 Integration Test를 위해 켰다. 시연 컨테이너(`learnershigh-mysql`)는 정지 상태 그대로이며 시작·변경하지 않았다. 검증용 일회용 컨테이너 `lh-a35-verify-mysql`(Volume 없음)은 삭제했다.

## 16. 다음 작업 우선순위

1. **결정 받기**: ① `api-contract.md` 정리 방식(§4-2 안 A 권장) ② 시연 DB에 `V202611140100` 적용 시점 ③ 운영 계획 확정 저장 방식(confirmed_value 재사용 vs 행 Table, §7-2) ④ 재검토(이전 확정 대체) 정책 ⑤ 임시 저장(review-draft) 필요 여부 ⑥ HWP/HWPX 변환 엔진 로컬 측정 설치 ⑦ 미Push 이력 경로 정리.
2. 분석기를 켜고 운정고 PDF로 PARTIAL 저장·검토 실측(§3).
3. 계정 B와 §10 R1~R5 합의 → 0.3 Parser(버전별 허용 필드) 구현.
4. 학생 화면: 평가계획서 상세에 `confirmedFields` 표시(원문 쪽 이동).
5. 과목 선택 목록(슬롯 과목 조회 API) — 과목 ID 직접 입력 제거.
6. Monthly Planner: `placeEntries` 순수 함수 + 합성 데이터 격리 Preview → 계정 B 출력 후 실데이터.
7. 후속 Phase: HWP/HWPX Viewer, Admin 레거시 메뉴 정리(AdminShell 유지, Student Care 불변), 1팀 통합 명세 인계(학교 마스터·인증).
