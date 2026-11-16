# [계정 A] A18 — 1·2·3학년 개발용 학업 슬롯 확장 및 기술 정책 적용 (2026-11-16)

> 상태 표기: **완료(실제 B16 HTTP)** / **완료(실제 B16 HTTP + React 화면)** / **완료(시험)** / **미실행** / **후속(외부 의존)**
> [실제] 계정 B B17 확정 Commit `9a0155c`을 `git archive`로 스크래치 폴더에 꺼내 A18 전용 포트에서 실행(프로필 `v21.10-b16-dev`) → 실제 HTTP → 계정 A Backend(일회용 DB, 시연 명단 ON) · [화면] 같은 Backend에 붙인 Admin·Student Vite + Playwright(Edge) · [IT] Testcontainers · [E2E] Playwright(분석기 Stub)

## 1. 시작 Git 상태

- 계정 A: Branch `feature/assessment-student-integration-enhancement`, HEAD `1abbce9`(A17 보고서), Stage 없음, 다른 담당자 미Commit 68건 그대로(변경·Stage 안 함).
- 계정 B: HEAD `9a0155c`(B17), 작업 트리 깨끗. 이번 실행은 그 Commit을 꺼낸 사본만 썼다(저장소에 쓰지 않음).
- 실행 중 컨테이너 없음, 여유 메모리 약 2.2GB → 무거운 작업은 하나씩만 실행했다.

## 2. 현재 Mock 학업 원천 구조 (변경 전 조사)

| 항목 | 내용 |
|---|---|
| 소유 | `assessment/integration/context`(학업 Context 경계 `AcademicContextProvider` + `MockAcademicContextProvider`)·`assessment/integration/roster/DemoRoster` — Assessment 범위. Shared `MockExistingStudentClient`·Student Care와 분리돼 있다 |
| 학교·학년도 | `school_001`(예시고등학교) 2026 1학년 1·2학기 + 과거 학년도 2025·2024 1학년 2학기(평가계획서 슬롯 전용). 기존 Mock 학생 `stu_*`은 모두 이 학교 1학년 |
| 시연 명단 | `assessment.demo-roster.enabled=true`일 때만: 합성 학교 15곳(`sch_demo_*`), 합성 학생 60명(학교마다 1·2·3학년), 지점 3개. 학생 학업 Context는 명단의 학교·학년·학기별 수강 과목 |
| 개설 과목 | `SubjectCatalog`(2026, 1~3학년 × 1·2학기 = 13/13/25/30/41/40과목) — 학교 공통 후보이며 공식 학교 개설 과목이 아니다 |
| 평가정보·운영계획 확정 | `findSlot(학교, 학년도, 학년, 학기)`의 과목 ID만 허용(`subjectId` 검사) + 원문 학년 충돌 검사(`grade_conflict`) |
| 학생 조회 | 학생 학업 Context의 학교·학년도·학년·학기가 문서 슬롯과 같을 때만(Backend 검사, 다르면 404/403) |
| 인증 | 기존 Mock Header(`X-Assessment-*-Id`) — 실제 로그인 아님(API-OD-A01) |
| 문제 | `findSlot`이 `school_001` 1학년만 돌려줘서 2·3학년 문서를 확정할 슬롯이 없었다. 주석의 '시연 학교 평가계획서 운영은 범위 밖'은 OD-A08(2026-11-13, 인증된 관리자는 모든 학교 운영)로 이미 해소된 이전 상태였다 |

## 3. 2·3학년 확장 방식

- **계약 먼저**: `api-contract.md` §38-4에 '학년별 개발용 시연 슬롯(A18)'을 적었다.
- **코드**(Assessment 범위만, Migration 없음):
  - `DemoRoster.school(schoolId)` — 명단 학생이 소속된 합성 학교만 찾는다(학교를 만들지 않음).
  - `MockAcademicContextProvider.findSlot` — 기존 슬롯을 먼저 찾고, 없을 때만 (명단 ON) 명단 학교 × 카탈로그가 있는 학년도·학년·학기 슬롯을 만든다. 과목 = 그 학년·학기 카탈로그, 출처 `source = "DEV_DEMO_CATALOG"`(기존 `EXISTING_LEARNERSHIGH`와 구분 — 실제 학교 원천이라고 주장하지 않음).
