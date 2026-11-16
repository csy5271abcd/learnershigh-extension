# [계정 A] A20 — 최신 main(Student Care) + Assessment 통합, Mentor 레거시 정리 (2026-11-16)

> 상태 표기: **완료(실행 확인)** / **환경 실패(재실행 통과)** / **main 기존 실패(통합 무관)** / **미실행** / **차단(승인·협의 필요)**
> 작업 위치: 별도 Worktree `C:\learnershigh-assessment-integration` · 브랜치 `integration/assessment-studentcare-20261116`. 원본 `C:\learnershigh-extension`은 파일을 바꾸지 않았다.

## 결론

- 최신 `main`(Student Care X′·학부모 리포트·사진 관찰 Proxy) 위에 Assessment(A19)를 병합했다. 충돌 4파일은 양쪽 기능을 모두 남겨 해결했다. Backend·Frontend·Harness·Assessment E2E·Student Care Node 시험은 통과했다.
- Mentor 레거시: 별도 앱 `frontend/mentor`와 관리자 Mentor 화면 계층은 **통합 브랜치에서 제거를 완료**했다. 구형 관리자 데이터 계층의 Mentor 데이터, 원본 폴더의 물리적 잔재, 문서 속 Mentor 설명은 **남아 있다**(§8).
- **Student Care Playwright 인수 시험은 31/31 실패**한다. 다만 같은 Backend·같은 데이터로 **`main` 그대로의 화면에서도 31/31이 같은 오류로 실패**하므로 통합 회귀가 아니라 `main`에 이미 있던 상태다. 완규님 확인이 필요하다(§12).
- 기존 시연 DB에는 `main`의 Student Care Migration 3개가 '순서 밖'이 되어 그대로 붙이면 Flyway 검증에서 막힐 가능성이 높다. 승인 없이는 조치하지 않았고 Draft PR 차단 사항으로 둔다(§13).

## 1. 최신 main HEAD

`git fetch origin main` → `origin/main` = **`c03a1a4`**(2026-11-12, "chore: stop tracking design review artifacts…"). A19가 본 `43260e1`(10-29)보다 Student Care Commit 32개가 더 있다(X′ 단일 화면 `41594a6`, 학부모 리포트, 사진 관찰·감독관 Proxy, 210명 합성 원천 등). 이 브랜치와의 merge-base는 `d5be566`(10-14). Fetch 전후로 원본 작업 파일 변화는 없었다(미Commit 68건 그대로).

## 2. Assessment HEAD

`feature/assessment-student-integration-enhancement` = **`f858574`**(A19 보고서).

## 3. 시작 Git 상태

- 원본: 브랜치 위와 같음, Stage 없음, 미Commit 68건(수정 26·미추적 42). 작업 전 목록을 저장해 두고 마지막에 비교했다(§19).
- 원격: `https://github.com/csy5271abcd/learnershigh-extension.git`(fetch·push 같음). 원격 브랜치 13개, `integration/*` 없음.
- Worktree: 원본 1개뿐이었다.

## 4. 생성한 Worktree 및 브랜치

| 항목 | 값 |
|---|---|
| 통합 Worktree | `C:\learnershigh-assessment-integration`(경로 비어 있음 확인 후 생성) |
| 통합 브랜치 | `integration/assessment-studentcare-20261116`(로컬·원격 중복 없음 확인) — 기준 `origin/main c03a1a4` |
| 기준선 Worktree(비교용) | `C:\learnershigh-main-baseline`(detached `c03a1a4`) — Student Care 시험 기준선 측정에만 사용, 코드 변경 없음 |

## 5. 공통 파일 충돌 해결

`git merge --no-ff --no-commit`. 충돌은 A19 예측과 같은 4파일이었다. 파일 전체를 한쪽으로 덮어쓰지 않았다.

