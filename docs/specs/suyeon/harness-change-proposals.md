# Shared 영역 하네스 변경 제안 (1차)

> 위치: `docs/specs/suyeon/harness-change-proposals.md`
> 상태: **PROPOSED — 적용하지 않음.** Shared 영역(`scripts/**`, `docs/architecture/**`, `docs/api/**`, `docs/OWNERSHIP.md`, `docs/SOURCE_OF_TRUTH.md`, `docs/adr/**`, `frontend/shared/**`, `e2e/**`, `.github/**`, Admin Shell/Router) 변경안이다.
> 각 항목은 팀(Suyeon + Wangyu) 검토 후 별도 PR로 적용한다. 승인되면 이 문서의 해당 항목에 "적용: PR/날짜"를 기록한다.
> 작성: 2026-10-26, 1차 하네스 정비.

## 요약

| ID | 대상 | 내용 | Wangyu 영향 | 승인 |
|---|---|---|---|---|
| P-01 | `scripts/verify.ps1` | 필수 파일 목록을 Assessment 문서로 교체, 폐기 Spec 재등장 경고 | 없음 (Wangyu 항목 변경 없음) | 필요 (Shared) |
| P-02 | `docs/SOURCE_OF_TRUTH.md` §4-3 | API 변경 순서를 설계 게이트 + 구현 Stage로 교체, Mock 기준 문서 추가 | 문구만 | 필요 |
| P-03 | `docs/architecture/overview.md` §4·§10-2 | Frontend 데이터 접근 계층 절 추가, Contract-first 순서 교체 | 문구만 | 필요 |
| P-04 | `docs/OWNERSHIP.md` §10 | Shell 변경 절차, Assessment 공유 코드 위치 | **있음** (Admin Shell) | 필요 |
| P-05 | `docs/adr/0010-…` (신규) | Frontend Routing ADR 초안 | **있음** (Admin Router) | 필요 |
| P-06 | Admin Shell / `App.tsx` | Assessment Entry 추가 범위 합의 항목 | **있음** | **Wangyu 동의 필수** |
| P-07 | `frontend/shared/assessment/` (신규) | Contract Type · Canonical Fixture · 읽기 전용 Renderer 공유 위치 | 간접 (workspace 설정) | 필요 |
| P-08 | `e2e/` | Mock 모드 Assessment Playwright Project 추가 | 간접 (기존 Spec 유지) | 필요 |
| P-09 | `.gitignore` | `backend/bin/` 추가 | 없음 | 경미 |
| P-10 | `.github/workflows/ci.yml` | P-01과 같은 PR로 반영해야 하는 타이밍 | 없음 | P-01과 함께 |
| P-11 | `.github/CODEOWNERS` | GitHub 핸들 확정 후 주석 해제 | 리뷰 흐름 | 팀 |
| P-12 | `scripts/CLAUDE.md` (Untracked) | 루트 `CLAUDE.md`와의 중복 처리 | 없음 | 소유자 확인 |
| P-13 | `docs/api/api-contract.md` | Domain OD ↔ API OD 대응표, MM 결정 반영 | 없음 | 필요 |
| P-14 | `docs/SOURCE_OF_TRUTH.md` §4-4·§5 (+ 선택: `CLAUDE.md` §3·§12, `AGENTS.md` 표) | Assessment 시각 기준을 "Mockup = 직접 기준(색상·글꼴 포함), Daglo = 보완, TDS 혼합 금지"로 정정 | 문구만 (Wangyu UI 기준 변경 없음) | 필요 |
| P-15 | `docs/api/api-contract.md` §12·14·20·22·24·31 + 신규 기준 조회 | 수행평가 상세 화면이 요구하는 최소 계약 보완 (MM-03·18~22) | 없음 (Assessment 전용) | 필요 |
| P-16 | `docs/api/api-contract.md` §16·17·18·27·30 | 심화 탐구 화면의 응답 Shape·필터 보완 (MM-26~29) | 없음 (Assessment 전용) | 필요 |
| P-17 | `docs/api/api-contract.md` §22·23 | 자료함 응답 Shape·유형 Enum·자료 연결 보완 (MM-21·30~32) | 없음 (Assessment 전용) | 필요 |
| P-18 | 신규 ADR 제안 + `api-contract.md` §19~21·23 | 탐구 노트 Editor 라이브러리·블록 Schema·자동 저장·충돌 정책 결정 (OD-A05, API-OD-A04, MM-18·25·33~36) | 없음 (Assessment 전용) | 필요 (라이브러리 설치 승인 포함) |
| P-33 | `.gitignore` | 저작권 미확인 원문(`references/mock-exam/`, `references/previous-exam-questions/`) 보호 + P-09 `backend/bin/` (2026-11-03) | 없음 | 경미 (Shared) |
| P-34 | `docs/adr/0011-…` (신규) + ADR-0008·0009 상태 줄 | 심화 탐구를 읽기 전용 정적 콘텐츠로 축소 (ADR-0008 Decision 3·4 부분 대체) | 간접 (문구) | 필요 |
| P-35 | `docs/api/api-contract.md` §10·11·16~18·20·24·27·30·31·38~42·46·47·47-A·53·61·62 | PDF 분석 Schema 통합, 심화 계약 DEPRECATED, `sourceType` 축소, 추천 링크 | 없음 (Assessment 전용, §65 무변경) | 필요 |
| P-36 | `docs/architecture/overview.md`·`integration-boundary.md`·`shared-conventions.md` | EnrichmentTask 제거, PDF 분석 파이프라인·파일 저장·외부 전송 경계 | 문구 | 필요 |
| P-37 | `CLAUDE.md`·`AGENTS.md`·`README.md`·`ARCHITECTURE.md`·`SOURCE_OF_TRUTH.md`·`OWNERSHIP.md`·`.claude/rules/*` | 심화 탐구 문구 최소 수정, `EnrichmentTask` 예시 교체 | 문구 (Wangyu 항목 무변경) | 필요 |
| P-38 | `frontend/shared/assessment/content/` (신규) | 정적 심화 콘텐츠 단일 원본 위치 (P-07 확장) | 간접 (workspace) | 필요 |
| P-39 | `docs/adr/0012-…` (신규, 결정 후) | 평가계획서 PDF 분석 아키텍처 (Provider·Job·저장·표/스캔 처리) | 간접 (`common/`·DB·설정) | 팀 |
| P-40 | 이미 적용된 미커밋 Shared 변경 | Admin `App.tsx`·`AdminShell.*`(P-06), `application.yml`·`build.gradle.kts`(P-31) 승인 기록 | **있음** | **Wangyu 확인 필수** |

---

## P-01. `scripts/verify.ps1` 필수 파일 목록

**현재 (실행 확인, 2026-10-26):** `powershell -NoProfile -File scripts/verify.ps1 -SkipFrontend -SkipBackend` → `Verification FAILED`. 누락 파일 = 폐기된 `mentor-hub.md`, `school-admissions.md`, `student-management.md`, `parent-progress.md`.

**변경 원칙**
- 신규 Assessment 문서(`docs/specs/suyeon/README.md`, Feature Spec 4종, ADR-0008·0009)가 없으면 **실패**한다.
- 폐기된 구형 Spec은 없어야 정상이다. 다시 생기면 **경고만** 낸다 (실패 아님).
- `frontend-mentor.md`는 `frontend/mentor/` workspace가 있는 동안만 요구한다.
- 기존 항목(Wangyu 관련 공통 문서, 디렉터리 규칙, settings.local 추적 검사, Frontend/Backend 검증 호출)은 그대로 둔다.

**Patch**

```diff
@@ -40,7 +40,6 @@
         ".claude/rules/common.md",
         ".claude/rules/frontend-student.md",
         ".claude/rules/frontend-admin.md",
-        ".claude/rules/frontend-mentor.md",
         ".claude/rules/backend.md",
         ".claude/rules/database.md",
         ".claude/rules/testing.md",
@@ -55,24 +54,32 @@
         "docs/design/tds-web-guidelines.md",
         "docs/api/api-contract.md",

+        "docs/specs/suyeon/README.md",
         "docs/specs/suyeon/domain.md",
         "docs/specs/suyeon/progress.md",
-        "docs/specs/suyeon/features/mentor-hub.md",
-        "docs/specs/suyeon/features/school-admissions.md",
-        "docs/specs/suyeon/features/student-management.md",
-        "docs/specs/suyeon/features/parent-progress.md",
+        "docs/specs/suyeon/features/assessment-student.md",
+        "docs/specs/suyeon/features/assessment-inquiry.md",
+        "docs/specs/suyeon/features/assessment-feedback.md",
+        "docs/specs/suyeon/features/assessment-admin.md",

         "docs/adr/README.md",
         "docs/adr/0001-separate-student-admin-mentor-surfaces.md",
         "docs/adr/0002-existing-learnershigh-integration-boundary.md",
         "docs/adr/0003-shared-feedback-queue.md",
         "docs/adr/0004-parent-report-without-parent-app.md",
+        "docs/adr/0008-rebuild-suyeon-features-as-assessment.md",
+        "docs/adr/0009-snapshot-based-assessment-feedback.md",

         "scripts/verify.ps1",
         "scripts/verify-frontend.ps1",
         "scripts/verify-backend.ps1"
     )

+    # 구형 Mentor Workspace가 남아 있는 동안만 해당 규칙 문서를 요구한다 (legacy-cleanup-plan.md 5단계에서 함께 제거).
+    if (Test-Path -LiteralPath (Join-Path $RepoRoot "frontend/mentor")) {
+        $required += ".claude/rules/frontend-mentor.md"
+    }
+
     $missing = New-Object System.Collections.Generic.List[string]

     foreach ($relative in $required) {
@@ -86,6 +93,20 @@
     return $missing
 }

+# ADR-0008로 폐기된 구형 Suyeon Feature Spec. 없어야 정상이며, 다시 생기면 활성 명세로 오인하지 않도록 경고한다.
+function Get-RetiredHarnessFilesPresent {
+    param([string]$RepoRoot)
+
+    $retired = @(
+        "docs/specs/suyeon/features/mentor-hub.md",
+        "docs/specs/suyeon/features/school-admissions.md",
+        "docs/specs/suyeon/features/student-management.md",
+        "docs/specs/suyeon/features/parent-progress.md"
+    )
+
+    return @($retired | Where-Object { Test-Path -LiteralPath (Join-Path $RepoRoot $_) })
+}
+
 function Test-ForbiddenCodeDirectories {
     param([string]$RepoRoot)

@@ -163,6 +184,15 @@
     Write-Info "Required Harness files: PASS"
 }

+$retiredPresent = @(Get-RetiredHarnessFilesPresent -RepoRoot $repoRoot)
+
+if ($retiredPresent.Count -gt 0) {
+    Write-Warn ("폐기된 구형 Suyeon Spec이 다시 존재합니다 (활성 기준 아님, ADR-0008):`n- " + ($retiredPresent -join "`n- "))
+}
+else {
+    Write-Info "Retired Suyeon specs absent: PASS"
+}
+
 Write-Step "Code directory convention"
```

