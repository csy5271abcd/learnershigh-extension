# [계정 A] A13 — 운영계획 재검토·재확정, 시연 DB Migration, 관리자 학교 범위, 화면 조작 E2E (2026-11-16)

> 상태 표기: **완료·E2E 통과** / **완료·일부 시험 미완료** / **부분 구현** / **외부 팀 의존** / **사용자 결정으로 범위 제외**
> [IT] Backend 통합 시험(Testcontainers MySQL) · [E2E] Playwright, 일회용 DB의 실제 Backend·Storage, 분석기만 Stub(합성 결과) · [시연 DB] `lh_demo_manual_20261111`

## 1. 시작 상태

- HEAD `bf8fb82`(A12), Branch `feature/assessment-student-integration-enhancement`, Stage된 파일 없음.
- 실행 중이던 Backend·Frontend·분석기 없음, 시연 DB 컨테이너 중지 상태. 계정 B 저장소·분석기 서비스(8765·8766)는 건드리지 않았다(계정 B 문서 2건만 읽기 전용으로 열람).
- 다른 담당자·이전 작업의 미Commit 파일(`.claude/rules/*`, 루트 문서, ADR, `docs/architecture/*`, `scripts/*`(새 `scripts/CLAUDE.md` 포함), seed·증거 폴더, `backend/bin/`, `references/**`)은 그대로 두었다.

## 2. 운영계획 재검토·재확정 — **완료·E2E 통과**

흐름: 운영계획 단계 → 확정본·확정 이력 → '운영계획 재검토 시작'(확인 창) → 확정본 기반 초안(재검토 중 표시, 학생은 이전 버전) → 행 확인·수정·제외(·복원 = 다시 확인) → 원문 근거(A11 근거 버튼·구조 뷰어 그대로) → '운영계획 다시 확정' → 새 버전 → 이력(n차 · 학생 공개 중 / 이전 버전(보존), 행 읽기 전용 보기) → 학생 Monthly Planner 최신 버전.

| API | 내용 |
|---|---|
| `POST …/teaching-plan-draft/reopen` | 확정으로 닫힌 운영계획 초안 다시 열기, 없으면 최신 확정 행으로 새 초안(CONFIRMED·EXCLUDED→ABSENT·EDITED→고친 칸만). 확정 전 `409 teaching_plan_not_confirmed`, 이미 열림 `409 already_open` |
| `PUT …/teaching-plan-draft` | 재검토 중에만 확정 문서에 저장 가능 |
| `PUT …/teaching-plan-review` | 재검토가 열려 있으면 다시 확정 → `review.versionNo` = N+1, 아니면 기존대로 `409 teaching_plan_already_confirmed` |
| `GET …/teaching-plan-reviews` | 버전 이력(최신 → 과거, 관리자 전용, 행 포함) |
| `GET …/teaching-plan-review` | 최신 버전(+ `versionNo`) |
| 학생 `GET …/{planId}/teaching-plan` | 최신 버전의 공개 행만(버전·이력·제외 행 없음) |

- **범위 밖**: 분석 후보에 없는 **새 행 추가**. 확정 요청이 후보 행 `rowKey`만 받는 기존 계약이라 계약 추가가 필요하다 → **부분 구현**(수정·제외·복원은 됨).
- 시험 [IT]: 1·2·3차 확정, 이전 버전 행 불변(1차 수정 단원 보존), 최신 판별(버전 번호), 재검토 없는 재확정 409, 같은 버전 중복 저장 DB 거절(동시 재확정), 학생 응답에 제외 행·버전 없음, 확정 전 재검토 409, 인증 없음 401. [E2E A] 화면으로 1차(1행 공개·1행 제외) → 재검토 → 2행 추가 공개·제외 행 복원 → 다시 확정 → 이력 2건·1차 행 보기 → 학생 API 3행·Planner 화면.

## 3. 평가정보 확정과의 독립성

평가 정보(§39-8)와 운영계획(§39-10)은 초안 범위(`EVALUATION`/`TEACHING_PLAN`)·확정 테이블·이력 API가 따로다. 운영계획 재검토는 평가 정보 초안·확정 이력을 바꾸지 않는다([IT] 운영계획 3차 확정 뒤 평가 정보 이력 1건·재검토 닫힘 그대로, [E2E A] 평가 정보 이력 0건 그대로).

## 4. 기존 확정 이력 보존

확정 기록·행은 UPDATE하지 않는다(새 버전 INSERT만). Migration은 기존 행에 `version_no = 1`만 채운다.

## 5. 신규 Flyway Migration

`V202611160100__assessment_teaching_plan_review_versions.sql` — `version_no INT NOT NULL`(기존 행 1), `CHECK(version_no >= 1)`, `UNIQUE(revision_id, version_no)` 추가 뒤 `UNIQUE(revision_id)` 제거(revision_id FK Index 유지). 기존 Migration·Checksum 변경 없음.

## 6. 일회용 DB 적용·검증

