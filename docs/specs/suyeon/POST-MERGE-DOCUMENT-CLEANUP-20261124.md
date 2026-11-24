# `main` 병합 후 문서 정리 (2026-11-24)

입력: `CLAUDE_CODE_POST_MERGE_DOC_CLEANUP_20261124.md`(사용자 지시). 표기: **이번 실행** = 이 회차에 실제로 한 것 / **이전 증거** = 앞 회차 기록(이번 결과로 세지 않음) / NOT RUN.

## 1. 개요 및 범위

- **문서 정리만** 했다. 코드·설정·Migration·시험·시연 데이터·사용자 DB·Storage·서버 프로세스는 바꾸지 않았다(§9 확인).
- 사용자 결정(2026-11-24):
  1. **Railway 는 현행 운영·배포 대상이 아니다.** 현행 분석기는 Spring Boot 안 `local` 모드다.
  2. **운영·배포·실제 로그인(Actor Provider) 연동은 1팀 담당**이다. H1(실제 로그인)은 이번에 구현·해결하지 않았고, 문서에도 해결된 것처럼 쓰지 않았다.
  3. Railway 원격 프로젝트 삭제·토큰 폐기 같은 **외부 서비스 조작은 하지 않았다**(1팀과 조율할 운영 항목).
  4. `main` 이 최종 개발 기준이다. 과거 보고서·기여 기록·결정 근거는 지우지 않고, 현재와 과거의 차이만 표시했다.

## 2. 기준 Git commit/PR 및 사용한 근거