**검증 (2026-10-26)**
- 저장소 밖 사본(저장소 경로를 가리키도록 Repository Root만 바꾼 테스트용 사본)을 `-SkipFrontend -SkipBackend`로 실행 → `Required Harness files: PASS`, `Retired Suyeon specs absent: PASS`, `Verification PASS`.
- 미검증: 신규 Spec 누락 시 실패·폐기 Spec 재등장 시 경고 동작 (가짜 Root 테스트가 권한 정책으로 실행되지 않음). Frontend/Backend 단계는 이번에 실행하지 않음.

**CI 영향 (P-10)**
- CI Harness Job은 **커밋된 상태**를 검사한다. 현재 `origin/main`에는 구형 Spec 4개가 있고 신규 Spec 4개·ADR-0008·0009는 Untracked다.
- 따라서 원본 스크립트는 지금 CI에서 통과하고, P-01만 먼저 커밋하면 CI가 **실패**한다.
- **구형 Spec 삭제 + 신규 Spec·ADR 추가 + P-01을 같은 PR**에 넣어야 한다.

**부수 관찰 (범위 밖):** Windows PowerShell 5.1에서 실행하면 한글 출력이 깨진다. 스크립트가 BOM 없는 UTF-8이기 때문으로 추정한다. 동작에는 영향이 없다.

---

## P-02. `docs/SOURCE_OF_TRUTH.md` §4-3

현재 252~264행의 "API 변경이 필요하면: api-contract.md → domain/spec → Backend → Frontend → Test"를 다음으로 교체한다.

```markdown
API 변경이 필요하면 `CLAUDE.md` §18의 설계 게이트(Feature / Domain 확인 → `api-contract.md` 개정)를 먼저 통과한다.
구현은 같은 절의 Stage 순서(Frontend Contract 기반 Mock → Backend → AI)를 따른다.
Frontend Mock도 이 문서의 계약 Shape만 사용한다. 기존 API의 제거 여부는 실제 Backend 호출부, Wangyu 기능, 테스트 의존성까지 확인한다.
```

§4 Concern 목록에 다음 행을 추가한다.

```markdown
## 4-5. Frontend Mock / Fixture (Assessment)

Mock Adapter 위치·전환·지속성·시나리오 → `docs/specs/suyeon/assessment-frontend-mock.md`
Canonical Fixture 조건 → `docs/specs/suyeon/domain.md` §25
Mock은 Requirement·Contract의 근거가 아니다. Mock과 계약이 다르면 계약이 우선한다.
```

---

## P-03. `docs/architecture/overview.md`

§10-2 Contract-first Rule (437~446행)을 교체한다.

```markdown
설계 게이트와 구현 Stage는 `CLAUDE.md` §18을 따른다.

 Feature Spec / Domain / Ownership 확인
  → api-contract.md 변경
  → (Stage 1) Frontend Contract Type + Mock Adapter
  → (Stage 2) Backend DTO / Controller → Frontend Adapter Real 전환
  → Contract / Integration / E2E Test
```

§4 뒤에 새 절을 추가한다.

```markdown
## 4-5. Frontend 데이터 접근 계층

화면 → model(화면 상태) → api(함수 시그니처) → { mock | http } 구현.
화면은 Fixture를 직접 import하지 않는다. Mock과 http는 같은 반환 Type을 가진다.
Frontend Mock은 Backend `common/integration/learnershigh/MockExisting*Client`(기존 시스템 대체)와 다른 계층이다.
Assessment 세부: `docs/specs/suyeon/assessment-frontend-mock.md`.
```

---

## P-04. `docs/OWNERSHIP.md` §10

§10-2 끝에 추가한다.

```markdown
Admin Shell 변경 절차:
- 대상: `app/AdminShell.tsx`, `App.tsx`, `app/adminLocation.ts`, `main.tsx`, `index.css`, `app/theme.css`, `components/AdminUi.module.css`, `app/StudentCareRoute.*`
- Assessment Entry 추가: Suyeon PR + Wangyu 리뷰. Student Care Entry·Route·Token의 위치·동작 변경 없음을 Student Care E2E로 확인한다.
- 기존 Entry 삭제·Shell 시각 구조 변경·Router 교체: Wangyu 동의 + ADR (P-05).
```

§10-4에 추가한다.

```markdown
Assessment 공유 코드: Student·Admin Assessment가 함께 쓰는 Contract Type, Canonical Fixture, 읽기 전용 Note Renderer 등은
`frontend/shared/assessment/`에 둔다 (Owner: Suyeon, Shared 리뷰: Wangyu). 다른 Feature가 이 경로를 import하지 않는 한 Assessment 전용이다.
```

---

## P-05. ADR-0010 초안 — Frontend Routing (Status: Proposed)

```markdown
# ADR-0010 Frontend Routing

- Status: Proposed
- Context:
  - Student는 `react-router` 7.18.4 Data Router(`createBrowserRouter`, `ScrollRestoration`)를 이미 사용한다 (`frontend/student/src/app/router.tsx`).
  - Admin은 Router Library 없이 `app/adminLocation.ts`(pathname + history.state 기반 Scroll 복원)와 `App.tsx`의 if 분기를 사용한다. 이 분기에 Wangyu Student Care Route(`/student-care`)가 포함된다.
  - 문서(CLAUDE.md §8 등)는 Router를 "미확정"으로 기록해 왔다.
  - Assessment는 Student 24개, Admin 8개 화면군(assessment-screen-map.md)과 목록 ↔ 상세 맥락 복원 요구(student §3)가 있다.
- Options:
  1. Student: react-router 유지 / Admin: adminLocation 유지 (Assessment는 이 방식으로 Route 추가)
  2. Student: react-router 유지 / Admin: react-router로 전환 (Student Care Route 포함 이전)
  3. 양쪽 자체 구현으로 통일
- 권장: Student는 1·2 공통으로 react-router 유지(사실 확정).
  Admin은 우선 옵션 1로 시작하고, Assessment 화면군이 커져 분기 유지 비용이 확인되면 Wangyu 동의 하에 옵션 2를 별도 PR로 진행한다.
- Consequences:
  - 옵션 1: Wangyu 코드 영향 없음. Admin의 Nested Route·Query 상태는 수동 관리.
  - 옵션 2: Admin 전체 Route 교체. Student Care E2E 전부 재검증 필요. `package.json` 의존성 추가 (Shared).
- 결정 권한: Suyeon + Wangyu.
```

---

## P-06. Admin Shell 합의 항목 (Wangyu 동의 필요)

1. `extensionEntries`에 `Assessment 관리` Entry를 추가하는 위치·이름 (Mockup은 `학습관리 > Assessment 관리 NEW`).
2. Assessment 내부 탭 6개를 Shell 메뉴가 아니라 **페이지 내부 탭**으로 구현 (Mockup AM-01). Shell 변경 최소화.
3. Mockup의 기존 Admin 크롬(어두운 Sidebar, 실제 기존 메뉴 목록, 상단 문자잔고)을 지금 Shell에 재현할지 여부. 재현하면 Student Care 화면 외관에도 영향이 있다.
4. 구형 Entry 6개 제거 시점과 `/` 기본 화면 (`legacy-cleanup-plan.md` 4단계).
5. 위 변경 PR에서 Student Care E2E 전부 실행을 필수 조건으로 한다.

---

## P-07. `frontend/shared/assessment/` 설정

- 필요 근거: Student와 Admin이 같은 Contract Type, 같은 ID Fixture, 같은 읽기 전용 Note·Version 표시를 써야 한다 (`domain.md` §25, One Entity 원칙). 두 앱은 별도 Vite 앱이다.
- 선택지:
  - (a) npm workspace Package (`frontend/shared/assessment/package.json`, 예: `@learnershigh/assessment-shared`) → `frontend/package.json` workspaces와 lockfile 변경 필요.
  - (b) 각 앱의 `tsconfig` include + Vite에서 상대 경로 import → Package 추가는 없지만 경계가 흐려진다.
- 권장: (a). Library 추가 없이 workspace만 추가한다.
- 승인 전 진행: `assessment-frontend-mock.md` §4-2 (Student 단독으로 시작, Admin 착수 전 이전).

---

## P-08. `e2e/` Mock 모드 Assessment Project

- 현재: `e2e/playwright.config.ts`는 Admin preview(4174) + Backend e2e Profile 하나만 대상으로 한다. Viewport는 1440×1000.
- 제안: Assessment Mock 모드용 Project를 별도로 추가한다 (Student preview 4173 / Admin preview 4174, Backend 불필요). 시각 비교 캡처용 1440×728 @ DPR 2 설정을 포함한다. 기존 Student Care Project와 실행을 분리한다.
- 새 Test Framework 추가 없음. CI Job 추가 여부는 별도로 결정한다.

---

## P-09. `.gitignore`

`backend/bin/`(IDE가 생성한 산출물, 192개 파일, Untracked)이 ignore되지 않아 실수로 커밋될 위험이 있다. 다음 한 줄 추가를 제안한다.

```gitignore
backend/bin/
```

