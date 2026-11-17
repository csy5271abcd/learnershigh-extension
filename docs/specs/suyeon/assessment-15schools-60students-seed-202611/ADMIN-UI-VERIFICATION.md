# Admin 화면 검증

> `scripts/ui-verify-e2e.mjs` · 실제 Chrome(Playwright) 1920×1080 · Backend 8080(실제 MySQL). 검증용 개발 서버를 계정 Context마다 **별도 포트**로 하나씩 띄워 검증하고 바로 종료했다(사용자 5173/5174는 그대로).
> 개발용 인증 Context = Vite 실행 시 `VITE_ASSESSMENT_DEV_ADMIN_ID`. 스크립트는 Header를 직접 붙이거나 바꾸지 않는다. **실제 로그인·로그아웃이 아니다**(API-OD-A01).

| 계정 | 서버 | 결과 | 페이지 오류 | API 4xx/5xx | 쓰기 요청 | 실행 |
|---|---|---|---|---|---|---|
| adm_demo_a01 | http://localhost:5184 | 11/11 | 0 | 404 /api/admin/assessment/students/stu_demo_021<br>404 /api/admin/assessment/students/stu_demo_021 | 0 | 2026-11-12T02:50:00.133Z |
| adm_demo_a02 | http://localhost:5185 | 11/11 | 0 | 404 /api/admin/assessment/students/stu_demo_021<br>404 /api/admin/assessment/students/stu_demo_021 | 0 | 2026-11-12T02:50:30.261Z |
| adm_demo_b01 | http://localhost:5186 | 11/11 | 0 | 404 /api/admin/assessment/students/stu_demo_001<br>404 /api/admin/assessment/students/stu_demo_001 | 0 | 2026-11-12T02:50:58.221Z |
| adm_demo_c01 | http://localhost:5187 | 11/11 | 0 | 404 /api/admin/assessment/students/stu_demo_001<br>404 /api/admin/assessment/students/stu_demo_001 | 0 | 2026-11-12T02:51:25.675Z |

## adm_demo_a01

| 영역 | 확인 | 결과 | 세부 |
|---|---|---|---|
| 인증 Context | 개발 서버 Context = adm_demo_a01 | PASS |  |
| 관리자 목록 | adm_demo_a01 담당 학생 20명 모두 표시 | PASS | [] |
| 관리자 목록 | adm_demo_a01 다른 지점 학생 0명 | PASS |  |
| 관리자 목록 | adm_demo_a01 담당 5개교 표시 | PASS |  |
| 관리자 학생 상세 | adm_demo_a01 시연학생001 학교·반·번호 | PASS |  |
| 관리자 학생 상세 | adm_demo_a01 시연학생001 2학기 수강 과목 칩 | PASS |  |
| 관리자 학생 상세 | adm_demo_a01 시연학생001 수행평가 과목명 표시('과목 없음' 없음) | PASS |  |
| 관리자 피드백 | adm_demo_a01 피드백 목록에 다른 지점 학생 없음 | PASS |  |
| 관리자 피드백 | adm_demo_a01 요청 상세(Snapshot) 열림 | PASS |  |
| 지점 간 차단(화면) | adm_demo_a01 → 시연학생021 URL 직접 입력 시 기록 미표시 | PASS | [404,404] |
| 학생 화면 보기 | adm_demo_a01 시연학생001 읽기 전용 화면에 학생 수행평가 표시 | PASS | true |

## adm_demo_a02

