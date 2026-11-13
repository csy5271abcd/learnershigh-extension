# 실제 MySQL 합성 데이터·Student/Admin 화면 검증·관리자 심화 탐구 정적 전환 (2026-11-12)

## 요약

| 목표 | 상태 |
|---|---|
| A. [DEMO-1112] 합성 데이터를 실제 API로 저장하고 Student·Admin 화면에서 확인 | **완료(API 재조회·화면)**. MySQL 행 SQL 직접 대조는 사용자 실행 대기(`DATABASE-VERIFICATION.md` §4) |
| B. 관리자 심화 탐구를 Student와 같은 정적 콘텐츠로 전환 | **완료**, Backend 꺼짐 38/38 · 켜짐 36/36 |

흐름 확인: Seed Script → HTTP API → Spring Boot → MySQL·File Storage → HTTP GET 재조회 → Student 5173·Admin 5174 Chrome 렌더링(새로고침 포함).

## 구현

- **Admin 심화 탐구**: http 모드에서 Mock 함수가 `503`을 내던 콘텐츠 화면을 Student 정적 원천(`enrichmentContent.ts`)으로 바꿨다. 탐구 라이브러리·모의고사 지문(60)·대학별 자료(27, PDF Viewer)·참고자료원(24, 새 탭). Task 생성·편집·공개·AI 진입 제거(이전 주소는 안내 화면). 관리자 참고자료실 DB 기능 유지. → `ADMIN-ENRICHMENT-STATIC.md`
- **Seed**: `scripts/seed-assessment-demo.ps1`(+`.mjs`) — localhost 전용, Schema 확인 입력 필수, Manifest·제목으로 재사용(재실행 생성 0), 실패 시 단계·ID 기록, 비밀번호·토큰 미사용. → `SEED-MANIFEST.md`
- **보강 1줄**: 학생 화면 보기의 숨은 안내문 파일 입력칸 `disabled={readOnly}` (`ISSUES.md` I-3)

## 등록한 데이터 (전부 합성)

수행평가 4 · 노트 1(Revision 2) · PDF 결과물 v1·v2 · PNG 1 · 피드백 요청 1(초안 → 전달) · 성장 기록 1 · 학생 자료 2 · 관리자 자료 2(공개 1·비공개 1) · 중요 표시 2 · 삭제·복원 1(자료 B). 사용자 확인용으로 남겨 두었다.

요청과 다른 점: C·D 과목 대체(학업 Context에 영어·수학 없음), 중요 표시를 자료 대신 수행평가 C에(계약상 수행평가만), 피드백 질문 문장 미입력(계약 필드 없음).

## 검증

`REGRESSION-RESULT.md`: 신규 4종(38·36·30·38) 통과, Student 심화 회귀 36/36, 시연 읽기 점검 13/13, Frontend PARTIAL PASS(단위 테스트 미구성), 번들 개발 문자열 0. Backend 테스트·쓰기형 E2E·분석기 관련은 **미실행**(사유 기재).

## API / DB 변경

없음. Migration·계약·Backend 코드 변경 없음. 쓰기는 기존 API로 [DEMO-1112] 데이터만. 기존 2026-2 수행평가 1건 등 보존 확인(API 기준선).

## 다른 담당자 영향

Student Care·Admin Shell·Sidebar·Router·Shared `vite.config.ts` 변경 없음. Admin Shell·학생 케어 메뉴 렌더링 확인.

## 남은 일

1. `verify-seed.sql` 실행 결과로 MySQL 행 대조 마무리(DB 자격증명 필요 — 사용자)
2. Admin `FeedbackDetailRoute`·`ReferenceLibraryRoute`의 이전 심화 Task 추천·연결 UI 정리(명세 §10, P-32·P-35 — Open Decision, `ISSUES.md` I-7)
3. 이전 편집 코드(`CatalogTaskRoutes`·`MockExamRoutes`·`UniversityRoutes`·`UniversityExamAiRoute`·Mock CRUD) 삭제 범위 결정
4. "원문 미포함" 안내 실제 화면 확인(원문 로컬 파일 없는 환경)
5. Backend 단위·통합 테스트는 Backend 변경이 없어 이번엔 생략 — Merge 전 1회 실행 권장
6. 이전 `NEXT-STEPS.md` 항목 유지

## 실행 상태 (보고 시점)

| 서버 | 주소 | 상태 | 띄운 곳 |
|---|---|---|---|
| Backend | `localhost:18080` | 실행 중 | 사용자 PowerShell |
| Student | `localhost:5173/assessment` | 실행 중 | 독립 PowerShell 창(분석기 토큰 없음) |
| Admin | `localhost:5174/assessment` | 실행 중 | 독립 PowerShell 창(분석기 토큰 없음) |
| 분석기 | `127.0.0.1:8765` | **꺼짐** | — (메모리 여유 1.2GB라 띄우지 않음) |

다시 띄우는 방법: `RUNBOOK.md`.
