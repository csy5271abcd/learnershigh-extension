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


## 2026-10-27 — Student 탐구 노트 편집기·Revision S8·S9 (Frontend 로드맵 Stage 4, Mock, PARTIAL)

Branch `feature/assessment-stage4-note-editor` (Stage 3 체크포인트 `c9895af`에서 분기, 미커밋).

### Done

- 경량 블록 편집기(라이브러리 설치 없음): 소제목·본문·글머리/번호 목록·체크리스트·인용·표·자료 링크 카드, 블록 추가·삭제·이동·유형 전환, 빈 줄 "/", Alt+↑↓, 키보드 접근.
- 저장: 첫 저장 §20 POST, 이후 §20 PUT(expectedRevisionId), Mock 자동 저장(1.5초, 정책 파일 분리), 상태 표시(저장 안 됨/저장 중/자동 저장됨 · vN/저장 실패/충돌), 실패 시 입력 보존·다시 저장, 409 충돌 비교 후 학생 선택(최신 위에 새 Revision / 최신 불러오기), 저장 안 된 변경 이동 보호.
- 템플릿 10종 실제 적용(이모지 소제목이 편집 가능한 본문 블록), 끝에 추가 / 확인 후 새 노트로 시작.
- 수정 이력: 과거 Revision 읽기 전용 보기, 복원 비활성+사유. 피드백 요청은 저장된 Revision만 가리키고(저장 안 된 변경 시 차단), 이후 편집해도 Snapshot 불변 확인.
- 자료함 자료를 링크 카드로 삽입(§20 PUT 방식). 학교 수행평가·심화 탐구에서 같은 편집기, 저장 대상 분리.
- 버그 수정(이번 작업 중 발견): 다른 화면에 다녀오면 편집기가 이전 조회 캐시로 시작해 저장된 최신 노트를 놓치던 문제, "/"로 유형을 바꾼 뒤 포커스를 잃어 입력이 사라지던 문제.

### Open / Blocked

- Editor 라이브러리(OD-A05)와 블록 Schema·자동 저장·충돌 정책(API-OD-A04) → P-18 제안(미승인, 설치 안 함). 목록 등 비계약 블록은 Mock 임시 형식(MM-33).
- 복원 정책(§21), 자료 넣기 계약 선택(MM-34), 과제당 노트 수(MM-35), 드래그(MM-36), 이미지·PDF 블록(File Storage).

### Verification

- `npm run typecheck` / `lint` / `build` (frontend 전체): PASS.
- Scratchpad Playwright: 노트 편집기 51/51, 상세 45/45(노트 관련 5개 기대값을 Stage 4 사양으로 갱신), 피드백 32/32, 심화 65/65, 자료함 43/43, 목록·학업 정보 51/52(기존 favicon 404), `/mentor`·`/school/tasks` 영향 없음.
- `scripts/verify*.ps1`: NOT RUN. Backend·E2E: NOT RUN.


## 2026-10-27 — Student 성장 기록·보관함 S22·S23 (Frontend 로드맵 Stage 5, Mock, PARTIAL)

Branch `feature/assessment-stage5-growth-archive` (Stage 4 체크포인트 `39fdff0`에서 분기, 미커밋).

### Done

- 성장 기록(§29): 목록(개인 기록 안내·과목 Chip·학기 묶음·카드), 작성(POST, 관련 활동·과목·시작일·서술 9항목·관련 활동 결과물 선택), 상세·수정(PATCH 바뀐 항목만), 저장 실패 입력 유지, 저장 안 된 이동 보호, Not Found/Error/Empty 구분. 학생 직접 작성만, AI 생성 없음, 세특 문장 아님.
- 학교 수행평가·심화 탐구 상세 더보기 "성장 기록에 남기기" → 관련 활동을 채운 작성 화면(더보기 항목이 Link를 지원하도록 `MoreMenuItem` 확장).
- 보관함(§30): 원본을 다시 계산하는 Projection(사본 없음), 탭 5개·검색·과목 폴더·행 → 원본 상세, 즐겨찾기는 학교 수행평가만(§30 PUT). 새 폴더·내보내기·휴지통 복구 비활성, 영구 삭제 없음.
- Sidebar 성장 기록·보관함 메뉴를 준비 중 화면에서 실제 화면으로 연결.

### Open / Blocked

- §29 응답·필수 필드·학기 기준(MM-37), 결과물 버전 고정(MM-38), §30 항목 Shape·탭 규칙(MM-39), 즐겨찾기 유형(MM-40), 폴더·내보내기·삭제/복구 정책(MM-41, API-OD-A08, OD-A11) → P-19 제안(미승인).

### Verification

- `npm run typecheck` / `lint` / `build` (frontend/student): PASS (build의 chunk 크기 경고는 기존과 동일).
- Scratchpad Playwright: 성장 기록·보관함 50/50, 회귀 상세 45/45·피드백 32/32·심화 65/65·자료함 43/43·노트 편집기 51/51·목록·학업 정보 51/52(기존과 같은 404 1건).
- `scripts/verify*.ps1`: NOT RUN. Backend·E2E: NOT RUN.


## 2026-10-27 — Student Assessment 홈 S24·수행평가 꿀팁 S14 (Frontend 로드맵 Stage 6, Mock, PARTIAL)

Branch `feature/assessment-stage6-home-tips` (Stage 5 체크포인트 `b328630`에서 분기, 미커밋).

### Done

- Assessment 홈(`/assessment`): 기존 계약만 조회해 화면에서 계산(새 Entity·홈 전용 Store·하드코딩 숫자 없음). 현황(진행 중·시작 전), 다가오는 일정, 답변 대기 카드, 최근 업데이트한 기록, 빠른 실행 7개, AI 입력창(비활성), 알림 Popover(마감 임박 계산, 읽음·발송 없음). 영역별 Loading/Error/다시 시도, 학기 변경 분리.
- 수행평가 꿀팁 6종: 정적 콘텐츠 1곳(`model/tipsContent.ts`), 수행평가 상세 Modal(Mockup)과 메뉴 화면(`/assessment/tips?tip=`)이 같은 Component 사용. 관련 기능 이동(주제명 추천 Modal·노트·자료함·심화 탐구·모의고사 지문), 과제 문맥이 없으면 사유 안내.
- 수행평가 상세 `?panel=ai` 진입 지원, 준비 중 Route 정리(`pendingAssessmentSections` 제거).

### Open / Blocked

- 홈 요약·학생 이름·과제별 여러 일정(MM-42), 알림·읽음·New 배지·AI 입력(MM-43), 꿀팁 서버 제공·relatedActions·추천 규칙(MM-44) → P-20 제안(미승인).

### Verification

- `npm run typecheck` / `lint` / `build` (frontend workspace 전체): PASS (build chunk 크기 경고는 기존과 동일).
- Scratchpad Playwright: 홈·꿀팁 57/57, 회귀 성장·보관함 50/50·노트 51/51·자료함 43/43·심화 65/65·피드백 32/32·상세 45/45·목록·학업 정보 51/52(실패 1건은 `favicon.ico` 404로 요청 경로 확인).
- `scripts/verify*.ps1`: NOT RUN. Backend·AI·E2E: NOT RUN.


