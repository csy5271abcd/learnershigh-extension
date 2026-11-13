# 계정 B HWP·HWPX Adapter 실제 E2E 통합 보고 (2026-11-10)

## 1. 결과 한눈에

| 목표 | 상태 | 수준 |
|---|---|---|
| 계정 B 합성 HWP 등록 + 계정 B Adapter HWP JSON 수신 | **완료** | 실제 HTTP·MySQL·관리자 브라우저 검증 (HWP 42건 PASS) |
| 계정 B 합성 HWPX 등록 + 계정 B Adapter HWPX JSON 수신 | **완료** | 실제 HTTP·MySQL·관리자 브라우저 검증 (HWPX 41건 PASS) |
| 미승인 후보·검토 확정 차단 | **유지** | `UNREVIEWED`, Review 0, 직접 PUT `review_not_supported` |
| 학생 후보 비노출·공식 항목 참조 차단 | **확인** | 실제 HTTP |
| Locator path·좌표 일치 검증(P1) | **구현 + 검증** | 계정 B 출력 568개에 오탐 0, 통합 테스트 + 실제 HTTP |
| PDF 회귀 | **유지** | 실험 ON 43/43·33/33, 실험 OFF 33/33, 해시 변경 전과 같음 |
| 실험 기능 ON/OFF 격리 | **확인** | OFF에서 HWP·HWPX 415, 실험 필드 `unknown_field`, PDF 그대로 |
| 운영 적용 | **불가** | 공식 계약·Migration·원문 대조 수단·Storage·실제 인증 승인 전 |

흐름(HWP·HWPX 각각, 모두 실제 실행):

```text
계정 B 합성 원본(재생성·수정 없음) → 관리자 화면 업로드 → Backend 형식·안전 검사 → MySQL Revision(content_type·SHA-256·쪽 수 NULL)
계정 B multiformat_adapter.py 출력 JSON(바이트 그대로) → POST analysis-imports 201 → 재전송 200 → MySQL 후보(REVIEW_REQUIRED·UNREVIEWED, Review 0)
→ 관리자 분석 조회(subjects = Adapter subjects) → 관리자 검토 화면(후보·활동·제출물·조건·채점·분석기가 기록한 위치·해시 대조·확정 비활성)
```

계정 A 임시 변환기는 이번에 쓰지 않았다(지난 결과는 참고 비교만, `HWPX-ADAPTER-E2E.md` §3).

## 2. 핵심 결정

| 결정 | 이유 |
|---|---|
| 계정 B 원본·JSON은 절대경로에서 읽기만, 저장소로 복사하지 않음 | 원본 메타데이터에 Windows 사용자 이름이 있음. 저장소 CI가 외부 폴더에 의존하지 않게 실파일 E2E는 선택 실행 스크립트로 둠 |
| 부정 시험은 메모리 사본만 변형 | 원본 JSON SHA-256 전후 같음을 확인 |
| 저장 JSON 비교는 "키 순서·null 직렬화만 무시"한 구조 비교 | 필드 추가·삭제·변조는 잡고 직렬화 차이만 허용 |
| `path_mismatch`는 `*_TABLE_CELL`에만, path의 **마지막** `r행c열` 기준 | 칸 안 문단·중첩 표를 정상으로 받기 위해. 계정 B 초안(어디든 포함)보다 엄격 |
| Admin 검토 화면에 활동·제출물·조건(AI 후보) 표 추가 | 관리자가 Adapter 값을 볼 수 있게. 빈 값은 "추출되지 않음 · 확인 필요" |
| HWP·HWPX 확정 차단 유지 | 확정값 근거 Column(Migration)과 원문 대조 수단이 없음. 해시 일치 ≠ 원문 확인 |

## 3. 변경 파일

| 구분 | 파일 | 내용 |
|---|---|---|
| Backend | `service/plan/AnalysisImportValidator.java` | `*_TABLE_CELL` 좌표와 path 마지막 칸 구간 일치(`path_mismatch`) |
| Backend 테스트 | `controller/MultiformatExperimentalApiTest.java` | `path_mismatch` 거절 2건 + 칸 안 문단·중첩 표 허용 1건(새 메서드) |
| Admin | `api/types.ts`, `api/http/assessmentAdminHttp.ts`, `routes/EvaluationPlanReviewRoute.tsx` | 수행 활동·제출물·조건(AI 후보) 표 (http 모드만) |
| 문서·스크립트 | 이 폴더 보고서 7종, `scripts/adapter-e2e.mjs`, `scripts/flag-off-check.py` | — |

변경 없음: `AnalysisImportRequest.java`(계정 B가 대조한 SHA `ff3fea85…d973c` 그대로), `api-contract.md`, `database/**`, Migration, `application.yml`, `common/**`, Student Care, Student Frontend, 공용 E2E, 계정 B 폴더, `backend/src/test/resources/**`(계정 B 파일 미복사).

## 4. 검증 요약

| 검증 | 결과 |
|---|---|
| 계정 B Adapter E2E `adapter-e2e.mjs`(최종 빌드) | **83/83** (HWP 42 · HWPX 41). 1차(path 규칙 추가 전 빌드) 81/81 |
| 실험 OFF `flag-off-check.py` | 9/9 |
| PDF 최종 흐름 / 이전 회귀 (실험 ON) | 43/43 / 33/33 |
| v21.1 HTTP (실험 OFF) | 33/33, 재전송 해시 변경 전과 같음 |
| `verify-backend.ps1` | PASS — 단위 251, 통합 129(Student Care 77) |
| `verify-frontend.ps1` | PARTIAL PASS(typecheck·lint·build, Frontend 단위 테스트 미구성) |
| Mock 모드 | Student·Admin 그대로 |

환경 문제(코드 무관)와 처리는 `PDF-REGRESSION.md` §1·§4: Student 개발 서버 첫 로드 지연, 실행 중 Docker의 MySQL 컨테이너 일괄 종료, 메모리 부족.

## 5. 보고서

`HWP-ADAPTER-E2E.md` · `HWPX-ADAPTER-E2E.md` · `LOCATOR-VALIDATION.md` · `PDF-REGRESSION.md` · `BACKEND-AI-CONTRACT-STATUS.md` · `NEXT-STEPS.md`
