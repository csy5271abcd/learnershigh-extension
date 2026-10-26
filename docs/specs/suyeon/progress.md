# LearnersHigh Extension — Suyeon Progress

> 위치: `docs/specs/suyeon/progress.md`  
> 목적: 최수연 담당 LearnersHigh Assessment의 **현재 진행 상태, 다음 작업, 완료 항목, Blocker, 검증 상태**를 기록한다.  
> 이 문서는 Requirement Source of Truth가 아니다. 기능은 최신 Assessment Feature Spec, Entity/State는 `domain.md`, API는 `docs/api/api-contract.md`에 따른다.

---

# 1. Progress 문서 사용 원칙

```text
Requirement / Feature Spec / Domain / API Contract
→ 만들 기능과 검증할 동작의 기준

progress.md
→ 실제 파일 반영 여부, 코드 구현 여부, 실행한 검증을 기록
```

구형 Suyeon 화면의 구현 이력과 **새 Assessment의 구현 상태**를 혼합하지 않는다. 시연 화면이 존재해도 실제 API/Storage/권한 검증이 없다면 `VERIFIED`로 기록하지 않는다.

---

# 2. Status 정의

| Status | 의미 |
|---|---|
| `NOT_STARTED` | 해당 새 기능의 구현·정비가 아직 시작되지 않음 |
| `DRAFTED` | 문서는 존재하나 보완·검증 중, 또는 아직 Repository 반영이 확인되지 않은 초안 |
| `DOCUMENTED` | 해당 문서의 현재 저장소 존재가 확인됨(내용 완전성·코드 구현은 별개) |
| `OPEN_DECISION` | 문서화했지만 담당자 결정·합의가 필요한 상태 |
| `NOT_IMPLEMENTED` | 신규 Assessment 실제 기능 코드 미구현(문서 존재와 별개) |
| `IN_PROGRESS` | 작업 중이며 완료 조건을 충족하지 못함 |
| `IMPLEMENTED` | 실제 Repository 코드/문서가 반영되었으나 최종 검증 전 |
| `VERIFIED` | 관련 검증까지 확인됨 |
| `BLOCKED` | 승인된 요구사항만으로 해결할 수 없는 외부 의존성·정보 문제 |
| `DEFERRED` | 새 개발 범위에서 제외하거나 폐기 예정 |

```text
문서 작성·저장소 파일 확인 ≠ 설계 최종 승인 ≠ Assessment 코드 구현 ≠ 실행 테스트 통과
```

과거 기록의 `IMPLEMENTED (Fixture UI)`는 **그 당시 구형 화면 상태**이며 신규 Assessment의 상태가 아니다.

---

# 3. Current Snapshot

```text
Date: 2026-10-26
Owner: Suyeon
Project: learnershigh-extension
Current Phase: 1차 하네스 정비 완료(Suyeon 범위) → Shared 제안 승인 대기 → Stage 1 Frontend 착수 준비 (코드 구현 전)
Workflow: 설계 게이트 + 구현 Stage(Frontend Mock → Backend → AI), 기준 CLAUDE.md §18
Document Scope: README.md / domain.md / progress.md + Assessment Feature Spec 4종
Repository Files: 로컬 저장소(C:\learnershigh-extension)에 7개 문서·API Contract 존재 확인 (2026-10-26 Claude Code 3차 검증)
Git State: 최신 Commit d5be566(2026-10-14) 이후 미커밋. README/domain/progress = Modified, Feature Spec 4종 = Untracked
Assessment API Contract: DRAFTED (계약 초안 작성됨. 학생 비교·출처 연결 포함, 휴지통·권한·형식별 비교는 Open Decision)
Assessment Frontend / Backend / DB / Test: NOT_IMPLEMENTED (신규 Assessment 코드 없음)
Wangyu Student Care/Counseling: 보존 대상
```

위 저장소 상태는 **로컬 파일과 `git status`로 확인한 사실**이다. 파일 내용 작성 ≠ Git Commit/Push ≠ 팀 승인 ≠ 빌드·테스트 검증이며, Commit·Push·팀 승인·테스트 성공은 확인되지 않았다. 과거 구현 이력(2026-10-14 이전)은 새 Assessment의 구현 근거가 아니다.

현재 핵심 목표:

```text
구형 Suyeon 기능 폐기 대상 식별
→ 구형 참조 및 공유 의존성 조사
→ Assessment Feature Spec 확정
→ Domain / API / UI Reference 정합성
→ 기존 Admin Shell + Wangyu Student Care 보호
→ 신규 Assessment 구현 및 검증
```

---

# 4. Current

현재 작업 순서:

1. 작성된 7개 Assessment 문서의 상태 표현·Open Decision·Domain 정합성 보완.
2. 학생 버전 비교(API §25-1)·Task 출처(`sourceReference`, §18)는 API 초안에 반영됨. 휴지통 대상별 정책은 API §30 표·API-OD-A08에서 미확정으로 추적.
3. ADR-0009의 문서상 결정과 실제 팀 승인·구형 Queue 재사용을 구분.
4. 공통 문서·API·Claude Rules와 교차 검증.
5. 실제 Source Code 제거·보존 대상은 공유 참조 분석 후 정리.
6. 문서 정합성 확보 이후 Assessment 신규 구현 착수.

이번 작업에는 **구형 Source Code 삭제·신규 Feature 구현이 포함되지 않는다.**

---

# 5. Documentation / Harness Progress

## 5-1. 이번 단계 대상