## 2026-10-27 — Student 평가계획서 PDF 가져오기 S5 (Frontend 로드맵 Stage 7, Mock, PARTIAL)

Branch `feature/assessment-stage7-pdf-import` (Stage 6 체크포인트 `4ff757e`에서 분기, 미커밋).

### Done

- 가져오기 Modal(Mockup SA-LIST-02): 학교 수행평가 목록 "PDF로 가져오기"와 홈 빠른 실행이 같은 Modal 사용. 내 PDF 끌어 놓기/선택(브라우저 1차 검사·Blob 미리보기), 학교 공통 평가계획서(§10-1 시연 Fixture)·작년 문서(참고용), 학교·학기 불일치 경고.
- 내 PDF: §10-2 업로드 Mock(메타데이터만, 서버 저장·분석 없음) → 분석 요청 503 → 직접 추가 안내. 임의 결과를 내 PDF 추출값처럼 보여주지 않음.
- 분석 결과 검토(Mockup 미제공 보완 UI): 진행·완료·확인 필요·부분 실패·실패·결과 없음 구분, 과목별 지필(표시만)·수행·성취·교수학습·원본 근거(PDF 쪽/문서 표기 쪽 구분, 원본 확인 불가 표시), 내 과목 연결, 이름 정정(§11 PUT 개인 검토), 수행평가 선택·중복 확인, §12 POST 항목별 등록(부분 실패·실패한 것만 재시도) → 목록·상세·홈 반영.

### Open / Blocked

- 분석 상태·결과 Schema·항목 키·근거 연결(MM-45·46), 개인 정정 범위·조회(MM-47), 중복·개정본·파일 정책·분석 엔진·외부 전송(MM-48, API-OD-A02·A03·A05·A10) → P-21 제안(미승인). 실제 PDF 파싱·OCR·AI·File Storage는 미구현.

### Verification

- `npm run typecheck` / `lint` / `build` (frontend workspace 전체): PASS (build chunk 크기 경고는 기존과 동일).
- Scratchpad Playwright: PDF 가져오기 66/66(시연 Fixture 흐름, 실제 PDF 분석 검증 아님), 회귀 홈·꿀팁 57/57(PDF 빠른 실행 기대값 갱신)·심화→홈 7/7·성장·보관함 50/50·노트 51/51·자료함 43/43·심화 65/65·피드백 32/32·상세 45/45·목록·학업 정보 51/52(`favicon.ico` 404).
- `scripts/verify*.ps1`: NOT RUN. Backend·Storage·AI·실제 PDF 분석·E2E: NOT RUN / NOT IMPLEMENTED.

### 추가 — 홈 빠른 실행 아이콘 개선 (같은 Branch, 2026-10-27)

- 빠른 실행 7개를 Daglo 홈 빠른 실행을 참고한 플랫 컬러 SVG로 교체(`components/home/QuickActionIcons.tsx`, 직접 그림·외부 자산 없음), 데스크톱 7개 한 줄(중심 간격 155px, 820px 4+3, 390px 3+3+1), 둥근 사각형 타일 60px(radius 18px)·아이콘 27px. 버튼 이름·순서·동작 그대로.
- 검증: 아이콘·배치 점검 31/31(1920·1280·1024·820·390px), 홈·꿀팁 57/57, PDF 가져오기 66/66, typecheck/lint/build PASS.

## 2026-10-27 — Student 통합 보강 (자료 추천·모의고사 스크린샷·즐겨찾기·과제 정보·Notion형 편집기·템플릿, Mock, PARTIAL)

Branch `feature/assessment-student-integration-enhancement` (Stage 7 체크포인트 `90720de`에서 분기, **미커밋**). 승인 AUD: 004·009·013·015·016·034·042 (AUD-005 등 그 밖의 AUD는 수정하지 않음).

### Done

- **A 자료 탭 (AUD-016)**: 수행평가·심화 탐구 상세 오른쪽 "자료" 탭 — 현재 과목·주제, §22 과목 추천 자료원(분류 필터, "탐색 후보 · 검색 결과 아님", 주소 미확인 자료원은 링크 없이 검색어만), 내 자료함 검색, "URL로 등록"·"찾은 자료 등록"(기존 자료 추가 Modal 재사용), "노트에 추가" → 노트에 출처 카드(RESOURCE_LINK, 원문 복사 없음). 편집기에서 "/참고자료"로도 연결.
- **B 모의고사**: 내 지문 등록에 스크린샷·PDF(선택) — 이 화면에서만 미리보기(서버·브라우저 저장소 저장 없음, OCR 없음, 출처 링크 필수 유지). 이미지 위 드래그로 영역(정규화 좌표) 만들기, 영역별 핵심 개념·탐구 질문·메모, 키보드용 "영역 추가"·위치(%) 입력, "이 영역으로 탐구 시작"(§18 sourceReference = 내 지문, 영역 좌표는 전달하지 않음). PDF는 미리보기만(렌더러 미설치). 최근 시험 독서 지문 주제 카드 5개 — 2026-10-27 기사로 확인한 주제만, 확인 못 한 문항 번호는 "미확인", 지문 원문 없음, 평가원 공식 사이트 링크.
- **C 즐겨찾기**: 공용 별표 버튼(채움/선, 28·34px, `aria-pressed`, Space/Enter) — 수행평가 목록 ★ 열·상세, 탐구 라이브러리 목록·미리보기, 내 탐구·심화 탐구 상세, 보관함. 상태는 §30 즐겨찾기 Projection 하나에서 읽어 화면 간 동기화. 수행평가는 §30 그대로, 심화 탐구(ENRICHMENT_TASK)·라이브러리(ENRICHMENT_CATALOG)는 Mock 전용 제안(P-22).
- **D 노트 위 과제 정보**: 원본의 최신 정보를 읽기 전용으로(노트에 복사하지 않음, 접기 가능). 수행평가 — 과목·평가 유형(미등록)·상태·평가일·반영 비율(평가계획서 분석 "후보 · 확인 필요")·제출 마감·학교 담당 선생님("미등록 · 확인 필요", 학원 정보로 대체하지 않음)·정보 출처·평가 기준(탭 이동)·첨부(미등록)·연결된 심화 탐구(AUD-013). 심화 탐구 — 목표·연결 수행평가(독립 탐구 표시)·출처 자료·시작일·내 목표일.
- **AUD-015 평가 기준 탭**: evaluationItemRef → §11 분석 결과에서 항목 후보(이름·반영 비율·배점·시기·채점 기준 후보·원본 근거 PDF/문서 쪽·원문)와 "확인 필요" 표시, 학생 "내 점검" 체크(저장 안 함). 직접 등록·분석 실패·과목/항목 없음·조회 오류를 각각 구분. AI가 기준을 만들지 않음, AI 쉬운 설명은 준비 중 유지.
- **E Notion형 편집기 (새 Editor 패키지 없음)**: 하단 "블록 추가"·빈 노트 시작 화면 제거 → 빈 노트는 바로 입력할 수 있는 본문 1줄(+ 템플릿 안내). Enter 나누기(한글 조합 중 무시)·Shift+Enter 줄바꿈·맨 앞 Backspace 합치기/유형 해제·Delete 끌어오기·↑↓←→ 블록 이동·목록 Tab/Shift+Tab 들여쓰기·빈 목록 Enter 빠져나오기·Alt+↑↓·블록 왼쪽 +("/" 메뉴)·복제·유형 바꾸기·본문 아래 빈 곳 클릭. "/" 메뉴 22개(검색·화살표·Enter·Esc·아이콘·설명, listbox + aria-activedescendant): 텍스트·제목 1~3·글머리·번호·체크리스트·토글·인용·이모지 강조·구분선·코드(언어 표시·고정폭·Tab)·수식(LaTeX 원문 + 괄호 검사, 렌더러 없음)·표(행·열 추가·삭제)·차트(표 값 → SVG 막대)·참고자료·링크 카드·이미지/파일/PDF(메타데이터만 저장, 이 화면 미리보기)·동영상(YouTube만 youtube-nocookie 삽입, 그 밖은 링크 카드)·지도·장소(장소 카드, 지도 API 없음). blockId·Revision·피드백 Snapshot·자동 저장·충돌·과거 블록 그대로. 읽기 화면(Revision·Snapshot·비교·템플릿 미리보기)도 새 블록을 표시(동영상은 읽기 화면에서 삽입하지 않음). 모르는 type은 보존.
- **F 템플릿 10종 보강**: ID·이름·이모지 소제목 7개 유지, 소제목마다 💡 안내·질문·흐린 예시(placeholder, 저장되는 글 아님)·표·체크리스트·참고자료 자리. 학생 결과·세특 문장을 대신 쓰지 않음(세특 칸은 "선생님이 작성, 실제 활동만 메모" 안내).
- **AUD-009** 마감순 화면 표시에서 완료 과제를 아래로(서버 Sort 규칙은 MM-12 미결), **AUD-034** 보관함 모든 탭에서 지난 학기 항목에 학기 표시, **AUD-004** Modal 선택 Chip 잉크 스타일, **AUD-042** 모바일 누름 영역 24px 이상(19개 화면 390px 실측 0건).

