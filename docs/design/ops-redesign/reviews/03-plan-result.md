**82/100점, 불통과입니다. 이번 심사로 작업을 중단해야 하며, 다음 단계 진행을 승인하지 않습니다.**

보강은 실질적입니다. 그러나 기록기의 정보 누출이 재현됐고, 시드를 바꾸면서 상세 스냅숏 일부가 이전 데이터로 남았습니다. 현재 시험으로는 개선안의 우위를 공정하게 판정하기 어렵습니다. 점수는 계획에 대한 검토 판단이며 구현 성과 측정값은 아닙니다.

### 1. 3차 필수 지적 5개의 해결 여부

**① 기록기 정보 누출과 회귀 검증 — 부분 해결**

문항 ID·읽은 내용 기록과 투명도·가림 검사가 추가됐습니다. 제공된 기록기 시험 1개와 시드 시험 6개는 모두 통과했습니다.

하지만 기록기의 `read()` 본문을 그대로 실행한 추가 합성 시험에서 다음 누출을 확인했습니다.

- 폭 100px에서 잘린 문자열의 **숨은 뒷부분까지 반환**
- 일부가 덮인 문자열도 **전체 반환**
- 화면 오른쪽 밖(`left:2000px`) 입력값 `OFFSCREEN_INPUT_SECRET` 반환

잘림 검사는 영역이 완전히 분리됐는지만 확인하고, 통과하면 텍스트 노드 전체를 반환합니다. 입력값 검사는 좌우 뷰포트 경계를 검사하지 않습니다. 따라서 압축·잘림을 많이 쓰는 화면이 실제 가독성보다 유리하게 평가될 수 있습니다.  
근거: [기록기 62행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-harness.mjs:62), [전체 문자열 반환 79행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-harness.mjs:79), [입력값 검사 83행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-harness.mjs:83). 제공 시험은 부분 잘림·가로 화면 밖 입력을 포함하지 않습니다. [회귀 시험 10행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-harness.test.mjs:10)

**② Q10 문항·JSON·채점 통일 — 부분 해결**

수지점 요청, `1→2→1` 저장 순서, 중간 화면 값 읽기가 채점 조건에 들어갔습니다. JSON도 같은 문서 규칙을 참조하므로 이전의 기준 충돌은 해소됐습니다.  
근거: [Q10 채점 50행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:50)

다만 3차에서 요구한 **각 저장 뒤 서버 재조회**는 없습니다. 첫 저장 뒤 입력창에 2가 남고 성공 응답만 왔다면, 서버가 실제로 2를 저장하지 않았어도 최종 값 1과 함께 만점을 받을 여지가 있습니다. 기록기의 화면 밖 입력값 누출도 중간 표시 검증을 약화합니다.

**③ 탐색 우회 탈락 조건 — 부분 해결**

읽기 조작 합계 상한과 자동 이동 합산을 명시한 것은 해결입니다. 상세 여는 요소 부재와 인원 문자열 부재도 이제 오류를 냅니다.  
근거: [개선 판정 52행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:52), [측정기 66행](D:/univ/capstone/learnershigh-extension/scripts/research/care-screen-metrics.mjs:66)

그러나 다음 구멍이 남습니다.

- 인원 검사는 `main` 어딘가에 “150명”이 있는지만 봅니다. 실제 명부 인원·로딩 완료 확인과 다릅니다.
- 상세 버튼을 클릭한 뒤 **해당 학생 상세가 실제로 열렸는지** 검증하지 않습니다. 버튼이 작동하지 않아도 닫힌 상태를 상세 측정값으로 기록할 수 있습니다.
- 화면 오류는 배열에 저장하고 출력하지만, 측정기 자체는 오류가 있어도 실패 종료하지 않습니다.

근거: [상세 측정 81행](D:/univ/capstone/learnershigh-extension/scripts/research/care-screen-metrics.mjs:81), [종료 처리 95행](D:/univ/capstone/learnershigh-extension/scripts/research/care-screen-metrics.mjs:95)

**④ 개인 종합·결석 패턴·재확인 — 부분 해결**

Q14에 진행률과 과목 비중 차이를 함께 넣었고, Q12는 연속·산발 결석을 구분합니다. Q15와 반복 요일 결석 데이터도 추가했습니다. 이전의 단일 숫자 읽기보다 분명히 나아졌습니다.  
근거: [문항 30행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:30), [정답 계산 37행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-answers.mjs:37)

재확인용 상태 생성·저장도 추가됐지만, **각 화면 직전에 `restore recheck-due`를 실행한다는 순서가 없습니다.** 첫 화면에서 재확인을 저장하면 두 번째 화면은 이미 바뀐 상태로 시험할 수 있습니다. 기대하는 저장 후 상태도 구체적으로 고정해야 합니다.  
근거: [재확인 절차 58행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:58)

**⑤ 현재 데이터에 맞는 회귀 명령 — 부분 해결**

포트·프로필·업무일·Chrome 옵션과 명령은 구체화됐습니다.

그러나 기존 E2E 실행을 타입 검사와 화면 수치 비교로 대체한 것은 동등한 회귀 검증이 아닙니다. 저장·오류 복구·제외/복원 동작이 깨져도 글자 수와 높이는 같을 수 있습니다. 또한 “기존 spec은 13명 전제”라는 설명은 현재 활성 설정과 맞지 않습니다. 활성 설정은 100명 데이터와 60/30/10 인원 검사를 명시합니다.  
근거: [계획 69행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:69), [활성 E2E 설정 9행](D:/univ/capstone/learnershigh-extension/e2e/playwright.config.ts:9), [실제 인원 검사 38행](D:/univ/capstone/learnershigh-extension/e2e/tests/student-care-branch-overview.spec.ts:38)

