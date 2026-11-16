# [계정 A] A22 — 레거시 정리 · 오래된 보고서 정리 · Student Care E2E 정비 · Migration 검증 · PR #17 갱신 (2026-11-16)

> 작업 위치: 통합 Worktree `C:\learnershigh-assessment-integration` · 브랜치 `integration/assessment-studentcare-20261116` · Draft PR #17.
> 원본 `C:\learnershigh-extension`은 바꾸지 않았다(§19 참고 → 보고서 29번 항목).

## 30. 최종 판정 (먼저)

**PARTIAL** — 레거시 제거·두 기능 보존·Backend/Frontend 시험·새 인수 시험·Assessment E2E·Railway E2E·새 DB 기동·실행 가이드까지 완료. 다만 PASS 조건 중 다음이 남았다.

1. **기존 시연 DB(`lh_demo_manual_20261111`) Migration 문제는 해결하지 않았다**(연결·변경 금지 — 새 독립 DB로 대체, §20).
2. 새 Student Care 인수 시험은 **22건 통과(21 정상 + 알려진 제품 결함 1건 '예상 실패')**. 이전 화면용 31건은 현재 화면에 없는 기능이라 이력용으로 보관했다(사용자 승인, 완규님 검토 대기).
3. 로컬 전체 Backend Integration 실행에서 `StudentCareLockFailureApiTest` 2건이 **환경 실패**(테스트용 MySQL 컨테이너 기동 중 끊김, A20과 같은 클래스) — 단독 재실행 2/2 통과. GitHub CI 결과는 §26.

---

## 1. 시작 Git 상태

- 통합 Worktree: HEAD `1c89c48`(= 원격 PR head), 미추적 1개(A21 보고서) → 먼저 `f0a7f42`로 보존 Commit.
- 원격: PR 브랜치 `1c89c48` 그대로(다른 사람의 수정 없음), `main` `c03a1a4` 그대로.
- 원본 폴더: HEAD `f858574`, 미Commit 68건(작업 전 목록 저장).

## 2. 최신 main 및 PR HEAD

`origin/main` = `c03a1a4`(fetch 재확인). PR #17 head = `1c89c48` → A22 Commit 6개 추가(§23).

## 3. A21 기준선

구형 관리자 화면은 실제 API·Backend·계약 없이 로컬 Fixture로만 동작, Student Care·Assessment import 0, 삭제 후보 68 + 5, Backend 구형 코드 0, 충돌 4파일·마커 0, Student Care 인수 E2E 31/31 실패(main 동일).

## 4. 사용자 승인 결정 반영

| 결정 | 반영 |
|---|---|
| 1. 관리자 기본 화면 = 학생 케어 | `App.tsx`: `/`에서 학생 케어 X′를 바로 그리고 주소를 `/student-care`로 바꿈(History 쌓지 않음). `/student-care`·`/student-care/5`·`/student-care/x2`·`/parent-report`·`/assessment/**` 유지. 그 밖 주소 → '페이지 없음' + '학생 케어로 가기' |
| 2. Today Board 제안 철회 | 화면 제거. `docs/specs/wangyu/README.md` 경계 표와 `docs/OWNERSHIP.md` §4의 제안 문장을 '철회(2026-11-16, 사용자 결정)'로 바꿈. Student Care 코드·데이터 모델 변경 없음. ADR은 손대지 않음 |
| 3. 구형 시나리오 실행 제거 | `configureCommandScenario(location.search)` 삭제, `store/`·`fixtures/`·`read-model/` 삭제 |
| 4. 오래된 보고서 정리 | §11 |
| 5. 사용자 직접 테스트 | `docs/specs/suyeon/assessment-studentcare-local-run-guide.md` |
| (추가) 인수 E2E 31건 처리 | 사용자 선택: 'X′ 인수 시험 신설 + 31건 이력 보관' |

## 5. 프론트엔드 레거시 제거 목록 (`70e25f5`, 73개 삭제)

삭제 목록은 개수를 맞춘 것이 아니라 **import 그래프로 다시 계산**했다: `App.tsx`에서 구형 import를 끊은 뒤 앱 진입점(`main.tsx`·`index.html`·`student-preview.html`·`vite.config.ts`)과 Node 시험 어디에서도 도달하지 않는 파일만 골랐다(결과가 A21과 같은 73개). 같은 영역에서 아직 도달하는 `components/AdminUi.tsx`·`.module.css`는 남겼다.

