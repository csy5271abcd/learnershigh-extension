너는 학원·독서실 관리자용 "학생 케어" 화면 개선 작업의 계획을 심사하는 독립 검토자다. 작성자는 직전에 같은 작업을 실패했다. 사용자는 작업 중 자리를 비우므로 네 검사가 사용자 승인을 대신한다. 통과시키는 것이 아니라 실패할 경로를 찾는 것이 목적이다.

이번은 3차 심사다. 이전 결과는 `reviews/00-plan-result.md`(65점), `reviews/01-plan-result.md`(78점)이며 둘 다 불통과다. 2차 지적이 실제로 해결됐는지, 고치면서 새 문제가 생기지 않았는지 본다. 앱(5174)·백엔드(8081)·DB가 실행 중이니 필요하면 스크립트를 실제로 실행해 확인해도 된다. 단 DB에 쓰는 시험을 했다면 `bash scripts/research/care-db-state.sh restore initial`로 되돌려라.

## 읽을 것
- 심사 대상: `docs/design/ops-redesign/plan.md`(2판), `docs/design/ops-redesign/task-test.md`, `docs/design/ops-redesign/task-answers.json`, `scripts/research/care-task-answers.mjs`, `scripts/research/care-task-harness.mjs`, `scripts/research/care-screen-metrics.mjs`, `scripts/research/care-db-state.sh`, `docs/design/ops-redesign/baseline-v2/`, `docs/design/ops-redesign/data-snapshot/`
- 기존 요구 계약: `docs/design/student-care-feedback-contract.md`, `docs/design/student-care-feedback-gate-2026-10-28.md`
- 직전 실패 기록: `docs/design/rejected-2026-11-07/`
- 현재 코드: `frontend/admin/src/features/student-care/`

## 사용자 요구 (원문 요약, 2026-11-07)
- 목표1 목적에 맞는 기능 개선: 운영자 입장에서 더 보기 편하게, 문제 학생이 더 잘 보이고 관리하기 쉽게. PM으로서 사용자 가이드 문서, 또는 튜토리얼·도움말. 그러나 가장 좋은 것은 보자마자 이해되고 바로 쓸 수 있는 디자인. 현재 학습관별은 다량의 학생을 보여주기에 부적합하고, 개인별은 한눈에 보기 힘들다.
- 목표2 기존 지표 개선: 다량의 학생을 잘 보여주는 법, 개인 학생을 한눈에(희망), 시계열·날짜가 비어 있는 시간값·비율·횟수 표현이 적절한지와 의미가 퇴색되지 않았는지.
- 과거 문제: A/B/C가 사실상 같음. 피드백한 것에 무조건 걸림. 개선 근거가 허황됨. 텍스트 양이 줄어야 함. 펼치기·접기·추가·제외는 복잡성을 늘림. 스크롤 과다나 과밀 금지. 결석 횟수 대 날짜 패턴 같은 고찰 필요. 참고자료를 실제로 써야 하고 공신력 있는 자료와 스킬을 써야 함.
- 이번 결정: 기존 지표·기능을 줄이지 않는다. 실제 React 앱에 별도 안. 초기값 필터링·운영자 설정·문제 학생 식별 유지. 계약과 충돌하면 이번 목표 우선, 변경 기록. 지점 인원 150/50/10명. 중간에 사용자에게 묻지 않는다.

## 채점
100점 만점. 항목마다 근거(파일·줄·측정값)를 적어라.
1. 목표 적합성 25
2. 측정 가능성 20: 개선을 실제로 증명하는가, 대리 지표의 우회를 막는가. 과업 시험의 공정성(두 화면 동일 조건, 정답 계산의 정확성, 시험관 독립성)을 직접 확인하라. 정답 스크립트를 실행해 결과가 `task-answers.json`과 같은지 확인해도 된다.
3. 실패 반복 방지 20
4. 실행 가능성 15
5. 근거 사용 15
6. 범위·정직성 5

## 출력
1. 2차 지적 6개 각각의 해결 여부(해결/부분/미해결)와 근거
2. 항목별 점수와 근거, 총점
3. 85점 미만이면 통과하려면 반드시 고칠 것(우선순위 순)
4. 85점 이상이어도 다음 단계에서 주의할 것
한국어로 쓴다. 파일을 수정하지 마라(DB 복원만 허용).