| 파일 | main(Student Care) 변경 | Assessment 변경 | 해결 |
|---|---|---|---|
| `backend/src/main/resources/application.yml` | 최상위 `server.compression`(학습관 지표 3MB 응답 압축) | `spring.servlet.multipart`(분석 업로드 100MB) | 둘 다 유지. multipart는 `spring:` 아래, `server:`는 최상위(YAML 파싱 확인). `learnershigh.vision` 등은 자동 병합 |
| `frontend/admin/src/App.tsx` | 학생 케어 = `VariantX2`(X′), `/parent-report` Route | `/assessment` Route, Shell `surface` | main의 X′·학부모 리포트 유지 + Assessment 분기 추가. 브랜치의 구형 `StudentCareRoute` 진입점은 main에서 이미 교체된 것이라 쓰지 않음 |
| `frontend/admin/src/app/AdminShell.tsx` | `parent-report` 메뉴, `data-care-theme` 속성 | Shell 디자인 개편(진한 Sidebar·아이콘·`assessment` 항목) | 개편본 위에 main의 세 변경을 그대로 얹음(3-way). `AdminShell.module.css`의 학생 케어 테마 블록은 자동 병합, 선택자 존재 확인 |
| `frontend/admin/vite.config.ts` | `loadEnv` 함수형, 학생 케어 API·Vision·감독관 Proxy, 학부모 리포트 미리보기, `student-care-v1` resolve Plugin | 대학 기출 PDF dev Plugin, `student-preview.html` 빌드 입력 | main 함수형 설정 유지 + Assessment Plugin·빌드 입력 추가 |

병합 Commit `64437b7` 전에 Frontend typecheck·lint와 Backend compile을 확인했다.

## 6. 완규님 Student Care 코드 보존

- 통합 브랜치와 `origin/main` 사이 `frontend/admin/src/features/student-care/**`·`backend/.../studentcare/**`·`scripts/demo/**`·`e2e/tests/**`·`e2e/playwright.config.ts`·`.github/workflows/ci.yml`의 **차이 0**(바꾸지 않음).
- Student Care 메뉴·`/student-care`·`/parent-report`·`data-care-theme`·Vision/감독관 Proxy 유지(실화면 §12).
- Migration 5개(`V202610131200`~`V202610291700`) 그대로.

## 7. Assessment 코드 보존

A19 Assessment 코드·계약·Migration 13개·E2E는 그대로 들어왔다. 병합 해결 외에 Assessment 코드는 바꾸지 않았다. Assessment Stub E2E 23/23(병합된 Admin Shell·vite 설정으로 빌드한 화면 기준).

## 8. Mentor 레거시 조사 결과

| 위치 | 발견 | 추적 상태 | 실제 사용 | 처리 |
|---|---|---|---|---|
| `frontend/mentor/` | 별도 Mentor 앱 Workspace 115파일 | main·브랜치 모두 추적, 내용 같음 | 다른 Workspace·e2e·CI import **0**. `frontend/package.json` workspaces·`dev:mentor`·Lockfile만 연결 | **삭제** |
| Admin `student-management` Mentor 화면 | 'Mentor 추천' 메뉴, Route 4개(`/mentor-content`, `/mentor-cases[/:id]`, `/mentor-content/:id`, `/mentors/:id`), 페이지 4·사진·카드·추천 Dialog 2·CSS 1 | 추적 | Route에서만 도달. 구형 Student 360(Mentor 탭·'Mentor 적용' 카드)·구형 Feedback 검토('Mentor Case 추천하기')가 진입점 | **삭제**(진입점도 제거) |
| Admin 구형 데이터 계층 | `fixtures/adminMentor*.ts` 3, `read-model/mentorContent.ts` 등, `store/*` | 추적 | **구형 Today Board·Student 360·Feedback이 사용** | **유지** — 구형 관리자 기능 전체 정리(legacy-cleanup-plan 4단계)와 함께 제거. 사용자 결정(2026-11-16): 이번에는 앱 + 관리자 Mentor 화면까지 |
| Student `assets/mentor-man`·`mentor-woman` | 사진 30장 | 추적 | 삭제한 관리자 사진 Fixture만 사용 | **삭제** |
| Student 앱 | Mentor Hub는 이미 제거됨 — 주석 7곳(제거 이력 설명) | 추적 | 없음 | 유지(이력 주석) |
| Backend | `mentor/` 패키지 없음 | — | — | 해당 없음 |
| Student Care·Assessment | Mentor 모듈 import **0** | — | — | 영향 없음 |
| 설정·스크립트 | `scripts/verify.ps1`가 `.claude/rules/frontend-mentor.md`를 필수 파일로 둠, CODEOWNERS 주석 3줄 | 추적 | — | 유지(아래 '원본 미Commit 보호') |
| 문서 | README §2 제품 설명·폴더 트리, `docs/OWNERSHIP.md`·`docs/architecture/*`·ADR·`.claude/rules/frontend-mentor.md` | 추적 | — | README 실행 안내·구조 목록만 정리. 나머지는 원본 폴더에서 다른 담당자가 미Commit 수정 중인 파일이라 통합 브랜치에서 바꾸지 않음 → 그 작업자의 문서 정리에서 처리 |