| 영역 | 파일 |
|---|---|
| `features/feedback/`(11) | Feedback Dashboard·구형 Review(Task·Topic·Activity)·Queue Model·Route·paths |
| `features/student-management/`(12) | Today Board·Student 360·Inspector(Task·Activity)·Connection·Interview·Outreach·Operations·Route·paths·CSS |
| `fixtures/`(12) | `admin*.fixture.ts` 10(Mentor 3 포함)·`snapshot.ts`·`types.ts` |
| `read-model/`(11) | feedbackQueue·integrity·materialRole·mentorContent·operations·student360·studentInsights·studentProjection·taskDetail·time·todayBoard |
| `store/`(2) | adminCommands·adminStore |
| `components/`(9) | ActivityInspector·TaskInspector·Inspector.css·AdminFilePreview(+css)·filePreview·AdminIcons·AdminVisual(+css) |
| `app/useScreenLoad.ts`(1) | 구형 화면 로딩 시나리오 |
| `assets/fixture-files/`(10)·`assets/activity-case/`(5) | 구형 첨부·Case 샘플 |

학생 앱: 추가로 지울 구형 기능 없음(이미 Assessment만). Student Care 내부 미사용 11개·Assessment 내부 미사용 파일은 **제외**(후속 — 소유자 판단).

## 6. Backend 보존 검사

변경 없음. 패키지 `assessment`·`studentcare`·`common`만 존재(A21 §2), 구형 Backend 코드 0, Migration 18개 그대로. PHAPI 변환·사진 관찰·테스트 지원 코드 보존.

## 7. 최종 관리자 메뉴·Route

| 메뉴(Shell) | Route |
|---|---|
| 학생 케어 | `/`(→ `/student-care`), `/student-care`, `/student-care/5`, `/student-care/x2` → X′ |
| 학부모 리포트 (표시: '학생 케어' 소속, 들여쓰기) | `/parent-report` |
| Assessment 관리 (NEW) | `/assessment/**` |
| — | 그 밖 전부 '페이지 없음'(구형 `/feedback`·`/today`·`/students/*`·`/tasks/*`·`/activities/*`·`/connections`·`/interview`·`/operations`·`/mentor*` 포함) |

Shell 정리: 기존 LearnersHigh를 흉내 낸 **클릭되지 않는 표시**(상위 메뉴 8개·학습관리 하위 7개·문자잔고·알림·설정·계정·콘솔 매뉴얼·학습타이머앱 안내)를 없앴다. 실제 PHP 서비스 메뉴는 건드리지 않았다. Sidebar는 '학습관리 확장' 제목 + 3개 항목. 관련 CSS 규칙만 지우고 학생 케어 테마 블록(`data-care-theme`, 5곳)·Assessment `data-surface='canvas'` 유지. Student Care 영향: 화면 본문·테마 그대로, Sidebar 항목만 줄었다(인수 시험·실화면 확인).

## 8. 관리자 기본 화면 변경

`admin-shell.spec.ts`: `/` → `/student-care`, 메뉴 '학생 케어' `aria-current=page`, `data-care-theme` 1개, 페이지 오류 0 — **통과**.

## 9. `configureCommandScenario` 제거 결과

`App.tsx`·전체 저장소에서 참조 0(`git grep`). 구형 Mock Store·Command·Fixture도 삭제. Student Care·Assessment 데이터 흐름(각자 API Client) 변화 없음 — Node 92·Stub E2E 23·인수 시험 22·Railway 4 통과.

## 10. 기존 Mentor 잔재 정리 결과

A20 이후 고아였던 `fixtures/adminMentorCaseDetails.fixture.ts`·`read-model/mentorContent.ts`·`read-model/integrity.ts`와 store가 쓰던 `adminMentor.fixture.ts`·`adminMentorContent.fixture.ts`를 모두 삭제. 코드·설정의 Mentor 참조는 `.github/CODEOWNERS` 주석 예시 몇 줄과 학생 앱 제거 이력 주석뿐(동작 영향 없음). `.claude/rules/frontend-mentor.md`·OWNERSHIP §3·§10·§11 예시는 원본 폴더 미Commit 수정과 겹쳐 남김.

