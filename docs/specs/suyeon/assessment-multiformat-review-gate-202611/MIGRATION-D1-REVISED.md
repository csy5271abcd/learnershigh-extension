# D-1 Migration 보완안 (승인 요청용, 미적용, 2026-11-10)

> SQL 초안: `sql/D1-draft.sql`. `database/migrations/`에는 파일을 만들지 않았다(Migration 4개 해시가 작업 시작과 같음). 아래 시험은 모두 **새로 만든 격리 시험 Schema**에서 했다.

## 1. 이전 초안에서 바뀐 점

| 항목 | 이전 | 보완 | 이유 |
|---|---|---|---|
| `evidence_format` | NULL 허용 | 기존 행을 PDF로 채운 뒤 **NOT NULL** | 형식 NULL 행이 CHECK를 UNKNOWN으로 통과하는 문제 제거 |
| 형식별 CHECK | NULL 조합을 처리하지 않음 | 형식 NOT NULL + `IS [NOT] NULL` 비교만 사용 → 결과가 항상 TRUE/FALSE | MySQL CHECK는 UNKNOWN을 통과시킨다 |
| HWP·HWPX Locator | 값이 있을 때만 필수(앱) | DB에서도 **항상 필수**(부재 확인도 확인 위치 필요) | null 정책(`API-CONTRACT-REVISED.md` §4) |
| `analysis_subject_index` | 없음 | 추가, HWP·HWPX 필수 | 원래 후보값 복원·과목 근거 검증 |
| Locator JSON 모양 | 없음 | 객체·깊이 2(중첩 금지)·키 12개·1,000 byte 이하 CHECK | 악의적 중첩·과대 JSON 차단 |
| sourceCheck CHECK | `method IN (…)`만 | 쌍 검사 + **`method IS NOT NULL`을 먼저** + 소문자 hex 64 | 1차 시험에서 "SHA만 있는 행"이 통과함을 확인 |
| `BROWSER_PDF_VIEW` | 허용값 | 제외 | PDF review는 바꾸지 않는다(최소 범위) |
| 원문 인용 | 500자 자르기 검토 | **저장하지 않음** | Run의 `result_json`에 원문 그대로 남아 있다. 같은 Locator로 찾는다(잘라서 뜻이 바뀌는 일 없음) |

## 2. CHECK 진리표 — 실제 MySQL 8.4.11 시험 (`scripts/d1_truth_table.py`, **42/42 PASS**, 2차)

2차 Schema `lh_assessment_d1_truth3`(새로 만듦, 2026-11-11 00:0x): 기존 Migration 4개 → 2차 D-1 초안 적용 → INSERT·UPDATE. 1차 결과(40/40, `lh_assessment_d1_truth2`)에 아래 2건을 더했다.

> **2차 보완(2026-11-10 23:5x):** PDF 분기에 `analysis_subject_index IS NULL`이 없어 PDF 확정값에 분석 과목 번호를 넣을 수 있었다(계약안은 PDF `analysisSubjectIndex` = `not_allowed`). `ck_assessment_plan_confirmed_evidence_shape`의 PDF 분기에 조건을 추가하고 INSERT·UPDATE 각 1건을 시험에 넣었다.

| 형식 | PDF 쪽 | Locator | 분석 과목 번호 | 기대 | 결과 |
|---|---|---|---|---|---|
| PDF | 있음 | 없음 | — | 허용 | 허용 |
| PDF | 없음 | 없음 (값 null, 기존 정책) | — | 허용 | 허용 |
| PDF | 있음 | 있음 | — | 거절 | 거절 (shape) |
| PDF | 없음 | 있음 | — | 거절 | 거절 (shape) |
| HWP | 없음 | 있음 | 0 | 허용 | 허용 |
| HWPX | 없음 | 있음 | 0 | 허용 | 허용 |
| HWP | 있음 | 있음 | 0 | 거절 | 거절 (shape) |
| HWPX | 있음 | 없음 | 0 | 거절 | 거절 (shape) |
| HWPX | 없음 | 없음 | 0 | 거절 | 거절 (shape) |
| HWP | 없음 | 있음 | 없음 | 거절 | 거절 (shape) |
| PDF | 있음 | 없음 | 0 | 거절 | 거절 (shape) — **2차 추가** |
| NULL | 없음 | 있음 | 0 | 거절 | 거절 (NOT NULL) |
| NULL | 있음 | 있음 | 0 | 거절 | 거절 (NOT NULL) |
| NULL | 있음 | 없음 | — | 거절 | 거절 (NOT NULL) |
| DOCX | 없음 | 있음 | 0 | 거절 | 거절 (format) |

JSON 검사: 문법 오류·배열·**이중 인코딩된 JSON 문자열**·중첩 객체·키 13개·1,000 byte 초과·음수 과목 번호 → 모두 거절. 한글 값 → 허용, 재조회 값 동일(UTF-8 바이트 확인).
UPDATE 우회: PDF 행에 Locator 추가, PDF 행에 분석 과목 번호 추가(2차), HWP 행에 쪽 번호 추가, HWP 행 Locator 삭제, 형식 NULL, HWP→PDF 변경(Locator 남음) → 모두 거절.
sourceCheck: 둘 다 없음 허용, method+소문자 hex 허용 / method만·SHA만·다른 method·대문자·hex 아님·63자·UPDATE로 SHA만 지움 → 모두 거절.
원자성: 다중 행 INSERT 중 1행 위반 → 전체 거절, 부분 저장 0행.

> **1차 시험에서 "SHA만 있고 method NULL" 행이 통과했다.** `NULL = 'LOCAL_FILE_EXTERNAL_VIEWER'`가 UNKNOWN이 되어 `FALSE OR UNKNOWN = UNKNOWN`이 되기 때문이다. `method IS NOT NULL AND …` 순서로 고친 뒤 새 Schema에서 다시 40/40을 통과했다.