## 9. Mentor 삭제 파일 목록

- `frontend/mentor/**` 115파일 전체.
- `frontend/admin/src/features/student-management/`: `MentorRecommendPage.tsx`, `MentorCaseDetailPage.tsx`, `MentorContentDetailPage.tsx`, `MentorProfilePage.tsx`, `MentorPhoto.tsx`, `MentorContentCards.tsx`, `RecommendCaseDialog.tsx`, `RecommendContentDialog.tsx`, `MentorContent.module.css`.
- `frontend/admin/src/fixtures/adminMentorPhotos.fixture.ts`.
- `frontend/student/assets/mentor-man/**`(15), `frontend/student/assets/mentor-woman/**`(15).

수정: `frontend/package.json`(workspaces·`dev:mentor`), `frontend/package-lock.json`(`@learnershigh/mentor` 항목만 삭제, `npm ci --dry-run` 통과), `App.tsx`·`AdminShell.tsx`(메뉴·Route), `student-management/routes/StudentManagementRoutes.tsx`·`paths.ts`, `Student360Page.tsx`(Mentor 탭·카드), `feedback/TaskReviewPage.tsx`·`FeedbackReviewRoute.tsx`(Mentor Case 블록), `README.md`(실행 안내).

**Commit 기록 주의**: Mentor 삭제 파일(156개)은 앞서 `git rm`으로 스테이징한 상태에서 Harness 보정 Commit `6f148fa`에 함께 들어갔다. 나머지 Mentor 편집은 `edec4ea`에 있다(메시지에 명시). 로컬 Commit을 다시 나누려던 `git reset --soft`는 자동 차단되어 실행하지 않았다. 결과 트리는 같다.

## 10. Mentor 잔여 의존성 확인

- `git grep`: `frontend/mentor`·`@learnershigh/mentor`·`dev:mentor`·Mentor 주소 상수 — 코드·설정 참조 0(문서·CODEOWNERS 주석·Harness 필수 규칙 파일 제외).
- 실화면: 메뉴에 'Mentor 추천' 없음. `/mentor-content`·`/mentor-cases`·`/mentors/m1` → '페이지 없음'. 구형 Student 360 탭 = Overview·Study·School·Activities·Reports. `?tab=mentor`는 Overview로 돌아감. 페이지 오류 0.
- Frontend typecheck·lint·build(student·admin) 통과, CI `verify-frontend.ps1 -Strict` PASS.

## 11. Backend·Frontend 회귀

| 범위 | 결과 |
|---|---|
| Backend Unit | **378, 실패 0**(생략 1) — Student Care 180 · Assessment 100 · 기타 98 |
| Backend Integration(Testcontainers) | **209, 최종 실패 0** — Student Care 83 · Assessment 103 · 기타 23. 첫 실행에서 `StudentCareLockFailureApiTest` 2건이 **환경 실패**(MySQL 컨테이너 기동 중 종료, 여유 메모리 약 2.5GB) → 그 클래스만 재실행해 2/2 통과 |
| 신규 일회용 DB Migration | **18개 순서대로 모두 성공**(Student Care 5 → Assessment 13, `v202611160200`) — §13 |
| Frontend typecheck·lint·build | 통과(student·admin. `frontend/shared`는 두 앱 빌드에 포함) |
| CI Harness `verify.ps1 -SkipFrontend -SkipBackend` | 병합 직후 **실패**(필수 목록의 구형 명세 4개가 Assessment 브랜치에서 삭제됨) → 필수 목록을 Assessment 명세 4개로 바꿔 통과(`6f148fa`) |
| CI `verify-frontend.ps1 -Strict` | PASS |
| Student Care Node 시험(CI와 같은 파일) | **92/92** |