| 문서 | 상태 | 비고 |
|---|---|---|
| `docs/specs/suyeon/README.md` | `DRAFTED` | 저장소에 문서 존재, 최신 기능·계약 현행화 중 |
| `docs/specs/suyeon/domain.md` | `DRAFTED` | 저장소에 문서 존재, Feedback 상태·OD·API 간 정합성 보완 |
| `docs/specs/suyeon/progress.md` | `DRAFTED` | 실제 작성 완료 문서와 미구현 코드의 상태 구분 |
| `docs/specs/suyeon/features/assessment-*.md` (4종) | `DRAFTED` | 37개 기능 명세 존재(Git Untracked), API 초안과 문구 정합화 완료, 남은 정책은 Open Decision |

위 `DRAFTED`는 **파일 미생성이 아니라 문서의 설계 검토·보완 상태**다. 2026-10-26 3차 검증 기준 모든 파일이 로컬 저장소에 존재하며 아직 Commit되지 않았다.

## 5-2. 연결되는 기존 공통 문서

```text
docs/OWNERSHIP.md
docs/SOURCE_OF_TRUTH.md
AGENTS.md / CLAUDE.md / README.md / ARCHITECTURE.md
docs/api/api-contract.md
docs/architecture/**
docs/adr/**
```

2026-10-26 2차 보고에서 `docs/OWNERSHIP.md`와 `.claude/rules/`의 구형 강제 규칙 충돌이 해소되었음을 확인했다. 3차 검증 기준 `CLAUDE.md`·`SOURCE_OF_TRUTH.md`·`api-contract.md`도 개정되어 Feature Spec 4종 존재·ADR-0008/0009·API 초안 상태를 반영한다(모두 Modified, 미커밋). 남은 공통 문서 과제는 `.github/CODEOWNERS` 경로, `frontend-admin.md` Admin Shell 문구, 중복 `scripts/CLAUDE.md` 확인이다. 이 4개 파일 작업에서 공통 문서, `docs/specs/wangyu/**`, 기존 디자인 지침은 수정하지 않는다.

---

# 6. 기존 통합 Spec / 구형 Feature Spec 상태

이전 Suyeon 범위:

```text
Mentor Hub / Mentor Surface
School & Admissions (8단계, 면접 연결)
Admin Student Management / Today Board / Student 360
Parent Progress
```

다음 문서 4개는 **새 Assessment의 활성 Feature Spec에서 삭제 대상**이다.

```text
docs/specs/suyeon/features/mentor-hub.md
docs/specs/suyeon/features/parent-progress.md
docs/specs/suyeon/features/school-admissions.md
docs/specs/suyeon/features/student-management.md
```

| 확인 항목 | 상태 |
|---|---|
| 위 4개 Markdown의 내용 검토 | 완료 — 업로드 원본 확인 |
| 새 Assessment의 직접 Spec으로 사용 | 금지 |
| 구형 Spec 4개 Repository 삭제 | 작업 트리에서 삭제(`D`) 상태 확인, **미커밋** (이전 명세는 Git 이력 보존) |
| API/ADR/.claude/README 구형 활성 참조 정리 | `DOCUMENTED` (3차 검증 기준 활성 참조 정리됨. 잔여: CODEOWNERS 구형 주석 경로, `frontend-mentor.md` 구형 참고 절) |
| 구형 Frontend/Backend/Fixture Source Code 제거 | `NOT_STARTED` (공유 Router 의존성 검토 후) |
| Wangyu 및 Shared 의존성 보호 검토 | `IN_PROGRESS` (문서·코드 diff 0 보고, 구형 코드 제거 전 검토 필요) |

역사적 구현 내역은 Git 이력과 과거 `progress.md` 기록에 남는다. 구형 파일을 새 Assessment 문서 이름으로 단순 변경하거나 8단계 상태를 재사용하지 않는다.

---

# 7. Architecture Progress

기존 프로젝트의 공통 기술 및 구조는 유지하는 방향이다.

```text
Frontend: React + TypeScript + Vite / npm workspaces / Node.js 22
Student / Admin Surface: 기존 App Shell 활용
Mentor Surface: 구형 Suyeon Scope 정리 대상 — 공유 영향 검토 필요
Backend: Spring Boot + Domain-packaged Layered MVC
DB: MySQL + Flyway
Existing LearnersHigh: Adapter / Integration Boundary
Testing: Gradle / Frontend verify / Playwright E2E (기존 Harness 범위)
```

원본 `progress.md`의 과거 기록은 Scaffold, MySQL/Testcontainers, CI, Admin Shell과 Wangyu Student Care 통합이 이루어졌음을 기술한다. 그 기록을 **현재 환경에서 재검증했다는 뜻으로 옮기지 않는다.**

---

# 8. Ownership Progress

| 범위 | 새 처리 |
|---|---|
| Suyeon | Student/Admin Assessment 신규 기능 구현 |
| 구형 Suyeon 기능 | 기존 구현·명세 폐기, Shared 참조 확인 후 정리 |
| Wangyu | Student Care·상담 및 본인 소유 기능 유지 |
| Shared | 기존 Admin Shell·API·인증·DB·Router 영향 검토 후 변경 |

```text
Assessment 피드백 ≠ 상담 CRM
Assessment 학생 기록 ≠ Wangyu Student Care Case
Admin Assessment 추가 ≠ 기존 관리자 전체 교체
```

2차 보고에서 `docs/OWNERSHIP.md`·`.claude/rules/`는 Assessment 기준으로 수정되어 있으며, `.github/CODEOWNERS`의 **구형 주석 경로는 아직 갱신 필요**하다고 확인되었다. CODEOWNERS는 Shared/팀 검토 대상으로 이번 파일에서 수정하지 않는다.

---

# 9. API Contract Progress

새 Assessment에서 필요한 계약 영역:

```text
Student: Academic Context / School Assessment / Notes / Templates
         Resources / Artifacts / Versions / Feedback / Enrichment / Archive
Admin: School Evaluation Plan / PDF Analysis / Student Records
       Feedback / Task & Resource Content / Activity Overview
```

