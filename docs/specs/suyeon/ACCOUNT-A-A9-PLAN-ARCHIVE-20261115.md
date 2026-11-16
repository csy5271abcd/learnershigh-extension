# [계정 A] A9 — 학년도별 평가계획서 열람, 비교 기능 제거, 시연 DB Migration (2026-11-15)

> 시작 HEAD `8ddad98` → `e17b68e`(코드) · `03b48d5`(api-contract) + 이 보고서. Push 없음 · 이력 재작성 없음 · 기존 Migration 수정 없음 · Student Care·AdminShell·계정 B 코드 변경 없음 · 0.3 Gate 기본 OFF 유지.
> 표기: **[Stub]** = E2E 합성 분석기 · **[시연 DB]** = `lh_demo_manual_20261111` 실제 적용.

## 1. 제거한 학년도 비교 기능

| 영역 | 삭제·수정 |
|---|---|
| Backend | `GET .../evaluation-plans/comparison`(Controller 메서드·의존성), `PlanComparisonQueryService`, `PlanComparisonResponse`, `PlanComparisonApiTest`(5건) |
| Frontend | `PlanComparisonRoute.tsx`, `PlanComparison*` Type, `comparePlansHttp`·`comparePlans`, `paths.planCompare`·`plan-compare` view, '학년도 비교' 버튼 |
| E2E | `comparison.spec.ts` |
| 계약 | `api-contract.md` §38-5 비교 조항 → 학년도별 열람 조항으로 대체 |
| DB | 비교 전용 객체 없음 → Migration 없음 |

보존: 학년도별 원문·SHA·분석 Run·Revision·관리자 확정값·운영계획 확정·학생 화면·Monthly Planner. 제거 확인: `GET .../comparison` → 404(`EvaluationPlanApiTest`, E2E), 관리자 `/evaluation-plans/comparison` 경로 → 비교 화면 없음(E2E).
A8의 `ACCOUNT-A-B-THREE-YEAR-COMPARE-CONNECTION-20261115.md`는 이력으로 남기되 **더 이상 유효한 계획이 아니다**(계정 B 3개년 비교 연결 불필요).

## 2. 학년도별 열람 화면 (`/assessment/evaluation-plans/archive`)

학교 → 학년도(실제 등록 문서가 있는 학년도만, 최신순) → 학년·학기 → 문서 목록(파일명·형식·등록일·분석·확정 상태) → 원문 보기·내려받기·검토 화면 → 과목 Chip → 탭 3개.

- **수행평가 · 채점기준**: 항목 목록(Master) + 상세(평가명·영역·시기·반영비율·만점, 내용, 제출물, 수행 조건·준비 사항, 채점표 = 채점 요소 × 수준별 기준 × 점수 × 근거 쪽).
- **월별 운영계획**: 학기 달 순서 묶음 + '이 학기 달 밖' + '시기를 정할 수 없는 계획'. 8종 정밀도·원문 표기 그대로, 단원·학습 내용·성취기준·교수학습 방법·탐구 활동·평가 관련 활동·특별 일정·근거 쪽. 확정 전엔 후보, 확정 뒤엔 확정 행만(제외 행 숨김).
- **평가 구성**: 지필·수행 반영비율, 수행평가 항목 수, 지필 회차·시기. 연도 비교 문구 없음.
- 값 상태: 확정 / 원문에 없음(확정) / 원문에 없음(분석) / 분석하지 못함 / 후보 / 정보 없음 — 값 생성 없음.
- 새 Endpoint 없음: §38·§38-1·§38-3·§39·§39-4·§39-6 조합. 분석 과목↔학업 과목 연결은 초안 `subjectLinks`, 없으면 "분석 과목 1개 + 확정 과목 1개"일 때만 연결(그 밖엔 추정 안 함).
- 원문 근거: 쪽 버튼 → 화면 안 Modal PDF Viewer(그 쪽). HWP·HWPX는 안내문 + 내려받기.

## 3. Daglo 참고 분석 (실제 이미지 열람: `daglo-file`, `daglo-pdf`, `daglo-scripts-01`, `additional/…122402`)

관찰: 흰 바탕 + 연회색 채움 영역(업로드 영역·안내), 그림자 없는 얇은 테두리와 큰 모서리, 탭은 진한 굵은 글자 + 검정 밑줄, 키워드는 파란 테두리 알약, 좌측 목록 선택은 연회색 채움, 주 동작만 파란 채움 버튼, 넉넉한 행간의 한글 본문. → 필터 바(연회색), 학년도·학기 알약(선택 = 파란 테두리·연파랑), 과목 Chip, 밑줄 탭, 문서·항목 목록 연회색 선택, 표는 얇은 선. 색은 기존 `--as-*` Token만 사용(다크 모드 호환), Stepper 무채색 유지. 이미지에 없는 규칙을 Daglo 공식 규칙으로 주장하지 않는다.

## 4. HWP/HWPX 미리보기 — **미완료(권한 차단)**

