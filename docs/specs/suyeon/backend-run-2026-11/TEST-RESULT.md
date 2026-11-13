# Assessment Backend 테스트 결과 (2026-11-09)

## 1. 실행 명령과 결과

| 명령 | 결과 |
|---|---|
| `scripts/verify-backend.ps1` (Gradle policy + `build` + `integrationTest`) | **PASS** |
| `./gradlew test` (DB 없이, ArchUnit 포함) | 246건 실행 · 통과 246 · 실패 0 · 건너뜀 0 |
| `./gradlew integrationTest` (Docker Testcontainers MySQL 8.4) | 117건 실행 · 통과 117 · 실패 0 · 건너뜀 0 |

이번 작업으로 추가한 Test는 단위 9건과 통합 17건이다. 나머지는 기존 Test(Student Care, AI, 공통 오류, ArchUnit 등)이며 모두 통과했다. 작업 전 기준선은 단위 237건 PASS(`progress.md` 기록, 이번 작업 시작 시 `./gradlew test` 재확인)였다.

## 2. 신규 Test가 검증하는 것

### `SchoolAssessmentApiTest` (integration, 11건)

- 인증 없음·알 수 없는 학생 → 401
- 학업 Context 조회
- 제목·과목만으로 등록 → DB 재조회(마감일 null, 상태 BEFORE_START)
- 등록 응답의 `createdAt`과 재조회 값이 같다
- Body의 `studentId`를 무시하고 인증된 학생으로 저장
- 필수값 누락·알 수 없는 과목·허용되지 않은 상태(`APPROVED`) → 400, 저장 없음
- 다른 학생의 조회·수정·상태 변경 → 404, 원본 변경 없음
- 개인정보 수정 후 재조회, 보내지 않은 필드 유지, 편집 불가 필드(과목·상태) → 400
- 상태: 앞으로 건너뛰기, 같은 상태 재요청 200, 역전이 409, DB 값 확인
- 목록: 학기 구분, 과목·상태 필터, 제목·과목명 검색, 마감일 정렬(미정은 뒤), 페이지, 허용되지 않은 정렬 400
- 관리자: 담당 지점 학생의 같은 ID·상태 조회, 다른 지점 404, 학생 Header로는 관리자 API 401

### `EvaluationPlanApiTest` (integration, 6건)

- 운영 권한 없는 관리자 403, PDF가 아닌 파일 415, 파일 Part 누락 400, 저장 없음
- 개정본 추가 시 Revision 1 보존(순번·쪽수·SHA-256), 권한 밖 목록 403·상세 404
- 분석 수신: 후보로만 저장, `UNREVIEWED` 유지, 검토 기록 0건, 값 보정 없음(비율 합계 불일치 → SERVER 경고), 같은 내용 재전송 200·Run 1건 유지
- 잘못된 수신 거절(저장 0건): 다른 문서 SHA-256, 분석기 내부 필드(`confidence`), 자동 확정 시도(`status=CONFIRMED`), 범위 밖 원문 쪽, 평가 Key 중복, 근거 없는 비율, 타입 불일치
- 검토: 허용되지 않은 fieldPath·근거 쪽 없는 값·`REJECT` 거절, 확정 후 `CONFIRMED`·확정값·검토자 기록, AI 후보 유지, FAILED 결과·다른 Revision 분석 ID로는 확정 불가
- 학생: 자기 학교 문서만(다른 학교 403, AI 후보 미노출), 확정 전 참조 불가, 확정 후 참조 등록, 같은 항목 중복 등록 허용(2건), 과목 불일치·없는 Revision 거절, 관리자 개정본 추가 뒤 학생 참조 불변

### `SchoolAssessmentTest` (unit, 5건) · `AnalysisImportValidatorTest` (unit, 4건)

- 상태 전이 규칙, 개인정보 수정이 상태·참조를 바꾸지 않음
- 비율 합계 경고, null 값은 근거 불요, 과목명 중복·쪽수 불일치 거절, FAILED 결과 형식

## 3. 작업 중 발견·수정한 오류