## 12. Student Care·Assessment E2E

| 시험 | 결과 |
|---|---|
| Assessment Stub E2E | **23/23**(1.9분, Edge) |
| Student Care Playwright 인수 시험(`playwright.config.ts` testMatch 5파일·31건) | **31/31 실패 — main 기존 실패(통합 무관)** |
| 같은 시험을 `main c03a1a4` 화면(기준선 Worktree 빌드)으로 | **31/31 실패**, 31건 모두 결과·첫 오류가 같음 |
| Admin Shell 실화면(통합 빌드) | 메뉴 8개 = Today Board · 학생 케어 · 학부모 리포트 · Feedback Dashboard · Connection 검토 · Interview 관리 · Operations · Assessment 관리(NEW). 학생 케어 정상(합성 150명 목록, `data-care-theme` 적용), Assessment·평가계획서 화면 진입, 학부모 리포트 진입, 전환 후 다시 학생 케어 정상. 페이지 오류 0 |

Student Care 인수 시험 실행 방법은 CI e2e Job과 같다: 일회용 MySQL, `care-demo,e2e`, `APP_FIXED_DATE=2026-10-28`, `generate-care-seed.mjs` Seed, Admin preview :4174, Chromium 대신 설치된 Edge.

관찰한 `main` 불일치(완규님 확인 요청, 코드는 바꾸지 않음):
- `generate-care-seed.mjs`는 2026-11-12에 **210명·기준일 11-11**로 바뀌었다. 그런데 CI는 아직 `APP_FIXED_DATE=2026-10-28`이고, `seed-care-history.mjs`는 **60명**을 기대해 AssertionError로 끝난다.
- 시험은 이전 화면의 동작을 기대한다(예: 첫 시험이 오래된 학습관 목록 갱신·`.rs-summary` 150개). 학생 케어 화면은 11-12에 X′ 하나로 바뀌었다.
- 같은 이유로 GitHub의 `main` CI e2e Job도 실패할 것으로 **추정**한다(직접 확인하지 않음).

실화면 콘솔 오류 중 병합과 무관한 것:
- `502 /supervisor-api/*`: 학생 케어 사진 관찰 감독관 서비스(127.0.0.1:39741)를 로컬에서 실행하지 않음.
- `401 /api/admin/assessment/*`: Preview에 개발용 관리자 Mock Header 변수를 넣지 않음 — 인증 없는 접근을 막는 정상 동작.

**시각 검토 요청**: 학생 케어도 이제 Assessment가 개편한 진한 Sidebar Shell 안에 보인다(본문은 학생 케어 테마). 완규님이 승인해야 할 화면 변화다.

## 13. Flyway Migration 순서 및 위험

| 대상 | 상태 | 예상 |
|---|---|---|
| 새 DB(일회용·Testcontainers·CI) | 18개 버전 순서대로 적용(실측) | 정상 |
| main 기반 DB(Student Care만, `V202610291700`까지) | Assessment 13개가 모두 더 높은 버전 | 순서대로 추가 적용 → 정상 예상(미실측) |
| **Assessment 브랜치 기반 DB — 시연 DB `lh_demo_manual_20261111`**(기록상 `V202611160100`) | main의 `V202610251000`·`V202610290800`·`V202610291700`은 적용 버전보다 **낮은데 미적용** | Flyway 기본(`outOfOrder=false`) 검증에서 '적용되지 않은 이전 Migration'으로 **기동 거부 가능성 높음**(미실측 — 시연 DB에 연결하지 않음). `V202611160200`(A14)도 미적용 |