## P-11. CODEOWNERS

모든 줄이 주석 처리되어 Shared 리뷰가 강제되지 않는다. 두 담당자의 GitHub 핸들이 확정되면 주석을 해제한다.

## P-12. `scripts/CLAUDE.md`

- Untracked 상태다. 2026-10-26 1차 정비 전까지 루트 `CLAUDE.md`와 내용이 완전히 같았다.
- 이번 정비로 루트 `CLAUDE.md` §8·§11·§18이 바뀌어 **이제 두 파일 내용이 다르다.** Claude Code가 `scripts/` 하위 작업 시 이 파일을 함께 로드하면 구형 순서 규칙이 다시 적용될 수 있다.
- 작성자·의도를 확인한 뒤 삭제하거나, 스크립트 전용 짧은 규칙으로 교체할 것을 제안한다. 이번 작업에서는 **변경하지 않았다.**

## P-13. `docs/api/api-contract.md`

- §61 아래에 Domain OD ↔ API OD 대응표를 추가한다. 같은 번호가 다른 의미로 쓰이고 있다: OD-A08 ↔ API-OD-A12(운영 권한), OD-A11 ↔ API-OD-A08(휴지통), OD-A12 ↔ API-OD-A11(외부 출처).
- `assessment-screen-map.md` §3의 MM-01~10은 결정이 나면 §12·13·31 등에 반영한다. 결정 전에는 계약을 바꾸지 않는다.

## P-14. Assessment 시각 기준 문구 정정 (2026-10-26 사용자 확정 방향)

현재 `SOURCE_OF_TRUTH.md` §4-4 표와 "구현 우선순위" 문단은 **색상·타이포그래피·여백·버튼·입력창 = Daglo**로 나눈다. 사용자 확정 방향은 Mockup이 이 항목까지 직접 기준이고 Daglo는 보완이다. Suyeon 문서는 `assessment-design-principles.md`로 이미 반영했다.

제안 diff (§4-4 표):

```diff
-| Assessment 화면 레이아웃·사이드바·카드·표·탭·CTA 위치 | 해당 Student 또는 Admin Claude Design Mockup |
-| Assessment의 색상 분위기·타이포그래피 인상·여백·버튼·입력창·모달·목록 스타일 | `references/design/daglo/`의 Daglo 이미지 |
+| Assessment 화면 레이아웃·사이드바·카드·표·탭·CTA 위치와 색상·타이포그래피·여백·버튼·입력창·모달·목록 스타일 | 해당 Student 또는 Admin Claude Design Mockup (직접 기준) |
+| Mockup에 없는 세부 표현(Hover·Focus·Selected·Drawer·Popover 등)과 UX 패턴 | `references/design/daglo/`의 Daglo 이미지 (Mockup의 기반 디자인 언어) |
```

제안 diff (§4-4 구현 우선순위):

```diff
-**구현 우선순위:** 화면의 구조는 Claude Design Mockup을 우선하고, 시각적 톤과 공통 컴포넌트 표현은 Daglo를 참고한다. 두 레퍼런스가 다르면 ...
+**구현 우선순위:** Claude Design Mockup이 구조와 시각 표현 모두의 직접 기준이다. Mockup은 Daglo를 참고해 제작되었으므로, Mockup에 없는 세부 표현만 Daglo로 보완하고, 둘이 다르면 Mockup을 따른다. 신규 Assessment에는 TDS 스타일을 섞지 않는다(기존 TDS 문서·기능은 보존). 세부 Token: `docs/specs/suyeon/assessment-design-principles.md`. ...
```

§5 마지막 문단의 "해당 문서가 Daglo 화면 이미지를 대체하거나"는 "해당 문서가 Claude Design Mockup을 대체하거나"로 바꾼다. `CLAUDE.md` §3·§12와 `AGENTS.md` 표는 현재 문구가 새 방향과 충돌하지 않으므로 선택 사항이다 (설계 문서 포인터 추가 정도).

## P-15. 수행평가 상세 화면용 최소 계약 보완 (2026-10-26, Stage 1 구현 중 확인)

결정 전까지 Frontend는 아래 항목을 **표시하지 않거나 Empty/비활성**으로 둔다. 기존 Entity와 겹치지 않도록 최소 필드만 제안한다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-03 | §12 `SchoolAssessment` 응답·PATCH에 선택 필드: `evaluationType`(자유 텍스트), `evaluationPeriodText`(예: "11월 중"), `weightText`(학교 표기 그대로, 숫자 확정 금지), `description`(이미 요청에 있음 → 응답에도 포함) | 평가계획서 추출값(§11)과 별개인 **학생 확인 값**. 공식값은 §11 원본 근거 유지 |
| MM-03 | 안내문·첨부: 별도 `AssessmentNoticeAttachment`(fileRef, fileName, uploadedAt) 또는 결과물과 구분되는 `kind` | ArtifactVersion(학생 산출물)과 섞지 않는다. Snapshot 포함 여부는 MM-04로 함께 결정 |
| MM-03 | 담당 선생님·AI 제한 배지 | 새 Actor 금지(feedback §2). 표시 여부만 결정 (MM-10) |
| MM-03 | 연결된 심화 탐구: `GET enrichment/tasks?relatedAssessmentId=` Query 추가 | §18의 `relatedAssessmentId` 재사용, 새 필드 불필요 |
| MM-18 | §20 GET 항목, §24 GET 항목 Shape을 명시 (현재 구현 가정: 요청 필드 + 저장/생성 응답 필드) | 없음 |
| MM-19 | §31 GET에 `sourceType`·`sourceId` Query, 항목에 `sourceType`·`sourceId` 포함 | 없음 |
| MM-24 (S15 추가) | §32 Reply 구조화 항목 채택 여부(잘한 점·보완할 점·복습 개념·다음 활동 → `overallComment` 외 선택 필드) 및 §46 추천 표시용 제목(`title`) 포함 여부, 추천 수락/확인 기록 계약 필요 여부 | §45 관리자 작성 Shape과 함께 바뀐다 (Admin 피드백 편집기 AM-06) |
| MM-25 (S15 추가) | §21 `GET .../revisions/{revisionId}` 응답 Shape: `revisionId`·`revisionNumber`·`savedAt`·`noteId`·`title`·`blocks` | MM-18과 같은 블록 Shape 사용 |
| MM-20 | `GET /api/student/assessment/school-assessments/{id}/criteria` → `items[{ criteriaId, title, maxScoreText, description, source{ pdfPageNumber, printedPageLabel } }]`. §14의 `criteriaSourceId`가 이 `criteriaId`를 가리킨다 | §11 분석 결과·관리자 확인값에서 파생. 학생 정정값과 구분 |
| MM-21 | §22 추천 응답 항목 Shape (`sourceName`, `category`, `homepageUrl`, `description`, `searchKeywords[]`) | 학생 자료(§22 POST)와 다른 Resource |
| MM-22 | §14 주제 추천 요청에 `careerInterest`(선택)·`recommendationType`(Spec ST-06 유형) | 없음 |

## P-16. 심화 탐구 화면용 계약 보완 (2026-10-26, Stage 2 Frontend 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** 결정 전까지 Frontend는 아래 항목을 표시하지 않거나 가정 Shape(코드 주석·screen-map에 명시)으로 Mock만 둔다. sourceReference(§18)는 계속 DRAFT로 취급한다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-26 | §16 항목에 선택 필드 `category`(탐구 분야, 문자열), `difficulty`(Enum 후보: EASY/NORMAL/HARD), `relatedSubjectIds[]`, `problemContext`, `referenceHints[]`, `expectedOutputs`, `selfCheckItems[]`. Query에 `category` | 관리자 콘텐츠 관리(assessment-admin.md)와 같은 Entity. 자기 점검 체크 결과 저장 여부는 별도 결정 |
| MM-26 | §30 즐겨찾기 `sourceType`에 `ENRICHMENT_CATALOG`·`MOCK_EXAM_MATERIAL`·`UNIVERSITY_RESOURCE` 포함 여부 | 학생 즐겨찾기는 원본 복제 없이 참조만 |
| MM-27 | §18 GET 항목·상세 Shape 명시(요청 필드 + `taskId`·`createdAt`·`updatedAt`), PATCH 수정 가능 필드(`title`·`goal`·`relatedAssessmentId`·`deadlineDate`) | 상태는 PATCH /status만 |
| MM-27 | 같은 `catalogTaskId`로 여러 Task 시작 허용 여부 (API-OD-A12) | 현재 화면은 "내 탐구 열기"만 제공 |
| MM-28 | §17 공개 카드 응답: `materialId`, `subjectId`, `source{academicYear, examMonth, grade, questionNumber, sourceUrl}`, `idea{topicTitle, coreMaterial, relatedFields[], topicReason, goal, methods[{label,text}], extensionQuestions[]}`. 모의고사 과목 목록 제공 방식(코드 상수/조회 API) | 원문 출처와 탐구 아이디어 분리(§17 문장) 유지 |
| MM-29 | §27 응답: `resourceId`, `university`, `title`, `academicYear`, `resourceType`, `officialUrl`, `checkedAt`, `relatedConcepts[]`, `inquiryIdeas[]`. Query에 `resourceType` | 대학명 Enum 금지 유지, 원문 미러링 금지(API-OD-A11) |

