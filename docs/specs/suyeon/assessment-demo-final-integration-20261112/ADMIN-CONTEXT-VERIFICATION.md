# Admin 시연 관리자 Context 전환·권한 검증

## 구현

- 패널: Admin Assessment 화면 왼쪽 아래 "개발용 · 시연 관리자: adm_demo_a01 · 시연 A지점 관리자 01" → 관리자 목록(범위 설명 포함) → "이 관리자로 보기" → `/assessment/students`를 새로 불러옴. 시연 링크 `?devAdmin=adm_demo_b01`.
- 목록: 시연 4명 + 기존 `adm_demo_gangnam`(강남 + 예시고 평가계획서 운영), `adm_plan_operator`, `adm_gangnam`, `adm_bundang`. **모든 지점을 보는 계정 없음.**
- 권한은 서버가 그대로 검사(`AdminActor.branchIds`). Admin Shell·Wangyu Student Care 메뉴는 건드리지 않았다(패널은 Assessment 루트 안에서만 그림).

## 결과 (실제 5174, `ADMIN-UI-VERIFICATION.md` admins 21/21)

| 관리자 | 지점 | 학생 목록 | 학교 필터 | 다른 지점 학생 URL |
|---|---|---|---|---|
| adm_demo_a01 | A | 20명(다른 지점 0) | 문현·세화·운정·인천하늘·호서 | "이 학생의 기록을 볼 수 없어요" (API 404) |
| adm_demo_a02 | A | 같은 20명·같은 집계 | 같음 | 같음 |
| adm_demo_b01 | B | 20명 | 가좌·대신·삼각산·진양·한림 | 같음 |
| adm_demo_c01 | C | 20명 | 광명·세종·제주·충무·한솔 (제주고 필터 → 4명) | 같음 |

- 범위 밖 학생 URL에서 **첫 학생으로 자동 이동하지 않는다**(이번 수정, `StudentsRoute.tsx`: 검색·필터가 없는데 목록에 없으면 안내).
- API 수준 지점 간 차단 80건(이전 작업 `DATA-VALIDATION.md`) — 이번 재검증 833/833.
- 평가계획서 운영 권한은 지점 권한과 별개: 지점 관리자 a01의 평가계획서 목록 요청 403.

## 한계

- 실제 로그인·로그아웃·Session 없음 → "로그아웃 후 세션 데이터 비노출"은 검증 대상이 없다.
- Mock 인증은 Header가 곧 신원이라 실제 인증 연결 전에는 Header 조작을 막을 수 없다(서버 지점 범위 검사만 보장).
