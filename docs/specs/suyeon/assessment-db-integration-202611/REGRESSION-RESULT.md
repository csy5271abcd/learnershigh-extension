# 회귀·신규 시험 결과 (2026-11-11, 실제 실행분만)

| 시험 | 결과 | 기준선 | 비고 |
|---|---|---|---|
| Backend 단위 (`gradlew test`, ArchUnit 포함) | **261 / 실패 0** | 261 | Student Care 145 포함 |
| Backend 통합 (`gradlew integrationTest`, Testcontainers) | **136 / 실패 0** | 129 | 기존 129 + 신규 7(`StudentRecordApiTest` 4, `StudentRecordExtrasApiTest` 3). Student Care 72 포함 |
| Frontend typecheck·lint·build (`verify-frontend.ps1`) | PARTIAL PASS | 같음 | Frontend 단위 테스트 미구성(원래 상태) |
| 교차 E2E 학생 기록 왕복 (신규) | **19/19** | — | 격리 환경 |
| 교차 E2E 성장 기록·중요 표시·공개 자료 (신규) | **11/11** | — | 격리 환경 |
| Student 분석 결과 전체 페이지 | **30/30** | 30 | 시연 5173 재실행(쓰기 0건 확인) |
| 심화 탐구 정적 참고자료 | **36/36** | 36 | 시연 5173 재실행 |
| 시연 주소 11개 화면 읽기 점검 | 렌더링 OK, API 4xx/5xx 0, 페이지 예외 0 | — | 5173·5174 |
| 운영 번들 개발 문자열·토큰 | 0건 | 0 | Student·Admin |
| Migration 적용 후 기존 데이터 | 행 수·Checksum 동일 | — | `lh_demo_pdf`, `lh_demo_manual_20261111` |
| Admin PDF 분석 13 · HWP/HWPX 15×2 | **미재실행** | 13·15·15 | 해당 코드(평가계획서 등록·검토)는 이번에 바꾸지 않음. 격리 Backend 재구성 시간 절약 |
| PDF 브라우저 43 · 이전 회귀 33 · PDF HTTP 33 · 실험 OFF 9 · Adapter E2E 83 · 점검표 6 | **미실행** | — | 새 빈 Schema가 필요한데 생성 권한이 없음(root 자격증명 사용은 권한 정책으로 거부, 우회하지 않음). Backend 통합 136이 같은 API 대부분을 MySQL로 검증 |
| 계정 B 분석기 615 | 미실행 | 615 | 계정 B 코드 무변경 |

## Student Care 영향

`backend/.../studentcare/**`, `frontend/admin/src/features/student-care/**`, Student Care Migration 2개: 변경 없음(git status 확인). Student Care 단위 145·통합 72 통과. Admin Sidebar·Header·상담 메뉴 그대로(캡처 확인).

## 바뀐 기존 동작 (의도)

- Admin 학생 상세: http 모드의 "학생 정보는 서버 계약 없음" 제한 화면 → 전체 화면.
- Student 성장 기록·심화: http에서 폐기된 심화 Task 목록을 503 대신 빈 목록.
- Admin 참고자료실 "추천 사이트": http에서 "연결 전" 대신 Student와 같은 정적 카탈로그.
- 노트 블록 안내 문구: "시연용(Mock) 형식" → "Editor 확정 전 임시 형식".
