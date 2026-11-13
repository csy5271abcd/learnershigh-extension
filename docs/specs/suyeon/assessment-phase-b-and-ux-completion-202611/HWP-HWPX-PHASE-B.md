# HWP·HWPX 공식 검토 (Phase B)

## 1. D-1 Migration (`V202611111600`) + 보완 (`V202611111610`)

| 대상 | 내용 |
|---|---|
| `assessment_plan_confirmed_value` | `evidence_format`(PDF·HWP·HWPX, NOT NULL), `evidence_locator_json`(평평한 JSON 객체·키 12개·1,000B 이하), `analysis_subject_index`(0~39). 형식별 모양 CHECK: PDF는 Locator·과목 번호 없음, HWP·HWPX는 PDF 쪽 없음 + Locator·과목 번호 필수 |
| 기존 행 | `content_type='application/pdf'` Revision의 값만 `PDF`로 Backfill. 아니면 NOT NULL 단계에서 Migration 실패(조용히 칠하지 않음) |
| `assessment_plan_review` | `source_check_method`(`LOCAL_FILE_EXTERNAL_VIEWER`)·`source_check_sha256`(소문자 64 hex) 쌍 CHECK. 보완: `manual_comparison_confirmed`(원문 확인 기록이 있을 때만 TRUE), `reviewer_auth`(MOCK_HEADER·VERIFIED, 기존 행 MOCK_HEADER) |
| 중복 방지 | UNIQUE `(review_id, subject_id, field_path)`. 적용 전 3개 Schema 중복·비정규 색인 0건 확인(자동 삭제·병합 없음) |

D-1과 Entity·Service 변경은 한 jar로 함께 배포했다(Migration만 먼저 적용하지 않음). 모든 PDF 확정 INSERT가 `evidence_format='PDF'`를 쓴다.

### 적용 검증

| 대상 | 결과 |
|---|---|
| 빈 Schema (Testcontainers) | 통합 테스트 144개가 매번 전체 Migration 8개를 적용한 뒤 실행 |
| 기존 PDF 데이터 사본 `lh_demo_pdf` | 적용 전후 Revision 3·Review 1·확정값 2·Run 2·수행평가 19·노트 Revision 18·결과물 버전 13 행 수와 MD5가 같다. 확정값 2건 PDF Backfill, Review 1건 MOCK_HEADER |
| 시연 Schema `lh_demo_manual_20261111` | 수행평가 1건 Checksum 같다. Flyway 5 → 8 |
| D-1 진리표 42 · PDF 사본 14 (이전 Python 시험) | **이번에 다시 실행하지 않음.** 새 Schema를 만들어야 하는데, 권한 있는 이름은 모두 이전 시험 데이터가 있는 Schema다. 지우지 않았다. CHECK 동작은 통합 테스트의 거절·저장 시험과 위 실데이터 적용으로 확인했다 |

## 2. 검토 API (M-1~M-7, `PUT .../review`)

요청과 사유 코드는 `../assessment-multiformat-review-gate-202611/API-CONTRACT-REVISED.md` §3-3·§3-4 그대로다. 구현: `ReviewFieldRules` + 기존 준비 코드 `ReviewEvidenceScope`(근거 노드 판정).

| 검사 | 사유 | 확인 |
|---|---|---|
| sourceCheck 없음 / 방식 / SHA 형식 / SHA ≠ Revision / 수동 대조 확인 없음 | `required`/`not_allowed`/`format`/`document_mismatch`/`required` | IT·E2E |
| 과목 번호 없음 / 범위 밖 / 중복 | `required`/`unknown`/`duplicate` | IT·E2E |
| 다른 Revision의 Run | `analysisId: unknown` | IT·E2E |
| 다른 항목·병합 정보가 다른 Locator | `evidence_not_in_analysis` | IT·E2E |
| Locator 없음 / PDF 쪽 번호 있음 | `required` / `not_allowed` | IT |
| kind 접두어 ≠ 문서 형식 / 표 칸 경로 ≠ 행·열 | `format_mismatch` / `path_mismatch` | IT |
| 근거 노드에 구조 Locator 없음(채점 요소 등) / 분석 밖 영역 | `evidence_scope_unavailable` | IT·E2E |
| 없는 노드 / 비정규 색인 `[00]` / 같은 fieldPath 두 번 | `unknown` / `unknown` / `duplicate` | IT·E2E |
| 값 null인데 absence 없음 / 값 있는데 absence | `required` / `not_allowed` | IT |

위반이 하나라도 있으면 Review·확정값을 저장하지 않는다(부분 저장 없음).

## 3. 관리자 원문 수동 대조 (A안)

검토 전체 페이지에서 다음 순서로 진행한다.
1. 로컬 원본 HWP·HWPX를 고른다.
2. 브라우저가 SHA-256을 계산해 등록 SHA와 비교한다. 불일치하면 확인 체크와 확정이 비활성이다.
3. 한글 프로그램에서 대조하라는 안내를 표시한다.
4. 과목 ID를 입력하고 필드를 고른다.
5. 필드마다 분석기 구조 위치(구역·표·행·열)를 라디오로 고른다.
6. "직접 대조했다"를 명시적으로 체크하고 확정한다.
7. 화면에 "원문 검토 기록"(검토자·시각·확정 수·SHA·수동 확인 여부)을 다시 조회해 보여 주고, MOCK_HEADER면 "운영 검토 실적 아님" 배지를 붙인다.

SHA 일치는 같은 파일이라는 뜻일 뿐, 사람이 대조했다는 증명이 아니다. 그래서 수동 대조 확인을 따로 저장한다.

## 4. 운영 인증 보호

| 환경 | 설정 | HWP·HWPX 확정 |
|---|---|---|
| 기본·시연(18080) | `assessment.plan-review.structured-confirm-dev=false` | 400 `revision.documentFormat: verified_auth_required` (실험 Flag와 무관) |
| 격리 합성 시험(18081, Testcontainers) | `true` | 허용. 기록 `reviewer_auth=MOCK_HEADER` |

실제 관리자 인증(`VERIFIED`)은 아직 없다. 운영 확정은 **운영 인증 대기**다.

## 5. 학생 노출

학생 평가계획서 응답은 그대로다(확정 상태 `reviewStatus`만). 근거 위치, 후보, 검토 기록, SHA는 내보내지 않는다(E2E 확인).

## 6. 한계

- 같은 평가 항목 안의 평가명·반영비율·만점은 같은 근거 범위를 공유한다. 분석 JSON이 필드별 근거를 주지 않기 때문이다(계정 B 계약 변경 필요).
- HWP 원본 브라우저 E2E는 없다. HWP는 서명 검사용 합성 바이트로 통합 테스트만 했다. 실제 한글 문서와 계정 B 분석기 연동 검토 E2E는 다음 작업이다.
- E2E의 분석 결과는 계정 B 분석기 대신 저장소 Fixture(초안 수신 JSON)를 API로 넣었다.
