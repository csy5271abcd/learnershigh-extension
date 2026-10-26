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