## P-17. 자료함 화면용 계약 보완 (2026-10-27, Stage 3 Frontend 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** 결정 전까지 Frontend는 가정 Shape(코드 주석·screen-map)으로 Mock만 둔다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-30 | §22 GET 목록·상세 Shape 명시: 요청 필드 + `resourceId`·`createdAt`·`updatedAt`. PATCH 수정 가능 필드: `type`·`title`·`sourceName`·`sourceUrl`·`author`·`publishedDate`·`memo`·`tags` (`fileRef` 교체는 §48 결정 후) | 학생 자료 = 본인 비공개 ResourceReference. 관리자 Scrap(§43)·대학 자료(§27)와 다른 Entity |
| MM-30 | 자료–수행평가/심화 Task 연결: 자료에 `relatedSources[{sourceType, sourceId}]`를 둘지, 노트 링크 블록(§23)으로만 연결할지 결정 | Domain §13 "활용 관계: Note Block / Assessment / EnrichmentTask" |
| MM-21 | §22 recommendations 항목 Shape: P-15 제안(`sourceName`, `category`, `homepageUrl`, `description`, `searchKeywords[]`) 확정. `homepageUrl`은 관리자가 확인한 주소만 | 추천 = 탐색 후보 자료원이며 개별 자료 추천이 아님 |
| MM-31 | `type` Enum 후보: `LINK`·`ARTICLE`·`PAPER`·`BOOK`·`VIDEO`·`PDF`·`IMAGE` (+`STATISTICS`?) | §22 본문의 통계·공공데이터 자료원과 정합 확인 |
| MM-32 | 출처 표시: 입력 완결성(작성자·발행일)과 실제 확인 상태를 구분할지, 상태 필드(`sourceCheck`)를 둘지 | AI·관리자 검증과 학생 입력을 섞지 않는다 |
| — | 자료 삭제/보관: §30 표의 `ResourceReference` 삭제·복원 범위 결정 (현재 화면은 삭제 없음) | API-OD-A08 |

## P-18. 탐구 노트 Editor 기술·블록 Schema 결정 제안 (2026-10-27, Stage 4 Frontend 구현 중 작성)

상태: **PROPOSED — 적용·설치하지 않음.** Stage 4는 라이브러리 없이 React 입력 요소로 만든 경량 블록 편집기로 구현했다. 편집 화면(`components/notes/NoteBlockEditor.tsx`)과 저장·Revision 흐름(`model/useNoteDraft.ts`, `model/noteEditorModel.ts`)을 분리해 두어, 라이브러리를 도입해도 저장·충돌·Revision 계층은 그대로 쓴다.

### 1. 현재 환경

React 19.3.0, TypeScript 6.0.3, Vite 8.3.4, npm workspaces. Repository에 Editor 관련 패키지는 없다(2026-10-27 `package.json`·lockfile 확인).

### 2. 후보 비교 (설치·실행 검증 안 함 — "확인 필요"는 설치 전 반드시 확인)

| 기준 | Tiptap | BlockNote | Lexical | 현재 경량 편집기 |
|---|---|---|---|---|
| 기반·라이선스 | ProseMirror 기반, 핵심 MIT (일부 Pro 확장은 유료) | Tiptap/ProseMirror 기반, 핵심 MPL-2.0, 일부 "XL" 패키지는 GPL-3.0 또는 상용 | Meta, MIT | 없음 (자체 코드) |
| Notion형 블록 UX | 확장으로 구성해야 함 | 기본 제공 (블록 메뉴·드래그·"/" 메뉴) | 플러그인으로 구성 | 일부 (메뉴·"/"·이동 버튼, 드래그 없음) |
| 안정적 blockId | 별도 확장 필요 (오픈소스 여부 확인 필요) | 블록마다 id 기본 제공 | node key는 실행 중 값이라 별도 id 필드 필요 | 있음 (생성 시 1회) |
| 표·체크리스트 | 공식 확장 | 기본 블록 | 플러그인 | 있음 (단순) |
| 링크 카드·자료 블록 | 커스텀 Node | 커스텀 블록 | 커스텀 Node | 있음 (자료함 resourceId) |
| 직렬화 | ProseMirror JSON | 자체 Block JSON (블록 배열에 가까움) | Lexical JSON | §20 NoteBlock 배열 그대로 |
| Mockup 디자인 맞춤 | 자유로움 (헤드리스) | 기본 UI 테마 재정의 필요 | 자유로움 | 완전 |
| React 19·Vite 8 호환 | 확인 필요 | 확인 필요 | 확인 필요 | 확인됨 (빌드 통과) |
| 의존성·유지보수 | 중간 | 큼 (UI 프레임워크 포함 여부 확인 필요) | 중간 | 직접 유지 |

### 3. 제안

1순위 **BlockNote**(블록 id·Notion형 UX가 Mockup과 가장 가깝고 §20 블록 배열과 직렬화가 비슷함), 대안 **Tiptap**(디자인 제어가 더 쉬움). 결정 전 확인:

- 설치 후보 버전의 React 19·Vite 8 peer dependency 호환, 번들 크기
- 라이선스: MPL-2.0 핵심만 쓰고 GPL/상용 패키지는 쓰지 않는지 팀 확인
- 기본 UI 의존 여부와 `--as-*` Token으로 재정의 가능한지
- 한국어 IME 입력·Backspace·"/" 메뉴 동작

### 4. 계약에 함께 정할 것 (`api-contract.md` §19~21·23, API-OD-A04)

- 블록 Schema: `type` Enum(MM-33 후보: HEADING·PARAGRAPH·BULLET·NUMBERED·CHECKLIST·QUOTE·TABLE·RESOURCE_LINK, 이미지·PDF 블록은 File Storage 결정 후), 유형별 추가 필드(`checked`, `rows`, `resource{resourceId,title,type,sourceName,sourceUrl}`)
- 자동 저장 주기·Revision 단위, 충돌 처리(현재 Mock: 409 → 비교 → 학생 선택: 최신 위에 새 Revision 저장 / 최신 불러오기, 자동 병합 없음)
- §21 Revision 상세 응답 Shape(MM-25), 복원 = 새 Revision 생성 여부
- 자료 넣기: §20 PUT(현재 Mock) 또는 §23 (MM-34)
- 과제당 노트 수와 "새 노트로 시작"의 의미(MM-35)

## P-19. 성장 기록·보관함 화면용 계약 보완 (2026-10-27, Stage 5 Frontend 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** 결정 전까지 Frontend는 가정 Shape(코드 주석·screen-map)으로 Mock만 둔다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-37 | §29 GET 목록·상세 응답 Shape 명시(요청 필드 + `recordId`·`createdAt`·`updatedAt`), 필수 필드(제목만?), PATCH 수정 가능 필드, 목록 학기 묶음 기준(`academicYear`·`semester`를 기록에 둘지, 과목 학기로 계산할지) | 성장 기록 = 학생 개인 기록. 학교생활기록부·세특 문장 아님, AI 생성 없음(inquiry §11) |
| MM-37 | 카드의 "선생님 피드백 N건 / 탐구 노트 N개"가 필요하면 응답 요약 필드로 둘지, 표시하지 않을지 | Dashboard Counter처럼 Source Entity(§31·§19)에서 계산 |
| MM-38 | `artifactIds`를 Artifact로 둘지 `artifactVersionIds`로 특정 버전을 고정할지 | 피드백 Snapshot(§31)의 버전 고정과 같은 원칙 적용 여부 |
| MM-39 | §30 항목 Shape(원본 참조 + 표시 필드), 탭별 포함 규칙(심화 탐구의 학기, 최근 기록 기준 시각), 피드백 요청이 보관함 대상인지 | 보관함 = Projection. 사본 저장 금지 |
| MM-40 | 즐겨찾기 `sourceType` 범위(`ENRICHMENT_TASK`, 공개 심화 콘텐츠 포함 여부) | 공개 콘텐츠(§16) 즐겨찾기는 심화 탐구 라이브러리 즐겨찾기(MM-26)와 같은 개념인지 |
| MM-41 | 사용자 폴더·내보내기 필요 여부, §30 Query에 `subjectId` 추가, 삭제·복구·영구 삭제·보존 기간(API-OD-A08, OD-A11) | 원본 삭제 정책이 먼저 정해져야 휴지통이 의미 있음 |

## P-20. Assessment 홈·수행평가 꿀팁 화면용 계약 보완 (2026-10-27, Stage 6 Frontend 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** 결정 전까지 Frontend는 기존 계약 조회 + 화면 계산(코드 주석·screen-map)으로 Mock만 둔다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-42 | 홈 요약이 필요하면 별도 Endpoint를 둘지, 기존 목록(§12·§31·§30)의 `totalElements` 조합으로 충분한지 결정. 학생 표시 이름 제공 여부(§9-1 또는 기존 LearnersHigh 사용자 정보) | Dashboard 숫자는 Source Entity에서 계산(CLAUDE.md §10) |
| MM-42 | 과제당 여러 일정(개요 제출·평가일·보고서 제출)이 필요하면 SchoolAssessment 일정 항목 계약(평가계획서 §10·§11 추출 결과와의 관계 포함) | 평가계획서 원본 근거와 학생 입력 구분 |
| MM-43 | 알림: 알림 Entity·읽음 상태·발송 채널(푸시/인앱)·대상 이벤트(마감 임박, 피드백 답변 도착) 계약. New 배지 표시 규칙 | Wangyu Student Care 알림과 겹치는지 확인 |
| MM-43 | 홈 AI 입력창: §28 AI 도우미 계약을 재사용할지, 대화 저장 여부·출처 표시 | AI는 Analysis/Suggestion/Draft만 (CLAUDE.md §14) |
| MM-44 | §15를 서버 제공으로 바꿀 경우 `relatedActions` Enum(`NOTE·TOPIC_SUGGESTION·RESOURCES·ENRICHMENT·MOCK_EXAM` 후보), 예시 구조, 과제별 추천 규칙(근거·표시 문구) | 팁은 필수 단계·DB 상태 전이가 아님(§15) |

