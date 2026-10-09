# AGENTS.md — LearnersHigh Extension

> 모든 AI Coding Agent(Claude Code, Codex, Cursor, Copilot 등)가 공통으로 따르는 진입점이다.  
> 상세 규칙은 반복하지 않고 링크한다. Claude Code 전용 규칙은 [`CLAUDE.md`](CLAUDE.md)와 [`.claude/rules/`](.claude/rules/)에 있다.  
> 이 파일과 `CLAUDE.md`가 다르게 읽히면 `CLAUDE.md`를 우선하고, 충돌을 보고한다.

## 1. 이 Repository는 무엇인가

기존 LearnersHigh 위에 신규 확장 기능을 붙이는 Repository다. 기존 기능을 다시 만들지 않는다.

```text
Existing LearnersHigh (재구현 금지: Timer / Plan / Library / History / Report / Statistics / 수행평가 / Study Room)
        │
        ▼
Integration Boundary (Adapter / Anti-Corruption Layer)
        │
        ├─ Mentor Hub            (Suyeon)
        ├─ School & Admissions   (Suyeon)
        ├─ Student Management    (Suyeon)
        ├─ Parent Progress       (Suyeon)
        └─ Counseling 등          (Wangyu)
```

구조 설명은 [`ARCHITECTURE.md`](ARCHITECTURE.md)를 본다.

## 2. 현재 단계

**Scaffold 단계**다. `frontend/`(student / admin / mentor App Shell)와 `backend/`(Spring Boot + Gradle Wrapper)가 있고, Feature Business Logic은 아직 없다. `database/`, `e2e/`, `frontend/shared/`는 아직 없다.

- 진행 상태: [`docs/specs/suyeon/progress.md`](docs/specs/suyeon/progress.md)
- Build / Test 명령은 [`README.md`](README.md) §22와 실제 `package.json` / `build.gradle.kts`를 따른다. 추측하지 않는다.

## 3. 작업 전 읽기 순서

```text
1. docs/SOURCE_OF_TRUTH.md          — 어떤 문서가 무엇의 기준인가
2. docs/OWNERSHIP.md                — 누구의 영역인가
3. docs/specs/<owner>/features/*.md — 기능 동작
4. docs/specs/<owner>/domain.md     — Entity / State
5. docs/api/api-contract.md         — 관련 구간
```

작업 종류별 추가 문서:

| 작업 | 추가로 읽을 문서 |
|---|---|
| 기존 LearnersHigh 연결 | `docs/architecture/integration-boundary.md`, `docs/product/existing-runners-high-analysis.md` |
| 신규 UI | `docs/design/tds-web-guidelines.md`, `references/claude-design-mockup/` |
| Architecture 변경 | `docs/architecture/overview.md`, `docs/architecture/shared-conventions.md`, `docs/adr/` |
| Backend | `.claude/rules/backend.md`, `.claude/rules/database.md` |
| Frontend | `.claude/rules/frontend-{student,admin,mentor}.md` |
| Test / 완료 판단 | `.claude/rules/testing.md` |

## 4. 작업 순서

```text
Requirement → Ownership → Domain → 기존 기능 중복 확인
→ API Contract 수정 → Backend → Frontend State/API → Screen
→ Loading / Empty / Error → Cross-Surface 확인 → Test → Visual Polish
```

`api-contract.md`에 없는 Endpoint / JSON Shape을 코드에 먼저 만들지 않는다.

## 5. 절대 규칙 (요약)

- **Ownership**: 코드 폴더는 Feature / Domain 기준. `suyeon/`, `wangyu/`, `ext/` 폴더 금지. 다른 담당자 Feature는 합의 없이 수정하지 않는다.
- **Counseling**: 상담 관련 Entity / API / DB / UI는 전부 Wangyu 영역. Suyeon 영역에는 Contract만 둔다.
- **One Entity, Many Views**: Student / Admin / Parent View마다 Task·Student·Mentor를 복제하지 않는다. Dashboard Counter도 Source Entity에서 계산한다.
- **Do Not Guess**: 기존 LearnersHigh API / DB / Auth / PK Type, 미정 Enum / Status, Open Decision을 임의로 확정하지 않는다. 충돌 시 중단하고 보고한다.
- **Read-only**: `references/**`, `docs/source/**`는 수정 / 이동 / 삭제하지 않는다.
- **Privacy**: Mentor에게 Student 실명 / 학교 / 기관 / 상세 학습 데이터를 노출하지 않는다. Parent Report에 Raw AI, 내부 Feedback 원문, 미동의 Artifact를 넣지 않는다.
- **AI**: Analysis / Suggestion / Draft / Candidate까지만. 최종 공개 상태로 자동 전이하지 않는다.
- **Error ≠ Empty**: 연동 실패를 빈 데이터로 표시하지 않는다.
- **Tech Stack**: Frontend는 React + TypeScript + Vite / npm only / Node.js 22, Backend는 Java 21 + Spring Boot + MySQL / Gradle Wrapper only / Domain-packaged Layered MVC(ADR-0005)로 확정이다. 상태관리 / Router / Data Fetching / UI Library, Frontend Test Framework, Migration Tool은 미확정이므로 임의로 선택하지 않는다. (기준: [`ARCHITECTURE.md`](ARCHITECTURE.md) §1)

## 6. 검증

```powershell
scripts/verify.ps1            # 전체 (Harness 규칙 + Frontend + Backend)
scripts/verify-frontend.ps1
scripts/verify-backend.ps1
```

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — Scaffold가 생기면 Frontend / Backend Job이 자동 활성화된다.

실패한 검증이 있으면 완료라고 보고하지 않는다. Test를 skip해서 통과시키지 않는다.

## 7. 완료 보고 형식

```text
- 구현한 기능
- 변경 파일
- API / DB 변경 여부
- 다른 Surface / 담당자 영향
- 실행한 검증 명령과 결과 (실제 실행한 것만)
- 남은 Blocker / Open Decision
```

## 8. Commit / PR

- PR은 [`.github/pull_request_template.md`](.github/pull_request_template.md) 구조를 따른다.
- Shared 영역(`docs/api/`, `docs/architecture/`, `frontend/shared/`, `backend/**/common/`, `database/`) 변경은 양쪽 담당자 리뷰 대상이다. ([`.github/CODEOWNERS`](.github/CODEOWNERS))
- 중요한 구조 변경은 새 ADR로 기존 ADR을 Supersede한다.