| 항목 | 상태 |
|---|---|
| 새 Domain 개념 문서 작성본 | `DRAFTED` (저장소 파일 있음, API 초안과 출처·비교 문구 정합화) |
| `docs/api/api-contract.md` 신규 Assessment 계약 반영 | `DRAFTED` (계약 초안. 학생 비교 §25-1·출처 `sourceReference` §18 포함, 휴지통 대상별 정책은 API-OD-A08, 운영 권한·형식별 비교는 API-OD-A12) |
| 구형 Mentor/Parent/School 활성 Endpoint 정리 | `DOCUMENTED` (현행 API에서 신규 Assessment 계약으로 대체) |
| Wangyu Student Care API §65 보존 | **3차 검증에서 Git HEAD 원문과 동일 확인** (API 수정 시마다 재검증) |
| Assessment Backend Controller / Client / Contract Test | `NOT_IMPLEMENTED` |

실제 확인 없이 Endpoint/Response Shape을 새로 추측하지 않는다.

---

# 10. Design Progress

| 기준 | 상태 | 역할 |
|---|---|---|
| Claude Design `LearnersHighAssessment/Student/` | 사용자 제공 Reference | 학생 화면별 구성 |
| Claude Design `LearnersHighAssessment/Admin/Assessment-Management/` | 사용자 제공 Reference | 관리자 화면별 구성 |
| `references/design/daglo/` | 사용자 제공 Reference | 색상·컴포넌트·목록·여백의 시각적 참고 |
| 기존 LearnersHigh Student/Admin Shell | 보존 | Navigation/Context |
| `tds-web-guidelines.md`, `student-care-ux.md` | 보존 | 기존 적용 기능의 기준 |

```text
Assessment Screen 구현: Student S1·S2·S3·S4·S6 Stage 1 Mock (2026-10-26), 나머지 NOT_IMPLEMENTED
Responsive Visual QA: NOT_RUN
Student Care UI 영향 검증: NOT_RUN
```

Claude Design Mockup과 Daglo Reference의 존재를 신규 기능 구현 완료로 기록하지 않는다.

---

# 11. ADR Progress

기존 ADR은 저장소의 공통 의사결정 이력으로 보존한다.

| ADR | 이번 범위와의 관계 |
|---|---|
| ADR-0001 Student/Admin/Mentor Surface | `Superseded` by ADR-0008 (구형 결정 보존) |
| ADR-0002 Existing Integration | `Accepted` 유지; Adapter 재사용 |
| ADR-0003 Shared Feedback Queue | `Superseded` by ADR-0009 |
| ADR-0004 Parent Report | `Superseded` by ADR-0008 |
| ADR-0005 Layered MVC | `Accepted` 유지 |
| ADR-0006 / 0007 | 두 ADR의 `Proposed` 상태 유지 |
| ADR-0008 | 문서상 `Accepted`; 수연 범위 Assessment 재구성. 실제 팀 합의 여부 확인 필요 |
| ADR-0009 | 문서상 `Accepted`; Assessment 공용 요청함·Snapshot, Staff 자동 배정 없음. 팀 합의 여부 확인 필요 |

현재 ADR 문서의 상태 및 양방향 대체 관계는 2차 보고에서 정합성이 확인되었다. **문서상 Accepted와 실제 팀 합의·승인은 별도로 기록**해야 한다. 새로운 변경이 필요하면 기존 ADR을 무단 삭제하거나 조용히 덮어쓰지 않는다.

---

# 12. Open Decisions

| ID | 문제 | 영향을 받는 작업 |
|---|---|---|
| OD-A01 | 기존 수행평가 원본과 신규 SchoolAssessment 매핑 / Write Owner | Existing API/DB·ADR-0002 |
| OD-A02 | 학교 평가계획서 PDF Revision·확인 정보 저장 | API/DB |
| OD-A03 | PDF 추출 Provider·원본 페이지·정정 정책 | AI/File Storage |
| OD-A04 | 학생 학교/학년/과목 Context 소유 원본 | Existing Integration |
| OD-A05 | Note Editor 포맷·자동 저장·Revision | Frontend/DB |
| OD-A06 | 피드백 Snapshot 물리 보존·취소/재요청 | API/DB/Privacy |
| OD-A07 | File Storage·Preview·포맷별 Version Compare | File Storage |
| OD-A08 | 학생/기관 접근 및 **Admin 콘텐츠 운영·공개 권한** | Auth/Shared |
| OD-A09 | **공용 피드백 방식은 ADR-0009로 문서상 결정**(API-OD-A09 반영 완료). 남은 것: 실제 팀 승인, 기존 Queue 코드/데이터 물리적 재사용 여부 | ADR/팀 검토 |
| OD-A10 | Mentor Surface Scaffold·Parent 범위 구형 코드 정리 | Shared Architecture |
| OD-A11 | 아카이브·휴지통 삭제/복원/보존 | Persistence/Privacy |
| OD-A12 | 외부 참조자료 이용·저작권·공개 콘텐츠 검수 | External Providers/Copyright |

예전 `ParentReport Status`, `Mentor Q&A reassign`, `Topic Approval` 등은 **신규 Assessment의 Open Decision이 아니다**. 과거 기록에는 남더라도 새 개발을 막는 필수 요구사항으로 취급하지 않는다.

---

# 13. Next — Harness Completion

