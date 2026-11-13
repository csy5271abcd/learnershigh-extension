# v21.1 합성 PDF × Backend 실제 통합 결과 (2026-11-09~10)

> 모두 **합성 자료**(가상고·가상과학탐구·2099학년도)다. 실제 학교 문서는 DB에 넣지 않았다.
> 검토 확정(PUT review)은 **합성 데이터 기반 검토 API 시험**이며 실제 사람 검토가 아니다. 과목 매핑(가상과학탐구 → `subj_14`)은 시험용 가정이다.

## 1. 입력 파일 (계정 B, 읽기 전용)

| 파일 | 직접 계산한 SHA-256 | 보고값과 일치 |
|---|---|---|
| `runs/v21-pdf-quality-backend-bridge-20261109/e2e/synthetic-e2e.pdf` (30,783 byte, 2쪽) | `ab52297581ef154dbd0abe00a0cffcceec01513248bb60416fd2f5909173b404` | 예 |
| 같은 폴더 `analysis-import.json` (Adapter 0.2 출력) | `585a69a9b0090fc503d5aa55ddb0062dfe39cb63ecdc36df544505dc3ad2cb11` | (보고값 없음) |

- JSON 원본 바이트를 그대로 HTTP로 보냈다(손수정 없음).
- 같은 두 파일을 바이트 복사해 `backend/src/test/resources/assessment/analyzer-v21_1/`에 Fixture로 두었다. 기존 v21 Fixture(`analyzer-v21/`)는 그대로다.

## 2. 환경

| 항목 | 값 |
|---|---|
| Backend | `bootRun --server.port=18080`, 최종 빌드(itemKey 검증·수신 응답 수정 포함) |
| DB | 로컬 Docker MySQL 8.4(3307), **새 빈 Schema `lh_assessment_e2e_v211b`** (1차 실행은 `lh_assessment_e2e_v211`) |
| 수신 기능 | 이 프로세스에만 `ASSESSMENT_ANALYSIS_IMPORT_ENABLED=true`. `application.yml` 기본값 false 유지 |
| 스크립트 | `scripts/e2e_v211.py` (HTTP + `docker exec mysql` 읽기) |

기존 `learnershigh_extension` DB, Volume, mentor Migration 이력은 건드리지 않았다. Flyway repair도 하지 않았다.

## 3. 결과 — 최종 빌드 33/33 PASS

| # | 확인 | 결과 |
|---|---|---|
| 1 | PDF 등록 | 201, `UNREVIEWED`, `fileRef:null` |
| 2 | `planId`·`documentRevisionId` | 반환 |
| 3·4 | 원본 JSON 최초 수신 | 201, `REVIEW_REQUIRED`·`UNREVIEWED`, 서버 경고 0 |
| 5 | 응답 `analysisId` | DB에 저장된 그 Run과 같음 |
| 5 | 같은 요청 재전송 | 200, 같은 `analysisId`, Run 1건 |
| 6 | SHA-256·쪽 수 | DB `sha256` = 파일 값, `page_count` = 2, `file_ref` NULL |
| 7 | DB 후보 | `result_json` = Adapter `subjects` **완전 일치**. Run `REVIEW_REQUIRED`·`EXTERNAL_IMPORT`·`v21.1/backend-adapter-0.2` |
| 8 | 관리자 분석 조회 | 200. 과목 1(가상과학탐구), 지필 1(W01), 수행 2(P01·P02). P01 활동·제출물 '탐구 보고서'·조건 2·채점 2, P02 활동·조건 1·채점 1·제출물 없음. Locator는 PDF 물리 쪽 1~2 |
| 9 | 검토 상태 | `UNREVIEWED`, `confirmedFields` 없음, Review 0건 |
| 10 | 학생 목록·상세 | 200. 응답 키는 문서 메타데이터·`reviewStatus`뿐(후보 미노출). 미확정 Revision 참조 400 `not_confirmed`, 저장 없음 |
| E | 수신 거절(모두 저장 없음) | 인증 없음 401 · 운영 권한 없는 관리자 404 · 학생 Header 401 · SHA 불일치 400 `document_mismatch` · 쪽 수 불일치 400 `page_count_mismatch` · `confidence` 400 `unknown_field` · `status=CONFIRMED` 400 `format` |
| R | [합성 시험] 검토 확정 | 200 `CONFIRMED`, 후보 Run은 그대로 `REVIEW_REQUIRED` |
| K | itemKey | P99 400 `evaluationItemRef.itemKey:unknown`(저장 없음) · W01(지필) 400 `not_allowed`(저장 없음) · P01 201 |
| K | Student ↔ Admin | 학생 상태 IN_PROGRESS → 강남 관리자 같은 ID·상태·참조, 분당 관리자 404, 다른 학생 404 |

1차 실행(`lh_assessment_e2e_v211`, itemKey 1차 구현 빌드)은 31/31 PASS였다. 그 뒤 아래 §4의 두 가지를 고치고 최종 빌드로 다시 실행했다.

## 4. 이번 작업에서 찾아 고친 Backend 결함

| # | 결함 | 원인 | 조치 |
|---|---|---|---|
| D-1 | 확정 Revision의 없는 `itemKey`(P99) 참조가 201 | Backend가 itemKey를 확인하지 않음(G-7) | `ITEMKEY-VALIDATION.md` |
| D-2 | **지필 항목(W01)도 수행평가로 참조 등록됨** | 1차 itemKey 구현이 지필·수행 Key를 모두 허용. 계약 §12 "지필평가 항목을 수행평가로 생성하지 않는다" 위반 | 수행 항목만 허용, 지필 Key는 400 `not_allowed` |
| D-3 | 수신 응답의 `analysisId`가 방금 저장한 Run이 아닐 수 있음 | 응답을 "수신 시각이 가장 늦은 Run"으로 만들었는데, 시각이 같으면(테스트 고정 시계·빠른 연속 수신) UUID 순서로 정해짐. 전체 통합 테스트에서 간헐 실패로 발견 | 수신 응답은 그 요청이 만든 Run(재전송이면 기존 Run)을 직접 가리키게 수정 + 회귀 Test. `GET .../analysis`의 "가장 최근 Run" 의미는 그대로다(같은 시각 동률은 남은 한계) |

## 5. 분석기 출력 관찰 (계정 B 전달용)

- 예상 결과 문서(`EXPECTED-RESULT.md`)와 같았다. 분석기 쪽 오류는 발견하지 못했다.
- `writtenEvaluation.weightPercent = null`(묶음 값 아님)과 `exams[0].maxScore = null`(원문에 시험 전체 만점 없음)을 Backend가 그대로 저장·반환한다. 0으로 바꾸지 않는다.
- `analyzer.version`이 `v21.1/backend-adapter-0.2`로 바뀌었다. Backend는 버전 문자열을 검사하지 않고 기록만 한다.

## 6. 자동 테스트

`AnalyzerV211ImportAndItemKeyApiTest`(통합 2건, 위 Fixture 사용)와 회귀 결과는 `REPORT.md` §4에 있다.

## 7. 남은 상태

- `lh_assessment_e2e`, `lh_assessment_e2e_v211`, `lh_assessment_e2e_v211b` Schema에 합성 데이터가 남아 있다(로컬 Docker 전용).
- Backend·Vite 서버는 모두 종료했다. Docker MySQL 컨테이너는 켜져 있다.
