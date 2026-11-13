# 15개교·60명 합성 학생 시연 데이터 · 학년·학기 과목 카탈로그 · 다지점 관리자 — 최종 보고

> 2026-11-12. 시연 Schema `lh_demo_manual_20261111`(MySQL 3307). 모든 학생·활동은 **합성 시연 데이터**다(실제 학생·개인정보·생활기록부·공식 학교 일정 아님).
> Git Commit·Push·Merge 없음. DB 초기화·Migration 수정·기존 데이터 삭제 없음.

## 1. 결과 요약

| 요구 | 결과 |
|---|---|
| 시연 지점 | `br_demo_a`(러너스하이 시연 A지점) · `br_demo_b`(B) · `br_demo_c`(C) — 기본 OFF 플래그 `ASSESSMENT_DEMO_ROSTER_ENABLED` |
| 지점별 학생 | 각 20명 = 5개교 × 4명. A: 운정·문현·호서·인천하늘·세화 / B: 대신·한림·진양·삼각산·가좌 / C: 충무·광명·세종·한솔·제주 |
| 관리자 | `adm_demo_a01`·`adm_demo_a02` → A, `adm_demo_b01` → B, `adm_demo_c01` → C. 전 지점 계정 없음. 평가계획서 운영 권한 없음. **개발용 Mock Header 계정(실제 로그인 아님)** |
| 학생 | 60명, 학교마다 4명, 학년별 20·20·20. 학교·학년·반·번호 중복 0 |
| 수강 과목 | 학생·학기 120개 Context, 학기당 7~9과목(평균 7.57), 서로 다른 조합 44개 |
| 카탈로그 | 6개 학년·학기 162과목(10~41개/슬롯), 학교별 아님. §9-1 `catalogSubjects` DRAFT |
| 모달 | 수강 과목만 선택 · 미수강 공통 후보 비활성 표시 · 학기 전환 시 갱신 · 학교 선택 없음 · 등록 검증 유지 |
| 학교 반·번호 | §9-1 `schoolClassNumber`·`schoolStudentNumber` DRAFT → Backend·Admin 학생 상세 표시 구현. 학원 반(`className`) 불변 |
| 데이터(재조회) | 수행평가 **360**(1학기 180·2학기 180 / 완료 236·진행 중 78·시작 전 46), 노트 **60**(v2 48명), 결과물 **49개·버전 67**(36명), 피드백 요청 **36**(전달 24·관리자 초안 6·요청만 6), 성장 기록 **60**, 중요 표시 20 |
| 재실행 | 60명 전체 재실행 생성 **0건** |
| 기존 보존 | `stu_001`·`adm_demo_gangnam` 이전 시연 데이터·화면 유지, Shared 학생 Client·Student Care 코드 변경 없음 |

## 2. 관리자별 로그인(개발 Context) · 조회 검증

| 시나리오 | 계정 | 결과 |
|---|---|---|
| A | `adm_demo_a01` | 담당 A지점 20명·5개교 표시, 다른 지점 0명, 학생 상세(학교·반·번호·과목), 피드백 목록·상세, 학생 화면 보기 — **11/11** |
| B | `adm_demo_a02` | 같은 A지점 20명, A01과 같은 학생·같은 활동 집계(API) — **11/11** |
| C | `adm_demo_b01` | B지점 20명 — **11/11** |
| D | `adm_demo_c01` | C지점 20명 — **11/11** |

- 각 검증은 계정 ID로 띄운 별도 개발 서버에서 새 브라우저 Context로 실행했고, 첫 검사로 화면 상단 인증 Context가 그 계정인지 확인했다(이전 계정 데이터 미표시).
- **로그아웃 검증은 하지 못했다**: 로그인·로그아웃·Session 기능이 시스템에 없다(API-OD-A01).

## 3. 지점 간 접근 차단

- API: 관리자 4명 × (다른 지점 학생 2명 + 기존 강남 학생) × 학생 상세·학기 수행평가·수행평가 단건·성장 기록·학생 화면 보기(학업 Context·노트)·피드백 상세 + 다른 지점 피드백 **초안 저장 시도** = **80건 모두 404**(저장 없음). 피드백 목록은 담당 지점 학생만. 기존 관리자 3명 목록에 시연 학생 없음. 학생 → 다른 학생 수행평가 404.
- 화면: 다른 지점 학생 URL 직접 입력 → 기록 미표시(API 404). 단 안내 문구 없이 첫 학생이 선택되는 기존 UX(ISSUES D-3).
- 한계: Mock 인증은 Header가 곧 신원이다. 실제 인증 연결 전에는 "Header 조작으로 다른 계정 사용"을 막을 수 없다(ISSUES C-2).

