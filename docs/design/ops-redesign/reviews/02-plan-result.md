**83/100점, 불통과입니다.** 데이터 고정과 비용 비교는 보강됐습니다. 그러나 화면 밖 정보를 읽는 기록기 결함, Q10의 검증 기준 불일치, 개인 지표 종합 과업의 부재가 남아 있습니다. 현재 절차로는 개선안이 시험을 통과해도 사용자 목표를 달성했다고 판단하기 어렵습니다.

심사한 `plan.md`의 실제 제목은 **3판**입니다. 아래 점수는 계획의 타당성에 대한 검토 판단이며, 구현 성과 측정값은 아닙니다.

### 1. 2차 지적 6개 해결 여부

1. **정답 오류·쓰기 무행동 통과 — 부분 해결**

   Q3·Q4에 관리 중 학생을 포함했고, Q4는 **6명**으로 수정됐습니다. 정답 스크립트의 파일 쓰기를 메모리에서 제거하고 실행한 결과, 저장 JSON과 일치했습니다. Q9도 학생·방법·결과·날짜·서버 이력까지 확인하도록 보강됐습니다.  
   근거: [정답 계산 19·51행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-answers.mjs:19), [Q9 채점 48행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:48).

   **Q10은 아직 불완전합니다.** 정답 JSON은 각 저장 후 서버 재조회를 요구하지만, 시험 문서는 PUT 두 번의 성공과 최종 값만 확인합니다. 따라서 **중간 저장값을 화면에서 확인하지 못한 구현도 만점**을 받을 수 있습니다. 수지점 요청인지도 채점 규칙에 명시되지 않았습니다.  
   근거: [시험 49행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:49), [정답 JSON 85행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-answers.json:85).

2. **시험 간 데이터 오염 — 해결, 복원 실행은 미검증**

   화면별 초기 복원, 동일 학생 사용, 읽기 먼저·쓰기 나중, 시험 후 복원을 명시했습니다. 복원 스크립트도 상담·기준 스냅숏·이력·설정·잠금 테이블을 포함합니다.  
   근거: [시험 절차 10행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:10), [복원 대상 9행](D:/univ/capstone/learnershigh-extension/scripts/research/care-db-state.sh:9).

   실제 조회한 **3지점 board·metrics·설정 9개 응답과 8명 상세·이력 16개 응답이 스냅숏과 모두 일치**했습니다. 인원은 150/50/10명, 강남 상담 필요/관리 중은 41/5명, 상세 업무일은 2026-10-28이었습니다. 시드 두 파일의 해시도 일치했습니다. 이번 심사에서는 복원 스크립트 자체를 실행하지 않았습니다.

3. **시험관 독립성·기록 정확성 — 부분 해결**

   화면마다 새 시험관을 쓰고 전달 프롬프트를 보관하도록 정했으며, `page` 객체 비노출·자동 이동·저장 요청·입력값 기록도 추가했습니다. 실제 설정 화면에서 입력값을 읽는 수정은 확인했습니다.  
   근거: [시험 9행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:9), [기록기 33행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-harness.mjs:33).

   하지만 **“보이는 텍스트만 읽는다”는 보장은 여전히 틀렸습니다.** 기록기의 `read()` 함수를 그대로 재사용한 합성 화면에서 내부 영역에 잘린 `CLIPPED_SECRET`과 `opacity:0`인 `TRANSPARENT_SECRET`이 모두 반환됐습니다. `hit.contains(el)`이 잘린 자손도 허용하고, 투명도는 검사하지 않기 때문입니다.  
   근거: [기록기 55행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-harness.mjs:55).

   또한 로그에는 문항 구분과 `read()` 결과가 없어, **문항별 조작 수와 실제 읽은 정보**를 독립적으로 재구성하기 어렵습니다. 새 시험관 규정은 생겼지만 실제 분리 실행의 증거는 아직 없습니다.

4. **빠진 과업·반례 — 부분 해결**

   사유 독해·연속 결석·학습관 전체 변화가 추가됐고, 시드 밖 반례를 합성 모델 테스트와 화면 캡처로 검사하도록 연결했습니다. 이는 실질적인 개선입니다.  
   근거: [문항 29행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:29), [반례 검증 110행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:110).

   그러나 **Q14는 진행률 한 숫자를 읽는 문제**여서 개인의 복수 지표 종합을 검증하지 않습니다. 대상 이하린은 진행률이 약 **91.6%**이지만 수학 계획 비중 **34.7% 대 실제 4.8%**라는 큰 차이가 있습니다. 이 관계를 놓쳐도 만점입니다. Q12도 연속 결석 한 사례만 묻고 산발 결석과의 구별은 시험하지 않습니다.  
   근거: [Q14 32행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:32), [대상 원자료](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/data-snapshot/detail-demo_s016.json:1).

   재확인 처리를 기능표로 옮긴 것은 가능하지만, **확인일 도래 데이터가 없다는 이유만으로 실행 검증 경로까지 확보된 것은 아닙니다.** 별도 시험 상태를 만드는 절차가 필요합니다.

5. **초기 DOM 밖으로 부담을 옮기는 측정 우회 — 부분 해결**

   첫 문제 학생 상세 측정과 지점 선택 확인은 추가됐습니다. 저장 기준점도 **72개 조합, 오류 배열 0개, 문서 가로 넘침 0개**로 확인했습니다.  
   근거: [측정기 64행](D:/univ/capstone/learnershigh-extension/scripts/research/care-screen-metrics.mjs:64), [기준점 JSON](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/baseline-v2/_student-care-metrics.json:1).

   다만 상세 열기 요소를 못 찾으면 **실패하지 않고 상세 측정을 생략**합니다. 지점 이름은 확인하지만 로딩 완료 후 실제 학생 인원은 확인하지 않습니다. 페이지 분할·가로 탐색은 로그로 “확인”한다고만 했고 탈락 기준이 없습니다. 자동 이동도 보고만 하므로, 명시적 스크롤을 자동 이동으로 바꿔 조작 수를 낮출 여지가 남습니다.  
   근거: [상세 측정 78행](D:/univ/capstone/learnershigh-extension/scripts/research/care-screen-metrics.mjs:78), [개선 판정 51행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:51).