| 영역 | 확인 | 결과 | 세부 |
|---|---|---|---|
| 인증 Context | 개발 서버 Context = adm_demo_a02 | PASS |  |
| 관리자 목록 | adm_demo_a02 담당 학생 20명 모두 표시 | PASS | [] |
| 관리자 목록 | adm_demo_a02 다른 지점 학생 0명 | PASS |  |
| 관리자 목록 | adm_demo_a02 담당 5개교 표시 | PASS |  |
| 관리자 학생 상세 | adm_demo_a02 시연학생001 학교·반·번호 | PASS |  |
| 관리자 학생 상세 | adm_demo_a02 시연학생001 2학기 수강 과목 칩 | PASS |  |
| 관리자 학생 상세 | adm_demo_a02 시연학생001 수행평가 과목명 표시('과목 없음' 없음) | PASS |  |
| 관리자 피드백 | adm_demo_a02 피드백 목록에 다른 지점 학생 없음 | PASS |  |
| 관리자 피드백 | adm_demo_a02 요청 상세(Snapshot) 열림 | PASS |  |
| 지점 간 차단(화면) | adm_demo_a02 → 시연학생021 URL 직접 입력 시 기록 미표시 | PASS | [404,404] |
| 학생 화면 보기 | adm_demo_a02 시연학생001 읽기 전용 화면에 학생 수행평가 표시 | PASS | true |

## adm_demo_b01

| 영역 | 확인 | 결과 | 세부 |
|---|---|---|---|
| 인증 Context | 개발 서버 Context = adm_demo_b01 | PASS |  |
| 관리자 목록 | adm_demo_b01 담당 학생 20명 모두 표시 | PASS | [] |
| 관리자 목록 | adm_demo_b01 다른 지점 학생 0명 | PASS |  |
| 관리자 목록 | adm_demo_b01 담당 5개교 표시 | PASS |  |
| 관리자 학생 상세 | adm_demo_b01 시연학생022 학교·반·번호 | PASS |  |
| 관리자 학생 상세 | adm_demo_b01 시연학생022 2학기 수강 과목 칩 | PASS |  |
| 관리자 학생 상세 | adm_demo_b01 시연학생022 수행평가 과목명 표시('과목 없음' 없음) | PASS |  |
| 관리자 피드백 | adm_demo_b01 피드백 목록에 다른 지점 학생 없음 | PASS |  |
| 관리자 피드백 | adm_demo_b01 요청 상세(Snapshot) 열림 | PASS |  |
| 지점 간 차단(화면) | adm_demo_b01 → 시연학생001 URL 직접 입력 시 기록 미표시 | PASS | [404,404] |
| 학생 화면 보기 | adm_demo_b01 시연학생022 읽기 전용 화면에 학생 수행평가 표시 | PASS | true |

## adm_demo_c01

| 영역 | 확인 | 결과 | 세부 |
|---|---|---|---|
| 인증 Context | 개발 서버 Context = adm_demo_c01 | PASS |  |
| 관리자 목록 | adm_demo_c01 담당 학생 20명 모두 표시 | PASS | [] |
| 관리자 목록 | adm_demo_c01 다른 지점 학생 0명 | PASS |  |
| 관리자 목록 | adm_demo_c01 담당 5개교 표시 | PASS |  |
| 관리자 학생 상세 | adm_demo_c01 시연학생042 학교·반·번호 | PASS |  |
| 관리자 학생 상세 | adm_demo_c01 시연학생042 2학기 수강 과목 칩 | PASS |  |
| 관리자 학생 상세 | adm_demo_c01 시연학생042 수행평가 과목명 표시('과목 없음' 없음) | PASS |  |
| 관리자 피드백 | adm_demo_c01 피드백 목록에 다른 지점 학생 없음 | PASS |  |
| 관리자 피드백 | adm_demo_c01 요청 상세(Snapshot) 열림 | PASS |  |
| 지점 간 차단(화면) | adm_demo_c01 → 시연학생001 URL 직접 입력 시 기록 미표시 | PASS | [404,404] |
| 학생 화면 보기 | adm_demo_c01 시연학생042 읽기 전용 화면에 학생 수행평가 표시 | PASS | true |

API 4xx 2건은 모두 **다른 지점 학생 URL을 직접 입력**했을 때 의도한 404다(데이터 미노출).