- 학생 학업 Context·학생 공개 규칙·학년 충돌 검사는 **바꾸지 않았다**. 슬롯 학년을 바꿔 다른 학년 과목을 확정하는 경로는 없다.
- 명단 OFF(기본값)면 시연 슬롯이 없다. 운영 설정에는 영향이 없다.

## 4. 기존 1학년과의 호환성

- `school_001` 2026 1학년 1·2학기·과거 학년도 슬롯은 같은 과목 ID·출처 그대로(명단 ON/OFF 모두). `school_001` 2·3학년 슬롯은 여전히 없다.
- 실제 B16 9문서 회귀(`school_001` 1학년 2학기 슬롯): 9/9 201, 확정·학생 공개 시나리오 A17과 같음(§6).
- A17 실제 화면 시험 2건(`school_001`, `stu_001`) 재실행 통과(§8).

## 5. 학년별 개설 과목 및 학기

| 슬롯 | 과목 수(카탈로그) | 비고 |
|---|---|---|
| 1학년 1학기 / 2학기 | 13 / 13 | `school_001`은 기존 Mock 4과목 그대로 |
| 2학년 1학기 / 2학기 | 25 / 30 | 시연 학교만 |
| 3학년 1학기 / 2학기 | 41 / 40 | 시연 학교만 |

- 학기는 관리자가 등록한 문서 슬롯의 학기다. 원문에서 학기를 추론하지 않는다.
- 실측 문서는 모두 원문 1학기 문서여서 **1학기 슬롯**에 등록했다(2학기 학생 문맥에 확정하지 않음). 학생 2학기 목록에는 1학기 문서가 0건(§9).
- 학년도: 카탈로그·명단이 2026뿐이라 원문 학년도(2024·2025·2026)와 관계없이 2026 슬롯에 등록했다(합성 슬롯 — 실제 학교·학년도 원천은 1팀 연결 후).

## 6. 실제 분석 결과 — **완료(실제 B16 HTTP)**

분석기: B17 `9a0155c` 사본, `--enable-contract03 --enable-contract03-b13 --enable-contract03-ext --timeout 120`, 토큰은 환경 변수(시작 로그 `tokenSource: env`, `tokenFile: null`, `contract03Ext: true`). Backend `contract03-version=v21.10-b16-dev`, `ASSESSMENT_ANALYZER_TIMEOUT_MILLIS=150000`.

- **9문서 회귀**: 9/9 201, 프로필 `v21.10-b16-dev`. 과목 응답 전체(확장 필드 포함) SHA-256이 **A17(B16 `aa58cb0`)과 9/9 같다** — B17 코드의 B16 프로필 결과는 B16과 같다. 원문 SHA 9/9, HWP·HWPX Locator 8,053/8,053, PDF 근거 문서 밖 0.
- **B13 하위 호환(B17 코드)**: 계정 A만 `v21.9-b13-dev`로 바꿔 9문서 → 9/9 201, 확장 필드 0, 확장 필드를 뺀 결과가 B16과 9/9 같고, A17의 B13 응답과도 9/9 같다.

