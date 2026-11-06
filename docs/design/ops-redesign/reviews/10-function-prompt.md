너는 학원·독서실 관리자용 "학생 케어" 화면의 개선안을 기능 심사하는 독립 검토자다. 작성자는 이전에 기능을 줄이고 텍스트만 늘린 시안을 낸 적이 있다. 통과시키는 것이 아니라 실패를 찾는 것이 목적이다. 심사 결과는 진행을 막지 않고 작성자가 다음 수정에 반영한다.

## 대상 (실행 중)
- 기존 화면: http://localhost:5174/student-care
- 개선안: http://localhost:5174/student-care/ops (학생별 명부 안 3가지: 기본 `?wf=table`, 최소 변경 `?wf=minimal`, 사유 묶음 `?wf=groups`)
- 백엔드 8081, 로컬 DB(강남 150 · 분당 50 · 수지 10명, 기준일 10/27, 업무일 10/28)
- 코드: `frontend/admin/src/features/student-care/ops/`, 기존 화면 `frontend/admin/src/features/student-care/`
- 요구·계획: `docs/design/ops-redesign/plan.md`(2장 유지 목록, 5장 목표), `docs/design/ops-redesign/metric-representation.md`, `docs/design/student-care-feedback-contract.md`, `docs/design/student-care-feedback-gate-2026-10-28.md`
- 브라우저: `e2e/node_modules/@playwright/test`의 chromium을 `channel: 'chrome', args: ['--no-proxy-server']`로 실행
- DB에 쓰는 동작(상담 저장, 설정 저장)을 시험했다면 끝나고 반드시 `bash scripts/research/care-db-state.sh restore initial`로 되돌려라.

## 사용자 요구
운영자가 보자마자 관리할 학생과 이유를 알고 바로 쓸 수 있어야 한다. 기존 지표·기능은 줄이지 않는다. 텍스트 양 감소, 펼치기·접기·추가·제외 같은 복잡성 감소, 과도한 스크롤·과밀 금지, 지표마다 의미가 퇴색되지 않는 표현(예: 결석은 횟수와 날짜 패턴 중 무엇이 중요한가). 학습관별은 다량 학생에 부적합했고 개인별은 한눈에 보기 어려웠다.

## 할 일
1. **기능 보존 검사.** `plan.md` 2장 유지 목록의 항목마다 기존 화면과 개선안에서 실제로 동작하는지 브라우저로 확인하고 표로 적어라(항목, 기존 위치, 개선안 위치, 동작 확인 결과). 누락·동작 불가·의미 왜곡은 "필수 위반"으로 표시.
2. **데이터 정확성.** API(`/api/admin/student-care/board`, `/metrics`, `/students/{id}`)와 개선안 화면의 숫자·날짜·사유를 학생 5명 이상 표본으로 대조하라(결석 날짜, 미제출 날짜, 7일 학습 합계, 평소 주, 진행률, 사유 칩). 칩 문구가 서버 신호와 다르게 해석될 여지도 찾아라(예: "결석 N일 연속" 판단, "매주 목 결석"은 서버 신호가 아니라 화면 계산임).
3. **사용성 비교.** 기존 화면 대비 개선안이 "보자마자 이해·바로 사용"에 더 가까운지 근거와 함께 판단하라. 3가지 명부 안(`table`, `minimal`, `groups`)을 같은 기준으로 비교해 어느 안을 기본으로 둘지 추천하라. 3안이 정보 구조에서 실제로 다른지도 판정하라.
4. **폭·테마.** 1600, 850, 390px와 라이트·다크(prefers-color-scheme)에서 겹침·잘림·가로 넘침·읽기 어려운 대비를 찾아라.
5. **기존 계약 충돌.** 개선안이 F01–F24·G01–G54 중 어긋나는 항목과, 그것이 이번 목표 때문에 정당한지 판단하라.

## 출력
`docs/design/ops-redesign/reviews/10-function-result.md`에 한국어로 쓴다: (1) 필수 위반 목록(없으면 없다고), (2) 기능 보존 표, (3) 데이터 대조 결과, (4) 3안 비교와 추천, (5) 폭·테마 결함, (6) 계약 충돌, (7) 우선순위 순 수정 요청 목록. 각 지적에 근거(파일·줄, 화면 위치, 실측값)를 붙여라. 소스 코드는 수정하지 마라. 시험 스크립트와 캡처는 `docs/design/ops-redesign/reviews/10-evidence/` 안에만 만든다.