## P-21. 평가계획서 PDF 가져오기 화면용 계약 보완 (2026-10-27, Stage 7 Frontend 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** 결정 전까지 Frontend는 가정 Shape(코드 주석·screen-map)으로 Mock만 둔다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-45 | §11 분석 상태 Enum 확정(NOT_REQUESTED·PROCESSING·REVIEW_REQUIRED·COMPLETED?·FAILED), 과목별 부분 실패 표현, 폴링/알림 방식, §10-1 `reviewStatus` Enum | 업로드 상태와 분석 상태를 섞지 않음(student §5) |
| MM-46 | §11 결과 Schema: 다과목 구조, 항목 키(`itemKey`), 평가 요소·채점기준 구조, 항목↔근거 페이지 연결, 성취·교수학습 구조, 신뢰도 표현 | API-OD-A02, 관리자 평가계획서(§38~39)와 같은 Schema 사용 여부 |
| MM-47 | 개인 정정: 허용 fieldPath 목록, PUT 응답, 저장한 개인 검토 조회(GET), 문서 과목명↔내 subjectId 연결 저장 위치 | API-OD-A05, 관리자 확인값과 분리 |
| MM-48 | 중복 가져오기 판정(같은 evaluationItemRef/같은 이름), 개정본(Revision)이 바뀐 뒤 다시 가져오기, 작년·다른 학기 문서 처리, 문서 없음 Error Code(`EVALUATION_PLAN_NOT_FOUND`?) | §12 "알림 우선, 자동 병합 없음" |
| MM-48 | 파일: 크기·MIME·페이지 제한, 악성 파일 검사, File Storage, 개인 PDF 보관 기간, AI Provider 외부 전송 동의 | API-OD-A03·A10 |

## P-22. 학생 통합 보강 화면용 계약 보완 (2026-10-27, 통합 보강 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** 결정 전까지 Frontend는 Mock 전용 동작(코드 주석·screen-map MM-49~54)으로만 둔다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-49 | §12 상세(또는 별도 과제 정보)에 평가 유형·평가일·반영비율·학교 담당 선생님(이름 표기 범위)·안내문 첨부를 둘지, 평가계획서 분석 값과 학생 입력값을 어떻게 구분해 돌려줄지 | MM-03, 학교 담당 선생님 ≠ 학원 관리자 (Privacy) |
| MM-50 | 과제별 평가 기준 조회: `GET /school-assessments/{id}/criteria`(가칭) 또는 §11 결과의 항목 단건 조회. 확인 상태(학생 확인·관리자 확인·확인 필요) 표현, 학생 점검 체크 저장 여부 | §14 AI 쉬운 설명, API-OD-A02·A05 |
| MM-51 | §30 favorites `sourceType`에 `ENRICHMENT_TASK`·`ENRICHMENT_CATALOG`(공개 콘텐츠) 허용 여부, §12 목록 "중요" Query(MM-07)와 같은 값인지 | MM-26 라이브러리 즐겨찾기와 같은 개념인지 |
| MM-52 | §20 블록 Schema: type 목록(제목 단계·토글·강조·코드·수식·구분선·차트·링크·동영상·지도·이미지·파일), attrs 구조, 파일 블록과 ArtifactVersion·File Storage의 관계, 외부 삽입 허용 Provider(YouTube 등) | P-18(Editor 선정), OD-A05, API-OD-A03 |
| MM-52 | Editor 도입 비교(설치 안 함): **BlockNote** — Notion형 블록·"/" 메뉴 기본 제공, 빠른 도입, 블록 JSON이 지금 모델과 가까움, Mantine 등 UI 의존·커스터마이즈 범위 확인 필요. **Tiptap** — ProseMirror 기반 확장성·협업(Yjs) 생태계, 블록 UI(슬래시·드래그)는 직접 구성, 일부 확장 유료. **Lexical** — 가벼운 코어·접근성·성능, 블록 UI·직렬화 직접 구현 범위 큼. 공통: 지금 `noteEditorModel`·`noteBlockOps`·`useNoteDraft`는 Editor와 분리돼 있어 화면 계층만 교체 가능 | P-18 |
| MM-53 | §17 `sourceFileRef` 업로드 흐름(Storage·크기·형식·보관 기간), 스크린샷 영역(정규화 좌표·메모·개념·질문) 저장 위치, §18 `sourceReference`에 영역 식별자를 둘지(API-OD-A12) | 저작권(지문 원문 공유 금지), OCR·AI 외부 전송 동의(API-OD-A10) |
| MM-53 | 최근 시험 주제 카드를 관리자 공개 소재(§17·Admin 콘텐츠 관리)로 옮길지, 출처 기사·확인일·문항 번호 확인 규칙 | 관리자 심화 콘텐츠 관리 범위 |
| MM-54 | §22 추천 응답의 `homepageUrl`·자료원 신뢰 정보 제공 여부, 자료원 별표(개인 즐겨찾기) 필요 여부 | P-15 |

## P-23. 학교 수행평가 목록·상세 Mockup 복원용 계약 보완 (2026-10-28, 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** P-22·MM-49~54도 승인 처리하지 않는다. 결정 전까지 Frontend는 화면 계산·이 화면 전용 미리보기로만 둔다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-55 | §12 목록 항목에 `favorite`·기록 요약(`noteRevisionCount`, `feedback: {delivered, pending}` 등)을 둘지, 또는 `favorite=true` Query와 별도 요약 Endpoint. "기록" 수에 결과물 버전·성장 기록을 포함할지 정의 | MM-07·MM-11·MM-19, Dashboard 숫자는 Source Entity에서 계산(CLAUDE.md §10) |
| MM-55 | 피드백 "새 답변" 표시가 필요하면 학생 확인(읽음) 상태 계약 | MM-43 |
| MM-49 | 상세 속성: 평가 유형, 평가일(텍스트·날짜), 학교 담당 선생님 표기 범위, 정보 출처 확인 상태(학교 원본·학생 확인·수정·분석 후보·확인 필요·직접 등록), AI 글쓰기 제한 배지 | MM-03·MM-10·MM-11, P-22 |
| MM-56 | 안내문·첨부: 업로드 Endpoint, 허용 형식·크기, 보관 기간, 학교 원본과 학생 업로드 구분 | AUD-014, API-OD-A03 |

## P-24. 모의고사 60선·과목별 참고자료 계약 보완 (2026-10-28, 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** P-22·P-23·MM-49~56 상태는 바꾸지 않는다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-57 | 모의고사 추천 콘텐츠의 관리자 제공·갱신 방식(Admin 심화 콘텐츠 관리), §17 응답에 시험 출처·문항·PDF 쪽·원본 파일 필드, 학년·시행 시기·계열 Query | API-OD-A11, Admin 콘텐츠 관리 |
| MM-57 | **원문 재배포 권한**: 시험 지문 원문을 앱·웹에 공개할 수 있는지(출제기관 이용 허락), 불가하면 원문 대신 출처·요약만 제공 | 저작권 (원본 문서 "원문 이용 안내") |
| MM-58 | 참고자료 카탈로그 Endpoint(`GET /api/student/assessment/reference-sources` 가칭)와 Shape, 분류 Enum, 링크 재검증 주기·주소 변경 처리 | §22 recommendations(P-15)와 통합 여부 |
| MM-58 | 자료원 사이트 안 검색(API·크롤링) 여부와 권한 — 현재는 대표 주소 안내만 | 원본 §4 주의사항 |
| MM-59 | 학교 과목 → 영역 분류 규칙을 서버(과목 메타데이터)에서 줄지, 화면 규칙으로 둘지 | §9 학업 정보 과목 |
| MM-58 | 출처 링크 저장 정책: 자료원 홈페이지는 저장하지 않고 학생이 찾은 개별 자료 URL만 §22로 저장 (현행 Mock 동작) | §22·§23 |

## P-25. 대학별 기출 PDF 열람·심화 탐구 연계 계약 보완 (2026-10-28, 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** P-22·P-23·P-24·MM-49~59 상태는 바꾸지 않는다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-60 | §27 응답에 문서 메타데이터(유형 실제 기출/예시 문항, 과목·영역, 쪽 수, 크기, checksum)와 문서 상세 `GET /university-resources/{id}`의 문항 인덱스 | §27, Admin 대학 자료 관리(§41~42) |
| MM-60 | 원문 파일 제공: 서버 Stream 또는 짧은 수명 주소, 학생 권한 확인, Range 요청 지원 여부 | §48 File Contract, API-OD-A03 |
| MM-60 | **이용 허락**: 서울대 PDF의 "상업적 이용·변형·발췌 금지" 안내, KAIST 자료의 공개 범위 — 서비스 공개 전 대학 확인 필요. 확인 전에는 Build·공개 정적 자산에 원문을 넣지 않는다 (현행) | API-OD-A11 |
| MM-61 | 문항 인덱스를 누가 만들고 검수하는지(관리자 검토·출처 쪽 근거), 원문 변경 시 인덱스 무효화 | Admin 평가계획서 분석 검토 흐름과 유사 |
| MM-62 | §18 `sourceReference.locator {questionId, page}` 또는 별도 출처 위치 Entity | API-OD-A12 |
| MM-63 | 노트 블록 `EXAM_SOURCE` Schema (P-18 Editor 결정과 함께) | OD-A05, P-18·P-22 |
| 의존성 | `pdfjs-dist` 5.4.296 (Apache-2.0, Student workspace, 원문 화면에서만 동적 로딩) 도입 승인 — CLAUDE.md §8은 UI Library 임의 설치를 막는다. 사용자 요청(2026-10-28, iframe으로 쪽 제어 불가 시 PDF.js 검토)에 따라 넣었고 승인 기록이 필요하다 | CLAUDE.md §8, ADR 필요 여부 |
| 도구 | `frontend/student/tools/university-exam-manifest.mjs` (`npm run exam-manifest`) — 폴더·Manifest 대조, 새 PDF는 "문항 정보 미확인"으로 추가 | scripts/ 공통 검증과 별개 |

## P-26. 학생 과목 추가 계약 보완 (2026-10-28, 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** P-22~P-25·MM-49~63 상태는 바꾸지 않는다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| MM-64 | 학생 자유 입력 과목 생성 Endpoint (가칭 `POST /api/student/assessment/academic-context/subjects` `{schoolId, academicYear, grade, semester, name}` → SubjectRef) 또는 §9-2 PUT에 새 과목 이름 허용. 같은 학업 Context 안 중복 판정(정규화 규칙)·길이 제한·오류 Code | §9 Write Owner(기존 LearnersHigh 학적과 충돌 여부, OD-A04) |
| MM-64 | 기존 과목 카탈로그 제공 여부 — 학교 개설 과목 목록이 없으면 현재처럼 "다른 학기에서 쓰던 과목"만 후보 | 기존 LearnersHigh 과목 데이터 (integration-boundary) |
| MM-65 | SubjectRef 출처 필드(학교 개설 / 학생 추가) | 평가계획서 PDF 분석 과목 매칭(§11)과 같은 과목 ID 공간인지 |
| MM-66 | 과목 이름 변경·삭제 정책 — 연결된 수행평가·심화 탐구·노트·성장 기록이 있는 과목의 처리(보관·병합·숨김) | domain.md OD (학업 정보 변경 시 기록 보존) |
| 운영 | 학생 추가 과목이 관리자 화면(Assessment 현황·피드백)에 어떻게 보이는지 | Admin Assessment (assessment-admin.md) |