6. **대안의 구현·유지 비용 — 해결, 계획 수준**

   최소 변경안과 함께 변경 컴포넌트·새 상태·상호작용·필요 테스트를 비교하고, 점수 차이가 20점 미만이면 비용이 작은 안을 선택하도록 했습니다. 이전보다 선택 규칙이 구체적입니다.  
   근거: [계획 62행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:62).

   다만 비전 표시는 여전히 후속 필수 단계입니다. 핵심 결과 비퇴보 검사와 별개로, **운영자에게 필요한지·추가 부담을 감수할 가치가 있는지** 심사하는 조건은 남겨야 합니다.

### 2. 항목별 점수

- **목표 적합성: 23/25**  
  사유 즉시 노출, 전원 명부, 개인 상세, 설정·판정 보존, 가이드는 요구와 맞습니다. 개인 종합 독해를 입증하는 과업은 부족합니다. [계획 7행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:7)

- **측정 가능성: 12/20**  
  정답 재계산·스냅숏 동일성은 확인했습니다. Q13도 날짜로 독립 대응해 계산하면 **200,226분 대 204,303.75분, −1.9959%**로 정답 −2%와 맞습니다. 그러나 기록기 정보 누출, Q10 기준 불일치, 탐색 우회가 비교 타당성을 훼손합니다. [정답 계산 40행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-answers.mjs:40)

- **실패 반복 방지: 17/20**  
  불합격 시 진행 금지·최소 변경안·비전 점수 분리는 유지됐습니다. 반면 직전 실패의 핵심인 **초기 화면 대리 지표와 평가 경로 편향**은 일부 남았습니다. [불통과 처리 67행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:67)

- **실행 가능성: 13/15**  
  API와 데이터는 준비돼 있습니다. 하지만 회귀 검사는 “기존 spec 중”으로만 지정했고, 현재 E2E 설정은 4174 포트·100명 데이터, 일부 검사는 60/30/10명을 전제로 합니다. 현재 조건에서 어떤 검사를 어떻게 실행할지 확정해야 합니다. [계획 69행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:69), [E2E 설정 9행](D:/univ/capstone/learnershigh-extension/e2e/playwright.config.ts:9), [인원 검증 40행](D:/univ/capstone/learnershigh-extension/e2e/tests/student-care-branch-overview.spec.ts:40)

- **근거 사용: 14/15**  
  기존 조사·13개 반례 재사용, 적용·불적용·한계 기록, 합성 입력과 캡처 연결은 적절합니다. 다만 `dataviz` 스킬의 위치·가용성은 제시되지 않아 실행 준비가 덜 됐습니다. [계획 102행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:102)

- **범위·정직성: 4/5**  
  합성 데이터와 Codex 상대 비교의 한계는 명시했습니다. 그러나 “보이는 텍스트만 읽음”, “자동 이동으로 우회 확인”은 실제 보장보다 강합니다. [계획 60·92·114행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:60)

**총점: 83/100**

### 3. 통과하려면 반드시 고칠 것

1. **기록기의 화면 정보 누출을 막고 회귀 검증하십시오.**  
   내부 잘림·투명도·가림을 검사하고, 문항 ID·읽은 내용·화면 캡처·명시적 조작과 자동 이동을 연결해야 합니다. 두 화면 모두 같은 수정본을 사용해야 합니다.

2. **Q10의 문항·JSON·채점 기준을 하나로 맞추십시오.**  
   수지점 요청인지 확인하고, `1→2→1` 각 단계의 서버 재조회와 화면 표시를 검증하십시오. 중간 화면이 계속 1인 구현은 만점을 받으면 안 됩니다.

3. **탐색 우회에 실제 탈락 조건을 두십시오.**  
   상세 측정 누락·지점 인원 불일치는 즉시 실패시키고, 전체 명부 접근·페이지 이동·가로 이동·상세 복귀 비용을 검사하십시오. 자동 이동은 단순 보고 항목으로 남겨두지 마십시오.

4. **개인 종합 독해와 결석 패턴 비교 과업을 보강하십시오.**  
   진행률 하나 대신 학습량·계획·과목 비중을 함께 해석하게 하고, 같은 결석 횟수의 연속·산발 사례를 비교하게 하십시오. 재확인 처리도 실행 가능한 시험 상태와 복원 절차를 지정해야 합니다.

5. **현재 데이터에 맞는 회귀 실행 명령을 고정하십시오.**  
   대상 spec, 포트, 인원 조건, 브라우저 실행 설정과 DB 복원 순서를 명시하십시오. 이번 환경에서는 기본 Chrome 실행이 시간 초과였고, `--no-proxy-server` 적용 후 실제 앱 읽기가 가능했습니다. 앱 자체 실패와 시험 환경 실패를 구분해야 합니다.

이번 심사에서는 파일과 DB를 수정하지 않았습니다. 세 `.mjs`의 `node --check`, 정답 재계산, API·해시 대조, 기록기 합성 시험과 실제 앱 읽기를 수행했습니다. 전체 과업 시험·E2E·DB 복원 실행은 수행하지 않았습니다.

(advertisal review result : 0.03, ambiguity : 0.02)