## 11. 오래된 보고서 삭제 목록 (`923b66e`, 25개)

판정 기준: 코드·Migration 주석·API 계약·남길 명세·다른 문서 **어디에서도 참조하지 않음**(저장소 전체 `git grep`). Migration 주석이 작업 단위 이름(A10·A11·A13·A14)을 근거로 적은 보고서는 남겼다.

| 파일 | 삭제 이유 | 대체 |
|---|---|---|
| `ACCOUNT-A-A0-A1-PREP-20261113.md`, `ACCOUNT-A-A0-COMMIT-A2-STORAGE-20261113.md` | 초기 준비·저장소 Commit 계획 | A17~A22, Git 이력 |
| `ACCOUNT-A-GIT-A3-SERVER-ANALYSIS-20261113.md`, `ASSESSMENT-CURRENT-STATUS-20261113.md` | 초기 분석·현황 점검 | A20·A21 |
| `ACCOUNT-A-A35-A4-PARTIAL-REVIEW-20261114.md`, `ACCOUNT-A-A5-STEPPER-REVIEW-DRAFT-20261114.md`, `ACCOUNT-A-A7-STEPPER-DRAFT-COMPARISON-E2E-20261115.md` | 검토 Stepper 진행 보고 | 구현·Stub E2E, api-contract §39 |
| `ACCOUNT-A-A6-INTEGRATION-20261115.md`, `ACCOUNT-A-A8-CONTRACT03-REAL-INTEGRATION-20261115.md`, `ACCOUNT-A-A15-REAL-ANALYZER-CONTRACT-INTEGRATION-20261116.md`, `ACCOUNT-A-A16-SUBJECT-LOCATOR-CONTRACT-AND-REAL-E2E-20261116.md` | 분석기 계약 0.3 통합 진행 | A17(B16 확장)·A19(Railway), api-contract §38~39 |
| `ACCOUNT-A-A9-PLAN-ARCHIVE-20261115.md`, `ACCOUNT-A-A12-ASSESSMENT-FEATURE-API-COMPLETION-20261116.md` | 기능 완료 진행 보고 | A17~A20, 명세 |
| `ACCOUNT-A-B-THREE-YEAR-COMPARE-CONNECTION-20261115.md` | 3년 비교 연결 실험 | A18 |
| `ACCOUNT-A-UI-REDESIGN-DAGLO-20261114.md`, `ACCOUNT-A-UI-V2-DAGLO-PLANNER-20261114.md` | UI 개편 진행 보고 | `assessment-design-principles.md`·`assessment-screen-map.md` |
| `assessment-student-mockup-audit.md` | 2026-10-29 Stage 1~7 Mockup 검수 | `assessment-screen-map.md`, 이후 UI 보고 |
| `assessment-document-diversity-cases-20261112/`(7) | 문서 다양성 사례(참조 0) | Git 이력 |

## 12. 보존한 최근 보고서·문서

| 문서 | 이유 |
|---|---|
| A17·A18·A19·A20·A21·A22 보고서 | 현재 통합 코드의 구현·검증 근거 |
| A10·A11·A13·A14 보고서 | Migration `V202611111620`·`V202611151300`·`V202611160100`·`V202611160200` 주석이 근거로 명시 |
| `README.md`·`domain.md`·`progress.md`·`features/*`(5) | 명세·Harness 필수(`scripts/verify.ps1`)·CLAUDE.md 참조 |
| `assessment-analyzer-setup.md`·`assessment-studentcare-local-run-guide.md` | 실행 설정 |
| `assessment-design-principles.md`·`assessment-frontend-mock.md`·`assessment-frontend-quality.md`·`assessment-screen-map.md`·`assessment-pdf-analysis-plan.md`·`harness-change-proposals.md`·`legacy-cleanup-plan.md`·`assessment-multiformat-integration-draft.md`·`assessment-ai-integration-handoff.md` | 코드 주석·CLAUDE.md·명세가 참조 |
| `assessment-15schools-60students-seed-202611/` | `SubjectCatalog.java`·시연 명단 생성 스크립트의 원천 |
| `assessment-db-integration-202611/`, `assessment-multiformat-review-gate-202611/` 등 날짜별 근거 폴더 | Migration 주석(`REPORT.md`·`sql/D1-draft.sql`)·api-contract·domain·features가 링크 |
| `backend-run-2026-11/`, `assessment-multiformat-202611/` | 시험 Resource README가 참조 |
| `ACCOUNT-B-HANDOFF-*`, `HANDOFF-WANGYU-*` | 다른 담당자와 주고받은 인수인계(외부 소유 성격) |