## P-27. Admin Assessment Stage 1 공통 데이터·계약 보완 (2026-10-29, Admin 구현 중 확인)

상태: **PROPOSED — 적용하지 않음.** P-22~P-26 상태는 바꾸지 않는다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| 공유 위치 | Student Canonical Fixture·Type을 `frontend/shared/assessment/`로 옮기고 Admin·Student가 같은 곳을 import (assessment-frontend-mock.md §4-2 A안). 그전까지 Admin은 `api/canonicalSource.ts`·`components/canonicalUi.ts` 두 파일에서만 Student 경로를 import (B안, 임시) | OWNERSHIP §10-4 Shared 승격 기준, Wangyu 리뷰 |
| 학생 식별 | Student Fixture에 studentId가 없어 Admin Mock이 `student_001`로 연결. 공유 Fixture로 옮길 때 학생·지점 ID를 Fixture에 넣을지 | domain.md §25, API-OD-A01 |
| §34 | 학생 목록 행 Shape(학교·학년·활동 요약·다가오는 마감·최근 기록)와 기록 단건 조회(`GET .../students/{id}/school-assessments/{assessmentId}` 등) | MM-55 |
| §36 | `previewSupported` 판정 규칙 (Stage 1은 PDF·이미지만 true) | API-OD-A03 |
| §38·39 | `analysisStatus`(NOT_REQUESTED·PROCESSING·REVIEW_REQUIRED·COMPLETED·FAILED)·`reviewStatus`(UNREVIEWED·CONFIRMED) Enum, 검토 저장(SAVE)과 확정(CONFIRM) 구분 | MM-45, API-OD-A02 |
| §41 | 탐구 유형·난이도·문제 상황, 대학 문항(`relatedExamQuestionIds`)·참고자료원(`referenceSourceIds`) 연결 필드, 공개 DTO(§16)에 어디까지 노출할지 | API-OD-A12, P-25 |
| §42 | 발행 기관·공식 주소·확인일·이용 조건 필드와 "주소·확인일 없으면 공개 불가" 규칙 | API-OD-A11 |
| §43·46 | 스크랩 `referenceSourceId`, 추천 전달 Projection(`title`·`url`) — Stage 1은 `note` 문장에 제목·주소만 담는다 (scrapId·관리자 메모 비노출) | §46 |
| Shell | AdminShell Extension Entry `assessment` 1개 + `App.tsx` `/assessment` 접두어 분기 (Wangyu 리뷰 필요, 최신 main의 학생 케어 1·2·3·5 Entry와 Merge 시 같은 배열 수정) | frontend-admin §20 |
| Dev | `admin/vite.config.ts` dev Proxy `/__dev/university-exams` → Student 개발 서버 (Build 영향 없음) | P-25 |

## P-28. Admin "학생 화면 그대로 보기"(읽기 전용) 구조 (2026-10-29, 요청 ⑦·⑧ 구현 중 확인)

상태: **PROPOSED — 팀 승인 전.** P-22~P-27 상태는 바꾸지 않는다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| 요청 ⑧ | Student Assessment Route Tree를 Admin에서 `createMemoryRouter`로 그대로 렌더링 (`student/.../routes/AssessmentReadOnlyViewer.tsx`). Admin 주소 관리(adminLocation)는 바꾸지 않고 Router는 Viewer 안에서만 산다. Admin 주소 `/assessment/students/{id}/view?path=` | frontend-admin §20 Router 교체 금지와 충돌 여부 (교체 아님, Wangyu 리뷰 필요) |
| 쓰기 차단 | `api/viewMode.ts`: 모드 `student`(기본)·`admin-readonly`. Student의 모든 쓰기 API 함수(19개)가 `guardWrite`를 먼저 지나 읽기 전용이면 403 `READ_ONLY_VIEW`로 거절 (Mock Store·서버 호출 없음). 쓰기 진입 버튼·Modal(7종)은 읽기 전용에서 그리지 않거나 안내 Modal로 바꾼다 | Stage 2 서버 인가가 별도로 필요 (화면 차단 ≠ 권한 검증) |
| 데이터 | Admin Read-only Adapter(`getStudentViewSnapshot`)가 담당 범위 검사(403/404) 뒤 한 학생 기록만 Admin 번들의 Student Mock Store 사본에 넣는다 (`readOnlyViewStore.ts`). 학생 Session 생성·위조 없음. 학생 전환 시 조회 Cache(`clearApiQueryCache`) 비움 | 계약: Admin이 학생 화면용 Student DTO를 받는 Endpoint 형태 (§34~36 확장 또는 별도) |
| 노트 | 읽기 전용 노트는 Student 블록 렌더러(`NoteBlocksView`) + Revision 선택(§21 GET) (`NoteReadOnlyView.tsx`) | OD-A05 블록 Schema |
| PdfViewer | `blob:` 주소는 HEAD 확인을 건너뛰고, `expectedPageCount=0`이면 쪽 수 비교 안내를 끈다 (Admin AI 분석 화면의 로컬 PDF 미리보기용) | Student 대학별 자료 화면 동작 변화 없음 |

## P-29. Admin 다학교 시연 데이터 (2026-10-29, 요청 ② 구현)

상태: **PROPOSED (Stage 1 Mock 전용).** 합성 데이터이며 실존 학교·학생·평가정보가 아니다.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| 요청 ② | `admin/.../api/mock/adminDemoFixture.ts`: 6개 학교(1곳은 다른 지점 → 403 확인용) × 7명 = 42명, 학년 1~3, 2025·2026 학년도 학기별 4~6과목, 수행평가·노트 Revision·결과물 버전·피드백·심화 탐구·성장 기록. 고정 시드, `demo_` 접두 ID | Student Canonical(student_001) ID·값 불변, Student 앱 데이터와 동기화 없음 |
| §34 | 학생 목록 필터 `term`(학년도·학기)·`subjectName`·`status`와 필터 선택지 Endpoint(가칭 `GET .../students/filter-options`) | §34 Query 확정 필요 |

## P-30. 모의고사 지문 원문 관리 (2026-10-29, 요청 ③ 구현)

상태: **PROPOSED.** API-OD-A11(저작권) 미결.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| 요청 ③ | 관리자 Record에 `adminPassage {text, origin(NONE·LOCAL_FILE·ADMIN_INPUT), updatedAt, aiTransferAllowed}` (최대 20,000자). 학생 공개 Shape(`material.research.passage`)과 분리해 자동 공개하지 않음 | §40 필드 추가, 저장소(서버) 미정 |
| 저장 | Stage 1은 Admin 메모리에만 (Git Fixture·브라우저 저장소에 쓰지 않음). 기존 `*.local.json` 원문은 시작값으로만 읽음 | P-24 로컬 원문 정책 유지 |
| UI | 내부 소재 ID(EN-06 등)는 목록·상세·폼·미리보기에 표시하지 않음 (검색·수정·연결에는 그대로 사용) | — |

## P-31. Assessment AI 분석 3종 Backend·계약 (2026-10-29, 요청 ⑨ 구현)

상태: **PROPOSED — API-OD-A10(AI Provider·비용·재시도), Existing Authentication 미결.** 기본값은 Provider 미연결.

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| Endpoint | api-contract.md §47-A (PROPOSED) 4개: status, evaluation-plan-analyses, university-exam-analyses, mock-exam-analyses | §38·39 기존 평가계획서 분석 계약과의 관계(같은 Job으로 합칠지) |
| Package | AI Provider Interface 위치를 `assessment/integration/ai/`로 제안 (overview.md §6 "Interface Package 위치 미확정") | overview.md 갱신은 팀 승인 후 |
| Provider | `com.anthropic:anthropic-java:3.2.0`(공식 SDK), 모델 `claude-opus-5-5`, Structured Output. `assessment.ai.provider=anthropic` + `ANTHROPIC_API_KEY`일 때만 켜짐 | 비용·재시도·학생 자료 외부 전송 정책 (API-OD-A10) |
| PDF | PDFBox 3.0.5로 쪽별 텍스트 추출, OCR 없음(이미지형 PDF는 422 `PDF_TEXT_NOT_FOUND`), 20MB·120쪽 제한 | API-OD-A03 Storage와 무관(파일 저장 안 함) |
| 검증 | AI 결과는 원문 텍스트와 서버에서 다시 대조(근거 문장·쪽 범위·숫자), 합계 불일치 자동 보정 없음, 성공 응답은 항상 `REVIEW_REQUIRED` | — |
| 중복 | `Idempotency-Key` 메모리 보관(재시작 시 사라짐) | §51 Idempotency |
| 인증 | Admin 인증·권한 검증 없음 → **운영 환경에서 켜지 말 것** | common/auth 미구현 |
| 설정 | `application.yml` multipart 한도(100MB, 20MB 초과는 Service가 413) | 공통 설정 변경 — Wangyu 리뷰 |

## P-32. 참고자료실 자료원 1 : 개별 참고자료 N (2026-10-29, 요청 ⑤ 구현)

상태: **PROPOSED.**

| 근거 | 제안 | 겹침 확인 |
|---|---|---|
| 요청 ⑤ | 스크랩 = 개별 참고자료(ReferenceItem, `scrapId`). 자료원(`referenceSourceId`)당 여러 개 저장. 같은 주소만 409 중복 | §43 |
| 필드 | `authorOrOrg`·`publishedDate`·`relatedCatalogTaskIds`·`relatedMaterialIds` | §43 필드 추가 |

---

# 2026-11-03 범위 변경에 따른 Shared 변경안 (P-33~P-40)