## 3. 기존 데이터 Schema 사본 (`scripts/d1_existing_copy.py`, **14/14 PASS**, 1차·2차 모두)

`lh_assessment_rn_pdf`(지난 회귀의 PDF 확정 기록, 합성)를 `mysqldump`로 **읽기만** 해서 새 Schema로 복사했다(1차 `lh_assessment_d1_copy`, 2차 SQL은 `lh_assessment_d1_copy2`). 현재 코드의 Backend를 사본에 띄운 채 D-1을 적용하고 전후를 비교했다.

| 확인 | 결과 |
|---|---|
| confirmed_value·review·revision·analysis_run 행 수·내용 해시 | 동일(2·1·2·1행) |
| 인덱스·외래키(7개) | 동일 |
| 기존 확정값 | 모두 `evidence_format='PDF'`, Locator·과목 번호 NULL |
| 기존 Review | 원문 확인 기록 Column 모두 NULL |
| Admin 문서·분석, Student 목록·상세 API 응답 | 적용 전후 동일 |
| 현재 Entity 모양의 INSERT(새 Column 없음) | **거절**(`Field 'evidence_format' doesn't have a default value`) |

→ **D-1과 Entity·Service 변경은 같은 배포에 함께 나가야 한다.** Migration만 먼저 적용하면 현재 코드의 PDF 확정 저장이 실패한다.
→ 사본 데이터가 작다(Review 1건). 승인 후 더 큰 사본(여러 PDF 확정·개정본)으로 다시 시험한다.

## 4. JSON Column 매핑 — Hibernate 7 실측 (`scripts/D1JsonMappingProbeTest.java.txt`, 임시 탐침)

D-1이 적용된 시험 Schema에서 Spring Boot 4.1.1(Hibernate 7) 설정 그대로 실행했다. 탐침은 시험 후 저장소 test 폴더에서 빼서 문서 폴더에만 보관한다.

| 매핑 | 저장 결과 | 재조회 |
|---|---|---|
| A `@JdbcTypeCode(SqlTypes.JSON) String` | `JSON_TYPE=OBJECT`, **이중 인코딩 없음** | 같은 JSON 값(키 순서는 MySQL이 정렬) |
| B `@Column(columnDefinition="json") String` | `OBJECT`, 이중 인코딩 없음 | 같음 |
| C `@JdbcTypeCode(SqlTypes.JSON) Map<String,Object>` | `OBJECT`, 한글 UTF-8 정상 | `Map`으로 복원 |

권장: **A**. `DocumentLocator` record를 기존 `JsonMapper`로 직렬화해(NON_NULL) String으로 저장하고, 읽을 때 record로 되돌린다(`value_json`과 같은 방식). MySQL이 키 순서와 공백을 정규화하므로 **저장한 문자열과 요청 문자열을 비교하지 않고, 해석한 record끼리 비교한다.**

## 5. Revision 형식과의 일치

CHECK는 다른 테이블(Revision의 `content_type`)을 볼 수 없다. 그래서 다음 세 가지로 막는다.

1. Service가 `evidence_format = revision.format()`으로만 쓴다(요청 값을 받지 않음).
2. 확정값은 수정 경로가 없다(Entity `updatable=false`, 수정 API 없음). Revision의 형식도 바뀌지 않는다.
3. 승인 후 통합 테스트와 점검 Query로 불일치 0건을 확인한다.

```sql
SELECT cv.id FROM assessment_plan_confirmed_value cv JOIN assessment_plan_revision r ON r.id = cv.revision_id
WHERE cv.evidence_format <> CASE r.content_type WHEN 'application/pdf' THEN 'PDF'
                                                WHEN 'application/x-hwp' THEN 'HWP'
                                                WHEN 'application/hwp+zip' THEN 'HWPX' END;
```

Review의 sourceCheck 유무(HWP·HWPX는 필수, PDF는 없음)도 Review 테이블에 형식이 없어 Service가 검사한다.

## 6. Entity 영향 (승인 후)

| 대상 | 변경 |
|---|---|
| `PlanReview.PlanConfirmedValue` | `evidenceFormat`(NOT NULL), `evidenceLocatorJson`(A 매핑), `analysisSubjectIndex` — 모두 `updatable=false` |
| `PlanReview` | `sourceCheckMethod`, `sourceCheckSha256` |
| Repository | 변경 없음 |

## 7. 실행·롤백 계획 (승인 후)

1. 승인된 경로에 새 Migration 파일 추가(기존 파일 수정 금지, 작성 시각 버전)
2. 빈 Testcontainers Schema → Flyway 전체 적용 + Migration 통합 테스트(진리표를 JUnit으로 옮김)
3. 더 큰 기존 데이터 사본 → 적용 → 행·응답 비교
4. Entity·Service와 같은 변경으로 배포
5. 롤백은 **새 전진형 Migration**으로 한다. 먼저 HWP·HWPX review를 다시 차단하고, HWP·HWPX 확정값을 어떻게 둘지 결정한 뒤 CHECK·Column을 제거한다. Flyway 이력 조작·기존 Migration 수정은 하지 않는다.
6. 적용 전 `mysqldump --single-transaction`으로 백업한다.

## 8. 남긴 시험 Schema

`lh_assessment_d1_truth`(1차, sourceCheck 결함 확인용), `lh_assessment_d1_truth2`, `lh_assessment_d1_copy`, 2차 `lh_assessment_d1_truth3`, `lh_assessment_d1_copy2`(Backend 접속용 `learnershigh` 사용자에게 이 Schema 권한만 추가). 모두 합성 데이터이고 로컬 Docker에만 있다. 삭제하지 않았다.
