# Admin 5174 화면 검증

> 사용자가 띄운 **실제 5173·5174 서버**(재시작·임시 서버 없음) · 실제 Chrome(Playwright) 1920×1080 · Backend 18080(MySQL). 스크립트: `scripts/demo-final-e2e.mjs`.
> Context 전환 = 개발 서버 전용 시연 링크(`?devStudent=` / `?devAdmin=`) → 화면 왼쪽 아래 "개발용" 전환 패널과 같은 저장소 값. **실제 로그인이 아니다**(API-OD-A01). 스크립트는 Header를 직접 붙이지 않는다.

## admins — 21/21 PASS · 페이지 오류 0 · API 4xx/5xx 8 (2026-11-12T05:59:36.737Z)

| 영역 | 확인 | 결과 | 세부 |
|---|---|---|---|
| 관리자 Context | adm_demo_a01: 화면 인증 표시 = adm_demo_a01 | PASS |  |
| 관리자 목록 | adm_demo_a01: 담당 20명 표시·다른 지점 0명 | PASS |  |
| 학교 필터 | adm_demo_a01: 학교 필터 = 담당 5개교 | PASS | ["전체 학교","문현고등학교","세화고등학교","운정고등학교","인천하늘고등학교","호서고등학교"] |
| 관리자 상세 | adm_demo_a01: 시연학생004 학교·반·번호·정리된 제목 | PASS |  |
| 지점 간 차단 | adm_demo_a01 → stu_demo_021(다른 지점): 접근 불가 안내, 첫 학생 자동 표시 안 함 | PASS | [404,404] |
| 관리자 Context | adm_demo_a02: 화면 인증 표시 = adm_demo_a02 | PASS |  |
| 관리자 목록 | adm_demo_a02: 담당 20명 표시·다른 지점 0명 | PASS |  |
| 학교 필터 | adm_demo_a02: 학교 필터 = 담당 5개교 | PASS | ["전체 학교","문현고등학교","세화고등학교","운정고등학교","인천하늘고등학교","호서고등학교"] |
| 관리자 상세 | adm_demo_a02: 시연학생004 학교·반·번호·정리된 제목 | PASS |  |
| 지점 간 차단 | adm_demo_a02 → stu_demo_021(다른 지점): 접근 불가 안내, 첫 학생 자동 표시 안 함 | PASS | [404,404] |
| 관리자 Context | adm_demo_b01: 화면 인증 표시 = adm_demo_b01 | PASS |  |
| 관리자 목록 | adm_demo_b01: 담당 20명 표시·다른 지점 0명 | PASS |  |
| 학교 필터 | adm_demo_b01: 학교 필터 = 담당 5개교 | PASS | ["전체 학교","가좌고등학교","대신고등학교","삼각산고등학교","진양고등학교","한림고등학교"] |
| 관리자 상세 | adm_demo_b01: 시연학생024 학교·반·번호·정리된 제목 | PASS |  |
| 지점 간 차단 | adm_demo_b01 → stu_demo_001(다른 지점): 접근 불가 안내, 첫 학생 자동 표시 안 함 | PASS | [404,404] |
| 관리자 Context | adm_demo_c01: 화면 인증 표시 = adm_demo_c01 | PASS |  |
| 관리자 목록 | adm_demo_c01: 담당 20명 표시·다른 지점 0명 | PASS |  |
| 학교 필터 | adm_demo_c01: 학교 필터 = 담당 5개교 | PASS | ["전체 학교","광명고등학교","세종고등학교","제주고등학교","충무고등학교","한솔고등학교"] |
| 관리자 상세 | adm_demo_c01: 시연학생044 학교·반·번호·정리된 제목 | PASS |  |
| 지점 간 차단 | adm_demo_c01 → stu_demo_001(다른 지점): 접근 불가 안내, 첫 학생 자동 표시 안 함 | PASS | [404,404] |
| 학교 필터 | adm_demo_c01: 제주고등학교 필터 → 제주고 4명만 | PASS |  |

API 4xx: 404 /api/admin/assessment/students/stu_demo_021, 404 /api/admin/assessment/students/stu_demo_021, 404 /api/admin/assessment/students/stu_demo_021, 404 /api/admin/assessment/students/stu_demo_021, 404 /api/admin/assessment/students/stu_demo_001, 404 /api/admin/assessment/students/stu_demo_001, 404 /api/admin/assessment/students/stu_demo_001, 404 /api/admin/assessment/students/stu_demo_001 — 다른 지점 학생 URL 직접 입력·지점 관리자의 평가계획서 접근 시도에 대한 **의도한 거절**.

## plans — 12/12 PASS · 페이지 오류 0 · API 4xx/5xx 2 (2026-11-12T05:54:31.893Z)

| 영역 | 확인 | 결과 | 세부 |
|---|---|---|---|
| 평가계획서 검토 | pdf: 과목 가상과학탐구 표시 | PASS |  |
| 평가계획서 검토 | pdf: 수행평가 탐구 보고서·토론 활동 표시 | PASS |  |
| 평가계획서 검토 | pdf: 반영비율 30%·40% 표시 | PASS |  |
| 평가계획서 검토 | pdf: 검토 전 상태(자동 확정 아님) | PASS |  |
| 원문 근거 | pdf: 근거 쪽 표시 | PASS |  |
| 평가계획서 검토 | hwp: 과목 가상과학탐구 표시 | PASS |  |
| 평가계획서 검토 | hwp: 수행평가 탐구 보고서·토론 활동 표시 | PASS |  |
| 평가계획서 검토 | hwp: 반영비율 30%·40% 표시 | PASS |  |
| 평가계획서 검토 | hwp: 검토 전 상태(자동 확정 아님) | PASS |  |
| 원문 근거 | hwp: 쪽 번호 대신 구역·표 위치(가짜 쪽 번호 없음) | PASS |  |
| 평가계획서 목록 | school_001: 문서 2개 · 고1 1·2학기 각 1개 · 검토 필요 | PASS |  |
| 평가계획서 권한 | adm_demo_a01(지점 관리자): 평가계획서 운영 권한 없음 안내 또는 문서 없음 | PASS |  |

API 4xx: 403 /api/admin/assessment/evaluation-plans, 403 /api/admin/assessment/evaluation-plans — 다른 지점 학생 URL 직접 입력·지점 관리자의 평가계획서 접근 시도에 대한 **의도한 거절**.