| 검증 | 결과 |
|---|---|
| 빈 DB 전체 적용(Testcontainers) | Integration 전체 195/0 |
| 시연 DB 복원본 + **기존 운영계획 확정 1건·행 2개**(일회용 복원본에만 넣음) | Flyway validate 14 → 1건 적용, 기존 확정 `version_no 1`, 행 2개(확정·제외) 그대로, 건수 변화 = `flyway_schema_history` +1, 제약 교체 확인 |
| 같은 복원본에 2차 버전 / 2차 중복 | 2차 저장됨, 중복은 `ERROR 1062` 거절 |

## 7. 시연 DB 적용 — **적용함**

- 대상: Docker `learnershigh-mysql`(로컬 개발, 포트 3307)의 `lh_demo_manual_20261111` — 이름·Flyway 이력(v202611151300, A10)으로 확인, 운영 DB 아님, 접속 중인 다른 연결 없음.
- 적용: `V202611160100`만 성공(now v202611160100), Flyway validate 통과.
- 정리: 일회용 복원 컨테이너 삭제, 시연 컨테이너 원래대로 중지. 원문 Storage·데이터 변경 없음, 시연 DB에 시험 데이터 넣지 않음.

## 8. 시연 DB 백업·복원

- 백업: `mysqldump --single-transaction` 731,844 byte(sha256 `09ae099b…`) → 사용자 홈 `.learnershigh-extension/backups/a13-demo-20261116/`(저장소 밖).
- 복원 검증: 일회용 MySQL(tmpfs)에 복원 → 26개 테이블 건수 전부 일치.

## 9. 적용 전후 변화

| 항목 | 전 | 후 |
|---|---|---|
| Flyway | v202611151300(13건) | v202611160100(14건) |
| 운영계획 확정 / 행 | 0 / 0 | 0 / 0 |
| 그 밖 25개 테이블 건수 | — | 전부 같음(분석 Run 5건 REVIEW_REQUIRED 등) |
| 제약 | `uk_…_revision` | `uk_…_version`, `ck_…_version` |

## 10. 학생 Monthly Planner 최신값

[IT] 재검토 중 1차(T01·T03) → 2차(T05·T08) → 3차(T09)만. [E2E A] 학생 API 1행 → 재검토 중에도 1행 → 다시 확정 뒤 3행, Planner 화면 표시.

## 11. 관리자 학교 목록의 데이터 원천 — **완료(Frontend 개발 우회 제거)**

- 이전: 개발 모드에서만 Frontend가 학생 목록을 읽어 학교를 모았고, 운영 빌드에서는 'API 없음'.
- 이번: `GET /api/admin/assessment/managed-schools` — 관리자 담당 지점 학생(`AdminStudents.inScope`)의 학업 Context에서 학교 ID 기준 중복 제거, 학생 수. 학교 Master 아님(새 학교 테이블·전역 검색 없음).
- 화면: 학교별 평가계획서의 학교 선택 = ① 담당 학생 학교(학생 수·등록 건수) ② 평가계획서가 등록된 다른 학교.

## 12. 관리자–학생–학교 권한 경계

- [IT] 시연 명단(합성 지점 A·B, 학교 15곳): 관리자 A·B는 서로 겹치지 않는 5개 학교씩, 같은 지점 관리자는 같은 목록, 다른 지점 학생 상세 404, 지점 없는 운영자는 빈 목록, 인증 없음·학생 401. [E2E C·D] 다른 지점 관리자는 피드백 요청·성장 기록 404.
- **정책 차이(보고)**: 평가계획서 운영 권한은 기존 결정 OD-A08('정상 관리자는 모든 학교')이라 **줄이지 않았다** — 담당 학생이 없는 학교의 등록 문서 열람·학교 코드 직접 입력·업로드가 그대로 가능하다. 사용자 결정 '담당 학교 우선 표시'는 목록 순서로 반영했고, 권한 축소가 필요하면 OD-A08 개정 결정이 필요하다.

## 13. 기존 LearnersHigh 수행평가 연결 — **사용자 결정으로 범위 제외**

DB Mapping·API 연결·데이터 이전·자동 동기화·자동 생성 모두 하지 않았다. 새 Assessment 학교 수행평가(자체 Frontend·Backend·API·DB)는 그대로다. 이후 미완료로 추적하지 않는다.

## 14. 노트 블록 편집기 화면 E2E — **완료·E2E 통과**

[E2E B] 학교 수행평가 상세 → 노트 제목·본문 블록 입력 → '지금 저장' → DB v1 → 새로고침 뒤 본문 유지 → 수정·저장 → v2 → '수정 이력' → v1 열기(첫 내용 그대로, 고친 내용 없음) → 오래된 기준 Revision 저장 409(낙관적 잠금). Loading·Error 화면 조작은 이번 E2E에 없음.

## 15. 관리자 답변 작성 화면 E2E — **완료·E2E 통과**

