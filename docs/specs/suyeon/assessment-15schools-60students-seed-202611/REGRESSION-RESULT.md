# 회귀·자동화 테스트 결과

> 2026-11-12 실제 실행한 것만 적는다. 실행하지 않은 테스트는 PASS로 적지 않는다.

## 1. Backend

| 테스트 | 명령 | 결과 |
|---|---|---|
| 단위 전체(Docker 없음) | `gradlew test --rerun-tasks` | **272/272 PASS** (32 클래스, Student Care 145건 포함) |
| 신규 `DemoRosterTest` | 위에 포함 | 8/8 |
| 신규 `DemoRosterWiringTest`(실제 Spring Context, 플래그 ON/OFF/비 mock) | 위에 포함 | 3/3 — 첫 실행에서 플래그 ON 시작 실패 결함 발견 → 수정 후 통과 |
| ArchUnit `ArchitectureTest` | 위에 포함 | 8/8 (Existing Client는 common에만, Controller→Entity 금지 등) |
| Integration 전체(Testcontainers MySQL) | `gradlew integrationTest` | **144/144 PASS** (25 클래스, Student Care 77건 포함, 6분 10초). `SchoolAssessmentApiTest`의 §9-1 응답 검사 포함 |

## 2. Frontend

| 테스트 | 결과 |
|---|---|
| `npm run typecheck --workspaces` | PASS |
| `oxlint --deny-warnings` (Student·Admin) | PASS |
| `npm run build` Student·Admin | PASS (청크 크기 경고만) |
| Unit/Component Test | 프레임워크 없음(미확정, 추가하지 않음) |

## 3. 실데이터·화면

| 테스트 | 결과 |
|---|---|
| Seed 내장 검사 / 재실행 생성 0 | 1333/1333 · 생성 0 |
| `verify-seed.mjs` (권한·카탈로그·정합성·보존) | 833/833 |
| 관리자 화면 4계정 | 44/44 |
| 학생 화면 6명 | 77/77 |

## 4. 기존 기능 회귀

| 대상 | 방법 | 결과 |
|---|---|---|
| 기존 시연 데이터·화면(`stu_001` / `adm_demo_gangnam`): 수행평가·노트·결과물 PDF/PNG·비교·피드백·성장 기록·학생 자료함·중요 표시·휴지통·관리자 학생 기록·피드백·관리자 참고자료실·학생 화면 보기 | 이전 스크립트 `assessment-seed-and-ui-verification-202611/scripts/seed-ui-verification-e2e.mjs` (Backend 8080, 검증용 서버 5196/5188) | **38/38** (`regression/ui.json`) |
| 정적 심화 탐구(탐구 라이브러리·모의고사·대학 PDF·참고자료원, Admin·Student) | `admin-enrichment-static-e2e.mjs ... on` | **36/36** (`regression/static.json`) |
| 기존 Seed Manifest(`assessment-seed-and-ui-verification-202611/seed-manifest.json`) ID | `verify-seed.mjs` 보존 영역 | 수행평가 4·피드백·성장 기록 존재, `stu_001` 수강 과목 `subj_01~04` 그대로 |
| 기존 Mock 관리자 범위 | API | `adm_demo_gangnam` 10명·`adm_gangnam`·`adm_bundang` 그대로, 시연 학생 없음 |
| Student Care (실행 중 Backend, 플래그 ON) | `GET /api/admin/student-care/branches`, `board?branchId=` | 지점 2개(강남 10·분당 3) 그대로, `br_demo_a` → 404 `BRANCH_NOT_FOUND`(시연 명단 미노출) |
| Student Care 코드·API·DB | Git 상태 | 변경 없음 |

## 5. 실행하지 않은 것

- Student Care Playwright E2E(`e2e/`): e2e Profile Backend·test endpoint가 필요해 실행하지 않음. 위 단위 145건·Integration 77건과 실행 API 확인으로 대신함.
- MySQL 직접 SQL 대조: 자격증명을 읽지 않는 원칙으로 실행하지 않음(모든 수치는 API 재조회).
- `scripts/verify.ps1` 전체: 개별 명령으로 나눠 실행(위 표).