결과: 298 → 273개. 삭제 후 참조 검사에서 깨진 링크 0(삭제 대상 이름·경로 grep 0건).

## 13. Student Care 코드 보존 결과

`features/student-care/**`·`backend/.../studentcare/**`·`app/studentCarePaths.ts`·`theme.css`·`parentReportPreview.ts`·`visionDevAuth.ts`·Vite Proxy(`/supervisor-api`·`/vision-api`·`/api/admin/student-care`) **변경 0**. 변경한 Student Care 관련 파일은 시험·Seed·CI·문서뿐(§16).

## 14. Assessment 코드 보존 결과

`features/assessment/**`(관리자·학생)·`backend/.../assessment/**`·Migration 13·Railway Client **변경 0**. 내부 미사용 파일 정리는 하지 않음(후속).

## 15. Student Care E2E 실패 원인

| 원인 | 근거 |
|---|---|
| **31건이 지금은 없는 화면을 검증** | 시험은 10-29~11-07 이전 화면 기준으로 작성. 11-12 `41594a6`에서 학생 케어가 X′ 하나로 바뀌며 이전 컴포넌트가 main에서 삭제. 시험이 쓰는 `.rs-summary`·`.bov-*`·`[data-metric]`·`.cm-status-card`·`#rs-open-*` 등이 현재 코드에 **0건** |
| 합성 원천 변경과 CI 날짜 불일치 | 11-12 `77ec091`: 생성기 210명(150/50/10)·AS_OF 11-11(화면 오늘 11-12). CI는 `APP_FIXED_DATE=2026-10-28` 그대로 |
| 상담 예시 Seed 하드코딩 | `seed-care-history.mjs`가 60/30/10·`demo_s035`·재점검 `2026-11-04`를 기대 → 새 원천에서 AssertionError |
| A19 시절 `student-care.spec.ts`(7건) | 10-14 작성, 이전 화면의 '특이사항 학생'·`article.sc-detail` 기준(main에서도 이미 testMatch 밖) — X′에서는 통과 불가, 이력용 |

## 16. Student Care E2E 수정 및 재실행 결과 (`8cccdc4`)

- **새 인수 시험** `e2e/tests/student-care-x2.spec.ts`(9) + `admin-shell.spec.ts`(13). 기대값은 하드코딩하지 않고 같은 Backend API에서 읽어 화면과 대조한다. 매 시험은 `/api/test/reset`(상담·설정만, 원천 유지)으로 시작해 상태 오염을 막는다.
  - 학습관 목록·인원 = `/branches`, 관리 사유별 인원 = `/board` 신호 집계(3개 학습관 모두)
  - 거르기·검색·조건 지우기(20명 쪽 나누기 반영)
  - 학생 상세: 최근 7일 출결·계획 제출 칸 = `/metrics` review.days, 공부 시간 합계, 이전·다음·닫기
  - 상담 저장(계속 관리): Backend 관리 건 1건(**연타해도 1건**), 재점검일 > 오늘, 상담 기록 탭의 건 단위 줄·다음 점검일 = API, 펼치면 내용, 이력 없는 학생은 '없습니다'
  - 관리 기준: 범위 밖 값 거절(aria-invalid, 저장 안 됨) → 결석 기준 변경이 API와 화면 인원에 반영
  - 학습관별: 사유별 인원 = API, 누르면 그 사유로 거른 학생 목록, 날짜 7개
  - 사진 관찰: 감독관 502 → 빈 화면이 아닌 **연결 실패 안내**, 요청은 `/supervisor-api` Proxy
  - 학부모 리포트: 학생 상세 탭(데일리 레포트)·메뉴 화면
  - Shell: 기본 화면·메뉴 3개·전환 오류 0·구형 주소 11개 '페이지 없음'