> 상태: **PROPOSED — 적용하지 않음.** 근거 결정: 2026-11-03 사용자 결정(① PDF Schema 통합 방향, ② 대학·모의고사 AI 분석 제외, ③ 콘텐츠 즐겨찾기 제외, ④ 추천은 콘텐츠 링크, ⑤ 학생 PDF 외부 전송 조건부). Suyeon 소유 문서는 이미 반영했다(`progress.md` 2026-11-03).
> 기존 제안 상태 변경: **P-16**(심화 응답 Shape)·**P-25**의 Task 연계 부분·**P-30**(관리자 원문 입력)은 `WITHDRAWN (2026-11-03 범위 변경)`으로 본다. **P-24**의 60선 열람·**P-25**의 PDF 열람 부분은 정적 콘텐츠로 유지한다. **P-31**은 평가계획서 부분만 P-35·P-39로 통합하고 대학·모의고사 분석은 범위 제외. **P-32**의 `relatedCatalogTaskIds`는 제거 또는 `relatedContentIds`로 교체 결정 필요.

## P-33. `.gitignore` — 원문 보호 (P-09 포함)

**현재 (2026-11-03 확인):** `references/mock-exam/`(236KB, 모의고사 원문 지문 전체 포함)와 `references/previous-exam-questions/`(PDF 27개, 13MB)는 Untracked이고 `git check-ignore` 결과 **ignore되지 않는다.** `git add references/`나 `git add -A` 한 번으로 공개 Repository에 들어갈 수 있다. 또 `.gitignore` §14 주석은 `references/**`를 "version-controlled 유지"로 적고 있어 이 제안과 충돌한다.

**Patch**

```diff
@@ 7. Backend — Spring Boot / Java
 # Compiled Java
 *.class
+
+# IDE(Eclipse/VS Code Java) output
+backend/bin/
@@ 13. Misc temporary / backup files
 *.bak
 *.backup
+
+# ------------------------------------------------------------
+# 13-1. Copyright-unverified source materials (local only)
+# ------------------------------------------------------------
+# 재배포 권한이 확인되지 않은 원문. Manifest·생성 Fixture(원문 제외)만 추적한다.
+references/mock-exam/
+references/previous-exam-questions/
+references/evaluation-plans/
@@ 14. Keep important project artifacts tracked
 # docs/**
-# references/**
+# references/** (13-1의 원문 폴더 제외)
 # database/migrations/**
```

- `references/evaluation-plans/`는 PDF 분석 Golden Corpus 로컬 폴더 제안(`assessment-pdf-analysis-plan.md` §8-1). 아직 없음.
- `references/claude-design-mockup/LearnersHighAssessment/`(25MB)·`references/design/`(7.7MB)·`references/reference-link/`도 Untracked다. 이것들을 추적할지(팀 공유 Mockup)는 별도 결정이며 이 Patch에 넣지 않았다.
- 확인: 적용 후 `git check-ignore -v references/mock-exam/LearnersHigh_Mock_Exam_60_Research_Materials.md`와 대학 PDF 하나가 규칙을 출력해야 한다. `universityExamManifest.json`·`npm run exam-manifest`는 로컬 파일을 읽기만 하므로 영향 없음.

## P-34. ADR-0011 초안 — 심화 탐구를 읽기 전용 정적 콘텐츠로 축소

번호: ADR-0001~0009는 파일이 있고, **ADR-0010은 P-05(Frontend Routing, Proposed)가 예약**했다. 따라서 이 ADR은 **0011**, PDF 분석 아키텍처(P-39)는 **0012**를 제안한다. `docs/adr/README.md`의 "Superseded by ADR-0010"은 형식 예시라 실제 예약이 아니다.

```markdown
# ADR-0011: Reduce Enrichment to Read-only Static Content; Prioritize Evaluation-plan Analysis

- Status: Proposed
- Date: 2026-11-03
- Amends: ADR-0008 Decision 3·4 (심화 탐구 / 심화 Task·모의고사 탐구 소재·대학 공개 자료 운영 부분만)
- Related: ADR-0009 (피드백 대상 범위 축소에 따른 주석)

## Context
- ADR-0008은 학생 심화 탐구(개인 Task)와 Admin 심화 콘텐츠 운영을 Assessment 범위에 넣었다.
- 2026-11-03 범위 결정: 학교 평가계획서 PDF 분석을 실제 Backend·AI 구현의 핵심으로 삼고, 심화 탐구는 교육용 예시 콘텐츠로 축소한다.
- 현재 심화 기능은 전부 Frontend Mock이며 Backend·DB·Migration이 없다(지울 저장 데이터 없음).

## Decision
1. 심화 탐구(탐구 콘텐츠·모의고사 60선·대학 공개자료)는 Frontend 정적 콘텐츠다. Backend·DB·API를 만들지 않는다. Student·Admin 모두 읽기 전용이며 같은 데이터를 쓴다.
2. 개인 EnrichmentTask(생성·시작·상태·전용 노트/결과물/피드백), 개인 모의고사 지문 등록, 자료 → Task 생성, 콘텐츠 즐겨찾기, 심화 KPI, Admin 콘텐츠 CRUD·공개 상태는 폐기한다.
3. 대학 기출·모의고사 AI 분석은 신규 범위에서 제외한다. 원문을 외부 AI에 보내지 않는다.
4. 노트·NoteRevision·ArtifactVersion·FeedbackSnapshot은 학교 수행평가 기능으로 그대로 유지한다. 노트 EXAM_SOURCE 출처 블록과 대학 PDF 뷰어도 유지한다.
5. 피드백 추천의 심화 항목은 정적 콘텐츠 상세 링크로 바꾼다(새 Entity 없음).
6. 학교 평가계획서 분석의 데이터 계층(원본·AI 후보·근거/검증·관리자 확정·학생 개인)을 분리한다. 기술 구조는 ADR-0012에서 정한다.

## Consequences
- 기능 ID(ST-07·16·17, AD-06·09·10)는 유지하고 의미를 "열람"으로 바꾼다.
- api-contract.md §16~18·27·40~42 DEPRECATED, sourceType에서 ENRICHMENT_TASK 제거(P-35).
- Frontend 코드에서 Task 관련 화면·Mock·타입 값을 정리해야 한다(features/assessment-enrichment-content.md §10).
- 콘텐츠 수정은 코드 PR로만 한다.
```

ADR-0008·0009 본문은 고치지 않고 상태 줄만 추가한다.

```diff
 # docs/adr/0008-rebuild-suyeon-features-as-assessment.md
 - Status: Accepted
+- Amended by: ADR-0011 (심화 탐구 범위 — Decision 3·4의 해당 부분)
 # docs/adr/0009-snapshot-based-assessment-feedback.md
 - Status: Accepted
+- Note: ADR-0011 이후 피드백 요청 대상은 학교 수행평가만이다(심화 탐구 Task 폐기). 공용 요청함·Snapshot 결정은 그대로다.
```

`docs/adr/README.md` 목록에 0011(Proposed) 행 추가. ADR-0008·0009의 실제 팀 승인 여부는 계속 확인 필요.

## P-35. `api-contract.md` 개정안

**① 평가계획서 분석 Schema 통합 (§11·§39 ← §47-A)**

```diff
 # 11. Student — 평가계획서 분석·개인 검토 (ST-02)
-완료된 결과 형식의 최소 예(일부만 예시; 원본의 없는 값은 `null`):
+완료된 결과 형식 (§11·§39 공통 결과 Schema, 2026-11-03 통합안 — §47-A의 근거·검증 개념 흡수):
+
+모든 값 필드는 Field<T> = { "value": T|null, "presence": "FOUND|NOT_IN_DOCUMENT|UNREADABLE",
+  "evidence": { "pdfPage": 9, "printedPage": "7", "quote": "…(≤80자)" } | null,
+  "verification": { "verified": true, "reason": null } }
+
+subjects[]: subjectName, pageRange{from,to}, segmentStatus(SUCCEEDED|FAILED),
+  teachingPlan[]{ period, unit, standards[], activities, assessmentMethod },
+  writtenEvaluation{ totalWeight, exams[]{ round, format[], weight, maxScore, timing } },
+  performanceEvaluation{ totalWeight, items[]{ itemKey, name, area, type, timing, weight, maxScore,
+     content, standards[], criteria[], rubric{ elements[]{ name, levels[]{label,description,score} }, cautions[] } } },
+  achievement{ system, levels[], thresholds[] }, warnings[]
+분석 응답 최상위: analysisId, documentRevisionId, status, provider, model, sourceSha256, startedAt, completedAt, subjects[]
```

- `status` 후보: `NOT_REQUESTED | QUEUED | PROCESSING | REVIEW_REQUIRED | PARTIAL | FAILED` (API-OD-A02에서 확정)
- §39 `review`: `confirmedFields[]`에 `candidateRef`(근거 후보) 추가, `decision=CONFIRM`은 그대로. 개정본 확정 시 이전 확정본 `SUPERSEDED` 표시 문장 추가.
- 과목 단위 재시도: `POST …/analysis/subjects/{subjectSegmentId}/retry` 후보 (Idempotency-Key §51).
- §10-2: 학생 개인 PDF 분석 요청은 API-OD-A13(신설) 해결 전 `422 AI_TRANSFER_NOT_ALLOWED`(기존 §47-A 오류 코드 재사용) 반환 문장 추가.
- §47-A: `/evaluation-plan-analyses`는 "§38·39로 이관 예정", `/university-exam-analyses`·`/mock-exam-analyses`는 `OUT_OF_SCOPE (2026-11-03)`로 표기. `/status`는 유지 검토.
- 필드명은 이 Patch 승인 시 확정. 현행 Student Mock `types.ts`와 Backend `AiSchemas.java`는 그 다음 구현 단계에서 맞춘다.

**② 심화 계약 DEPRECATED (삭제하지 않음)**

