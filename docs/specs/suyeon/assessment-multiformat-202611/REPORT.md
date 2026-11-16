# HWP·HWPX 다중 형식 확장 보고 (2026-11-10)

## 1. 결과 한눈에

| 목표 | 상태 |
|---|---|
| PDF 전용 가정 조사 | **완료** (`FILE-FORMAT-SUPPORT.md` §1) |
| 계정 B와 공유할 Locator 계약 초안 | **계약 설계 완료(검토용)** — `../assessment-multiformat-integration-draft.md`, `LOCATOR-CONTRACT-DRAFT.md` |
| 형식별 파일 등록·검증 구조 | **구현 완료 · 실험 기능(기본 off)** |
| 다중 형식 분석 후보 수신 | **구현 완료 · 실험 기능** |
| HWP·HWPX 검토 확정 | **의도적으로 차단** (근거 위치 저장 Column 없음 → Migration 승인 대기) |
| 관리자 화면 | **구현 + 브라우저 검증** (형식 표시, HWP·HWPX 선택, 위치 근거 표시, 해시 대조, 확정 차단) |
| 합성 HWPX → 실제 분석기 → (계정 A 임시 변환기) → HTTP → MySQL → 관리자 조회 | **실제 HTTP·MySQL·브라우저 검증 완료** (18/18). 단 **계정 B Adapter 출력이 아니다** |
| 실제 HWP 바이너리 E2E | **미수행** — 실제 파서로 읽히는 합성 HWP 파일이 없음. 서명 검사용 합성 바이트로 등록 검사만 |
| PDF 회귀 | **유지** (`PDF-REGRESSION.md`) |
| 운영 적용 | **불가** — 공식 계약·Migration·Storage·실제 인증 승인 전 |

## 2. 주요 결정

| 결정 | 이유 |
|---|---|
| 실험 기능 `assessment.multiformat.experimental`(코드 기본 false, yml 키 추가 없음) | 계약 미확정 상태에서 운영 기능으로 켜지 않음. 꺼져 있으면 동작이 기존과 같음(HWPX 415, 새 필드 `unknown_field`) |
| 형식 저장은 기존 `content_type`(MIME), 쪽 수 NULL | Migration 없이 의미 있게 저장 가능. 가짜 쪽 수를 넣지 않음 |
| 형식은 바이트로 판별 | 확장자 위장 무시(PDF 바이트 `.hwp` → PDF, HWPX 바이트 `.pdf` → HWPX) |
| 기존 `AnalysisImportRequest`에 선택 필드(`source.format`, `Locator.documentLocator`) 추가 | 별도 수신 경계보다 변경이 작고, 기존 PDF 입력과 같이 받을 수 있음. PDF 필수 조건은 Validator가 형식별로 검사 |
| 새 필드는 NON_NULL 직렬화 | PDF 결과 저장 JSON·재전송 해시가 변경 전과 같게(실측 확인) |
| Locator 필드는 계정 B DocumentModel 실제 필드 그대로, 분석기 로컬 `id`는 받지 않음 | 없는 좌표를 지어내지 않음 |
| HWP·HWPX 검토 확정은 서버·화면 모두 차단 | 근거 위치 저장 Column이 `pdf_page_number`뿐, 원문 위치 대조 수단 없음. 해시 일치 ≠ 사람의 원문 확인 |
| HWPX 검사는 ZIP 스트리밍 + XML 미해석 | 압축 폭탄·경로 이탈 차단, XML 외부 엔터티 위험 없음 |

## 3. 변경 파일

| 구분 | 파일 |
|---|---|
| Backend 신규 | `entity/PlanDocumentFormat.java`, `service/plan/DocumentFormatInspector.java` |
| Backend 수정 | `entity/PlanRevision.java`(`format()`), `service/plan/EvaluationPlanService.java`(형식 판별·실험 플래그 전달·HWP/HWPX 검토 차단), `service/plan/AnalysisImportValidator.java`(형식별 Locator 규칙), `dto/plan/AnalysisImportRequest.java`(선택 필드·호환 생성자), `dto/plan/AdminEvaluationPlanResponse.java`·`service/plan/PlanViews.java`(`documentFormat`) |
| Backend 테스트 | `DocumentFormatInspectorTest`(단위 5), `MultiformatExperimentalApiTest`(통합 4), `MultiformatDisabledApiTest`(통합 1), Fixture `test/resources/assessment/multiformat/` |
| Admin | `api/types.ts`, `api/http/assessmentAdminHttp.ts`(형식·위치 근거 변환), `components/PlanReviewConfirmPanel.tsx`(형식 분기·확정 차단), `routes/EvaluationPlanReviewRoute.tsx`, `routes/EvaluationPlansRoute.tsx`(형식 배지·개발 Flag 업로드) |
| 문서·스크립트 | `../assessment-multiformat-integration-draft.md`, 이 폴더 보고서 8종, `scripts/`(합성 HWPX 생성기, 임시 변환기, 브라우저 검증) |

변경 없음: `api-contract.md`, `database/**`, Migration, `application.yml`, `common/**`, Student Care, Student Frontend, 공용 E2E, 계정 B 폴더.

## 4. 보고서

`FILE-FORMAT-SUPPORT.md` · `LOCATOR-CONTRACT-DRAFT.md` · `BACKEND-IMPLEMENTATION.md` · `HWP-HWPX-E2E-RESULT.md` · `PDF-REGRESSION.md` · `SHARED-CHANGE-REQUEST.md` · `NEXT-STEPS.md`
