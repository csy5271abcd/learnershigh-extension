# 계정 B 합성 HWP × 계정 B Adapter 실제 E2E (2026-11-10)

> 합성 자료(가상 학교). 실제 학교 문서는 DB에 넣지 않았다. HWP 검토 확정은 정책상 차단돼 실행하지 않았다(사람 검토 기록 없음).

## 1. 입력 (계정 B, 읽기 전용 · 복사·수정·재생성 없음)

| 항목 | 값 |
|---|---|
| 원본 | `runs/v21-multiformat-backend-bridge-20261110/synthetic/synthetic-plan.hwp` (36,864 byte) |
| SHA-256 (직접 계산) | `581cc33d951d26b8ab81797fae46e8e8c54859a146b68ea870ef08e8629cde2b` — 인계값과 같음 |
| 파일 서명 | OLE(`D0 CF 11 E0 A1 B1 1A E1`), Backend 등록 검사(한글 5.x FileHeader, 암호·배포용 아님) 통과 |
| Adapter JSON | `synthetic-results/SYNHWP.experimental-import.json` — 계정 B `multiformat_adapter.py` 출력(`analyzer.version = v21.1/multiformat-adapter-0.1-draft`), SHA-256 `390301d5…` |
| Payload 내용 | 과목 1(가상과학탐구) · 지필 W01(40%, 만점 null, 5월) · 수행 P01(30%·100·4월, 제출물 1·조건 2·채점 2) · P02(30%·100·6월, 제출물 0·조건 1·채점 1) · 수행 비율 60 · 지필 묶음 비율 null · warnings [] |
| Locator | 30개 모두 `HWP_TABLE_CELL`(`kind, section, path, table, row, col, rowSpan, colSpan`), `pdfPageNumber`·`pageCount` 없음 |
| 개인 메타데이터 | 원본 파일에는 '마지막 저장자'로 Windows 사용자 이름이 들어 있다(계정 B 보고). 그래서 원본을 저장소로 복사하지 않았고, 이 보고서에도 적지 않는다. Payload JSON에는 사용자 이름이 없다 |

## 2. 환경

Backend 18080(`ASSESSMENT_ANALYSIS_IMPORT_ENABLED=true`, `ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true`, 이 프로세스만), 로컬 Docker MySQL 새 빈 Schema `lh_assessment_mf_adapter_e2e2`(1차 `lh_assessment_mf_adapter_e2e`), Admin Vite 5174(http, Mock 인증 `adm_plan_operator`, `VITE_ASSESSMENT_DEV_MULTIFORMAT=true`), Chrome + Playwright. 스크립트 `scripts/adapter-e2e.mjs`.

## 3. 결과 (최종 빌드, HWP 42건 = 흐름 23 + 오류·보안 19, 모두 PASS)

| 단계 | 결과 |
|---|---|
| 관리자 화면 업로드 | `POST` 201. DB `content_type=application/x-hwp`, `page_count` NULL, 크기 36,864, `file_ref` NULL(원본 미보관) |
| 관리자 응답 | `documentFormat=HWP`, `pageCount=null`, `checksum` = 원본 SHA-256. 문서 카드 "HWP · 실험" |
| 최초 수신(원본 JSON 바이트 그대로) | **201** `REVIEW_REQUIRED`·`UNREVIEWED`, 서버 경고 없음 |
| Run | DB 1건, `id` = 응답 `analysisId`, `EXTERNAL_IMPORT`, 분석기 버전 기록 |
| 재전송 | **200**, 같은 `analysisId`, Run 1건, Review 0건 |
| 저장 JSON | Adapter `subjects`와 구조 동일(키 순서·null 직렬화만 무시한 비교 — 필드 추가·삭제·변조 없음) |
| Locator 보존 | `HWP_TABLE_CELL` 보존, 쪽 번호 값 없음, HWPX kind 섞임 없음 |
| 관리자 분석 조회 | `subjects` = Adapter `subjects`, `UNREVIEWED`, 확정값 없음 |
| 원본 JSON 파일 | 시험 전후 SHA-256 같음(수정 없음) |
| 관리자 검토 화면 | 과목·W01·탐구 보고서·토론 활동, 활동·제출물·조건(P02 제출물은 "추출되지 않음 · 확인 필요"), 채점기준(실험 설계·보고서 작성), 근거는 "분석기가 기록한 위치"(예: 구역 0 · 표 1 · 3행 2열 · 경로 p3.c0.r2c1 — "1차 지필평가(40%)") |
| 해시 대조 | 다른 형식 원본(HWPX) → 불일치 / 등록 원본 → 일치 + "브라우저는 HWP를 열지 못해요" 안내, 미리보기 없음 |
| 확정 | 해시 일치·필드·과목 ID가 있어도 확인 체크·확정 버튼 비활성, 화면에서 PUT 없음. 직접 PUT → 400 `revision.documentFormat: review_not_supported`, Review 0, `UNREVIEWED` |
| 학생 | 문서 `UNREVIEWED`, 후보·Locator 미노출. 공식 평가 항목 참조 → 400 `not_confirmed`, 저장 없음 |

## 4. 오류·보안 (메모리 사본만 변형, 모두 400/401/404 + 6개 Table 행 수 불변)

SHA-256 불일치(`document_mismatch`) · `format=PDF`(`format_mismatch`) · `pdfPageNumber` 포함 · `pageCount` 포함 · `pageRange` 포함(각 `not_allowed`) · kind를 `HWPX_TABLE_CELL`로(`format_mismatch`) · 표 칸 행 누락(`cell_position_required`) · **좌표 ≠ path 마지막 r행c열(`path_mismatch`, 이번 추가)** · 경로 형식 오류(`format`) · `itemKey` 중복(`duplicate`) · 숫자 근거 누락(`evidence_required`) · `documentLocator.id`·`confidence`(`unknown_field`) · `status=CONFIRMED`(`format`) · HWPX Revision으로 전송(`format_mismatch`+`document_mismatch`+kind `format_mismatch`) · 인증 없음 401 · 학생 Header 401 · 운영 권한 없는 관리자 404. 부정 시험 뒤에도 Run 1건.

## 5. 한계

- Backend 등록 검사는 OLE·FileHeader 서명 수준이다(문서 전체 해석 아님). 내부 구조 검증은 계정 B 분석기 결과(근거 원문 대조 41/41)를 따른다.
- Locator 검증은 **구조 검증**(형식·좌표·경로 문법·좌표와 경로 일치)이다. 그 위치가 실제 문서에 있는지, `extractedText`가 그 위치 글인지는 Backend가 확인하지 못한다(원본 미보관).
