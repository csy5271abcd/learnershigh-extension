---
name: adversarial-self-review
description: 변경분(Diff)을 작성 맥락 없는 Reviewer로 Section별 채점하고, Finding을 고친 뒤 새 Diff만 다시 리뷰하는 Loop를 목표 점수까지 반복한다. 결과는 세션에 보고하고 Repo에 파일로 남기지 않는다. "셀프 리뷰", "리뷰 돌려", "점수 몇 점", "95점까지 반복" 요청에 사용.
---

# Adversarial Self Review

채점 기준은 `.claude/rules/code-review.md`다. Severity, 배점, 판정, Finding 형식은 거기서 가져온다. 이 Skill은 Loop를 돌리는 방법만 정한다.

## 0. 시작 값

| 항목 | 기본 | 사용자가 바꿀 수 있음 |
|---|---|---|
| 목표 점수 | 95 | 예: "90점까지" |
| 최대 Round | 5 | |
| 고칠 Severity | P0, P1, P2 | 예: "마이너 제외" → P0, P1만 |
| 첫 범위 | `origin/main...HEAD` | 예: 특정 커밋부터 |

## 1. Loop

```text
Round N
  1. 범위: 첫 Round는 첫 범위, 이후는 <이전 Round HEAD>..HEAD
  2. 독립 Reviewer로 Finding 수집
  3. 반박 → CONFIRMED만 남김
  4. 채점 (변경 없는 Section은 이전 점수 유지)
  5. 목표 점수 이상이고 P0 없음 → 종료
  6. 고칠 Severity의 CONFIRMED Finding 수정
  7. 관련 Test 실행 → 통과하면 커밋
  8. Round N+1
```

종료 조건은 다음 중 하나다.

- 목표 점수 이상이고 P0가 없음
- 최대 Round에 도달함
- 남은 Finding이 사용자 판단을 요구함: Open Decision, 다른 담당자 영역, Spec 충돌. 이때는 고치지 않고 멈춘다 (CLAUDE.md §15, §16).

## 2. 독립 Reviewer (Subagent, 병렬)

Agent 도구로 Subagent를 띄운다. 차례대로가 아니라 **한 메시지에서 동시에** 띄운다. 매 Round마다 새 Subagent를 쓴다.

| Reviewer | 보는 것 |
|---|---|
| 상태 / 계약 | A Spec, B Domain / State, C API Contract |
| 경계 / 보안 | D Boundary, E Security / Privacy |
| 테스트 | F Test |
| 화면 / 유지보수 | G Frontend UX, H 유지보수성 |
| 종합 | Section 사이에 걸친 문제만 본다: Contract와 Backend, Frontend, Test가 서로 맞는지, 한 Surface의 변경이 다른 Surface나 다른 담당자 기능을 깨는지, 문서 / PR 설명과 코드가 맞는지, 이번 변경이 기존 동작에 준 회귀 |

- Diff가 작으면 Section Reviewer를 합쳐도 된다. 종합 Reviewer는 항상 띄운다.
- Reviewer에게는 Diff 범위 명령, 담당 확인 질문(code-review.md §3), Finding 형식(§2), 읽을 Source of Truth만 준다.
- 작성 의도, 대화 내용, 이전 Round에서 무엇을 고쳤는지는 주지 않는다.
- 각 Reviewer는 Finding마다 Section을 하나 붙인다. 종합 Reviewer의 Finding은 가장 가까운 Section에 넣는다.

모든 Reviewer가 끝나면 메인 세션이 Finding을 합친다. 같은 원인의 Finding은 하나로 묶고 Severity가 높은 쪽을 남긴다. 한 원인을 두 Section에서 중복 감점하지 않는다.

## 3. 반박 (Subagent, 병렬)

Finding마다 Reviewer가 아닌 새 Subagent가 반증을 시도한다. Finding끼리는 동시에 돌린다.

- 코드 경로를 따라가거나 관련 Test Class를 실제로 실행한다.
- "Test가 있다"는 근거가 아니다. 그 Test가 해당 실패 시나리오를 검증하는지 확인한다.
- `CONFIRMED`이면서 Confidence가 80 이상인 것만 감점한다. 나머지는 "확인 필요"로 둔다.

## 4. 수정

- Finding이 요구하는 최소 수정만 한다. 범위를 넓히지 않는다.
- 수정마다 실패 시나리오를 재현하는 Test를 먼저 추가하거나 기존 Test로 재현을 확인한다.
- 변경한 Module의 관련 Test만 돌린다. 전체 빌드는 종료 직전 한 번만 돌린다.
- Test를 skip하거나 기대값을 약화해서 통과시키지 않는다.
- 커밋 메시지에 Round 번호를 적는다: `fix(<scope>): <내용> (self-review R2)`

## 5. 보고 (세션에만)

결과는 대화에 보고한다. `docs/reviews/` 같은 Repo 파일은 사용자가 요청할 때만 만든다.

Round마다 한 줄씩 남긴다.

```text
R1  62 FAIL         P1 3 · P2 2   → 수정 4건 (a1b2c3d)
R2  86 CONDITIONAL  P1 1          → 수정 1건 (d4e5f6a)
R3  97 PASS
```

종료할 때는 점수표 한 번, 남은 "확인 필요"와 사용자 판단이 필요한 Finding만 보여 준다. 고친 Finding을 하나씩 나열하지 않는다. 커밋이 기록이다.

```text
| Section | 배점 | R1 | R2 | R3 |
|---|---|---|---|---|
| A. Spec 일치 | 15 | ... | ... | ... |
| 합계 | 100 | 62 | 86 | 97 |

종합: <종합 Reviewer가 본 Section 간 일관성 · 회귀 결론 한두 문장>
```

## 금지

- 점수를 맞추려고 Severity를 낮추는 것
- 증거(file:line, 실패 시나리오) 없는 Finding
- Nit로 차단하거나 Nit를 고치려고 Round를 늘리는 것
- Reviewer에게 작성 맥락을 넘기는 것
- 실행하지 않은 검증으로 REFUTED 처리하거나 통과로 보고하는 것
