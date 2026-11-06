너는 학원·독서실 관리자용 "학생 케어" 개선안의 2차 기능 심사자다. 1차 심사 결과는 `docs/design/ops-redesign/reviews/10-function-result.md`이며 필수 위반 V01–V08과 수정 요청 1–8이 있었다. 작성자는 커밋 `48d23bd`에서 이를 고쳤다고 주장한다. 주장을 믿지 말고 브라우저와 코드로 확인하라. 결과는 진행을 막지 않고 다음 수정에 반영된다.

## 대상 (실행 중)
- 기존 화면 http://localhost:5174/student-care , 개선안 http://localhost:5174/student-care/ops (명부 안은 이제 하나다)
- 백엔드 8081, 로컬 DB(강남 150 · 분당 50 · 수지 10명, 기준일 10/27, 업무일 10/28)
- 코드 `frontend/admin/src/features/student-care/ops/`, 계획 `docs/design/ops-redesign/plan.md`, 기능표 `docs/design/ops-redesign/function-map.md`
- 브라우저는 `e2e/node_modules/@playwright/test`의 chromium, `channel: 'chrome', args: ['--no-proxy-server']`
- DB 쓰기 시험 후 반드시 `bash scripts/research/care-db-state.sh restore initial`

## 할 일
1. V01–V08 각각 해결/부분/미해결 판정과 근거(재현 절차, 실측값, 파일·줄).
2. 1차 수정 요청 1–8 중 남은 것.
3. 이번 수정으로 새로 생긴 문제(특히 텍스트 증가, 학습관 칸 버튼의 조작성, 390px·다크 테마).
4. 저장 기능 실행 검증: 개선안에서 상담 신규 저장, 관리 중 학생 노트, 설정 1항목 변경·저장·재조회·원복이 실제로 되는지(끝나고 restore).

## 출력
`docs/design/ops-redesign/reviews/11-function-result.md`에 한국어로 쓴다: 필수 위반 남은 것, 판정 표, 새 문제, 저장 검증 결과, 우선순위 순 수정 요청. 소스 코드는 수정하지 마라. 시험 파일은 `docs/design/ops-redesign/reviews/11-evidence/` 안에만.