적용 계획 후보(**모두 사용자·완규님 승인 필요, 이번에 실행하지 않음**):
1. 시연 DB를 새 DB로 다시 만들고 Seed를 다시 적재한다(가장 단순, 데이터 재적재 필요).
2. 시연 DB에만 한 번 `spring.flyway.out-of-order=true`로 3개를 적용한 뒤 끈다. 세 Migration이 Assessment 표와 독립인지 검토가 먼저다(이름상 care 표 전용).
3. 재번호·repair·삭제는 금지(지시).

Draft PR 차단 사항으로 표시했다.

## 14. 기존 시연 DB 미변경

`learnershigh-mysql` 컨테이너는 작업 전후 `Exited (0)` 그대로이고, 시작·연결하지 않았다. 사용한 DB는 Testcontainers와 일회용 `lh-a20-care-mysql`(tmpfs·`--rm`, 127.0.0.1:33465)뿐이다. A14 Migration은 시연 DB에 적용하지 않았다.

## 15. Railway 연결 설정

- 새 개발자 가이드 `docs/specs/suyeon/assessment-analyzer-setup.md`: 변수명·URL·프로필·Timeout·토큰 설정(로컬 User 환경 변수 / 서버 Secret)·미설정 시 503·오류별 응답·토큰을 React·PHP에 넣지 않는 이유를 담았다. README §22에서 링크한다.
- 바인딩은 코드에서 확인했다(`assessment.analyzer.base-url|token|timeout-millis|contract03-version|version`). 인증 정책·Railway 설정은 바꾸지 않았다. 토큰 값은 저장소·PR·로그에 없다(변경분 전체에서 실제 토큰 문자열 검색 0, 테스트용 `*-not-a-secret-*` 값만 있음).

## 16. 통합 Commit

| Commit | 내용 |
|---|---|
| `64437b7` | Merge: Assessment(A19) → 최신 main, 충돌 4파일 해결 |
| `6f148fa` | Harness 필수 목록 보정 **+ Mentor 삭제 파일 156개**(§9 주의) |
| `d12d823` | 분석기 연결 가이드, README Mentor 실행 안내 정리 |
| `edec4ea` | Mentor 정리의 나머지 편집(package.json·Lockfile·메뉴·Route·구형 진입점) |
| (이 보고서) | docs: A20 보고서 |

## 17. GitHub Push 결과

(Push 후 기록)

## 18. Draft PR URL

(PR 생성 후 기록)

## 19. 원본 작업 폴더 미Commit 파일 보존

- 작업 전후 `git status --porcelain` 목록이 같다(68건). 원본 폴더에서는 `git fetch`와 `git worktree add`만 실행했고, 파일 수정·Stage·삭제는 하지 않았다.
- 원본의 Mentor 물리 잔재: 추적 115파일(수정 0)과 Git 무시 대상 `frontend/mentor/dist/`·`node_modules/`. PR이 병합된 뒤 원본에서 `main`을 받으면 추적 파일은 사라지고, 무시 대상 폴더는 **수동 정리 필요**(별도 항목). Mentor 관련 미Commit 수정 2건(`.claude/rules/frontend-mentor.md`, ADR-0001)은 다른 담당자의 작업이라 그대로 두었다.
- 통합 Worktree에도 Git 무시 대상 `frontend/mentor/node_modules/`가 남아 있다(정리 명령이 자동 차단됨, Push 대상 아님).

## 20. 실제 서비스 통합에 남은 사항 (이번 PR 범위 밖)

- 기존 PHP 로그인과 Spring Boot 인증 연동, 실제 관리자 인증(Mock Header 대체), HWP/HWPX 공식 평가정보 확정 인증.
- 실제 학생·학교·학년·학기·개설 과목 원천, 기존 서비스 DB 연동(계정 B B18 분석 후 1팀 협업).
- 기존 서비스 배포 설정. 시연 DB Migration 적용 방식 결정(§13).
- A19 PARTIAL 사유 유지: 원격 합성 PDF에서 수행평가 항목이 추출되지 않아 PDF 채점기준·요소 배점·확장 필드 원격 수신은 미검증이다(HTTPS 연결 자체는 정상).
- 구형 관리자 기능(Today Board·Student 360·구형 Feedback·Connection·Interview·Operations)과 그 Mentor 데이터 계층 정리, 문서 속 Mentor 설명 정리.