### Open / Blocked

- 과제 정보 항목(평가 유형·담당 선생님·첨부)·과제별 평가 기준 조회·학생 점검 저장(MM-49·50), 즐겨찾기 유형 확장(MM-51), 블록 Schema 확장·파일 저장(MM-52, OD-A05·API-OD-A03), 지문 스크린샷·영역 저장·sourceReference 영역(MM-53), 추천 자료원 주소(MM-54) → **P-22 제안(PROPOSED, 미승인)**. Editor 패키지(BlockNote·Tiptap·Lexical) 도입은 P-18·P-22 비교만, 설치하지 않음.
- 검증된 시험 주제 카드는 정적 참고 콘텐츠이며 정기 갱신·관리자 콘텐츠 이전 여부 미정.

### Verification

- `npm run typecheck` / `lint` / `build` (frontend workspace 전체): PASS (build chunk 크기 경고는 기존과 동일).
- Scratchpad Playwright: 통합 보강 신규 124/124(`enh-check`), 회귀 노트 51/51·상세 45/45·피드백 32/32·성장·보관함 50/50·자료함 43/43·심화 65/65·심화→홈 7/7·홈·꿀팁 57/57·PDF 66/66·아이콘 31/31·목록·학업 정보 51/52(`favicon.ico` 404, 기존과 동일). 반응형·접근성 일괄 점검 19개 화면×4폭: 가로 스크롤·이름 없는 버튼·콘솔 오류 0, 390px 24px 미만 대상 0.
- 사용자 요청으로 동작이 바뀐 기존 테스트 기대값: 노트(빈 노트 시작 화면·"블록 추가" → "/" 메뉴·+ 버튼, 템플릿 블록 수 → 소제목 7개 기준), 상세(소제목 입력 이름 "제목 2", 평가 기준 Empty → 분석 후보, 빈 노트 시작 화면), 성장·보관함("심화 탐구 행 별표 없음" → 별표 있음), 심화·심화→홈(라이브러리 행 선택자에서 별표 제외, 과제 정보 패널과 같은 링크는 속성 목록으로 한정), 자료함("내 자료함 열기" → "자료함 열기"). 요구사항을 약화한 변경은 없음.
- `scripts/verify*.ps1`: NOT RUN. Backend·Storage·AI·OCR·E2E: NOT RUN / NOT IMPLEMENTED. Stage 1 ≠ VERIFIED.

## 2026-10-28 — 학교 수행평가 목록·상세 Mockup 복원 (SA-LIST-01·SA-DETAIL-01, Mock, PARTIAL)

같은 Branch `feature/assessment-student-integration-enhancement`(HEAD `90720de`, **미커밋**). 직전 통합 보강 Working Tree 위에서 수정.

### Done

- **목록 (SA-LIST-01)**: 헤더 `★ | 수행평가 | 평가일 · 마감 | 정보 출처 | 진행 상태 | 기록`. ★ 열은 행 링크 위에 올려 마우스·키보드로 누를 수 있게 함(행 이동 없음, 기존에는 행 링크가 별표를 덮어 마우스 클릭이 안 되던 문제 수정). `★ 중요` 필터(URL `important=1`) — §12에 Query가 없어 같은 범위를 한 번에 받아 §30 즐겨찾기와 화면에서 맞춤, 상태·과목·검색과 조합, 추가·해제 즉시 반영, 완료 후순위 유지.
- **기록 열**: 노트 수정 이력 = 이 과제 노트의 NoteRevision 수(§21), 피드백 말풍선 = 이 노트 Revision을 가리키는 FeedbackRequest(§31)의 답변 도착·대기(답변이 있으면 파란 강조). 결과물 ArtifactVersion 수는 합치지 않음. 수정 이력 → 상세 `?history=1`(수정 이력 열림), 말풍선 → `?panel=feedback`. 조회 실패는 "0·피드백 없음"이 아닌 오류 아이콘 + 다시 시도.
- **즐겨찾기 조작 위치**: 학교 수행평가 목록, 탐구 라이브러리 목록 행, 내 탐구 목록에서만. 수행평가 상세·심화 탐구 상세·라이브러리 미리보기의 별표 제거. 보관함은 즐겨찾기 표시·원본 이동 유지(학교 수행평가 행 별표는 Stage 5부터 있던 것 유지, 심화 탐구·라이브러리 행은 표시만).
- **상세 (SA-DETAIL-01)**: 노트 위 회색 "과제 정보" 패널을 학교 수행평가에서 제거하고, 제목 아래 속성 목록으로 이동 — 진행 상태·과목·평가 유형(미등록)·평가일·제출 마감·반영비율(평가계획서 분석 값은 "평가계획서 후보 · 확인 필요")·정보 출처(배지 + "PDF 분석 후보 · 확인 필요" + `PDF p.N` → 평가 기준 탭)·담당 선생님("미등록 · 확인 필요", 예시 이름·학원 정보 사용 안 함)·연결된 심화 탐구·평가 정보 수정. 그 아래 **안내문·첨부**(사진·PDF 추가, 썸네일·파일명, 이 화면에서만 미리보기 — 서버·브라우저 저장소 저장 없음), 결과물, 탐구 노트 순. 오른쪽 4개 탭·Editor·Revision·Snapshot은 그대로. `NoteContextPanel`은 심화 탐구 상세에서 계속 사용.