[E2E C] 학생 요청(API) → 학생이 요청 뒤 노트 수정 → 관리자 화면(담당 지점 관리자)에 요청 당시 내용만, 고친 내용 없음 → 의견 입력·임시 저장(학생에게 아직 안 보임) → 보내기·확인 → DELIVERED → 학생 피드백 화면에 의견 → 재전달 409 → 다른 지점 관리자 404 → 학생 원본 노트(2개 Revision) 그대로.

## 16. 성장 기록·보관함 E2E — **완료·E2E 통과**

[E2E D·E] 새 성장 기록 화면 → 제목·관련 활동(학교 수행평가)·배운 점 → 저장 → 상세·새로고침 유지 → 목록 → 관리자(담당 지점) 조회·다른 지점 404 → 보관함 최근 기록·과목 폴더(통합과학2). 삭제·복원·상태 전이는 새로 만들지 않았다.

## 17·18·19·20. 시험 결과

| 범위 | 결과 |
|---|---|
| Backend Unit | **305건, 실패 0**(생략 1 = 기본 꺼진 코퍼스 덤프 도구) |
| Backend Integration 전체 | **195건, 실패 0**(신규: 운영계획 재확정 2, 담당 학교 1) |
| Frontend typecheck·lint·build(student·admin·shared) | 통과 |
| Assessment E2E (Edge, 일회용 DB, Stub 분석기) | **19/19**(기존 15 + 신규 `a13-flows` 4) |
| Student Care 회귀 | Unit 145·Integration 72(결과 파일 기준) 실패 0, 코드·화면·Migration 변경 없음 |
| 실제 분석기 | 이번에는 실행하지 않음(계정 B B12 진행 중 — 분석기 서비스 변경·사용 회피). A12 실제 검증 결과 유지 |

## 21. 계정 B 0.3 계약 변경 검토 (P1, 문서만)

계정 B `B11-CONTRACT03-CHANGE-PROPOSAL-20261116.md`·`B11-ACCOUNT-A-DEV-INTEGRATION-GUIDE-20261116.md`(읽기 전용). 계정 B는 계정 A가 받아들이기 전에는 아래 필드를 보내지 않는다고 명시했다. 이번에 코드에 넣지 않았다.

| 제안 | 계정 A 영향 |
|---|---|
| `rubric[].maxScore?`(요소 배점) | DTO `RubricCriterion` 선택 필드 + `AnalysisImportValidator` 범위 검사. Wizard 분석 후보 표에 '요소 배점' 열. 확정 저장: A12 채점표 값(`levels[].score`)과 별개라 `rubric[n].maxScore`를 채점표 값 모양(`rubric_shape`)에 선택 필드로 추가하면 Migration 없이 저장 가능. 학생 표에 '요소 배점' 표시 |
| `rubric[].linkReview?: "REVIEW_REQUIRED"` | 분석 후보에만(확정값 아님). Wizard 채점기준 행에 '사람 확인 필요' 표시 |
| `subjects[].grades?: [int]` | 같은 결과 안 과목명 중복 판정 키를 (과목명, 학년)으로 — 현재 `duplicate` 거절 규칙 변경(§39-7). 학년 슬롯과 다르면 경고 |
| 과목 상한 40 | `@Size(max=40)`·확정값 `analysis_subject_index` CHECK(0~39)·초안 `@Max(49)`가 함께 묶여 있다. 상향 시 CHECK 교체 Migration 필요. 대안: 상한 유지 + 학년별 분리 분석 안내 |

권장: B12 결과 확인 뒤 양쪽 계약(`api-contract.md` §39-3, B 계약)을 같은 날 함께 바꾸고, 계정 A는 Gate 뒤(기본 OFF)에서 먼저 받는다.

## 22·23. Git·백업

| Commit | 내용 |
|---|---|
| `cedbd92` | Backend: Migration·운영계획 재검토·재확정·이력·담당 학교 API·시험 |
| `7c2f44e` | Frontend: 운영계획 재검토·이력 UI, 담당 학교 우선 표시, 패널 배치 |
| `83a3bbd` | E2E `a13-flows` 4 |
| `d571715` | `api-contract.md` §39-10·§33-1 |
| (이 보고서) | docs: A13 보고서 |

- Git Bundle: 보고서 Commit 뒤 사용자 홈 `.learnershigh-extension/backups/a13-feature-assessment-20261116.bundle` 생성·`git bundle verify` 확인.
- **GitHub Push·Fetch·Merge·Rebase·PR 실행하지 않음.** `main` 변경 없음.

## 24. 남은 외부 의존성·후속

- 운영계획 새 행 추가(계약 추가 필요).
- 1팀: 인증·권한, 전체 학교 Master, 학업 과목 원천, 실제 학교·학생 식별자. (기존 수행평가 연결은 범위 제외)
- 완규: Student Care가 들어간 최신 main과의 통합(별도 단계), 학교알리미 자동 수집.
- 계정 B: B12 결과 확인 뒤 0.3 계약 변경(§21), 분석 품질.
- OD-A08(평가계획서 운영 권한 = 모든 학교) 유지 여부 — 담당 학교로 줄이려면 결정 필요.