- **알려진 제품 결함(새로 발견)**: 상담 탭을 연 뒤 양식에 **처음 입력한 글자 하나가 사라진다**(기록자 'XY' → 'Y', 사람 속도로도 재현, 두 번째 칸부터 정상). 완규님 코드(`fd7f87d`, main 동일)라 고치지 않았다. 단언은 완화하지 않고 `test.fail()`로 '예상 실패' 표시 — 고쳐지면 '예상 밖 통과'로 알려 준다.
- `playwright.config.ts` testMatch → 새 2개 파일. 이전 31건은 **삭제하지 않고** 이력용으로 남김(주석에 사유).
- `seed-care-history.mjs`: 인원은 생성기 `BRANCHES`, 학생은 강남점 `START_TIME_SHIFT` 학생 중 ID 순 첫 번째(`demo_s004`), 재점검 = API today + 7. 두 번째 실행은 쓰기 없음(실측).
- CI e2e: `APP_FIXED_DATE=2026-11-12`, `LEARNERSHIGH_MOCK_ANCHOR_DATE=2026-11-11`.
- **결과(CI와 같은 절차, 로컬 Edge)**: **22 passed**(21 정상 + 1 예상 실패) — 같은 DB에서 연속 3회 동일. 이전 31건은 실행 대상 아님(기능 없음 — 31/31 통과라고 주장하지 않는다).
- Student Care Node 시험 92/92, 학부모 리포트 미리보기 3/3, Seed 생성기 6/6.

## 17. Backend 전체 테스트 결과

| 범위 | 결과 |
|---|---|
| Unit | **378/378**(생략 1) — Student Care 180 · Assessment 100 · ArchUnit 24 · 기타 74 |
| Integration(Testcontainers) | **207/209 + 2 환경 실패** → 해당 클래스 단독 재실행 **2/2 통과**. Student Care 83 · Assessment 103 · 기타 23 |
| 새 DB Migration·기동 | §19 |

환경 실패 내용: `StudentCareLockFailureApiTest`(자체 `GateConfig`로 새 Spring Context·새 MySQL 컨테이너를 띄움)에서 컨테이너가 연결 직후 끊김(`EOFException`) — 여유 메모리 약 2.5GB. A20과 같은 클래스. GitHub CI Backend Job으로 재확인(§26).

## 18. Frontend 전체 테스트 결과

typecheck·lint·build(student·admin) 통과, `verify-frontend.ps1 -Strict` PASS, Harness `verify.ps1` PASS, e2e typecheck 통과, **Assessment Stub E2E 23/23**, **Railway 화면 E2E 4/4**(통합 트리, 합성 문서만).

## 19. 신규 DB Migration 테스트

일회용 MySQL(tmpfs, 127.0.0.1:33466)에 통합 Jar(`care-demo,e2e`, 오늘 11-12):
1. `Successfully applied 18 migrations … now at version v202611160200`(Student Care 5 → Assessment 13 순서) → 기동.
2. 합성 원천 Seed(210명) + 상담 예시 Seed.
3. Student Care API(branches·board·metrics·settings·cases) · Assessment API(schools) 200.
4. **같은 DB로 재기동**: `Successfully validated 18 migrations` · `Schema … is up to date. No migration necessary.` · API 200.
Railway 시험용 별도 일회용 DB(33467)에서도 18개 적용 후 기동.

## 20. 기존 시연 DB 상태 및 남은 문제

- `learnershigh-mysql`: 작업 전후 `Exited (0)`, 시작·연결하지 않음. `lh_demo_manual_20261111`에 대한 읽기·변경·repair·outOfOrder 없음.
- 남은 문제(**미해결**): 기록상 `V202611160100`까지 적용된 이 DB에서는 main의 `V202610251000`·`V202610290800`·`V202610291700`이 '순서 밖'이라 Flyway 기본 검증에서 기동이 거부될 가능성이 높다(미실측). 사용자용 실행은 새 독립 DB(가이드 `lh-local-run-mysql`, 33307)로 대체했다.
- 기존 DB를 쓰려면 사용자 승인이 필요한 선택지: (a) 복제본을 만들어 1회 `out-of-order` 적용 시험 → 원본 적용, (b) 새 DB로 이전(데이터 재적재). 재번호·repair·삭제는 하지 않는다.

## 21. Railway 설정 보존 확인

`PlanAnalyzerConfig`·`HttpPlanAnalyzerClient` 변경 0. Railway 화면 E2E 4/4에서 `v21.10-b16-dev` 프로필·150초 대기·인증 헤더 동작 확인. Backend 로그 token 문자열 0건, 토큰 값 출력·저장 없음. 원격 전송은 A19 합성 manifest(SHA 가드)뿐.