```diff
-# 16. Student — 심화 탐구 공개 콘텐츠 (ST-16)
+# 16. (DEPRECATED 2026-11-03, ADR-0011) Student — 심화 탐구 공개 콘텐츠 (ST-16)
+> 정적 Frontend 콘텐츠로 대체. Endpoint를 구현하지 않는다. 기준: features/assessment-enrichment-content.md
```

같은 방식: §17(개인 자료 포함 전체), §18, §27, §40, §41, §42. §53의 `ENRICHMENT_TASK_NOT_FOUND`는 DEPRECATED 표기. §62 Inventory 해당 행에 `DEPRECATED`.

**③ `sourceType` 축소** — §20·§24·§29·§30·§31 예시와 설명에서 `ENRICHMENT_TASK`를 제거하고 `SCHOOL_ASSESSMENT`만 남긴다. §30 즐겨찾기 대상 = `SCHOOL_ASSESSMENT`만(심화 콘텐츠 즐겨찾기 제외 결정).

**④ §46 추천**

```diff
-    { "type": "ENRICHMENT_TASK", "catalogTaskId": "catalog_001", "note": "추가 조사를 해볼 수 있어요." }
+    { "type": "ENRICHMENT_CONTENT", "contentId": "catalog_001", "note": "관련 탐구 사례를 읽어보세요." }
```

`contentId`는 정적 콘텐츠 ID 문자열. 서버는 형식(길이·문자)만 검사하고 존재는 검증하지 않는다(정적 데이터는 Frontend에만 있음). 새 Entity 없음.

**⑤ §47 KPI** — 심화 활동 카운트 제거. **⑥ §61** — API-OD-A02에 "§9-0 5계층·Schema 통합 방향은 결정(2026-11-03)" 추가, API-OD-A11은 "정적 콘텐츠 원문 제공 방식"만 남김, API-OD-A12의 콘텐츠 공개 Enum·`sourceReference` 부분 종결 표시, **API-OD-A13 신설**(학생 PDF 외부 전송 선결 조건 = domain OD-A13). §65 Student Care는 변경 없음.

## P-36. `docs/architecture/**`

| 파일:줄 | 현재 | 변경안 |
|---|---|---|
| `overview.md:94`·`:121` | 심화 탐구 / 심화 탐구 콘텐츠·모의고사 탐구 소재·대학 공개 자료 (운영) | "심화 탐구 콘텐츠 (읽기 전용)" |
| `overview.md:338`·`:347~350`·`:390~393`·`:415`·`:653` | `EnrichmentTask`, `EnrichmentContent` 개념·Publish 흐름 | 개념 제거, "정적 콘텐츠는 Domain 밖" 1문장 |
| `overview.md` §6 | AI Interface Package 위치 미확정 | `assessment/integration/ai/`(P-31) + 평가계획서 분석 구성 요소(PageMap·Segment·Extract·Verify·Job) — ADR-0012 승인 후 |
| `integration-boundary.md:18`·`:168`·`:296`·`:403`·`:549`·`:874` | 자율 심화 탐구 / EnrichmentTask / Admin Enrichment Content | 제거·"읽기 전용 정적 콘텐츠"로 교체 |
| `integration-boundary.md` (File Storage·AI 절) | 미정 | 평가계획서 원본 저장 경계, **학생 개인 PDF 외부 전송은 OD-A13 해결 전 금지** 명시 |
| `shared-conventions.md:609`·`:1331` | `Enrichment Task List`, `publishedEnrichmentTaskCount` 예시 | 다른 예시로 교체 또는 삭제 |

## P-37. 최상위 문서·`.claude/rules` 문구 (최소 수정)

| 파일:줄 | 현재 | 변경안 |
|---|---|---|
| `CLAUDE.md:150` | `├─ 심화 탐구 / 자료함 / 성장 기록 / 보관함` | `├─ 심화 탐구 콘텐츠 열람(읽기 전용) / 자료함 / 성장 기록 / 보관함` |
| `CLAUDE.md:157` | `├─ 심화 탐구 콘텐츠 관리` | `├─ 심화 탐구 콘텐츠 열람(읽기 전용)` |
| `CLAUDE.md:267`·`:276` (§10) | `SchoolAssessment / EnrichmentTask (서로 다른 업무 개념)`, "학교 수행평가와 자율 심화 탐구도 … 강제 병합하지 않는다" | `SchoolAssessment / FeedbackRequest` 예시로 교체, 두 번째 문장 삭제 |
| `CLAUDE.md` §5 문서 목록 | Feature Spec 4종 | `features/assessment-enrichment-content.md`, `assessment-pdf-analysis-plan.md` 추가 |
| `CLAUDE.md` §17 표 | ADR-0009까지 | `ADR-0011 심화 탐구 축소 — Proposed` 행 추가 |
| `AGENTS.md`·`README.md`(9곳)·`ARCHITECTURE.md:132` | 같은 표현 | 같은 원칙으로 교체 |
| `docs/SOURCE_OF_TRUTH.md:423`·`:428` | 심화 탐구 / 심화 탐구 콘텐츠 / 참고자료 관리 | "심화 탐구 콘텐츠(열람)", "참고자료 관리" |
| `docs/OWNERSHIP.md:80`·`:86`·`:108~120`·`:296`·`:797` | 자율 심화 탐구 Task, `EnrichmentTask / AssessmentNote` | "읽기 전용 심화 콘텐츠", `AssessmentNote`만. §3-2 관련 Spec에 enrichment-content 추가 |
| `.claude/rules/backend.md:68`·`:162`·`:189` | `SchoolAssessment / EnrichmentTask` | `SchoolAssessment` |
| `.claude/rules/common.md:148` | `SchoolAssessment·EnrichmentTask·파일 버전의 임의 중복` | `SchoolAssessment·파일 버전의 임의 중복` |
| `.claude/rules/database.md:113`·`:201` | 자율 심화 탐구 상태, `EnrichmentTask` | 제거, 평가계획서 계층(domain §9-0) 테이블 후보 언급 |
| `.claude/rules/frontend-admin.md:59~61`·`:92`·`:125`·§14(`:131~`) | 심화 Task 유형·콘텐츠 관리 | 학교 수행평가만, §14 → "심화 콘텐츠 열람(읽기 전용)" |
| `.claude/rules/frontend-student.md:18`·`:72`·`:78`·§8(`:105~110`)·`:146`·§13(`:148~150`) | EnrichmentTask 상태·시작·출처 | 정적 콘텐츠 열람 규칙으로 교체, `EXAM_SOURCE`·PDF 뷰어 보호 명시 |
| `.claude/rules/testing.md:113`·`:139~140`·`:208` | `SchoolAssessment / EnrichmentTask 구분`, 심화 Task 공개 → 개인 Task 시작 E2E | "평가계획서 원본·후보·확정·학생 정정 분리", E2E Flow를 "Admin 평가계획서 확정 → Student 반영·중복 확인"으로 교체, PDF 정확도 회귀(Golden Corpus, 로컬) 추가 |
| `scripts/verify.ps1` (P-01과 함께) | 필수 Spec 4종 | `assessment-enrichment-content.md` 추가 |

Wangyu 관련 문장(Student Care·상담)은 바꾸지 않는다.

## P-38. 정적 심화 콘텐츠 단일 원본 위치

P-07(`frontend/shared/assessment/`) 승인 시 하위에 `content/`를 둔다.

```text
frontend/shared/assessment/content/
├─ types.ts                        # EnrichmentArticle (features/assessment-enrichment-content.md §5)
├─ topics.ts                       # 탐구 콘텐츠 (현 enrichmentFixture.ts fixtureCatalog에서 이전)
├─ mockExam/research.generated.ts  # 현 mockExamResearchFixture.ts (생성 Script 유지, 원문 없음)
├─ mockExam/articles.ts            # LH 보강 설명 (생성 파일과 분리)
├─ university/manifest.json        # 현 universityExamManifest.json
└─ index.ts                        # 읽기 함수만 export
```

- 승인 전 임시: `frontend/student/src/features/assessment/content/` + Admin은 기존 `canonicalSource.ts` 상대 경로(현행 4-2 B, 새 복제 금지).
- `universityExamPdfDevServer.ts`(Student tools, Admin `vite.config.ts`가 사용)는 Manifest 경로만 바뀐다.
- workspace/alias 설정 변경은 Shared(Wangyu 리뷰).

## P-39. ADR-0012 (결정 후 작성) — 평가계획서 PDF 분석 아키텍처

결정할 항목: Provider·모델·비용 상한(API-OD-A10), 표·스캔 처리(텍스트 / 페이지 이미지 입력 / OCR / 외부 서비스 / Python 분리), 비동기 Job 방식, 파일 저장소(API-OD-A03), 결과 저장 테이블(DB Migration — Shared), Idempotency 저장, 인증 연결. 근거 자료: `assessment-pdf-analysis-plan.md` §6~§8, Golden Corpus 측정 결과. **측정 전에 쓰지 않는다.**

## P-40. 이미 적용된 미커밋 Shared 변경의 승인 확인

| 변경 (git status `M`) | 관련 제안 | 승인 기록 | 필요한 조치 |
|---|---|---|---|
| `frontend/admin/src/App.tsx`, `app/AdminShell.tsx`(+206줄), `app/AdminShell.module.css` | P-06 (Wangyu 동의 필수) | **없음** | Wangyu 확인 + Student Care E2E 7개 실행 후 커밋 |
| `frontend/admin/vite.config.ts` (dev PDF 서버) | P-25 | 없음 | 확인 |
| `backend/src/main/resources/application.yml` (multipart 전역 100MB, `assessment.ai.*`) | P-31 | 없음 | Wangyu 리뷰 — 전역 한도가 Student Care 업로드에도 적용됨 |
| `backend/build.gradle.kts` (pdfbox 3.0.5, anthropic-java 3.2.0) | P-31 | 없음 | 의존성 추가 승인. Provider 미결(API-OD-A10)과 함께 판단 |
| 공통 문서·`.claude/rules`·ADR 0001~0005·README 등 다수 `M` | 1차 하네스 정비 | 이 문서의 P-01~P-14 | 기존 절차대로 |

이 변경들은 이번 작업에서 **건드리지 않았다.**