```text
[x] Assessment Feature Spec 4종 생성 (현행 37개 ID; 설계 검토는 진행 중)
[x] docs/specs/suyeon/features/ 아래 구형 4개 Spec 삭제 상태 확인 (2차 Claude Code 보고)
[x] OWNERSHIP / .claude/rules 구형 강제 규칙 정리 (2차 Claude Code 보고)
[x] 7개 문서 로컬 저장소 반영 확인 (3차 검증. Git Commit은 미실시)
[x] ST-13 Student Compare, ST-07·17 출처 연결 API 계약 초안 반영 (API §25-1, §18)
[ ] ST-20 대상별 삭제/복원 정책 결정 및 계약 보완 (OD-A11 / API-OD-A08)
[x] ADR-0009 vs API-OD-A09 / CLAUDE.md / SOURCE_OF_TRUTH.md 미결 문구 정리
[ ] 기존 구형 코드·Router 공유 의존성 조사 및 CODEOWNERS 확인
```

이번 문서 수정은 Source Code 변경을 수반하지 않는다.

---

# 14. Next — Repository Verification

문서 반영 후:

```text
[ ] 신규 문서가 docs/specs/suyeon/ 경로에 저장되었는가?
[ ] 삭제한 구형 파일을 README / API / ADR / CLAUDE가 활성 Spec으로 참조하지 않는가?
[ ] 상대 경로와 Markdown Link에 Broken Link가 없는가?
[ ] docs/specs/wangyu/의 변경 Diff가 0인가?
[ ] frontend/admin/src/features/student-care/ Diff가 0인가?
[ ] 기존 TDS·Student Care UX Reference가 보존되는가?
[ ] 실제 기능 경로와 새로운 Spec 경로가 일치하는가?
```

---

# 15. Next — Implementation Foundation

```text
1. 기존 LearnersHigh Integration 확인
2. Student/Admin Canonical Identity 및 인가 확인
3. Note / Artifact / Feedback Snapshot 핵심 Invariant 구현
4. 새 Assessment API Contract 정리
5. Backend + DB Migration
6. Frontend Student/Admin 화면과 상호 연동
7. 테스트와 Visual QA
```

단계별 이행은 실제 파일·PR·테스트 근거가 생길 때 Progress에 기록한다.

---

# 16. Implementation Priority

| 우선순위 | 작업 묶음 | 완료 조건 요약 |
|---|---|---|
| P1 | 학교 수행평가·탐구 노트·결과 파일 | 생성/조회/저장/버전 유지 |
| P2 | Student–Admin 피드백 | 요청 Snapshot, 파일 열람, 답변/위치별 의견 |
| P3 | 수행평가 준비 및 자료 조사 | 꿀팁, 주제 추천, 템플릿 10종, 자료 삽입 |
| P4 | 학교 PDF·평가정보 | 지필/수행 분석, 원본 비교, Admin 수정 |
| P5 | 심화 콘텐츠·성장 기록 | Task, 모의고사 소재, 대학 자료, Archive |

이는 **개발 우선순위**이며 학생에게 강제하는 단계가 아니다.

---

# 17. Phase Plan

## Phase 0 — Harness / Docs

```text
이번 7개 문서: DRAFTED (파일 생성 확인, 설계 보완 진행 중)
기존 Harness Scaffold: 과거 기록상 구현됨 (Assessment 기능 구현과 별개)
Assessment Feature Spec 4종: DRAFTED (ST 20개 + AD 17개, 문서 존재)
Assessment API Contract: DRAFTED (현행 계약 공백 남음)
```

## Phase 1 — 구형 범위 정리 및 Integration Boundary

```text
Legacy 4개 Markdown 제거: 2차 Claude Code 보고에서 Git 삭제 상태 확인
구형 코드·Fixture·Router 제거: NOT_STARTED (공유 의존성 검토 전)
Wangyu Student Care / Shared 보호: 2차 보고상 기존 파일 diff 0; 제거 시 재검증 필수
```

## Phase 2 — Assessment Student Core

```text
학교 수행평가 목록·직접 추가·학업 정보: STAGE1_MOCK (2026-10-26, Backend 미연동)
노트 / 템플릿 / 파일: NOT_IMPLEMENTED
Backend/API/DB 연동: NOT_IMPLEMENTED
```

## Phase 3 — Admin Assessment / Feedback

```text
기존 Admin Shell 보존: 필수
학생 기록 열람 / 피드백 / 문서 Viewer: NOT_IMPLEMENTED
```

## Phase 4 — 학교 PDF / AI 지원

```text
학교별 PDF 등록·지필/수행평가 분석·검토: NOT_IMPLEMENTED
AI Provider 및 원본 근거 확인: OPEN_DECISION / NOT_IMPLEMENTED
```

## Phase 5 — 심화 탐구 / Reference / Archive

```text
심화 Task·모의고사 카드·대학 자료·성장 기록·개인 보관함: NOT_IMPLEMENTED
```

## Phase 6 — Integration / E2E / Visual QA

```text
Student ↔ Admin ↔ Backend 일치: NOT_RUN
Permission / Snapshot / Version / File Fallback: NOT_RUN
Daglo + Assessment Mockup Visual Check: NOT_RUN
```

## Phase 7 — 기존 LearnersHigh 연동

기존 Student Identity / Auth / Admin Scope / Performance Task / Library 등의 실제 Interface를 확인한 범위에서 연결한다. 기존 서비스 전체를 재구현하지 않는다.

---

# 18. Blocked

현재 문서 작성 자체는 진행 가능하다. 다만 실제 구현 시 확인이 필요한 항목:

```text
- 기존 LearnersHigh 실제 API / DB / Auth
- Admin Scope 권한
- 공식 학교 평가계획서 원본 관리 경계
- 외부 AI / PDF Analysis / File Storage
- Office(HWP 포함) Preview / Version Compare 지원
- 구형 Suyeon Code의 Shared / Wangyu 참조 관계
```

필요한 정보가 없는 단계에 도달하면 추측 구현하지 않고 해당 이슈를 `BLOCKED`로 기록한다.

---

# 19. Verification