## 22. 실행 가이드 작성 및 검증

`docs/specs/suyeon/assessment-studentcare-local-run-guide.md`(`7ee7c1a`): 준비 → MySQL(별도 이름·포트·볼륨) → DB 확인 → 환경 변수 → bootRun → Health → 학생 케어 원천 Seed → Admin(5174) → Student(5173, Proxy 설정) → 합성 문서 생성 → 업로드·분석·확정 → 학생 조회 → 학생 케어 → 종료, 체크리스트, 시연 불가 항목, 문제 해결, 단계별 검증 상태. PowerShell 문법 그대로는 실행하지 않았다(같은 값을 bash로 실행) — 가이드 §13에 '미검증'으로 표시.

## 23. Git Commit 목록 (1c89c48 이후)

| Commit | 내용 |
|---|---|
| `f0a7f42` | A21 보고서 보존 |
| `70e25f5` | 레거시 관리자 기능 제거(73), 기본 화면 학생 케어, Shell 메뉴 3개 |
| `923b66e` | 오래된 보고서 25개 삭제(사유 기록) |
| `4cc76de` | Today Board 제안 철회 문서, legacy-cleanup-plan 진행 기록 |
| `8cccdc4` | Student Care X′ 인수 시험·Shell 시험, Seed·CI 날짜 정합 |
| `7ee7c1a` | 로컬 실행 가이드 |
| (이 보고서) | A22 보고서 |

모두 파일을 지정해 Stage(`git add .` 미사용). 이력 재작성 없음(Push 전 보고서 Commit 메시지 개수 오기 1건만 `--amend`로 수정).

## 24. GitHub Push 결과

(Push 후 기록)

## 25. PR #17 업데이트 결과

(갱신 후 기록)

## 26. GitHub CI 확인 결과

(CI 완료 후 기록)

## 27. 완규님 검토 필요 항목

1. **새 인수 시험으로 교체한 것**(이전 31건은 이력 보관) — 인수 기준 승인.
2. **알려진 결함**: 상담 양식 첫 글자 유실(`CareCounsel`의 `onInputCapture → onDirty(true)` 직후 양식이 다시 그려지는 것으로 보임).
3. Seed·CI 날짜 정합 변경(`seed-care-history.mjs`, `ci.yml`).
4. Shell 시각 변화(진한 Sidebar, 메뉴 3개, 흉내 메뉴 제거)와 '학부모 리포트 — 학생 케어 소속' 표시.
5. `docs/specs/wangyu/README.md`·`OWNERSHIP.md` §4의 Today Board 제안 철회 문구.
6. Student Care 내부 미사용 11개·`StudentCareRoute.module.css`·`student-care-v1` Vite Plugin 정리 여부.
7. 감독관 서비스가 없을 때 `/supervisor-api` 502(현재는 연결 실패 안내 — 인수 시험으로 확인).

## 28. 사용자가 직접 테스트할 항목

가이드 §11 체크리스트 18개. 수동으로 확인할 수 없는 것: 합성 PDF 수행평가 항목·채점기준·요소 배점, `maxScore`·`linkReview` 원격 수신, HWP·HWPX 평가정보 공식 확정(보호), 실제 사진 관찰, 실제 로그인·학교 데이터.

## 29. 아직 남아 있는 문제

- 기존 시연 DB Migration 순서(§20) — 승인 필요.
- 상담 양식 첫 글자 유실(완규님).
- 이전 31건·A19 7건 Student Care 시험의 처분(완규님).
- 로컬 Integration 환경 실패 2건(메모리) — CI에서 확인.
- 학생 앱 기본 `vite.config.ts`에 `/api` Proxy 없음(가이드는 E2E 설정 사용) — 후속 제안.
- Assessment 내부 미사용 파일·문서 속 구형 설명(OWNERSHIP·README·rules, 원본 미Commit 작업과 조율)·`.github/CODEOWNERS` 주석.
- 원본 폴더의 무시 대상 `frontend/mentor/dist`·`node_modules`, 기준선 Worktree `C:\learnershigh-main-baseline` 정리.
- 기존 러너스하이 PHP 인증·실제 데이터·배포 연동(범위 밖).
- 원본 미Commit 68건: 작업 전후 동일(확인).
