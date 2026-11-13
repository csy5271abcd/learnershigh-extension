# AI × Backend 통합 작업 회귀 결과 (2026-11-09)

## 1. 수정 파일

**Main 코드·설정·Migration 변경 없음.** 수신 API·Validator·DTO는 v21 실제 출력을 그대로 받았기 때문에 고칠 필요가 없었다. 보안·검증 로직도 완화하지 않았다.

신규 파일(모두 Assessment Test·Fixture·문서):

| 파일 | 내용 |
|---|---|
| `backend/src/test/java/.../assessment/controller/AnalyzerV21SyntheticImportApiTest.java` | v21 합성 PDF 결과 수신 흐름 통합 테스트 2건 |
| `backend/src/test/java/.../assessment/controller/AnalysisImportDisabledApiTest.java` | 기본 설정에서 수신 Endpoint 404 통합 테스트 1건 |
| `backend/src/test/resources/assessment/analyzer-v21/synthetic-plan.pdf` | 합성 평가계획서 PDF(2쪽, 34,028 byte) |
| `backend/src/test/resources/assessment/analyzer-v21/synthetic-plan.backend-import.json` | 위 PDF의 v21 Adapter `payload`(수정 없음) |
| `backend/src/test/resources/assessment/analyzer-v21/README.md` | Fixture 출처·모듈 해시·교체 규칙 |
| `backend/src/test/resources/assessment/analyzer-v21/generator/` | PDF 생성기, 분석기 래퍼, HTTP·DB 검증 스크립트(재현용, 빌드 대상 아님) |
| `docs/specs/suyeon/backend-run-2026-11/AI-BACKEND-*.md` | 보고서 4종 |

`docs/specs/suyeon/progress.md`에 이번 작업 한 줄을 추가했다.

변경하지 않은 것: `docs/api/api-contract.md`, 기존 Migration, `application.yml`(수신 기본값 false 유지), `common/**`, Student Care 코드·Fixture, 계정 B 폴더.

## 2. 테스트 결과

| 명령 | 결과 |
|---|---|
| `./gradlew integrationTest --tests '*AnalyzerV21SyntheticImportApiTest' --tests '*AnalysisImportDisabledApiTest'` | 3건 통과 |
| `scripts/verify-backend.ps1` (정책 + `clean build` + `integrationTest`) | **PASS** (3회차. 1·2회차는 §4 환경 문제로 `clean` 실패) |
| 단위 테스트(`build` 안) | 246건 · 실패 0 · 건너뜀 0 (기준선 246과 같음) |
| 통합 테스트 | 120건 · 실패 0 · 건너뜀 0 (기준선 117 + 신규 3) |
| 그중 Student Care | 단위 145건, 통합 77건 모두 통과 |
| 실제 서버 HTTP·DB | 77개 검사 중 76개 PASS, 1건은 기대값 오류(`AI-BACKEND-E2E-RESULT.md` §6-5) |

## 3. Student Care 영향

- Student Care 코드·설정·Fixture를 바꾸지 않았다.
- 자동 테스트: Student Care 단위 145건·통합 77건 통과.
- 실제 서버: `/api/admin/student-care/branches`, `/board` 200.

## 4. 환경 문제 (코드 실패 아님)

- `verify-backend.ps1` 1·2회차가 `:clean`의 `Unable to delete directory backend\build\test-results`로 실패했다. 제 셸 작업 폴더가 그 안에 있었기 때문이다. 작업 폴더를 옮긴 뒤 3회차는 PASS였다.

## 5. 검증하지 않은 것

- **실제 학교 PDF(수준 3)**: 반입 승인 없음
- HWP·HWPX 결과 수신: 계약상 불가(등록 API PDF 전용)
- 분석기 `extractedText`와 실제 PDF 쪽 글의 서버 대조: 원본 미보관이라 불가
- 동시 수신·동시 검토 경쟁(낙관적 잠금 동시성 테스트 없음)
- 413(20MB 초과)·422(손상 PDF) 업로드 통합 테스트
- Frontend 실제 HTTP 연결, Playwright E2E
- 실제 인증·학업 Context·운영 권한(모두 Mock)
- 계정 B가 실행 중 수정한 `assessment_assembly03.py` 이후 버전의 출력