이번 Markdown 개정에서 주장할 수 있는 검증과 주장할 수 없는 검증을 구분한다.

| 항목 | 이번 결과 |
|---|---|
| 현재 사용자 업로드 7개 Assessment 문서 + API 계약 기준 확인 | `DONE` |
| 신규 Assessment 37개 ID 문서 작성 | `DRAFTED` (파일 존재, 설계 보완 필요) |
| 2026-10-26 Claude Code 2차 문서 검증 결과 | `DOCUMENTATION CONDITIONAL PASS` (이전 산출물 기준) |
| 이번 수정본 Markdown 구조·참조 점검 | ZIP 생성 시 실행해 별도 보고 |
| 이번 수정본 Windows Repository 반영 / Git Diff | `NOT_RUN` |
| Frontend typecheck / lint / build | `NOT_RUN` |
| Backend Unit / Integration | `NOT_RUN` |
| Playwright E2E / 권한 / Snapshot 테스트 | `NOT_RUN` |

과거 원본 문서에서 언급한 `scripts/verify.ps1 -Strict PASS`, Browser Flow, Build PASS는 과거 해당 Branch/시점의 결과다. **새 Assessment 기능이나 현재 Git Head의 검증 결과로 승계하지 않는다.**

---

# 20. Done

이번 문서 작업의 완료 조건:

```text
- 기존 문서 범위·목차 분석
- 신규 Assessment Domain 및 네 Feature Spec의 문서 정합성 보완
- 구형 기능 Spec 4개의 삭제 상태와 신규 문서의 존재 구분
- Wangyu / Shared 보호 기준 유지
- 파일 경로·Markdown·ZIP 정적 검증 (실행 결과로 별도 확인)
```

`Done`은 문서 **작성본 기준**이다. Repository 반영·실제 삭제·신규 Assessment 코드 동작은 완료라고 보고하지 않는다.

---

# 21. Repository 반영 후 상태 갱신 규칙

```text
DRAFTED (설계 보완 중)
→ Git Repository에 파일 존재 확인: DOCUMENTED
→ 문서 간 계약·링크·권한 검증 완료: VERIFIED (문서)
→ 실제 Assessment 코드 개발·테스트: IMPLEMENTED / VERIFIED (기능, 별도 기록)
```

기능 코드는 별도 테스트를 수행해야 `VERIFIED`로 변경한다. 새 Assessment가 구현되었다는 주장을 하려면 실제 커밋·실행 근거를 남긴다.

---

# 22. Update Format

```md
## YYYY-MM-DD — 작업 제목

### Current
- ...

### Done
- ...

### Next
- ...

### Blocked
- ...

### Verification
- command: 실제 실행 결과
```

기존 이력은 사실 기록으로 남기되 현재 Phase 상태에 자동 합산하지 않는다.

---

# 23. Recent Log

## 2026-10-09 ~ 2026-10-14 — 구형 범위의 구현 이력 (Historical)

### Done (당시 기록)

- React / TypeScript, Spring Boot / MySQL 기반 Scaffold 및 Harness 구성.
- 기존 Student Mentor Hub, School & Admissions, Admin Management, Mentor Surface의 **Fixture 기반 UI** 작업과 브라우저 Flow 검증을 다수 수행.
- 2026-10-13: 기존 Admin Shell에 Wangyu Student Care `/student-care` Route를 통합; `features/student-care/**` 변경 없이 유지했다는 기록이 있음.
- 2026-10-14: 최신 `origin/main` 재통합 당시 Wangyu 코드·Backend·Student Care E2E 구간을 보호했다는 기록이 있음.

### Verification (당시 기록)

- 2026-10-14 통합 작업 문서: Frontend typecheck/lint/build 및 Backend `gradlew clean build` PASS 기록(당시 Unit 222건), Docker가 없어 Backend Integration / Student Care E2E NOT_RUN.
- 기존 기능 대부분이 Fixture/UI Prototype으로, 실제 API·Storage·인증 연동 및 Frontend 자동 테스트는 미완료였다는 기록이 있음.

### 구분 규칙

이 절은 **기존 파일에 있던 개발 이력을 요약 보존한 것**이다. 구형 코드가 현재도 남아 있는지, 실제 기능이 정상 동작하는지, 최신 Branch에 무엇이 병합되었는지는 현재 Repository 검증 전까지 확인되지 않았다. 구형 Scope는 신규 Assessment 요구사항과 별개다.

## 2026-10-26 — Assessment 문서 재구성

### Current

- 현재 저장소에 생성된 Assessment 문서 7개의 정합성을 보완.
- 기존 Harness와 Wangyu 기능을 보호하며 수연 문서만 교체용으로 개정.

### Done

- `README.md`, `domain.md`, `progress.md` 및 Assessment Feature Spec 4종의 저장소 파일 존재(Claude Code 2차 보고).
- 구형 Feature Spec 4개 삭제 상태 확인(Claude Code 보고).
- OWNERSHIP·Claude Rules 개정 뒤 강제 규칙 충돌 해소 확인.

### Next

- 이번 개정본 Windows Repository 반영과 링크/상태 교차 검증.
- API 계약의 학생 버전 비교·출처 참조·삭제/복원 및 피드백 상태 보완.
- ADR-0009 팀 승인 여부·공통 문서 미결 표기 확인.
- 기존 코드 제거 범위는 공유 의존성 조사 후 결정.

### Blocked

- 실제 LearnersHigh 연동 API/Auth·File Storage/AI Provider 및 일부 Admin 권한 미확정.
- 이번 산출물은 사용자 로컬 저장소에 자동 반영되지 않음.

### Verification

- 이번 작업은 Markdown 산출물 정적 검증만 해당. Frontend/Backend/DB/E2E 실행하지 않음.