### Open / Blocked

- 목록 "중요" 서버 Query·기록 집계 기준(MM-07·MM-55), 평가 유형·평가일 텍스트·담당 선생님·AI 제한 배지·정보 출처 확인 상태(MM-49·MM-11), 안내문 첨부 저장(MM-56, API-OD-A03) → **P-23 제안(PROPOSED, 미승인)**. 행 메타(유형·비율·AI 제한)·정보 출처 "학생 확인·수정" 문구는 계약이 없어 Mockup과 다름.

### Verification

- `npm run typecheck` / `lint` / `build` (frontend workspace): PASS.
- Scratchpad Playwright (메모리 확인 후 한 묶음씩 순차 실행): 이번 작업 `mk-check` 50/50, 통합 보강 `enh-check` 123/123, 회귀 노트 51/51·상세 45/45·피드백 32/32·성장·보관함 50/50·자료함 43/43·심화 65/65·심화→홈 7/7·홈·꿀팁 57/57·PDF 66/66·아이콘 31/31·목록·학업 정보 51/52(`favicon.ico` 404 Known Issue). 반응형·접근성 일괄 점검 76건: 가로 스크롤·이름 없는 버튼·콘솔 오류 0, 390px 24px 미만 0.
- 이번 요청으로 바뀐 기존 테스트 기대값: enh-check(과제 정보 → 속성 목록, 상세·미리보기 별표 없음, 즐겨찾기 실패는 목록에서), 성장·보관함(심화 탐구 행 별표 없음 — Stage 5 기대값으로 복귀), capture(행 안 링크가 2개라 제목 링크로 한정).
- Mockup 비교 캡처(1920×972, DPR 1.5): Scratchpad `measure\mockup2\` (side-list-final, side-detail-final, side-zoom-props-final, side-zoom-records-final).
- `scripts/verify*.ps1`: NOT RUN. Backend·Storage·E2E: NOT RUN. Stage 1 ≠ VERIFIED.

## 2026-10-28 — 모의고사 60선·과목별 참고자료 허브·수행평가 필터/색 (Mock, PARTIAL)

같은 Branch(HEAD `90720de`, **미커밋**). 직전 작업(목록·상세 Mockup 복원) Working Tree 위에서 수정.

### Done

- **목록 필터**: 전체·시작 전·진행 중·완료·★ 중요는 한 번에 하나만(같은 Chip 그룹). ★ 중요 = 진행 상태와 관계없이 즐겨찾기 전체(건수 표시), 상태 Chip = 별표와 관계없이 그 상태 전체. 예전 URL에 둘 다 있으면 중요 우선. 검색·과목·학기·정렬은 그대로 조합.
- **상세 보조 문구 색**: 속성 옆 "평가계획서 후보 · 확인 필요"·"PDF 분석 후보 · 확인 필요"를 회색(보조 글자색)으로. 오른쪽 평가 기준 배지·링크·D-day·오류 색은 그대로.
- **모의고사 60선**: `references/mock-exam/LearnersHigh_Mock_Exam_60_Research_Materials.md`(읽기 전용)를 Scratchpad 변환 스크립트로 `api/mock/mockExamResearchFixture.ts`(자동 생성, 원본 SHA-256 기록)로 옮김 — 60개(영어 30·국어 30), 목차 표·본문 제목·출처·ID·원문 중복·방법 3개·Q1~Q3 검증. 원문 지문은 글자 그대로. 공개 추천 소재를 60선으로 교체하고 예전 시연 카드 5개는 목록에서 내리되 ID 상세 조회는 유지(그 소재에서 시작한 탐구 출처 보존). 직전 작업의 "최근 시험 주제 카드 5개"(`verifiedExamTopics.ts`)는 이전 추천 콘텐츠라 제거. 개인 지문 등록·스크린샷 영역은 그대로.
- **모의고사 화면**: 카드형 라이브러리(과목 탭 전체 60/영어 30/국어 30, 검색, 학년·시행 시기·추천 계열 필터, 필터 초기화, 12개씩 더 보기, 데스크톱 3열·태블릿 2열·모바일 1열). 카드: 과목 배지·시험·문항·소재·추천 주제·계열·지문 상세 보기·심화 탐구 시작. 상세: 원문 지문(스크롤 + 전체 펼치기)·시험·문항·원본 PDF·학습용 제안 안내·추천 주제·해설·방법 1~3·Q1~Q3·"이 주제로 심화 탐구 시작"(기존 만들기 Modal, 제목·목표 수정 가능, §18 sourceReference = 소재 ID, 학교 수행평가로 등록하지 않음). 목록 복귀 시 탐색 조건 유지.
- **참고자료 카탈로그**: `references/reference-link/learnershigh-assessment-subject-reference-links.md` 기준 자료원 24곳(원본 22 + 추가 2)·8개 영역·영역별 활용 문장을 `api/mock/referenceSourcesFixture.ts` 한 곳에 둠(중복 없음, 과목 매핑으로 연결). 과목 이름 → 영역 규칙은 `model/referenceAreas.ts`(화학·생명을 과학보다 먼저 등). §22 추천 Mock도 이 카탈로그에서 만들어 자료함·수행평가·심화 탐구 자료 탭이 같은 Source를 씀.
- **자료 탭**: 공식 사이트 열기(실제 주소, 새 탭), 추천 이유, 자료원 종류 필터, "전체 참고자료 보기"(과목 영역 미리 선택), 찾은 자료 등록(주소는 학생이 입력), 내 자료 검색·노트에 추가 유지.
- **참고자료 메뉴·화면(신설)**: Sidebar 자료함 아래 "참고자료"(펼친 책 아이콘), `/assessment/reference-links`. Daglo 콘텐츠 안내 화면 구조를 참고 — 소개(연한 파란 그래픽 + 제목 + 파란 버튼), "참고자료는 이렇게 활용해요" STEP 1~3 카드, "이런 자료원을 추천해요" 3묶음, 둘러보기(과목 영역 9 Chip·검색·자료 유형 필터·자료원 카드 24·과목별 활용 펼치기·공식 사이트 열기·찾은 자료 등록·내 자료함 열기). 그래픽은 CSS·아이콘으로 직접 그림(Daglo 로고·이미지·문구 미사용).

### Open / Blocked

- 모의고사 원문 공개 배포 권한, 60선 관리자 제공·갱신 방식, §17 학년·시기·계열 Query(MM-57), 참고자료 카탈로그 서버 응답·과목 분류/추천 규칙·외부 검색 API·링크 재검증 주기(MM-58), 학교 과목이 어느 영역에도 연결되지 않는 경우의 추천(MM-59) → **P-24 제안(PROPOSED, 미승인)**. P-22·P-23·MM-49~56 상태는 바꾸지 않음.
- Student build 번들이 약 1.26MB → 1.54MB로 커짐(60선 원문 Fixture 약 280KB). 서버 연결 시 API 응답으로 바뀌며, 그 전에 필요하면 지연 로딩을 검토.

### Verification

- `npm run typecheck` / `lint` / `build` (frontend workspace): PASS (chunk 크기 경고는 기존과 같은 종류, 크기는 위와 같이 증가).
- Scratchpad Playwright(메모리 확인 후 한 묶음씩 순차): 이번 작업 `rx-check` 77/77(원본 Markdown 직접 대조 포함), 회귀 목록·상세 `mk-check` 50/50·통합 보강 `enh-check` 122/122·자료함 43/43·심화 65/65·심화→홈 7/7·노트 51/51·상세 45/45·피드백 32/32·성장·보관함 50/50·홈·꿀팁 57/57·PDF 66/66·아이콘 31/31·목록·학업 정보 51/52(`favicon.ico` 404 Known Issue). 반응형·접근성 일괄 점검 84건(신규 2화면 포함): 가로 스크롤·이름 없는 버튼·콘솔 오류 0, 390px 24px 미만 0.
- 이번 요청으로 바뀐 기존 테스트 기대값: mk-check(중요+상태 조합 → 한 번에 하나), enh-check(추천 자료원 수·실제 링크, 검증 주제 카드 → 60선), rl-check(추천 자료원 6곳, 과학탐구실험2도 과학·물리로 연결되어 "추천 없음"은 Fixture 과목으로 재현 안 됨), ae-check(모의고사 5개 카드 → 60선 카드·상세 원문·버튼 이름).
- 캡처: Scratchpad `measure\ref60\`(01~10 final, side-daglo-01·02).
- `scripts/verify*.ps1`: NOT RUN. Backend·외부 링크 실제 열림·E2E: NOT RUN. Stage 1 ≠ VERIFIED.

## 2026-10-28 — 상세 화면 이중 스크롤·하단 빈 공간 수정 (CSS, Mock 화면)

같은 Branch(HEAD `90720de`, **미커밋**).

- **원인**: 상세의 가운데(`.main`)·오른쪽(`.panelArea`) 스크롤 영역에 위치 기준(position)이 없어, 안의 `position:absolute` 요소(노트 제목의 `lh-visually-hidden` 라벨)가 body를 기준으로 놓였다. 이 요소는 스크롤 영역의 overflow로 잘리지 않고 문서를 136px 늘려(1920×972에서 document 1108 / viewport 972) 바깥 스크롤이 생기고, 바깥을 스크롤하면 전체가 밀려 상단 바가 가려지고 아래에 빈 공간이 보였다. 높이 계산(상단 50 + 상단 바 43 + 본문 879) 자체는 맞았다.
- **수정**: `routes/SchoolAssessmentDetailRoute.module.css`의 `.main, .panelArea`에 `position: relative`(누수 차단)와 `overscroll-behavior-y: contain`(끝에서 바깥으로 넘김 방지) 추가. 심화 탐구 상세도 같은 CSS를 써서 함께 해결. 1279px 이하(한 열)는 기존대로 문서 스크롤 하나.
- **검증**: Scratchpad `scroll-check` 25/25(1920·1440: document = viewport·가운데/오른쪽/Sidebar 독립 스크롤·노트 끝·Enter 25번 따라 스크롤·"/" 메뉴·팝오버·모달, 1024·820·390: 문서 스크롤 하나·끝까지 접근), 회귀 노트 51·상세 45·목록/상세 50·60선/참고자료 77·피드백 32·통합 122·심화 65·자료함 43·성장/보관함 50·심화→홈 7·홈/꿀팁 57·PDF 66·아이콘 31·목록 51/52(favicon 404), 일괄 점검 84건 이상 없음, typecheck/lint/build PASS. `scripts/verify*.ps1` NOT RUN.

## 2026-10-28 — Sidebar 과목 검색·접기 + 3영역 스크롤 (Mock 화면)

같은 Branch(HEAD `90720de`, **미커밋**).

- **과목 9개 이하**: 기존 Sidebar 그대로(제목 "과목" + 목록, 검색·접기 없음). 과목 0개 문구만 "등록된 과목이 없습니다."로 맞춤.
- **과목 10개 이상**(`components/SidebarSubjects.tsx`, 기준 10은 컴포넌트 안 상수): 제목 줄에 "과목 N개" + 접기/펼치기 버튼(`aria-expanded`·`aria-controls`, Enter/Space, 기본 펼침, 접힌 과목은 그리지 않아 Tab 대상 아님). "과목 검색" 입력(앞뒤 공백 무시·대소문자 무시·부분 일치, 한글 입력 중 Escape 무시, 지우기 버튼·Escape로 비움), 결과 없음 "일치하는 과목이 없습니다.". 검색어·접힘은 화면 상태일 뿐 저장하지 않고 수행평가 목록 검색·필터·URL을 바꾸지 않는다. 과목 클릭은 기존 이동·Active 표시 그대로. 학기를 바꾸면 그 학기 과목으로 다시 그리며 없는 과목으로 자동 이동하지 않음.
- **3영역 스크롤**(`routes/AssessmentLayout.module.css`): 위 학기 선택 고정, 아래 "학교·학업 정보" 고정, 가운데 메뉴(`nav`)만 스크롤(스크롤바 1개, 과목 목록 자체 `max-height` 스크롤 없음). Sidebar 전체 스크롤(`overflow-y: auto`)·하단 sticky를 없앰. `body` overflow는 건드리지 않음. 모바일 Drawer(959px 이하)도 같은 구조.
- **Mock 시나리오**(화면 확인 전용, 기본 Fixture 그대로): `subjects0`·`subjects4`·`subjects9`·`subjects10`·`subjects15`·`subjects20`·`subjects30` — 현재 학기 과목만 Fixture 4개 + 시연용 과목 이름으로 N개를 만든다(실제 학교 과목 아님, 수행평가 없음).
- 과목 제목 id(`assessment-subject-group`)는 기존과 같게 유지.

### Verification

- Scratchpad `sb-check` 52/52: 0·4·9·10·15·20·30개, 기본 4개 기존 치수(제목 여백 21px·행 37px·간격 2px), 검색("과학" 2개·공백·결과 없음·지우기), 접기/펼치기(키보드 Enter·Space, 검색어 유지, 접힌 과목 Tab 제외), 검색 결과 클릭 이동·Active, 학기 변경, 1920×972@1.5·1440×900·1440×640에서 가운데만 스크롤·마지막(30번째) 과목 접근·위아래 고정·문서 높이 증가 없음, 상세 화면 이중 스크롤 재발 없음, 1024·820·390(Drawer 검색·접기·스크롤·선택 후 닫힘, 가로 넘침 없음).
- 측정(과목 30개, 1920×972): 변경 전(CSS 재현) Sidebar 922 중 내용 1704 → Sidebar 전체가 782px 스크롤되며 학기 선택이 화면 밖(-732)으로 나감. 변경 후 위 73 · 가운데 787(내용 1620, 여기만 스크롤) · 아래 62 = 922, document 972 = viewport.
- 회귀(순차): `scroll-check` 25/25(Sidebar 측정 대상을 aside → 가운데 nav로 갱신), 노트 51·상세 45·목록/상세 50·60선/참고자료 77·통합 122·성장/보관함 50·피드백 32·심화 65·자료함 43·심화→홈 7·홈/꿀팁 57·PDF 66·아이콘 31·목록/학업 정보 51/52(`favicon.ico` 404 Known Issue), 일괄 점검 84건(이전과 같음). typecheck/lint/build PASS. `scripts/verify*.ps1` NOT RUN. Stage 1 ≠ VERIFIED.

## 2026-10-28 — 대학별 기출 PDF 열람·심화 탐구 연계 (Mock 화면 + 개발 서버 원문)

같은 Branch(HEAD `90720de`, **미커밋**).

- **실제 PDF 조사**: `references/previous-exam-questions` — SNU 9개(수시 면접·구술고사 2023~2026, 적성·인성면접 2023~2026, 2028 면접 예시 문항), KAIST 18개(2024~2026 물리학·생명과학·수학·영어·화학, 학업외역량/적합성 공통문제). 쪽 수는 pypdf·poppler·pdf.js 세 방법이 모두 같음(SNU 2028은 AES 암호화로 poppler·pdf.js로 확인). 원본은 읽기만 함.
- **카탈로그**: `api/mock/universityExamManifest.json`(문서 27, 문항 블록 123) — 대학·학년도·유형(실제 기출/예시 문항)·과목·쪽 수·크기·SHA-256·문항 목차. 문항·구획 쪽은 원문에서 머리·제목이 확인된 쪽만(검증 스크립트로 27개 문서 123개 블록 범위 확인). 서울대 2028은 "예시 문항"으로 따로 표시. `npm run exam-manifest`(`frontend/student/tools/university-exam-manifest.mjs`)로 폴더와 대조(누락·중복·변경 0), `--write`면 새 PDF를 "문항 목차 없음"으로 추가.
- **원문 제공**: Vite 개발 서버 전용 `/__dev/university-exams/files/{documentId}.pdf`(`vite.config.ts`, apply: serve) — Manifest 허용 목록만, 경로 탐색·모르는 ID 404, 크기·해시 불일치 409, GET/HEAD만. Build에는 원문·경로가 없고 화면은 "이 환경에서는 원문 PDF를 제공하지 않아요".
- **PDF 뷰어**: `pdfjs-dist` 5.4.296 도입(Apache-2.0, 원문 화면에서만 동적 로딩, 한글 CMap·표준 글꼴·wasm은 정적 자산). 이유: iframe 내장 뷰어는 현재 쪽·로딩 실패·손상 파일을 알 수 없고 Android Chrome은 iframe PDF를 표시하지 않음. 이전·다음·쪽 이동·확대·축소·폭 맞춤·키보드·새 탭(브라우저 기본 뷰어). 파일 없음·변경·손상·불러오기 실패·배포 미제공 구분. **승인 기록 필요(P-25)**.
- **화면**: 대학별 자료(S20 확장, 탭 이름 "대학별 자료") — 대학 카드·칩·학년도·과목·유형 필터·검색(문서 목록 검색, PDF 본문 검색 아님)·문서 카드 27. 원문 보기(S26 신설) — PDF + 자료 정보·지금 보는 쪽·문항 목차(해설·채점 기준·예시 답안·총평은 접힘)·탐구 방향 예시 4개(요청 원문, 공식 추천 아님 표시).
- **심화 탐구 연계**: "이 문항으로 심화 탐구 시작" → 기존 만들기 Modal 재사용(제목 "이 기출문제로 심화 탐구하기", 출처·원문 개념·예시, 주제·질문은 학생이 작성) → §18 `sourceReference`(UNIVERSITY_RESOURCE) + Mock 전용 `locator {questionId, page}`. 탐구 상세 자기 점검 탭에 출처 카드(해당 쪽으로 이동). 원문 화면 "현재 쪽을 노트에 추가" → 그 탐구 노트에 출처 카드 + 자동 저장. 노트 "/참고자료"·"/대학 기출 PDF" → 문서·문항·쪽 범위 선택 → `EXAM_SOURCE` 카드(원본 보기). 새 노트 편집기를 만들지 않음.
- 가상 대학 시연 자료 5건(`fixtureUniversityResources`) 제거 — §27 목록 Mock은 같은 Manifest에서 만든다(같은 자료 = 같은 ID).

### Open / Blocked

- 대학 PDF 공개 배포·이용 허락(서울대 "상업적 이용·변형·발췌 금지" 안내), 원문 제공 서버 계약·권한, 문항 인덱스 작성·검수 주체, `locator`·`EXAM_SOURCE` Schema, `pdfjs-dist` 도입 승인 → **P-25 PROPOSED(미승인)**. P-22~P-24 상태는 바꾸지 않음.
- PDF 본문 전체 검색 없음(목록 검색만). OCR 불필요(27개 모두 글자 추출 가능).

### Verification

- `npm run typecheck` / `lint` / `build` (frontend workspace): PASS. Build 결과에 시험 PDF·개발 서버 경로 없음 확인. pdf.js는 별도 chunk(약 394KB + worker 1MB)로 원문 화면에서만 받음.
- `npm run exam-manifest`: PDF 27 (snu 9, kaist 18) · Manifest 27 · 문항 123 · 누락·중복·변경 없음.
- 개발 서버 경로 curl: 27개 AVAILABLE, `../`·인코딩된 경로·모르는 ID·대문자 ID 404, POST 405.
- Scratchpad Playwright `univ-check`(실제 Chrome·실제 PDF): 직전 실행에서 등록 PDF 27개 전부 열림·쪽 수 일치·마지막 쪽 그려짐·해당 파일만 요청 27/27, 대표 8개(SNU 2026·2028, KAIST 수학·물리·화학·생명·영어·적합성) 표시·글자 픽셀·확대·축소·마지막 쪽·문서 전환 PASS, 목록 개수(27·9·18)·예시 문항 배지·문항 목차 이동·해설 접힘·채점 기준 이동·탐구 Modal 출처 표시 PASS. 필터 4건 FAIL은 테스트가 클릭 직후 다음 필터를 바꾼 경합(대기 추가로 수정)이었고, 과목 선택 단계에서 테스트 셀렉터 시간 초과.
  - 이 과정에서 실제 결함 1건 수정: 대학 선택 시 목록으로 스크롤하면 칩 줄이 고정 상단 메뉴 아래로 가려짐 → 카드 "자료 둘러보기"에서만 스크롤 + `scroll-margin-top`.
  - **수정 후 전체 재실행은 시스템 메모리 부족으로 Claude Code가 중지함 → 탐구 생성 이후(노트 카드·자동 저장·오류 상태·반응형 5폭) 브라우저 검증과 기존 회귀는 NOT RUN.**
- `scripts/verify*.ps1`: NOT RUN. Backend·E2E: NOT RUN. Stage 1 ≠ VERIFIED.

## 2026-10-28 — 대학별 자료 목록·PDF 상세 UI 간소화 (Mock 화면)

같은 Branch(HEAD `90720de`, **미커밋**). 기능·데이터 변경 없음(Manifest·원본 PDF·계약 그대로).

- **목록**: 카드 그리드 → Daglo 전체 보드형 목록(`components/university/UniversityExamRow.tsx`, 카드 컴포넌트 삭제). 열: 자료명(+원문 개념 회색 줄) | 대학·학년도·유형 | 과목·영역 | 분량 | 작업. 자료명 클릭 = PDF 보기. PDF 보기·탐구 시작은 같은 크기의 보조 버튼(파란 배경 없음). 서울대 2028은 "예시 문항". 목록 폭은 이 화면만 최대 1240px.
- **상단**: 대학 소개 카드 2개 제거 → 대학 칩만. 학년도·과목·유형은 "필터" 버튼으로 펼치고, 적용된 조건(개별 지우기·필터 초기화)·필터 개수 표시. 정렬(학년도 최신/오래된·자료명) 추가. 검색은 위 공통 검색창.
- **원문 상세 오른쪽**: 파란 왼쪽 강조선·파란 테두리 상자·중첩 회색 상자·파란 큰 버튼 제거. 문서형 순서: 자료 이름 → 문항 안내(지금 보는 쪽·문항·원문 개념·원문 구획 쪽·해설 묶음 접힘·탐구 방향 예시·보조 버튼) → 문항 목차(한 줄, 현재 문항 = 연한 배경 + 굵기 + "보는 중" + aria-current). 목차에서 문항을 고르면 그 문항 시작 쪽으로 이동하고 안내가 바뀐다.
- **회귀 수정**: 이전 작업의 "/대학 기출 PDF" 명령이 "/pdf" 검색에서 기존 PDF 블록보다 앞에 와서 Enter가 다른 블록을 골랐음 → 명령 순서를 기존 PDF 뒤로.

### Verification

- typecheck / lint / build PASS, `npm run exam-manifest` 27·123 변경 없음.
- Scratchpad `univ-check-a` 13/13(파일 27 AVAILABLE, PDF 27개 전부 열람·쪽 수·마지막 쪽, 대표 8개 확대·축소·문서 전환), `univ-check-b` 목록 22/22·원문 패널 14/14·탐구/노트 9/9·오류 7/7·반응형(1440·1024·820·390) 11/11.
- 회귀(순차, 메모리 확인): 노트 51·상세 45·Sidebar 52·상세 스크롤 25·통합 122(메뉴 23개로 기대값 갱신)·심화 62(대학 구간을 실제 PDF 목록 기준으로 교체)·목록/상세 50·60선 77(필터 연속 변경 경합에 대기 추가, 기대값 동일)·피드백 32·성장 50·자료함 43·심화→홈 7·홈/꿀팁 57·PDF 가져오기 66·아이콘 31·목록 51/52(`favicon.ico` 404)·일괄 점검 84건 이전과 같음.
- `scripts/verify*.ps1`·Backend·E2E: NOT RUN. Stage 1 ≠ VERIFIED.

## 2026-10-28 — 대학별 PDF 원문 오른쪽 패널 디자인 복원 (Mock 화면)

같은 Branch(HEAD `90720de`, **미커밋**). 직전 간소화에서 요청 범위를 넘어 바뀐 오른쪽 패널을 되돌림. 목록형 대학별 자료·PDF 뷰어·데이터는 그대로.

- **복원**: 간소화 직전 Scratchpad 백업에서 `components/university/ExamQuestionNavigator.tsx`(문항별 상세 카드)와 `routes/UniversityExamDocumentRoute.tsx`(자료 정보·지금 보는 쪽 회색 카드·개념 Chip·세로 버튼)를 되살림. CSS는 목록·뷰어 구간은 그대로 두고 원문 보기·버튼·배지·Modal 출처 구간만 백업 값으로 복원(간소화 때 함께 바뀐 탐구 만들기 Modal 출처 상자·노트 출처 카드 버튼 모양도 원래대로).
- **요청한 변경만 적용**: 지금 보는 문항 카드의 파란 테두리·왼쪽 강조선(inset box-shadow) 제거 → 연한 회색 배경(`--as-color-subtle`)으로만 구분, 일반 카드 테두리·둥근 모서리 유지. "이 문항으로 심화 탐구 시작"은 위치·세로 배치는 복원하고 파란 배경 대신 보조 버튼 모양(사용자 허용).
- 패널 안내 문구는 예전 상자 모양(`noticeBox`), 목록 안내(`notice`)는 목록형 그대로.

### Verification

- typecheck / lint / build PASS, `npm run exam-manifest` 변경 없음.
- Scratchpad `panel-check` 50/50: SNU 2026(1쪽·5쪽)·SNU 2028·KAIST 물리·생명에서 회색 카드·개념 Chip 수 = 원문·버튼 세로 2개·파란 배경 없음, 문항 카드 수 = 인덱스(15·12·2·2)·모든 카드에 문제 보기·탐구 시작, 선택 카드 파란 테두리·inset·outline 없음 + 배경 구분, 목차 이동·해설 접힘·채점 기준 이동·탐구 생성→출처→노트 카드→자동 저장→원본 보기, 오류 상태, 반응형 1920·1440·1024·820·390.
- 목록 유지 `univ-check-b list` 22/22, 회귀 심화 62·통합 122·노트 51·상세 45·상세 스크롤 25·Sidebar 52.
- 같은 문서·같은 쪽(SNU 2026 5쪽)으로 간소화 전 캡처와 비교: 구조·Chip·카드 일치, 차이는 파란 버튼 배경과 선택 카드 강조선뿐.
- `scripts/verify*.ps1`·Backend·E2E: NOT RUN.

## 2026-10-28 — Assessment 기본 진입(홈) + 구형 Mentor Hub·School Activity 제거 (legacy-cleanup-plan 2단계)

같은 Branch(HEAD `90720de`, **미커밋**).

- **진입**: 상단 Assessment → `/assessment`(기존 `AssessmentHomeRoute`, 새 화면 없음). 앱 첫 주소 `/`도 Assessment로 이동(예전 Mentor Hub). `/assessment` index는 원래 홈이었고, 바뀐 것은 Shell의 메뉴 이동 대상뿐. 상세 URL 직접 접근·뒤로 가기는 그대로.
- **제거(삭제)**: `frontend/student/src/features/mentor-hub/`(135), `features/school-admissions/`(96), `frontend/student/assets/activity-case/`(학생 Mentor Hub Fixture 전용). 모두 미커밋 변경 없던 추적 파일이며 Git History에 남는다.
- **부분 수정(Shared 영향, OWNERSHIP §10-1)**: `app/router.tsx`(Mentor 18·School 9 Route 제거, index → Assessment), `app/StudentAppShell.tsx`(Mentor Fixture 의존 제거 — 표시 이름은 같은 고정값, Assessment → 홈), `app/NotFoundPage.tsx` + 신규 `NotFoundPage.module.css`(Mentor Hub CSS 의존 제거, "Assessment 홈으로 이동"), `components/student-navigation/studentNavigationItems.ts`·`NavigationIcons.tsx`(mentor·schoolActivity 항목·아이콘 제거). 기존 LearnersHigh 메뉴 11개와 Assessment는 그대로. 기존 "수행평가"(performanceTask) 아이콘은 School로 가던 연결이 사라져 다른 기존 메뉴처럼 Route 미연결.
- **유지(삭제하지 않음)**: `frontend/student/assets/mentor-man`·`mentor-woman` — Admin 구형 `fixtures/adminMentorPhotos.fixture.ts`가 직접 import(삭제 시 Admin Build 실패를 실제로 확인 후 백업에서 되돌림). Admin 구형 코드 정리는 4단계(Wangyu 리뷰). `frontend/mentor/` workspace — 5단계(OD-A10 팀 합의, `package.json`·lockfile·scripts Shared 승인). Backend에는 mentor/school 패키지가 없음(`common`, `studentcare`만).
- 남은 문자열: 변경 이력 주석, 전역 `index.css`·Navigation CSS의 Token 설명 주석(전역 CSS 승인 대상이라 그대로), Assessment `school-assessments`(보존 대상).

### Verification

- typecheck / lint / build PASS (student·admin·mentor 3개 workspace).
- Scratchpad `nav-check` 36/36: `/`·직접 접근·새로고침 → 홈 + Sidebar 홈 활성, 학교 수행평가 목록·상세·심화 탐구 상세·PDF Viewer에서 상단 Assessment → 홈·뒤로 가기, Sidebar 학교 수행평가 → 목록, 1920·1440·1024·820·390 상단 메뉴 12개(Mentor·School Activity 없음·가로 넘침 없음), 삭제 주소 9개(`/mentor/**`, `/school/**`) → 일반 Not Found(런타임 오류 0).
- 회귀(순차): capture 51/52(favicon 404, 상단 메뉴 기대값 14→12·Assessment→홈으로 갱신), 심화→홈 7·홈/꿀팁 57·60선 77·목록/상세 50·노트 51·상세 45·피드백 32·심화 62·자료함 43·성장 50·통합 122·Sidebar 52·상세 스크롤 25·PDF 가져오기 66·아이콘 31·대학별 PDF 패널 50·목록 22·PDF 27개 13, 일괄 점검 84건 이전과 같음.
- `scripts/verify*.ps1`·Backend·E2E: NOT RUN.

## 2026-10-28 — 학생 과목 추가 + Assessment 연동 (Mock 화면)

같은 Branch(HEAD `90720de`, **미커밋**). Mentor·School Activity 제거 상태 유지.

- **진입점 2곳, Modal 1개**: 학교·학업 정보 "+ 과목 추가"(기존 비활성 칩을 실제 동작으로)와 Sidebar 과목 제목 옆 "+"(`aria-label="과목 추가"`)가 Layout의 `AddSubjectModal` 하나를 연다. Modal은 Assessment 테마 범위 안·Sidebar 밖에 그려 잘리지 않음.
- **두 방식**: 이름 직접 입력 → `createStudentSubject`(P-26 PROPOSED, Mock 전용, "직접 추가" 표시) / 다른 학기에서 쓰던 과목 고르기 → §9-2 PUT subjectIds(같은 subjectId 재사용). 학교 개설 과목 카탈로그가 없어 추천 과목을 만들지 않음. 입력한 이름이 다른 학기 과목과 같으면 그 과목을 재사용.
- **검증** (`model/subjectName.ts`, 화면·Mock 공통): 빈 값·공백 → "과목명을 입력해 주세요.", 같은 학교·학년도·학년·학기 안 중복(NFKC·공백 제거·대소문자 무시) → "이미 등록된 과목입니다.", 40자 초과(Mock UI 규칙). 공통국어1/2, 물리학Ⅰ/Ⅱ는 다른 과목. 연속 클릭은 한 번만 처리.
- **저장**: Mock Store `academicContexts`에 추가 + 학생 추가 과목만 이 브라우저 저장소(학기 키)에 보관 → 새로고침해도 같은 ID로 유지. 저장 실패 시 오류 안내·입력 유지·Sidebar 미반영. 학기 간 복제 없음.
- **연동**: 모든 과목 선택 UI가 학업 정보 응답을 쓰므로 Sidebar(건수 0)·과목별 목록(기존 빈 상태)·수행평가 추가·심화 탐구 만들기·탐구 라이브러리 필터·성장 기록·자료함에 바로 반영. 참고자료 영역 매핑이 없는 과목도 정상 동작.
- **함께 고친 것**: Sidebar 메뉴 목록 grid에 `minmax(0, 1fr)` — 긴 과목명이 Sidebar를 넘던 문제(기존 말줄임이 grid 때문에 동작 안 함). 학업 정보 수강 과목 fieldset이 "정보 수정" 전에는 비활성이라 "+ 과목 추가"도 눌리지 않던 문제(저장 중에만 비활성).
- 범위 밖: 과목 이름 변경·삭제(정보 수정의 선택 해제만 기존대로), 서버 생성 계약 → P-26.

### Verification

- typecheck / lint / build PASS (3 workspace).
- Scratchpad `subject-check` 57/57: 학업 정보 등록·Modal 디자인·Focus·새로고침 후 같은 ID, 검증 9종(빈·공백·중복·중간 공백·41자·HTML 문자열·5회 연속 클릭·물리학Ⅰ/Ⅱ), Sidebar 등록 → 0 → 과목별 빈 목록 → 수행평가 등록 → 1 → 상세 과목명 → 전체 목록 → 심화 탐구 생성 → 라이브러리 필터 → 성장 기록 → 자료함, 다른 학기 과목 재사용(subj_11)·1학기 추가 과목이 2학기에 섞이지 않음·같은 이름 다른 학기 추가·"직접 추가" 유지, 9→10개 검색·접기 등장·+와 접기 버튼 겹침 없음·31개 단일 스크롤, 저장 실패·잠금·저장소 차단, 1440·1024·820·390 Modal·IME 입력·가로 넘침 없음, 긴 과목명 말줄임.
- 회귀(순차): Sidebar 52(제목 옆 + 때문에 목록 간격 측정 대상만 갱신, 값 동일)·상세 스크롤 25·진입/제거 36·노트 51·상세 45·목록/학업 정보 51/52(favicon 404)·심화→홈 7·홈/꿀팁 57·60선 77·목록/상세 50·피드백 32·심화 62·자료함 43·성장 50·통합 122·PDF 가져오기 66·아이콘 31·대학별 PDF 패널 50·목록 22, 일괄 점검 84건 이전과 같음.
- `scripts/verify*.ps1`·Backend·E2E: NOT RUN.

## 2026-10-29 — PR 준비: 원문 데이터 분리

- 원격 저장소가 공개 저장소라, 배포 권한이 확인되지 않은 **모의고사 60선 원문 지문**을 Fixture에서 분리했다. `mockExamResearchFixture.ts`의 `research.passage`는 빈 문자열이고, 원문은 로컬 전용 `api/mock/mockExamPassages.local.json`(Git 제외)에 두며 `mockExamPassages.ts`가 있을 때만 붙인다. 없으면 상세 화면에 "원문 미포함" 안내.
- 대학별 기출 PDF 27개와 `references/` 원본(모의고사 Markdown·참고자료 링크 Markdown·Daglo·Mockup 이미지)은 Commit하지 않는다. Manifest에는 파일명·쪽·개념어 같은 색인 정보만 있다.
- 탐구 주제·방법·질문(LearnersHigh 제안)과 시험·문항·쪽 출처는 Fixture에 그대로 둔다.

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