- 확인: 로컬에 **한컴오피스 2024**(`HNC/Office 2024/HOffice130`)와 COM 자동화 객체 `HWPFrame.HwpObject`가 등록되어 있다 → 새 구매·외부 업로드 없이 쓸 수 있는 후보.
- 시도: 공개 HWP 1건을 임시 폴더에서 COM으로 PDF 저장하는 시험 스크립트 실행 → **Claude Code 자동 권한 분류기가 거부**(PowerShell 실행 정책 우회 + 한컴 보안 모듈 등록 호출이 포함된 명령). 우회하지 않았다.
- 결과: 변환 미검증 → 코드에 변환 기능을 넣지 않았다. 현재 범위 그대로: HWP/HWPX 원문 보관·SHA·내려받기 됨, 앱 안 미리보기 없음(415, `previewAvailable=false`), 열람 화면에 안내 표시.
- 다음 단계(승인 후): 사용자 허용 → 변환 시험(표·병합 셀·쪽 번호·글꼴) → 파생 PDF Rendition 저장(원본·SHA 보존, 크기 제한, 실패 시 내려받기 유지) → `previewAvailable` 갱신. `documentLocator`→변환 쪽 이동은 검증 전까지 하지 않는다.

## 5. 시연 DB 백업·Migration [시연 DB]

| 단계 | 결과 |
|---|---|
| 대상 확인 | 컨테이너 `learnershigh-mysql`(3307, Volume `learnershigh-extension_mysql-data`), DB `lh_demo_manual_20261111`(기록상 시연 DB, Flyway 8건 성공). 기본 DB `learnershigh_extension`은 다른 이력(3건)이라 대상 아님 |
| SQL 검토 | 4건 모두 스키마 추가·CHECK 확장·Unique 교체. 데이터 삭제·변경 없음 |
| 백업 | `mysqldump --single-transaction` 724KB(sha256 `ca8f6bc9…bae2`) + 원문 Storage 100개 파일 복사(해시 전부 일치). 위치: 사용자 홈 `.learnershigh-extension/backups/a9-demo-20261115/`(저장소 밖) |
| 복원 검증 | 일회용 MySQL(tmpfs)에 복원 → 22개 테이블 건수 전부 일치 |
| 시험 적용 | 복원본에 Backend Flyway 실행: validate 12건 → 4건 적용, 기존 건수 변화 없음, 새 테이블 4개 |
| 시연 적용 | `V202611140100__assessment_plan_analysis_partial_status`, `V202611140300__assessment_plan_review_draft`, `V202611150100__assessment_teaching_plan`, `V202611150200__assessment_review_draft_scope` 성공(now v202611150200). 건수 = 시험 결과와 동일, Storage 해시 불변, 문서 5건·분석 Run 5건 조회 정상 |
| 정리 | 일회용 컨테이너 삭제, 시연 컨테이너는 원래대로 중지. 리셋 API·데이터 삭제 없음 |

0.3 Gate는 켜지 않았다(Migration 적용 ≠ 0.3 운영 활성화).

## 6. api-contract.md Commit (`03b48d5`)

- §1~§64는 HEAD 기준으로도 수연 담당 범위(§56)이고 이번 Commit은 그 Assessment 재작성분이다. **§65 Wangyu Student Care는 HEAD와 바이트 동일**, 상담·학생 케어 보호 경계는 §56에 유지.
- §38-5 비교 조항 제거 → 학년도별 열람 조항. 줄바꿈을 HEAD와 같은 LF로 맞춤.

## 7. 검증

| 범위 | 결과 |
|---|---|
| Backend Unit / Integration | **297/0 · 184/0**(비교 시험 −5, 학년도 경계 +1, Student Care 145·77 포함) |
| Frontend typecheck · lint · build | 통과 |
| Assessment E2E (Stub, Edge) | **7/7** — 신규 `plan-archive`: 학교·학년도·문서·과목·수행평가·채점기준·운영계획·원문 Modal·학년도 전환 혼합 없음·1024/390 가로 넘침 없음·비교 경로/API 404 |
| 실행 안 함 | 실제 분석기로 열람 화면 확인, HWP/HWPX 변환, Student Care E2E(해당 코드·AdminShell 변경 없음) |

## 8. 남은 결정·외부 의존

- **HWP/HWPX 변환 시험 권한**(§4).
- D-A8-1 운영계획만 있는 문서 학생 공개, D-A8-2 0.3 운영 활성화, D-A8-3 실패 결과 저장 정책.
- PDF 확정값에 분석 과목 순번이 없어 다과목 문서는 초안 `subjectLinks`가 없으면 확정 표시를 과목에 붙이지 못함(값은 후보로 표시) — 확정값에 `analysisSubjectIndex`를 PDF에도 저장할지 결정 필요.
- 1팀: 실제 학교 마스터(현재 등록 문서가 있는 학교만 목록), 학업 과목 원천.