## 2026-10-26 — 3차 검증 후 문서 시차 정리

### Done

- `domain.md` §4·§11·§14-2·§31, `assessment-inquiry.md` §4·§8-2·§9·§12·§14·§15, `README.md` §8을 API 초안(§18 `sourceReference`, §25-1 학생 비교)과 일치하도록 문구 정정.
- 이 문서의 Snapshot·Current·API 진행·OD-A09·Harness 체크리스트를 로컬 저장소와 `git status` 사실 기준으로 갱신.

### Next

- OD-A11 / API-OD-A08 휴지통 대상별 정책, OD-A08 / API-OD-A12 Admin 콘텐츠 운영 권한 결정.
- ADR-0008·0009 팀 승인 기록, CODEOWNERS·`frontend-admin.md` 문구·중복 `scripts/CLAUDE.md` 정리(공통 문서, 팀 검토).

### Blocked

- 기존 LearnersHigh 연동 API/Auth·File Storage/AI Provider 미확정.

### Verification

- 문서 정적 검증만 수행(용어·참조·코드 블록). Git Commit 미실시. Frontend/Backend/DB/E2E 실행하지 않음.

## 2026-10-26 — 1차 하네스 정비 (Frontend 우선 개발 기반)

### Done

- 개발 순서 기준을 `CLAUDE.md` §18로 일원화했다 (설계 게이트 + 구현 Stage). `AGENTS.md` §3·§4, `README.md` §4·§5·§13·§18, `ARCHITECTURE.md` §1·§2, `domain.md` §25·§35는 이 절을 참조하도록 수정했다.
- `CLAUDE.md` §8에 Routing 현황(Student react-router 7.18.4 사용 중, Admin `adminLocation.ts`)을 사실대로 반영했다.
- `.claude/rules/frontend-student.md`·`frontend-admin.md`·`testing.md`에 Mock 허용 범위, Stage 1 품질 기준, Admin Shell 최소 변경 절차를 반영했다.
- 신규 DRAFT 문서 5종을 추가했다: `assessment-screen-map.md`, `assessment-frontend-mock.md`, `assessment-frontend-quality.md`, `legacy-cleanup-plan.md`, `harness-change-proposals.md`.

### Next

- `harness-change-proposals.md`의 P-01~P-13을 팀(Wangyu)과 검토한다. 특히 P-01 verify.ps1, P-04·P-06 Admin Shell, P-07 shared 위치.
- `assessment-screen-map.md` MM-01~10을 결정한다.
- Stage 1 첫 작업: Student Assessment Shell(S1)과 학교 수행평가 목록(S3).

### Blocked

- `scripts/verify.ps1` 원본은 구형 Spec 4개를 요구해 **실패한다** (P-01 적용 전).
- Admin Assessment 화면은 P-06(Wangyu 동의)과 P-07(공유 위치) 승인 전에는 착수하지 않는다.

### Verification

- `powershell -NoProfile -File scripts/verify.ps1 -SkipFrontend -SkipBackend` (원본): **FAILED** — 구형 Spec 4개 누락.
- 같은 명령으로 P-01 패치 사본(Repository Root만 저장소로 고정)을 실행: **PASS**. 저장소의 `scripts/verify.ps1`은 변경하지 않았다.
- Frontend typecheck / lint / build, Backend, E2E: 이번 작업에서 실행하지 않음 (코드 변경 없음).

## 2026-10-26 — Student Assessment Frontend Stage 1 (Shell · 학업 정보 · 학교 수행평가 목록 · 직접 추가)

### Current

Stage 1 (Contract 기반 Mock). 서버 저장·권한·Backend는 없음 → `VERIFIED` 아님 (CLAUDE.md §18).

### Done

- `frontend/student/src/features/assessment/` 신규: `api/`(§9·§12·§13 Type, Mock Adapter, Fixture, 전환 스위치), `model/`, `components/`, `routes/`.
- 화면: Assessment Layout(S1: 메뉴·학기 선택·과목 바로가기·Mobile Drawer), 학교·학업 정보(S2), 학교 수행평가 목록·과목별 목록(S3·S6: 검색·상태 탭·정렬·다가오는 일정·순방향 상태 변경·Back Context), 수행평가 추가 Modal(S4: 제목·과목 필수, 마감일·설명 선택), 상세 기본 정보(S7 일부).
- 공용 Student Shell 최소 변경(추가만): `app/router.tsx`에 `assessmentRoute` 1개, 상단 메뉴 `Assessment` 항목·아이콘, `StudentAppShell` 활성 메뉴 연결. 구형 Route·`/` Redirect는 그대로 둠.
- MM-01(역전이)은 순방향만 허용, MM-07(중요 ★)은 미구현. 새 계약 공백 MM-11~15를 `assessment-screen-map.md`에 기록.

### Next

- S7 상세(노트·결과 파일·패널), S5 PDF 가져오기, S24 홈.
- MM-01·07·11~15 결정 후 계약 개정 → 화면 반영.
- Playwright Mock 모드 Project(P-08) 승인 시 scratchpad 검증 스크립트를 `e2e/`로 옮김.

### Blocked

- `scripts/verify*.ps1`이 Zone.Identifier(인터넷 다운로드 표식) 때문에 `RemoteSigned` 정책으로 실행 차단됨. 사용자가 `Unblock-File`로 해제해야 함.

### Verification

- `npm run typecheck` / `npm run lint` / `npm run build` (frontend workspaces 전체): **PASS**.
- Scratchpad Playwright 스크립트(로컬 Chrome, 1920×972 @1.5 + 820/390 폭): Interaction 48개 PASS. 실패 1건은 favicon 404(기존 Student 앱에 favicon 없음, 이번 변경과 무관).
- `scripts/verify.ps1`, `scripts/verify-frontend.ps1`: **NOT RUN** (실행 정책 차단).
- 기존 Student 화면(Mentor Hub / School) 회귀: `/` 진입과 상단 메뉴 표시만 확인. 전체 회귀는 미실행.

