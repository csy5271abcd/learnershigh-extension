**78/100점, 불통과입니다.** 자동 진행 예외는 제거됐지만, **잘못된 정답·쓰기 과업의 무행동 통과·시험 간 데이터 오염**이 남았습니다. 현재 시험으로는 개선 여부를 신뢰하기 어렵습니다. 점수는 계획에 대한 검토 판단이며 구현 성과 측정값이 아닙니다.

**1. 1차 지적 6개 해결 여부**

| 1차 지적 | 판정 | 확인 근거 |
|---|---|---|
| 불합격 후 자동 진행 | **해결** | 필수 조건은 점수로 상쇄할 수 없고, 반복 불합격 시 재작업 후 중단하도록 바뀌었습니다. [계획 25·64행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:64) |
| 측정 우회 | **부분** | 내부 스크롤·숨은 텍스트·최소 글자 측정은 추가됐습니다. 하지만 미렌더링 상세·페이지 분할·가로 탐색은 집계되지 않고, 실제 조작의 자동 스크롤도 누락됩니다. [측정기 26–50행](D:/univ/capstone/learnershigh-extension/scripts/research/care-screen-metrics.mjs:26), [기록기 24–27행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-harness.mjs:24) |
| 과업 사전 고정·업무 완료 검사 | **부분** | 문항·정답·부분점수와 퇴보 금지는 생겼습니다. 그러나 정답 오류와 저장 검증 누락이 있고, 계획에 약속한 일부 과업은 실제 문항에 없습니다. [시험 13–40행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:13) |
| 값 존재 수준의 기능 보존 | **해결 — 계획 수준** | 요구별 기존/신규 위치·API·접근 경로·실행 검증을 작성하게 했고 G54도 포함했습니다. 실제 보존 여부는 이후 산출물로 확인해야 합니다. [계획 13–23행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:13) |
| 데이터·실행 조건 고정 | **부분** | 3지점 스냅숏, 설정, 커밋과 정상 이력 대체 표본은 지정했습니다. 그러나 상세·이력 스냅숏이 없고 상담 저장 전 상태 복원 절차도 없습니다. [계획 102–106행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:102), [스냅숏 폴더](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/data-snapshot/) |
| 대안·근거 심사 | **부분** | 최소 변경안, 기존 조사 재사용, 불적용 이유·한계, 비전 점수 분리는 반영했습니다. 구현·유지 비용 비교는 빠졌고, 필요한 반례가 시험에 연결되지 않았습니다. [계획 59·92·98행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:59) |

**2. 항목별 점수**

| 항목 | 점수 | 근거 |
|---|---:|---|
| 목표 적합성 | **23/25** | 사유 즉시 노출, 전원 명부, 개인 상세, 설정·기존 판정 보존, 가이드는 요구에 맞습니다. 다만 개인 지표를 함께 읽는 과업과 학습관 전체 변화를 판단하는 과업이 실제 시험에 없습니다. [계획 7–22행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:7), [시험 문항](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:13) |
| 측정 가능성 | **10/20** | 기준점 JSON은 **54개 조합**, 오류 배열은 비어 있습니다. 강남 학생별 **5,558자·13.8화면·150토글**도 계획과 일치합니다. 그러나 아래 정답·채점·동일 조건·기록기 결함이 비교의 타당성을 훼손합니다. [기준점](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/baseline/_student-care-metrics.json:1) |
| 실패 반복 방지 | **17/20** | 자동 진행 삭제, 필수 탈락 조건, 최소 변경안, 비전 점수 분리는 실질적 개선입니다. 반면 직전 실패의 핵심이던 **대리 지표 우회와 평가 절차의 편향**은 완전히 막히지 않았습니다. [직전 실패 분석 31–59행](D:/univ/capstone/learnershigh-extension/docs/design/rejected-2026-11-07/codex-review/comparison.md:31) |
| 실행 가능성 | **12/15** | 기존 API에 명부·지표·상세·이력·저장·설정 기능이 있고 실제 명부도 board/metrics를 함께 사용합니다. 검증 명령과 폭·테마도 배정됐습니다. 다만 시험 데이터 복원·업무일 고정·정확한 회귀 spec 실행 명령은 미완성입니다. [HTTP 어댑터 9–22행](D:/univ/capstone/learnershigh-extension/frontend/admin/src/features/student-care/api/httpStudentCareApi.ts:9), [명부 로더 12–18행](D:/univ/capstone/learnershigh-extension/frontend/admin/src/features/student-care/api/loadCareRoster.ts:12), [계획 66행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:66) |
| 근거 사용 | **12/15** | 기존 조사와 13개 반례를 재사용하고 적용·불적용·한계를 기록하는 방향은 좋습니다. 그러나 기존 반례의 **집단 전체 변화·하루 극단값에 의한 반복 감소 상쇄**를 이번 데이터·과업에서 어떻게 검증할지 빠졌습니다. [기존 조사 135–147행](D:/univ/capstone/learnershigh-extension/docs/design/student-care-metric-research-2026-10-28.md:135), [계획 106행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:106) |
| 범위·정직성 | **4/5** | Codex 상대 비교와 합성 데이터의 한계를 밝히고 비전으로 핵심 점수를 얻지 않도록 했습니다. 다만 “6가지 모두 반영”, “뷰포트에 보이는 텍스트만 읽음”은 실제 보장보다 강한 표현입니다. [계획 3·57·110행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:57) |
| **총점** | **78/100** | **85점 미달** |