| 항목 | 값 | 확인 |
|---|---|---|
| 기준 | `origin/main` = `5b9db4b895c92eb306f2fbca9a7615363db185db`(PR #17 merge, 부모 `c03a1a4`·`af593e9`) | 이번 실행 `git fetch` |
| integration | `af593e9`(PR #20 merge) — `main` 과 트리 동일 | 이전 증거(병합 검증 회차), 이번 fetch 로 HEAD 동일 확인 |
| PR #17·#18·#19·#20 | 모두 `closed · merged`(merged_at 2026-11-23T22:49:10Z · 2026-11-22T13:47:44Z · 2026-11-23T21:19:03Z · 2026-11-23T22:46:43Z) | **이번 실행** GitHub REST `pulls/{n}` 재조회 |
| 작업 위치 | 별도 worktree, 브랜치 `docs/post-merge-assessment-cleanup-20261124`(시작 `5b9db4b`) | 원본 작업 트리(미커밋 변경 보존)는 건드리지 않음 |

근거 자료(실제로 읽음): 병합 검증 보고서 `POST-MERGE-MAIN-VERIFICATION-20261124.md`(**로컬 검증 증거 — 저장소 미포함**, §8~§12), `README.md`, `docs/OWNERSHIP.md`, `docs/SOURCE_OF_TRUTH.md`, `docs/architecture/overview.md`·`integration-boundary.md`·`shared-conventions.md`, `docs/api/api-contract.md`, `ARCHITECTURE.md`·`AGENTS.md`·`CLAUDE.md`, `docs/specs/suyeon/` 의 README·실행 가이드·분석기 설정·A28 보고서·SCREENSHOTS 2개·`progress.md`·`legacy-cleanup-plan.md`·`harness-change-proposals.md`, `docs/specs/wangyu/README.md`(참조만). 코드 대조: `PlanAnalyzerConfig`·`LocalPlanAnalyzer`·`PlanAnalysisService.translate`·`application.yml`·`AssessmentErrorCode`·`frontend/package.json`.

**이전 증거(병합 검증 회차 — 이번 실행 아님)**: `main` CI run 45283275859 전부 success · `main` 과 코드가 같은 트리로 Backend 단위 480(실패 0)·Frontend verify PASS·Node 201/201·Assessment E2E 89/89·REPLAY 8/8 · 사용자 DB Migration 31/31 체크섬 일치(추가 적용 없음) · 실환경 노트 PDF 다운로드 성공.

## 3. 변경 파일 전체 목록 (BEFORE → AFTER)

추가 1 · 수정 16 · 삭제 0 · 이동 0 (모두 `.md`).

| 파일 | BEFORE | AFTER |
|---|---|---|
| `docs/OWNERSHIP.md` | 현행 담당 표 없음. §3·§10·§20 이 퇴역한 Mentor Hub·`frontend/mentor/**` 등을 현재 소유 영역처럼 서술 | **0절 '현행 담당'** 추가(Assessment·분석기 = Suyeon, PR #18 원 작성 = Wangyu 기여 기록, 학생 케어 = Wangyu, Shared, **운영·배포·실제 로그인 = 1팀**), 퇴역 영역 표. §3·§3-2·§10·§10-3·§10-4·§20 예시에 '퇴역'·'예정(현재 미생성)' 표기(원문 삭제 없음) |
| `docs/architecture/overview.md` | 본문 전체가 Mentor Surface 포함 초기 구조를 현재처럼 서술 | 머리말에 **현행 구조** 블록(Surface 2개, Feature 2개, Domain, `local` 분석기, `frontend/shared/` 예정, 1팀) · §3-3 Mentor Surface 제목·경로에 퇴역 표기 |
| `docs/architecture/shared-conventions.md` | 적용 대상에 `frontend/mentor/**`·`frontend/shared/**` | 각각 '퇴역'·'예정(현재 미생성)' 주석 |
| `README.md` | §11 Frontend Rules 가 퇴역 Feature 를 '주요 Feature' 로, `main` 에 없는 ADR-0008 인용, §12 예시 Domain | 현행 Feature 안내·퇴역 표기·ADR-0008 사실 정정, `local` 분석기 한 줄, **운영·배포·실제 로그인 = 1팀** 안내 |
| `docs/SOURCE_OF_TRUTH.md` | 수연 Feature Spec 을 삭제된 4개 파일로 안내 | 실제 `features/assessment-*.md` 5개 + 색인 링크 + 삭제 경위(`109140f`, 2026-11-13) |
| `ARCHITECTURE.md` | npm workspaces 에 `mentor`, Feature 표가 퇴역 예시 | '현행' 블록(Feature 2개, workspaces `student`·`admin`), `frontend/shared/`·`database/seed/` 예정 표기 |
| `AGENTS.md` | '현재 단계: Scaffold, Feature Business Logic 없음, `database/`·`e2e/` 없음'(사실과 다름) | 현행 상태 문장으로 교체, 초기 문구는 괄호로 보존. 행동 규칙은 변경 없음 |
| `docs/api/api-contract.md` | §1 에 병합 후 상태 없음 | §1 머리 **병합 후 상태**: DRAFT 절 = 구현·병합됐으나 팀 승인 전(APPROVED 로 바꾸지 않음), 매핑 181개 기술 확인, 1팀 인계(인증·Linux 글꼴·Gateway·CORS), `local` 분석기, `API-OD-07` 정의 누락 사실 |
| `docs/specs/suyeon/assessment-studentcare-local-run-guide.md` | A22~A24 Railway 현행 안내(§4 분석기 설정·§4 표·§9-1·§9-2 Railway 왕복·§10 토큰·§11 체크 항목·§12 `analyzer_auth_failed`·`BUSY`·`PLAN_ANALYZER_NOT_CONFIGURED`(주소)·§5 Migration 18건) | 대상 `main`, `local` 분석기 기준으로 교체, 문제 해결 표를 실제 코드 동작으로(`none` → 503, `UNSUPPORTED_FORMAT` → `PLAN_ANALYSIS_UNSUPPORTED`, 옛 모드 값 시작 거부, OCR), Migration 31, §13 '당시 기록' 표기, **§14 퇴역 기록** 신설 |
| `docs/specs/suyeon/assessment-analyzer-setup.md` | 보안 메모 'Railway 서비스를 계속 쓴다면 토큰 무효화' | '현재 코드 Railway 미사용' 과 '과거 토큰 무효화 확인 필요(1팀/Railway 관리자), 이력 재작성은 팀 결정' 분리 |
| `docs/specs/suyeon/README.md` | 현행/과거 문서 구분 색인 없음, A28 보고서 미수록 | **0절 문서 안내** 추가: 현행 문서 · A28 보고서 · 팀원 기여·인계 · 과거 회차(논리적 아카이브) · 로컬 검증 증거 표기 |
| `docs/specs/suyeon/A28-51-53-PDF-EXPORT-TRASH-PERMANENT-DELETE-20261124.md` | 'PR #20 Draft · PR #17 미병합'(작성 시점 사실) | 본문 그대로 + 말미 **병합 후 상태**(날짜·REST 근거·증거 발생 시점 구분) |
| `docs/specs/suyeon/ACCOUNT-A-A28-ASSESSMENT-UAT-FINAL-20261122.md` | 회차 요약의 'main·PR #17 미병합' | 본문 그대로 + 말미 **병합 후 상태** |
| `docs/specs/suyeon/assessment-15schools-60students-seed-202611/SCREENSHOTS.md` | 저장소에 없는 이미지 링크 67 | 파일 이름 표기 `(저장소 미포함)` + 안내 |
| `docs/specs/suyeon/assessment-demo-final-integration-20261112/SCREENSHOTS.md` | 같은 문제 32 | 같은 처리 |
| `docs/specs/suyeon/progress.md` | 2026-11-13 스냅샷이 '진행 상태' 로 링크됨 | 머리에 '갱신 안 됨 — 회차 보고서·색인 참고' 한 줄(본문 보존) |
| `docs/specs/suyeon/POST-MERGE-DOCUMENT-CLEANUP-20261124.md` | 없음 | 이 보고서(신규) |

## 4. Railway 현행 안내 제거 및 과거 기록 보존 결과

- **현행 문서에서 제거·교체**: 실행 가이드 15곳(위 표), `assessment-analyzer-setup.md` 보안 메모, README·overview·api-contract 에 'Railway 는 현행 운영·배포 대상 아님 · 분석은 `local`' 명시.
- **집계(이번 실행, 점검 스크립트 — Markdown 328개)**: Railway 언급 줄 BEFORE 169(19 파일) → AFTER 179(22 파일). 늘어난 줄은 모두 '퇴역·현행 아님' 문구(README·overview·api-contract·실행 가이드 §14·색인·이 보고서)다. 현행 문서(`README`·`OWNERSHIP`·`SOURCE_OF_TRUTH`·`ARCHITECTURE`·`AGENTS`·`CLAUDE`·`docs/architecture/*`·`api-contract`·`assessment-analyzer-setup`·실행 가이드·`docs/specs/suyeon/README`)의 남은 Railway 언급은 **전부 퇴역/역사 문맥**이거나 폴더 경로(`e2e/assessment-railway/`)다 — 수동 전수 확인.
- **역사 기록 보존(수정하지 않음)**: `ACCOUNT-A-A17~A27`, `ACCOUNT-A-A19/A23/A24-RAILWAY-*`(퇴역 경위·토큰 경고 근거), `A27-UX-*`, `A28-27-PR18-COMPARISON.md`, `A28-37` 등 — 당시 Railway 사용 사실 그대로.
- **바꾸지 않은 것**: `e2e/assessment-railway/` 폴더 이름(합성 문서 생성기 2개 — 이름만 옛것. 실행 가이드·스크립트가 경로를 쓰므로 이번 범위 밖, 변경 제안으로 남김). 코드 주석의 Railway 언급(이미 '퇴역' 문맥).
- **외부 서비스**: Railway 프로젝트 삭제·토큰 폐기 **미실행**. **H2 보안 경고 유지** — 과거 Git 커밋에 Railway 토큰 형태 값이 남아 있음(값은 어디에도 다시 쓰지 않음). '현재 코드 Railway 미사용' 과 '과거 토큰 무효화 확인 필요(1팀/Railway 관리자)' 를 문서에서 분리했다. `git filter-repo`·force push 하지 않음.

## 5. OWNERSHIP / 아키텍처 / 현재 실행 안내 정합성

| 사실 | 문서 근거 | 코드·저장소 대조(이번 실행) |
|---|---|---|
| Surface 2개(student·admin), mentor 삭제 | OWNERSHIP 0절·overview 머리말·ARCHITECTURE·AGENTS | `frontend/package.json` workspaces = `student`,`admin` |
| Feature = assessment(Suyeon) · student-care(Wangyu) | 같음 | `frontend/*/src/features/` = `assessment`, `student-care` · Backend = `assessment`·`studentcare`·`common` |
| 분석기 = Backend 안 `local`, `none`=503, `loopback-stub`=E2E 전용 | 실행 가이드·분석기 설정·README | `PlanAnalyzerConfig`(그 밖 값은 시작 거부), `application.yml` `mode: ${ASSESSMENT_ANALYZER_MODE:local}` |
| 분석기 정확도 담당 = Suyeon, 원 작성 = Wangyu(PR #18) | OWNERSHIP 0절 | `A28-25-…` 상태 갱신(2026-11-22 사용자 결정), `A28-27-PR18-COMPARISON.md`(작성자 `beans3142`) |
| 학생 케어 담당 = Wangyu | OWNERSHIP §4·0절 | 병합 검증: 옛 `main` 대비 학생 케어 코드 diff 0(이전 증거) |
| 운영·배포·실제 로그인 = 1팀, 인증 미해결 | OWNERSHIP 0절·README·overview·api-contract §1 | `MockHeaderAssessmentActorProvider` 하나, `learnershigh.integration.mode: mock` |
| Migration 31 | 실행 가이드 §5 | `database/migrations` SQL 31개 |
| 퇴역 Feature Spec 4개 삭제 시점 | SOURCE_OF_TRUTH | `git log --diff-filter=D` → `109140f`(2026-11-13) |

- 협업 문서(`docs/specs/wangyu/**`, `docs/design/student-care-*`)는 **읽기만** 했고 바꾸지 않았다.
- `legacy-cleanup-plan.md` §5 는 "OWNERSHIP §3·§10·§11 구형 예시는 원본 작업자 미Commit 수정과 조율 후 정리" 라고 적었다. 그래서 OWNERSHIP 원문은 지우거나 고쳐 쓰지 않고 **현행 절 추가 + 퇴역/예정 표기**만 했다 — PR 리뷰에서 공동 담당 확인 필요.
- `.claude/rules/frontend-mentor.md`(하네스 규칙)는 바꾸지 않았다(규칙 파일 — 별도 합의 대상).

## 6. 문서 색인 및 아카이빙 결과

- `docs/specs/suyeon/README.md` 0절을 **입구 색인**으로 만들었다: 0-1 현행 문서 11 · 0-2 A28 보고서 8 · 0-3 팀원 기여·인계 · 0-4 과거 기록(회차 보고서 15 + Railway 시기 3 + 날짜 폴더 16 + 설계·계획 당시 문서 6).
- **논리적 아카이빙만** 했다(파일 이동 0). 많은 문서가 서로·스크립트·보고서에서 경로로 참조돼, 전수 참조 검사 전 이동은 링크를 깨뜨릴 위험이 있다.

검토한 3개 문서 분류(삭제 없음):

| 문서 | 분류 | 이유 |
|---|---|---|
| `progress.md`(1,393줄, 마지막 2026-11-13) | **UPDATE**(이번엔 머리 안내 한 줄만) | `AGENTS.md` 가 '진행 상태'로 링크하지만 A10 이후 갱신 없음. 본문 갱신 또는 ARCHIVE 는 담당자 결정 |
| `legacy-cleanup-plan.md` | **KEEP**(완료 기록, 장기적으로 ARCHIVE) | 단계 1~5 완료 기록·남은 조율 항목(OWNERSHIP 구형 예시) 근거 |
| `harness-change-proposals.md`(2026-11-13) | **ARCHIVE** | Shared 하네스 변경 제안 1차 — 각 제안(P-01~)의 채택 여부 미확인이라 삭제 금지 |

DELETE_CANDIDATE: **없음**(확신 있는 중복 문서를 찾지 못함). PR #18 연구 자료·완규님 기여·인계 문서는 KEEP.

## 7. 깨진 링크 99건 처리 현황

| 파일 | BEFORE 깨진 링크 | 처리 | AFTER |
|---|---|---|---|
| `assessment-15schools-60students-seed-202611/SCREENSHOTS.md` | 67 | 이미지가 저장소·Git 이력·원본 작업 트리 어디에도 없음 → 링크를 파일 이름 표기 `(저장소 미포함)` 로, 상단에 '과거 로컬 검증 당시 보관, 저장소 미포함' 안내 | 0 |
| `assessment-demo-final-integration-20261112/SCREENSHOTS.md` | 32 | 같음 | 0 |

- 새 이미지·경로를 만들지 않았다. 개인정보·시연 데이터 재첨부 없음.
- 전체(이번 실행): Markdown 상대 링크·이미지 링크 BEFORE 144개 중 깨짐 99 → AFTER 깨짐 **0**(새 색인 링크 포함, §9).

## 8. API DRAFT·운영 인계 및 남겨둔 제약

- **DRAFT 계약**(약 25절): `api-contract.md` §1 에 '구현·병합됐지만 팀 승인 전' 으로 명시. **어느 절도 APPROVED 로 바꾸지 않았다.**
- **1팀 인계(구현·결정하지 않음)**: 실제 로그인·운영용 Actor Provider(H1, API-OD-07·API-OD-A01), Linux 서버 한글 글꼴(§20-1 PDF — Nanum/Noto CJK 또는 `assessment.export.pdf-font-path`), 운영 Gateway·CORS·배포 인증, Railway 과거 토큰 무효화 확인(H2).
- **다른 DB 의 Flyway 위험**: PR #18 의 미도입 파괴적 Migration `V202611180100`(검토 표 2개 DROP)을 적용한 적이 있는 DB(시연/QA DB·다른 담당 로컬 DB)는 `main` 기동 시 Flyway 검증에서 거부될 수 있다 — **시연/QA DB 적용 이력 확인 필요(담당자 협의)**. 사용자 DB(`lh_local_run`)는 31/31 적용·체크섬 일치로 해당 없음(이전 증거).
- **간헐 실패** `SchoolInfoSelectionClassificationApiTest`: **미해결(Medium)**. 유력 원인(분류 뒤 비동기 분석이 도는 동안 계획서 삭제 → 409)은 병합 검증 보고서 기록. 코드·시험 수정 없음.
- `API-OD-07` 은 `application.yml`·일부 문서가 인용하지만 현재 `api-contract.md` Open Decision 표에 정의가 없다 → 정리 대상으로 기록만 함.

## 9. 문서 검증 명령과 실제 결과 (이번 실행)

| 검사 | 방법 | 결과 |
|---|---|---|
| 링크·이미지 대상 존재 | 로컬 점검 스크립트(추적 파일 기준 Markdown 328, 코드 블록·인라인 코드 제외, 외부 URL·순수 앵커 링크 제외) | BEFORE 링크 144·깨짐 99 → AFTER 깨짐 **0**(커밋 직전 재실행) |
| Railway·mentor 언급 | 같은 스크립트 + `git grep -i railway`(역사 문서 제외) | 현행 문서의 남은 언급 = 퇴역·역사 문맥·폴더 경로뿐(§4) |
| 색인 링크 | 색인 생성 스크립트가 넣는 모든 링크 대상 존재를 assert | 통과 |
| 공백·줄 끝 | `git diff --cached --check` + 줄 끝 비교 | 실제 끝 공백 없음. 표시된 33줄은 `assessment-analyzer-setup.md`(45/45줄)·`assessment-studentcare-local-run-guide.md`(346/346줄)가 `main` 에서부터 **전체 CRLF** 인 파일이라 추가 줄의 CR 이 잡힌 것 — 파일 줄바꿈 방식 그대로 유지(수정 뒤 46/46·358/358 CRLF) |
| Repository Harness | `scripts/verify.ps1 -SkipFrontend -SkipBackend`(CI Harness job 과 같은 명령) | **PASS** |
| 변경 범위 | `git diff --cached --name-only` | `.md` 17개뿐(코드·설정·Migration·시험·데이터 0) |
| 원본 환경 | 원본 작업 트리 `git status` 항목 수·HEAD | 변경 없음 |
| 전체 Backend·E2E·REPLAY | — | **NOT RUN**(문서만 변경 — 코드 영향 없음, 메모리 사고 이력) |
| 헤딩 앵커(`#…`) 검사 | — | **NOT RUN**(헤딩 앵커 링크는 이번에 추가하지 않음) |

## 10. 미해결 사항

| 항목 | 담당 | 중요도 | 후속 |
|---|---|---|---|
| H1 실제 로그인·운영 Actor Provider | **1팀** | High(운영 투입 전 필수) | 팀 통합 |
| H2 과거 Railway 토큰 무효화 확인·이력 재작성 여부 | **1팀** / Railway 관리자 · 팀 | High | 외부 확인 |
| DRAFT 계약 약 25절 승인 | 공동(Shared) | Medium | 팀 리뷰 |
| `V202611180100` 적용 DB(시연/QA) 확인 | 담당자 협의 | Medium | 읽기 전용 확인 → 백업·리허설 |
| `SchoolInfoSelectionClassificationApiTest` 간헐 실패 | Suyeon | Medium | 시험에서 분석 완료 대기 후 삭제 |
| Linux 한글 글꼴·Gateway·CORS | **1팀** | Medium | 배포 설정 |
| OWNERSHIP §3·§10·§11 구형 예시 본문 정리 | 공동(원 작업자 조율) | Low | 이번엔 표기만 |
| `progress.md` 갱신 또는 ARCHIVE | Suyeon | Low | 결정 |
| `e2e/assessment-railway/` 이름 변경 | Suyeon | Low | 경로 참조 수정과 함께 별도 변경 |
| `API-OD-07` 정의 누락 | Shared | Low | Open Decision 표 보완 |
| `.claude/rules/frontend-mentor.md` | 공동 | Low | 규칙 합의 |

## 11. GitHub Commit / Push / PR 및 CI 상태

- 브랜치 `docs/post-merge-assessment-cleanup-20261124`(시작 `5b9db4b`), 문서 전용 커밋, 일반 push, `main` 대상 PR. 커밋 SHA·PR 번호·CI 결과는 이 파일에 미리 쓰지 않고 PR 본문·최종 보고에 실제 결과로 적는다(결과를 사칭하지 않기 위해).
- 자동 병합·브랜치 삭제·`main` 직접 push·force push·이력 수정: 하지 않음.
- 원본 작업 트리(`integration` 체크아웃, 미커밋 변경)·사용자 DB·Storage·8080/5173/5174 서버: 건드리지 않음.

## 12. 최종 판정

**PASS WITH WARNINGS** — 현행 문서에서 Railway·Mentor·PR 상태의 잘못된 안내를 바로잡고(깨진 링크 99 → 0, 퇴역 표기, 병합 후 상태 단락), 과거 기록은 그대로 보존했으며, Assessment·학생 케어·1팀(운영·배포·실제 로그인) 경계를 명시했다. 경고: 운영 인증(H1)·과거 토큰(H2)은 **1팀 소관으로 미해결**, DRAFT 계약 승인·타 DB Migration 확인·간헐 실패 시험이 남아 있다. OWNERSHIP 원문 정리는 공동 담당 리뷰가 필요하다.