## 2026-10-26 — Assessment 디자인 정밀화 (Mockup 직접 기준 + Daglo 보완, TDS 분리)

### Done

- 원인 확인(코드·Computed Style): Assessment CSS가 `index.css`의 TDS 의미 기반 Token(`--lh-color-*`, 예: Accent `#3182f6`)을 약 150곳에서 참조. 전역 `:focus-visible`도 TDS Accent 사용.
- `features/assessment/styles/assessmentTheme.css` 신규: Mockup 픽셀 실측 `--as-*` Token을 `.lh-assessment` 범위에만 정의. Assessment CSS의 `--lh-color-*` 참조 0건.
- Layout·목록·Modal·학교·학업 정보·상세를 Mockup 실측(1920 @1.5) 치수로 수정. 상세는 상단 Breadcrumb 바 + 가운데 속성 목록 + 오른쪽 패널 자리 구조.
- 버그 수정: Modal을 열자마자 빈 제목 오류가 뜨고, 빈 상태에서 "평가 정보 더 입력하기" 클릭이 빗나가던 문제(Blur 시 오류 문구로 Layout 이동). 상세를 바로 열 때 "과목 정보 없음"이 잠깐 보이던 문제.
- 문서: `assessment-design-principles.md` 신규, Suyeon 문서·`frontend-student.md` 문구 정정, Shared `SOURCE_OF_TRUTH.md` §4-4는 P-14 제안.

### Verification

- `npm run typecheck` / `lint` / `build` (frontend 전체): 결과는 이번 보고 참조.
- Scratchpad Playwright 회귀 52건 중 51 PASS (실패 1 = 기존 favicon 404). 구형 `/mentor`, `/school/tasks` 렌더링·body 스타일 영향 없음 확인.
- `scripts/verify*.ps1`: NOT RUN (실행 정책 차단 유지).

## 2026-10-26 — Student 수행평가 상세 UI (Stage 1)

### Done

- 상세 화면을 Mockup 구조로 완성: 상단 바(Breadcrumb·수정 이력·피드백 요청·더보기), 본문(기본 정보·주제명 추천/꿀팁·결과물·탐구 노트), 오른쪽 패널 4탭.
- Contract 기반 Mock 추가 (`api/assessmentDetailApi.ts`, `api/mock/assessmentDetailMock.ts`, `assessmentDetailFixture.ts`): §20·21 노트·Revision 조회, §24·25 결과물·버전 생성(메타데이터만), §31·32 피드백 요청·Snapshot·답변 조회.
- 실제 동작: 결과물 등록/새 버전(결과물별 독립 번호), 피드백 대상 버전 선택, 피드백 요청(노트 Revision + 선택 버전 Snapshot 고정, 같은 범위 대기 중 중복 방지), 요청 기록·답변 표시, 수정 이력 열람, 템플릿 10종 미리보기.
- 비활성/Empty(사유 표시): 노트 편집·템플릿 적용(Editor OD-A05), 평가 기준(MM-20), 자료 추천(MM-21), AI 도우미·쉬운 설명·주제 추천 실행(Stage 3), 미리보기·다운로드(File Provider), 더보기 메뉴 항목, 평가 정보 수정·삭제.
- 버그 수정: 결과물 생성 후 업로드만 실패하고 창을 닫으면 목록이 갱신되지 않던 문제.

### Next

- 탐구 노트 Editor 결정(OD-A05) → 편집·자동저장·Revision 생성 → 템플릿 적용.
- P-15 계약 보완 결정 → 상세 속성·평가 기준·자료 탭.

### Verification

- `npm run typecheck` / `lint` / `build` (frontend 전체): PASS.
- Scratchpad Playwright: 상세 45건 PASS, 기존 목록·학업 정보 52건 중 51 PASS(기존 favicon 404), 구형 `/mentor`·`/school/tasks` 영향 없음.
- `scripts/verify*.ps1`: NOT RUN (실행 정책 차단 유지).

## 2026-10-26 — Student 선생님 피드백 목록 S15 (Frontend 로드맵 Stage 1, Mock)

### Done

- `/assessment/feedback` 구현 (Mockup TF-LIST-01~03): 전체 / 답변 대기 / 답변 완료 필터(`?status=`, 건수), 요청 카드(상태·요청 시각·보낸 자료), 답변(전체 의견·위치별 의견·후속 추천), Sidebar `선생님 피드백 대기 N`.
- 요청 당시 자료 Modal: Snapshot의 노트 Revision 본문(§21 `GET .../revisions/{revisionId}` Mock 추가)과 파일 버전 Metadata, 지금 최신 버전과 구분 표시.
- 과제 제목 → 상세 `?panel=feedback`(피드백 탭) → 뒤로 시 필터 유지.
- §31 목록에 과제 정보가 없어(MM-19) 학기별 수행평가의 노트 Revision으로 과제를 찾는다 (`model/feedbackListView.ts`). 계약 밖 Mockup 표현(선생님 이름, 구조화 답변 항목, 추천 수락 버튼 동작)은 MM-24로 기록하고 표시/동작하지 않음.
- Fixture: `fbr_001` 답변에 위치별 의견·후속 추천 추가, 답변 대기 `fbr_002`(assessment_002, rev_005 + version_003) 추가. Scenario `feedbackEmpty` 추가.
- 버그 수정(상세): 결과 파일 목록을 불러오기 전에 피드백 요청을 누르면 파일 없이 Snapshot이 고정되던 문제 → 목록 확인 전·조회 실패 시 요청 비활성 + 사유 표시.

### Next