### 2. 수정 과정에서 새로 생긴 문제

**상세 스냅숏이 현재 시드·metrics와 불일치합니다.**

현재 API와 저장 스냅숏 26개를 대조했습니다. **21개 일치, 상세 5개 불일치**입니다. 불일치 학생은 `demo_s010`, `demo_s016`, `demo_s017`, `demo_s020`, `demo_s035`입니다.

특히 Q14 대상 `demo_s010`은 다음처럼 다릅니다.

| 항목 | 저장된 상세 스냅숏 | 현재 API |
|---|---:|---:|
| 신호 | 입실 시각 지연 | 과목 비중 변화 |
| 탐구 계획·실제 비중 차이 | 약 0.063%p | 약 24.085%p |

정답 **탐구 24.1%p**는 현재 metrics와 맞지만, 저장된 상세로 만든 시안에는 그 차이가 없습니다. 이는 같은 학생 이름으로 서로 다른 문제를 시험하는 경로입니다.  
근거: [상세 스냅숏](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/data-snapshot/detail-demo_s010.json:1), [정답 산출 51행](D:/univ/capstone/learnershigh-extension/scripts/research/care-task-answers.mjs:51), [스냅숏 사용 계획 62행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:62)

문서도 같은 판으로 정리되지 않았습니다.

- 실행 절차는 여전히 상담 필요 **41명**을 요구하지만 현재 정답·API는 **49명**입니다. [시험 10행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/task-test.md:10)
- 계획은 **14문항·140점·시험 2판**, 실제 시험은 **15문항·150점·3판**입니다. [계획 90행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:90)
- 지표 검토 문서는 산발·반복 요일 결석이 **0명**이라는 이전 데이터를 설계 근거로 사용합니다. [지표 검토 16행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/metric-representation.md:16)

### 3. 항목별 점수

| 항목 | 점수 | 근거 |
|---|---:|---|
| 목표 적합성 | **24/25** | 전원 명부·사유 즉시 노출·기존 지표 보존·가이드와 최소 변경안이 요구에 맞습니다. 개인 종합 문항도 보강됐습니다. [계획 79행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:79) |
| 측정 가능성 | **12/20** | 정답 15개 재계산은 모두 일치했습니다. 그러나 기록기 누출, 상세 데이터 불일치, Q10 중간 저장 검증 부족이 비교 타당성을 훼손합니다. |
| 실패 반복 방지 | **17/20** | 불통과 시 중단·기능 누락 상쇄 금지·비용 비교·비전 점수 분리는 적절합니다. 반면 정보 누출과 서로 다른 데이터 비교라는 과거 실패 경로가 남았습니다. [계획 62행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:62) |
| 실행 가능성 | **12/15** | 앱·API는 실제 접근 가능하고 시드 시험도 통과합니다. 하지만 41/49명 조건 충돌, 재확인 복원 순서, 기능 회귀 대체 방식이 실행을 막습니다. |
| 근거 사용 | **13/15** | 기존 조사·13개 반례·적용 및 불적용 기록을 재사용하는 방향은 좋습니다. 다만 다음 단계 문서의 데이터 근거가 낡았고, `dataviz` 스킬의 실행 경로도 여전히 제시되지 않았습니다. [계획 102행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:102) |
| 범위·정직성 | **4/5** | 합성 데이터·Codex 상대 비교·운영 연동 한계를 명시했습니다. “보이는 정보만 읽음”과 스냅숏 준비 완료 주장은 실제 보장보다 강합니다. [계획 60행](D:/univ/capstone/learnershigh-extension/docs/design/ops-redesign/plan.md:60) |
| **총점** | **82/100** | **불통과** |

### 4. 통과 판단에 반드시 필요한 수정 — 우선순위 순

이번에는 중단 규칙이 적용됩니다. 아래는 재개가 별도로 결정될 경우 필요한 조건입니다.

1. **기록기의 부분 잘림·부분 가림·가로 화면 밖 입력 누출을 차단하십시오.** 이번에 재현된 반례를 회귀 시험에 포함해야 합니다.
2. **데이터 묶음을 일관되게 다시 고정하십시오.** board·metrics·detail·이력·정답을 함께 대조하고, 학생별 동일 날짜·과목 값의 일치 검사를 두십시오. 41/49명과 문항 수·판 번호도 통일해야 합니다.
3. **기능 회귀 실행을 확보하십시오.** 150/50/10 데이터에 맞는 상호작용 검증을 실행해야 합니다. 화면 수치 일치는 보조 검사로 남기십시오.
4. **Q10의 각 저장 뒤 서버 값 확인과 재확인 시험의 화면별 복원을 명시하십시오.**
5. **측정 완료 조건을 실제 화면 상태로 확인하십시오.** 학생 ID가 맞는 상세의 로딩 완료, 실제 명부 인원, 오류 발생 시 실패 처리가 필요합니다.

실행한 검증은 기록기·시드 **7개 시험 통과**, 정답 **15문항 일치**, API 스냅숏 **26개 대조**, 시드 두 파일 **해시 일치**, Q13 날짜 대응 독립 계산입니다. Q13은 **192,442분 대 198,841.5분, −3.2184%**로 저장 정답 −3.2%와 맞았습니다. 저장 기준점은 **72행·오류 0·가로 넘침 0**을 확인했습니다.

전체 과업 시험·E2E·DB 복원 실행은 하지 않았습니다. 저장소 파일과 DB는 수정하지 않았습니다.

(advertisal review result : 0.03, ambiguity : 0.02)