**3. 통과하려면 반드시 고칠 것 — 우선순위 순**

1. **정답과 업무 완료 판정을 수정하십시오.**

   정답 스크립트의 파일 쓰기를 메모리에서 제거하고 계산을 실행한 결과, 저장된 JSON과 **일치**했습니다. 그러나 이는 정답의 정확성을 보장하지 않습니다.

   - **Q4 누락:** 스크립트는 `needsCheck`만 검색합니다. 스냅숏의 `inAdjustment`에도 입실 지연 신호가 있는 **최하준(`demo_s035`, +101분)**이 있습니다. 문항은 관리 상태를 제한하지 않았으므로 정답은 **5명이 아니라 6명**입니다. Q3도 같은 범위 제한을 제거해야 합니다. [정답 계산 36–37행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-answers.mjs:36), [board 원자료](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/data-snapshot/board-demo_large.json:1)
   - **Q10 무행동 통과:** 현재 값을 `1`이라고 답하고 아무것도 저장하지 않아도, 최종 API 값이 원래 값이면 **10점**입니다. `1→2→1`의 각 저장과 서버 재조회 결과를 확인해야 합니다.
   - **Q9 불완전 저장 통과:** 현재 채점은 기록 존재와 다음 확인일만 봅니다. 지정 학생·면담 방식·계속 관리 결과·화면에서 회수한 답까지 검증해야 합니다. [시험 채점 37–38행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:37)

   발견된 오류를 고친 뒤 새 시험 버전으로 고정하십시오. 현재의 “이후 변경 금지”가 잘못된 정답을 보호해서는 안 됩니다.

2. **두 화면 시험을 동일한 초기 상태에서 시작하도록 만드십시오.**

   Q9는 서로 다른 학생을 쓰지만 같은 DB에 상담을 저장합니다. 정상 저장 시 강남의 상태는 **상담 필요 41→40명, 관리 중 5→6명**으로 바뀝니다. 원복 없이 다음 화면을 시험하면 고정 정답 Q1·Q7과 충돌합니다. 기록 ID 보존은 초기 상태 복원이 아닙니다. [계획 102행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:102)

   화면별 독립 DB 복제 또는 동일 시드 재설정, 설정·이력·업무일 확인 절차가 필요합니다. Q9도 동일 학생을 쓰는 편이 탐색 난이도 차이를 줄입니다. 상세의 `today`를 폼에 전달하는 현재 코드까지 포함해 업무일을 검증해야 합니다. [상담 폼 연결 30행](D:/univ/capstone/learnershigh-extension/frontend/admin/src/features/student-care/components/weekly/RosterStudies.tsx:30)

   스냅숏에는 상세·이력을 추가하고, 커밋에는 현재 수정 중인 시드 내용까지 포함하거나 별도 해시를 남기십시오. 현재 `commit.txt` 하나로는 작업 트리 전체를 재현할 수 없습니다.