- 로드맵 Stage 2: 심화 탐구 (S16~S20).
- P-15(MM-19·24·25) 결정 시 과제 매칭 조합을 §31 `sourceType·sourceId`로 교체.

### Verification

- `npm run typecheck` / `lint` / `build` (frontend 전체): PASS.
- Scratchpad Playwright: S15 32건 PASS, 상세 45건 PASS, 목록·학업 정보 52건 중 51 PASS(기존 favicon 404), 구형 `/mentor`·`/school/tasks` 영향 없음.
- `scripts/verify*.ps1`: NOT RUN (실행 정책 차단 유지). Backend·E2E: NOT RUN. Admin 답변 → 학생 반영은 미검증(Mock은 앱별 메모리, 사전 준비 답변만).


## 2026-10-26 — Student 심화 탐구 S16~S20 (Frontend 로드맵 Stage 2, Mock)

Branch `feature/assessment-stage2-enrichment` (Stage 1 체크포인트 `9cdedbc` 위, 미커밋).

### Done

- 탐구 라이브러리(S16): 과목·검색·카드 선택(URL), 선택 ID 일치 Preview, 이 탐구 시작하기(§18 POST → 새 taskId, 공개 콘텐츠 불변), 직접 만들기 Modal.
- 내 탐구(S17), 심화 탐구 상세(S18: 상태 변경·수행평가 연결·노트·수정 이력·더보기·자기 점검/AI/자료 패널), 모의고사 지문(S19: 카드·상세·내 지문 등록·출처 연결 Task), 대학 공개 자료(S20).
- Contract 기반 Mock: `api/enrichmentApi.ts`, `api/mock/enrichmentMock.ts`·`enrichmentFixture.ts` (§16·17·18·27). 노트 Mock은 `ENRICHMENT_TASK` 출처도 허용.
- Sidebar `심화 탐구 N` = 진행 중 Task 수(§18 totalElements).
- 공용 컴포넌트 추가 확장(하위 호환): `DetailTopBar`(root·menuItems·피드백 버튼 선택), `Modal` compact, `DetailPanel`의 AI·자료 탭 export, Token `--as-color-selected`.

### Open / Blocked

- 계약 공백 MM-26~29 → P-16 제안(미승인). `sourceReference`는 §18 DRAFT(API-OD-A12)라 Mock 시연만.
- 노트 편집·템플릿 적용·자료 삽입(OD-A05), AI 도우미(Stage 3), 즐겨찾기(§30 sourceType), 보관·성장 기록 이동은 비활성.

### Verification

- `npm run typecheck` / `lint` / `build` (frontend 전체): PASS.
- Scratchpad Playwright: 심화 탐구 65/65 PASS, 피드백 목록 32/32(필터 클릭 직후 읽던 검증에 대기 추가 후), 상세 45/45, 목록·학업 정보 51/52(기존 favicon 404), `/mentor`·`/school/tasks` 영향 없음.
- `scripts/verify*.ps1`: NOT RUN (실행 정책 차단). Backend·E2E: NOT RUN.


## 2026-10-27 — Student 자료함 S21 (Frontend 로드맵 Stage 3, Mock)

Branch `feature/assessment-stage3-resource-library` (Stage 2 체크포인트 `7268933`에서 분기, 미커밋).

### Done

- 자료함 목록: 과목별 추천 자료원(§22 recommendations, 탐색 후보 출처), 유형 필터·검색(URL 보존), 내 자료 목록, 출처 정보 표시(Mockup 규칙: 작성자+발행일).
- 자료 추가 Modal(RL-ADD-01): 유형 7종, 자료명 필수, URL·발행일 형식 검사(실제 링크 확인 아님), 중복 제출 방지, 실패 시 입력 유지, 작성 중 닫기 확인. 추천 자료원에서 발행기관을 채워 열기.
- 자료 상세·수정(§22 GET·PATCH): 메모·태그 포함 수정, 직접 입력한 링크 구분, 파일은 저장소 연결 전 안내. 노트에 추가·AI 요약 비활성, 삭제 없음.
- Contract 기반 Mock: `api/resourcesApi.ts`, `api/mock/resourcesMock.ts`·`resourcesFixture.ts`. Sidebar 자료함 건수. 상세 패널 자료 탭에 "내 자료함 열기" 진입점.

### Open / Blocked

- 계약 공백 MM-21·30~32 → P-17 제안(미승인). 자료 유형 Enum, 응답 Shape, 자료–과제 연결, 출처 확인 의미.
- 노트에 자료 넣기(§23 또는 §20)는 Editor 결정(OD-A05)과 함께 Stage 4. 파일 첨부는 File Storage(API-OD-A03). 기존 LearnersHigh Library와의 관계는 inquiry §15 Open Decision.

### Verification

- `npm run typecheck` / `lint` / `build` (frontend 전체): PASS.
- Scratchpad Playwright: 자료함 43/43, 심화 탐구 65/65, 피드백 목록 32/32, 상세 45/45, 목록·학업 정보 51/52(기존 favicon 404), `/mentor`·`/school/tasks` 영향 없음.
- `scripts/verify*.ps1`: NOT RUN. Backend·E2E: NOT RUN.

---

# 24. 핵심 요약

```text
Current: Assessment 문서 7종 작성됨(DRAFTED); Domain·API 정합성 보완
Legacy Suyeon Specs: 4종 Git 삭제 보고, 과거 구현 코드 제거는 별개
Wangyu Student Care / Counseling: 유지
Shared Shell / API / Database: 공유 영향 확인 후 작업
Assessment Feature Implementation: Student 일부 Stage 1 Mock (Backend·Admin 미구현)

Progress = 실제 작업·검증 이력
Requirement = 최신 Feature Spec / Domain / API Contract
```