| 문서 | 슬롯(시연 학교, 2026, 1학기) | 실제 결과 |
|---|---|---|
| F02455 PDF | 1학년 | 13과목 모두 원문 1학년, 요소 배점 35·연결 확인 17. 요소 배점이 있는 채점표를 배점 그대로 확정 200(배점 2개) → 1학년 학생 확정 채점표 배점 2개, 확장 메타데이터 없음 / 2학년 학생 404 |
| F01664 PDF | 1·2·3학년 각각 | 40과목·수행 118, 원문 1학년 12·2학년 17·3학년 11. 각 슬롯에서 그 학년 과목 확정 200(1학년 #0·2학년 #12·3학년 #29), 다른 학년 과목 400 `grade_conflict` |
| F02099 HWPX | 1·2·3학년 각각 | 원문 3학년, 운영계획 24행. 3학년 슬롯 운영계획 확정 200(24행) → 3학년 학생 24행(정밀도 `WEEK_IN_MONTH`·`MONTH`, 원문 주 표기 24/24), 1·2학년 슬롯 400 `grade_conflict`(24행 모두), 1·2학년·다른 학교 학생 404 |

## 7. 1·2·3학년 관리자 확정

- API 실측(§6)과 화면 시험(§8) 모두에서 각 학년 슬롯의 `GET …/subjects`가 `available=true`, `source=DEV_DEMO_CATALOG`, 과목 수 = 카탈로그(13·25·41).
- 1학년 카탈로그 과목 ID는 2학년 슬롯 확정에 쓸 수 없다([IT] 400).
- 평가정보·운영계획 모두 같은 슬롯 규칙과 학년 충돌 검사를 쓴다.

## 8. 1·2·3학년 학생 조회 — **완료(실제 B16 HTTP + React 화면)**

`e2e/assessment-real/a18-grades.spec.ts`(신규, opt-in, 실제 분석기) **3/3 통과**(46.4초, Edge). 학생은 `?devStudent=`로 고른 같은 합성 학교의 1·2·3학년 학생.

1. F02099 → 3학년 슬롯: Wizard 운영계획 과목 머리 '원문 3학년' → 24행 확인 → 확정 → 3학년 학생 Monthly Planner에 그 문서 영역(3~7월 24개), 1·2학년 학생 Planner에는 없음.
2. F02099 → 1학년 슬롯: 확정 시 '원문상 이 문서 학년이 아닌 과목의 행이 있어요' 안내, 확정되지 않음, 1학년 학생에게 없음.
3. F01664 → 2학년 슬롯: 과목 카드 40개, 다른 학년 과목 확정 불가 안내 23개, 2학년 과목 카드 '원문 2학년'·안내 없음 → 수행평가 값 확인 → 화면 확정 → 2학년 학생 '학교 평가 정보'에 보임, 1·3학년 학생에게는 없음(각자 자기 학년 확정 문서가 보이는 상태에서 비교).

A17 실제 화면 시험 `b16-ext.spec.ts`도 같은 Backend(B17 코드)에서 **2/2 통과**(요소 배점 수정·비우기 → 확정 → 학생 배점, 40과목 학년 충돌).

## 9. 학년 충돌·접근 권한 검증

| 검사 | 결과 |
|---|---|
| [실제] 학생 목록(자기 학교·학년·1학기) | 1학년: F02455·F01664(1학년 슬롯)만 / 2학년: F01664(2학년)만 / 3학년: F01664(3학년)·F02099(3학년)만 / 다른 학교 2학년: 0 |
| [실제] 남의 학년을 Query로 요청 | 4명 모두 403 |
| [실제] 2학기 목록 | 4명 모두 0건(1학기 문서는 2학기에 보이지 않음) |
| [실제] 다른 학년·다른 학교 학생의 상세·운영계획 | 404 |
| [IT] `AllGradesPlanSlotApiTest` | 2학년 슬롯: 원문 1학년 과목 `grade_conflict`, 1학년 카탈로그 과목 ID 거절, 원문 2학년 과목 확정 → 같은 학교 2학년 학생만 공개(1·3학년·다른 학교 404, 남의 학년 목록 403, 2학기 목록 0), 학생 응답에 `grades`·`linkReview`·`analysisSubjectIndex` 없음. 같은 원문을 1학년 슬롯에 등록하면 반대로 동작 |
| [IT] 기존 슬롯 | 명단 ON에서도 `school_001` 1학년 = `EXISTING_LEARNERSHIGH` 4과목, 2·3학년 `available=false` |

## 10. B16 확장 필드 보존

- 9문서 확장 필드 수: F02455 요소 배점 35·연결 확인 17·학년 13 / F01912 연결 확인 18·학년 12 / F01664 학년 40 / F01657 12 / F01673 28 / F02099 1 / F04902 10 — A17과 같다(전체 응답 해시 동일).
- 확정 채점표의 요소 배점이 학생에게 전달되고(F02455), `linkReview`·`grades`는 학생 응답에 없다(실측·IT·화면).

## 11. 분석기·Backend Timeout 검증

**연결 확인**

| 항목 | 결과 |
|---|---|
| Backend `ASSESSMENT_ANALYZER_TIMEOUT_MILLIS` → `assessment.analyzer.timeout-millis` | [Unit] `PlanAnalyzerEnvBindingTest` — 150000 연결, `…CONTRACT03_VERSION`·`…BASE_URL`도 연결, 없으면 기본 130000(기본값은 바꾸지 않음 — 시연 환경 변수로 분리) |
| 실제 Backend 기동 | A18 Backend를 150000·3000 두 값으로 기동해 동작 차이로 적용 확인(아래) |
| 계정 B 배포 진입점(B17 `deploy_entry.build_argv`, 서버 미기동) | 결정값(`ANALYZER_ENABLE_CONTRACT03=1`·`ANALYZER_ENABLE_B13=1`·`ANALYZER_ENABLE_CONTRACT03_EXT=1`·`ANALYZER_TIMEOUT_SEC=120`) → `--timeout 120` + 세 Flag. `ANALYZER_ENABLE_CONTRACT03_B13`(오타) → **시작 거부**(exit 2, 올바른 이름 안내). B13 없이 확장 Flag → 시작 거부. `ANALYZER_TIMEOUT_SEC` 5 → 거부(10~900). **비우면 180초**(120을 꼭 넣어야 함) |
| 확장 Flag만 빠진 경우 | 진입점은 시작한다(B13까지만). 이때 계정 A의 B16 요청은 `422 analyzer_rejected:contract03_experimental_disabled`, 저장 없음, B13 대체 없음(A17 실측) |

**오류 경로 (짧은 제한으로 같은 경로 실측, F01781 약 17초 문서)**

| 경우 | 응답 | 소요 | Run·상태 | 학생 |
|---|---|---|---|---|
| Backend 3초 < 분석 | `503 PLAN_ANALYZER_UNAVAILABLE (timeout)` | 3.1초 | Run 없음, `NOT_REQUESTED`, 검토 `UNREVIEWED` | 404 |
| 분석기 5초 < 분석 (Backend 150초) | 분석기 `504 ANALYSIS_TIMEOUT` → `502 PLAN_ANALYZER_BAD_RESPONSE (analyzer_error:analysis_timeout)` | 5.3초 | Run 없음, `NOT_REQUESTED` | 404 |
| 정상(120초/150초) | 201 | 최장 16.6초(F01781) | 저장 | — |

- Timeout은 재시도하지 않는다(기존 IT 포함) → Backend 최대 대기 = 150초.
- **수정(관리자 화면 안내)**: 분석기 쪽 시간 초과가 '분석 결과 형식이 약속(계약)과 달라… 분석기 담당자 확인'으로 잘못 안내되고 있었다. `analysisFailure.ts`에서 `analyzer_error:analysis_timeout`을 '처리 시간 제한을 넘겨 분석을 멈췄어요. 결과를 저장하지 않았어요…'(일시 장애)로 안내한다. API 응답 모양은 그대로이며 계약 §39-1에 두 단계 시간 제한을 적었다. [E2E] Stub `*analyzertimeout*`(실제 분석기와 같은 `504 errors[ANALYSIS_TIMEOUT]` 모양)으로 확인 — 시간 초과 문구 표시, 계약 문구 없음, 분석 결과 없음.
- Backend 응답 `message`('결과 형식이 계약과 맞지 않아요')는 502 공통 문구라 그대로 두었다(화면은 사유 코드로 안내).
- Railway 원격 실측은 하지 않았다(배포 전).

## 12. 과목 상한 40개 유지

- DTO `@Size(max=40)`, CHECK 0~39, 요청 `@Max(49)` 변경 없음. F01664 40과목 그대로 수신·저장(이번 실측: B16 9문서 회귀 1회·학년별 슬롯 3회·B13 1회·화면 시험 2회).
- 40과목을 넘는 원문이면 분석기 단계에서 잘린다 — 계정 A는 추출되지 않은 과목을 만들지 않고, 받은 과목만 표시한다. '전체'라고 표시하는 문구는 없다(과목 수만 표시). 상한 초과 여부를 관리자에게 알리는 신호는 분석기 issue/warning에 의존한다 — 80과목 확장과 함께 후속.

## 13. HWP·HWPX 인증 보호 유지

- 설정 기본값(`structured-confirm-dev=false`) 그대로. [실제] F02099 HWPX 3학년 슬롯 평가정보 확정 → `400 revision.documentFormat: verified_auth_required`.
- HWPX 업로드·분석·원문 구조 위치·운영계획 확정·학생 운영계획 조회는 동작(§6·§8). **HWP·HWPX 평가정보 공식 확정은 미지원**(실제 관리자 인증 연동 필요).

## 14. 시연 DB·Migration 미변경

- `learnershigh-mysql`: 작업 전후 `Exited (0)`, 마지막 실행 2026-11-15 21:42~21:44(UTC) 그대로. 연결·기동하지 않았다.
- Flyway는 일회용 `lh_a18_real`(15개, 실행 스크립트가 DB 이름·포트가 다르면 기동 거부)·Testcontainers·E2E 일회용 DB에만 적용. **A14 `V202611160200`은 시연 DB에 적용되지 않았다**. 새 Migration 없음.
- 일회용 DB(정리 직전): Run B16 PARTIAL 20·FAILED 1, B13 PARTIAL 8·FAILED 1(Timeout 2건은 Run 없음) / 문서 슬롯: 시연 학교 1학년 1학기 6·2학년 3·3학년 3, `school_001` 1학년 2학기 20 / 운영계획 확정 행 332 / 평가정보 확정 8.
- 정리: Backend(5회 기동)·분석기(3회)·Vite(3회) 종료(남은 Python·Node 하위 프로세스는 명령줄의 포트를 확인한 뒤 종료), `lh-a18-real-mysql` 삭제, 포트 18870·18194·33363·5395·5396 닫힘. 다른 컨테이너는 만지지 않았다.

## 15. 전체 회귀

| 범위 | A17 기준 | A18 결과 | 분석기 |
|---|---|---|---|
| Backend Unit | 317 | **322, 실패 0**(생략 1). 신규: `DemoRosterTest` 3(학년별 슬롯·기존 슬롯 불변·2·3학년 학생 Context) · `PlanAnalyzerEnvBindingTest` 2 | — |
| Backend Integration | 201 | **203, 실패 0**(9분 48초). 신규 `AllGradesPlanSlotApiTest` 2 — `AdminSchoolScopeApiTest`와 같은 설정으로 Spring Context 공유(컨테이너 증가 없음) | Stub·합성 |
| Assessment E2E | 22/22 | **23/23**(2.2분, Edge). 신규: 분석기 시간 초과 안내 1 | **Stub** |
| 실제 분석기 화면 시험 | 2/2 | **5/5** — 신규 `a18-grades` 3 + `b16-ext` 2 재실행 | **실제 B16(B17 코드)** |
| 실제 HTTP 드라이버 | — | 9문서 B16·B13 회귀, 학년별 슬롯 7문서 등록·확정·학생 4명, Timeout 2경로 | 실제 B16(B17 코드) |
| Student Care | Unit 145·IT 77 | **Unit 145·IT 77, 실패 0**, 코드·화면·Migration 변경 없음. Playwright Student Care E2E는 **미실행**(Wangyu 절차, 이번 변경과 무관 — Admin Shell·공통 CSS 변경 없음) | — |
| Frontend typecheck·lint·build | 통과 | **통과**(student·admin·shared), e2e typecheck 통과 | — |

- 회귀 시험은 `cleanTest cleanIntegrationTest`로 이전 결과를 지우고 실제로 다시 실행했다.
- A14(관리자 추가 행·재확정)·A13(재검토·이력)·A12(채점기준 보완·노트·파일·피드백·성장 기록)·A15(확장 필드 Stub)·A16(과목 근거 쪽) 시험은 위 전체 실행에 포함돼 모두 통과했다.

## 16. Commit·Bundle

| Commit | 내용 |
|---|---|
| `bc2cc17` | 계약: §38-4 학년별 개발용 시연 슬롯, §39-1 두 단계 시간 제한 (코드보다 먼저) |
| `18ebac1` | Backend: 시연 학교 학년별 슬롯(`DemoRoster.school`, `findSlot`), 시간 제한 설정 설명 + Unit 5·IT 2 |
| `374f51b` | Frontend: 분석기 시간 초과 안내 수정 + Stub `*analyzertimeout*` + E2E 1 |
| `c8f8002` | 실제 분석기 opt-in 화면 시험 `a18-grades` 3 |
| (이 보고서) | docs: A18 보고서 |

- 위 파일만 골라 Stage했다(다른 미Commit 파일 그대로).
- Bundle: `~/.learnershigh-extension/backups/a18-feature-assessment-20261116.bundle`(보고서 Commit 뒤 생성·`git bundle verify`).
- 실측 수치(원문 글자 없음)는 저장소 밖 스크래치 폴더 `a18/`(`result-9docs*.json`·`result-grades.json`·`timeout-results.json`·`deploy-env-check.json`·`db-summary.txt`)에 두었다.
- 실제 분석기 화면 시험 실행 조건: `a18-grades`는 시연 명단 ON Backend + 학생 Vite 1학기(`2026-1`), `b16-ext`는 학생 Vite 2학기(`2026-2`)·`stu_001` — 두 학기 문맥이 달라 따로 실행한다.

GitHub Push·Merge·Rebase·PR 없음. `main` 변경 없음.

## 17. 미완료·외부 의존

### A18에서 완전히 해결한 사항
- 1·2·3학년 × 1·2학기 개발용 문서 슬롯(시연 명단 ON, 합성 학교·카탈로그, 출처 구분) — 확정·학생 공개·학년 충돌·학기 분리를 실측·IT·화면으로 확인.
- F01664 학년별 확정, F02099 3학년 운영계획 확정·3학년 학생 Planner.
- B17 코드의 B16 프로필 = B16 결과(9/9), B13 하위 호환(9/9).
- 시간 제한 환경 변수 연결 확인, 두 단계 Timeout 오류 경로 실측, 분석기 시간 초과의 관리자 안내 수정.
- 확장 Flag 오타·누락 시 동작 확인(오타·B13 없는 확장은 시작 거부, 확장만 빠지면 계정 A 422).

### 실제 학교 데이터 연동이 필요한 사항
- 실제 학교 Master·학교별 개설 과목·학생 학년·학기(1팀, API-OD-A01·OD-A04). 지금 2·3학년은 공통 카탈로그 후보이고 학년도는 2026만이다.
- 실제 관리자 인증(HWP·HWPX 평가정보 공식 확정, Mock Header 대체).

### 계정 B에서 개선해야 하는 사항
- 동명 과목 반복 구간 판정·학년·학기별 과목 식별(현재 두 번째 구간은 보내지 않음 — 계정 A는 만들지 않음).
- 40과목 초과 문서의 잘림 신호(issue/warning)와 80과목 확장 시 출력.
- 확장 Flag만 빠진 배포는 시작은 되므로(B13까지), 운영 점검 목록에 세 Flag 확인을 넣는 것을 제안.

### 사용자 승인 후에만 가능한 사항
- 시연 DB(`lh_demo_manual_20261111`)에 A14 Migration 적용 — 이번에도 적용하지 않았다.
- 과목 상한 40→80(새 Migration·Wizard 검색·성능).
- Railway 배포·실제 학교 문서의 원격 전송.

### Railway 배포 후 재검증해야 하는 사항
- `ANALYZER_TIMEOUT_SEC=120`(비우면 180)·세 Flag(`ANALYZER_ENABLE_CONTRACT03`·`ANALYZER_ENABLE_B13`·`ANALYZER_ENABLE_CONTRACT03_EXT`)·`ANALYZER_ALLOWED_HOSTS`, Backend `ASSESSMENT_ANALYZER_BASE_URL`(HTTPS)·`…TIMEOUT_MILLIS=150000`·`…CONTRACT03_VERSION=v21.10-b16-dev`·토큰.
- 분석기 처리 시간과 HTTP 전체 시간(업로드·응답 전송 포함) 재측정, Timeout 두 경로 재확인.
- `playwright.assessment-real.config.ts`(b16-ext·a18-grades)를 원격 분석기에 연결한 Backend로 재실행.
- 원문 전송 범위(공개 코퍼스 문서만) 확인.