| # | 증상 | 원인 | 조치 |
|---|---|---|---|
| E-1 | 허용되지 않은 `sort`에 500 | Controller `@Validated`(AOP)가 `ConstraintViolationException`을 던지는데 공통 Handler가 처리하지 않음 | `@Validated`를 제거하고 MVC 기본 메서드 검증(400) 사용 |
| E-2 | 검토 확정 500 (`No row with the given identifier`) | ID를 미리 정한 `PlanReview`에 `save()` → merge가 하위 확정값을 조회 | `Persistable` 구현으로 persist 사용 |
| E-3 | **회귀**: `@WebMvcTest` 7건 Context 로딩 실패(AI Web Test, **Wangyu `StudentCareLockConflictWebTest`** 포함) | 신규 `AssessmentWebConfig`가 Slice에 포함되는데 Provider Bean이 없음 | Provider 지연 조회(`ObjectProvider`) + Provider 없으면 401. 전체 재실행 통과 |
| E-4 | 등록 응답 `createdAt`(나노초)과 재조회 값(마이크로초)이 다름 | MySQL `DATETIME(6)` 정밀도 | 서버 시각을 마이크로초로 자름 + 회귀 Test 추가 |

## 4. 실제 서버 실행 확인

`./gradlew bootRun` (Java 21 Toolchain, `--server.port=18080`, Docker MySQL 8.4 `localhost:3307`)

- Flyway: 빈 Schema `lh_assessment_check`에 Migration 4개 적용(Student Care 2개 + Assessment 2개) 후 서버 시작
- HTTP 확인(최신 빌드): 인증 없음 401 → 등록 201 → 재조회 200(`createdAt` 일치) → 마감일 수정 200 → 상태 IN_PROGRESS 200 → 역전이 409 → 다른 학생 404 → 강남 관리자 조회 200(같은 ID·상태) → 분당 관리자 404 → DB 행(`version=2`) 확인
- 평가계획서(최신 빌드): PDF 등록 201 → 분석 수신 201(SERVER 경고) → 재수신 200 → 확정 200 `CONFIRMED` → 학생 목록 200 → 확정 항목 참조 등록 201
- Student Care 회귀: `/api/admin/student-care/branches`·`/board` 200

환경 제약:

- 기존 로컬 Docker Volume의 `learnershigh_extension` DB에는 저장소에서 이미 삭제된 구형 `202610150300 create mentor tables` Migration 이력이 남아 있어 Flyway 검증이 실패했다(**이번 변경과 무관한 기존 환경 상태**). 기존 데이터를 지키려고 repair·삭제하지 않고 빈 Schema(`lh_assessment_check`)를 따로 만들어 확인했다. 정리 여부는 담당자가 결정해야 한다.
- 로컬 Windows MySQL80 서비스가 3306을 사용 중이어서 Compose MySQL을 3307로 띄웠다.
- 처음 서버를 재시작할 때 이전 서버 프로세스가 종료되지 않아, 평가계획서 HTTP 확인 1회차는 시각 수정 이전 빌드에서 실행됐다. 프로세스를 종료한 뒤 최신 빌드로 다시 실행해 위 결과를 얻었다.
- Windows Git Bash curl `-d`로 한글을 보내면 코드페이지 문제로 JSON이 깨진다(서버 문제 아님). UTF-8 파일(`--data-binary @file`)로 보내면 정상이다.

## 5. 검증하지 않은 것

- Frontend를 실제 Backend로 연결한 화면 동작(Frontend Adapter는 아직 Mock, `httpNotConnected`)
- 실제 기존 LearnersHigh 인증·학생·학업 Context 연동(모두 Mock)
- 동시 요청 경쟁(낙관적 잠금은 설계만 했고 동시성 Test는 없음)
- 20MB 초과 실제 업로드(413), 손상 PDF(422) 경로의 통합 Test
- 학생 `GET /evaluation-plans/{planId}`의 자동 Test(서버 수동 확인 없음, 코드 경로만 목록과 공유)
- 계정 B 실제 분석기 출력(합성 Fixture로만 검증)
- E2E(Playwright)