## 4. 실행한 검증

| 검증 | 결과 |
|---|---|
| Backend 단위 테스트 (`gradlew test`, Docker 없음) | **272/272** (Student Care 145 포함, 신규 11) |
| Backend Integration Test (`gradlew integrationTest`, Testcontainers MySQL) | **144/144** (Student Care 77 포함) |
| ArchUnit | 8/8 |
| Frontend typecheck(전체 workspace)·oxlint(Student·Admin) | PASS |
| Seed 스크립트 내장 검사(Context·재조회·학기·Snapshot·초안 비노출·SHA-256) | 1333/1333 |
| 데이터 검증 `verify-seed.mjs` | **833/833** |
| Admin 화면 4계정 | 44/44 |
| Student 화면 6명(1·2·3학년, 일반·자사, 결과물·피드백 유무 섞음) | 77/77, 페이지 오류·API 오류 0 |
| 기존 화면 회귀(`stu_001`·`adm_demo_gangnam` 38항목, 정적 심화 탐구 36항목) | 38/38 · 36/36 |
| Student Care 실행 API(플래그 ON) | 지점 2개(강남 10·분당 3) 그대로, 시연 지점 `BRANCH_NOT_FOUND` |

Frontend 프로덕션 Build Student·Admin PASS. 미실행: Student Care Playwright E2E(별도 e2e Backend 필요), MySQL 직접 SQL 대조(자격증명 미사용 원칙). 상세 `REGRESSION-RESULT.md`.

## 5. 변경 파일

- Backend(Assessment): `integration/context/SubjectCatalog.java`(신규), `integration/roster/DemoRoster.java`·`AssessmentStudentDirectory.java`(신규), `integration/auth/MockHeaderAssessmentActorProvider.java`, `integration/context/MockAcademicContextProvider.java`·`AcademicContextRecord.java`, `dto/context/AcademicContextResponse.java`, `service/school/AcademicContextQueryService.java`, `service/record/AdminStudentQueryService.java`·`AdminStudents.java`, `service/AdminStudentScope.java`, `resources/application.yml`, 리소스 JSON 2개, 테스트 2개 + 리소스 1개
- Frontend: Student `api/types.ts`, `components/AddSchoolAssessmentModal.tsx`·`.module.css` / Admin `routes/StudentDetailRoute.tsx`
- 문서(Shared, **승인 대기**): `docs/api/api-contract.md` §9-1·§62-1-3
- 문서: `docs/specs/suyeon/progress.md`, 이 폴더 전체
- API 변경: §9-1 응답 필드 추가(DRAFT, 비파괴). DB 변경: 없음(데이터만 API로 추가)
- 다른 담당자 영향: 없음(Student Care 코드·API·DB 미변경, 동작 확인)

## 6. 남은 일 · 승인 대기

`ISSUES.md` 참고. 핵심: §9-1 DRAFT 승인(A-1), 실제 로그인(C-1·C-2), 범위 밖 URL 안내 UX(D-3), Student Care E2E(C-6), **Backend를 18080으로 재시작**(C-7: 지금 8080에서 실행 중이라 기존 5173/5174 Proxy가 502).

## 7. 문서 목록

학교·학생: `SCHOOL-INVENTORY.md` · `STUDENT-DISTRIBUTION.md` · `SYNTHETIC-STUDENTS.md`(.json) · `ACADEMIC-CONTEXT-ANALYSIS.md` · `ACADEMIC-CONTEXT-CHANGES.md`
과목: `GRADE-SEMESTER-SUBJECT-CATALOG.md` · `SUBJECT-CATALOG.json` · `SUBJECT-ENROLLMENT-MATRIX.md` · `PDF-REFERENCE-INVENTORY.md`(.json) · `ASSESSMENT-REFERENCE-SOURCES.md`(.json)
수행평가·활동: `ASSESSMENT-SEED-PLAN.md` · `SEED-MANIFEST.json` · `SEED-MANIFEST.md` · `ACTIVITY-DISTRIBUTION.md` · `DATA-VALIDATION.md`(.json)
Frontend: `ADD-ASSESSMENT-MODAL.md` · `STUDENT-UI-VERIFICATION.md` · `ADMIN-UI-VERIFICATION.md` · `CROSS-SURFACE-CHECK.md`
테스트·시연: `REGRESSION-RESULT.md` · `SCREENSHOTS.md` · `RUNBOOK.md` · `ISSUES.md` · `REPORT.md`
스크립트: `scripts/`(카탈로그·명단 생성, Seed, 검증, 화면 검증, 문서 생성, `research/` 조사)