3. **과업 시험의 독립성과 기록 정확성을 보강하십시오.**

   맥락 없는 시험관이라는 규정은 있으나 실제 실행·분리 절차는 없습니다. 화면마다 정답과 이전 시험 답을 받지 않은 새 시험관을 사용하고, 전달 프롬프트와 실행 순서를 남겨야 합니다.

   기록기에도 다음 결함이 있습니다.

   - `page.click()`은 화면 밖 대상을 자동 스크롤할 수 있지만 로그에는 클릭만 남습니다.
   - `read()`는 뷰포트 사각형과의 교차만 확인해 내부 영역의 잘림·다른 요소의 가림을 반영하지 않습니다.
   - 설정의 **입력값**은 텍스트 노드 순회로 읽히지 않습니다.
   - 제한 없는 `page` 객체도 그대로 노출합니다. [기록기 23–43행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-harness.mjs:23)

   조작 전후 문서·내부 스크롤 위치, 실제 화면 캡처, 입력값을 근거로 남기고 명시적 조작과 자동 이동을 구분하십시오.

4. **계획이 약속한 핵심 과업과 반례를 실제 시험에 넣으십시오.**

   현재 문항에는 문제 **사유의 정확한 독해**, 연속 결석과 산발 결석 구별, 학습관 전체 변화, 한 학생의 복수 지표 종합, 재확인 처리, 제외·복원 검증이 없습니다. Q2는 “4일 이상”만 묻기 때문에 날짜 패턴 개선을 증명하지 못합니다. [계획의 과업 약속 86행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:86)

   특히 계획 106행의 **“집단 전체 변화가 없는 상태”**만으로는 기존 G51의 전체 동시 변화 반례를 검증할 수 없습니다. 기존 13개 반례 각각에 데이터·기대 결과·검사 단계를 연결하십시오.

5. **초기 DOM 밖으로 부담을 옮기는 측정 우회를 막으십시오.**

   현재 측정기는 열린 탭의 초기 DOM을 측정합니다. 아직 렌더링하지 않은 상세는 숨은 텍스트에도 잡히지 않습니다. 실제 기존 화면도 학생 상세를 선택 시에만 렌더링합니다. [현재 상세 렌더링 55행](D:/univ/capstone/learnershigh-extension/frontend/admin/src/features/student-care/components/weekly/RosterStudies.tsx:55)

   따라서 페이지 분할이나 선택 후 로딩으로 초기 텍스트·탐색 거리를 줄일 수 있습니다. 전체 명부 접근 가능성, 페이지 이동, 가로 탐색, 상세·기록·재진입까지 포함한 과업 경로를 함께 측정해야 합니다. 지점 선택 실패를 무시하는 `.catch(() => {})`도 제거하고 실제 선택 지점·인원을 확인하십시오. [측정기 62행](D:/univ/capstone/learnershigh-extension/scripts/research/care-screen-metrics.mjs:62)

6. **대안 선택에 구현·유지 비용을 포함하십시오.**

   최소 변경안을 넣은 것은 적절합니다. 그러나 조작 수·탐색 거리만 비교하면 큰 재구현이 근소한 점수 차이로 선택될 수 있습니다. 재사용 범위, 추가 상태·상호작용, 테스트와 유지 부담을 함께 비교하고, 차이가 불확실하면 최소 변경안을 선택하는 규칙이 필요합니다. 비전 예시도 핵심 개선 이후 별도 필요성·비용 심사를 거치도록 하십시오.

확인한 실행 결과는 **정답 계산과 저장 JSON의 일치, Q4 독립 대조, 세 스크립트의 `node --check` 통과**입니다. 앱·DB 쓰기 시험과 브라우저 재실측은 실행하지 않았고, 파일은 수정하지 않았습니다.

(advertisal review result : 0.03, ambiguity : 0.02)