---
name: adversarial-self-review
description: 변경분(Diff)을 작성 맥락 없는 Reviewer로 적대적 리뷰하고 점수표를 남긴다. PR 올리기 전, Feature 완료 보고 전, "리뷰해", "셀프 리뷰", "점수 몇 점" 요청에 사용.
---

# Adversarial Self Review

기준은 `.claude/rules/code-review.md`다. 이 Skill은 그 절차를 실행하는 방법만 정한다. Severity, 배점, 판정 기준은 거기서 가져온다.

## 1. 범위 고정

```bash
git fetch origin main
git diff --stat origin/main...HEAD      # 첫 리뷰
git diff --stat <이전 리뷰 HEAD>..HEAD  # 재리뷰
```

- 기본은 변경분만 본다. 전체 Feature 리뷰는 사용자가 요청할 때만 한다.
- 400 LOC가 넘으면 Section 묶음별로 나눈다.
- 이전 리뷰 HEAD는 `docs/reviews/*.md`의 마지막 Round에서 찾는다.

## 2. 독립 Reviewer

Agent를 Section 묶음별로 띄운다. 400 LOC 이하면 1명, 넘으면 최대 4명이다. 각 Reviewer에게는 다음만 준다.

```text
- Diff 범위 명령 (base..head)
- 담당 Section과 확인 질문 (code-review.md §3 해당 행)
- Finding 형식 (code-review.md §2)
- 읽어야 할 Source of Truth: 관련 Feature Spec, domain.md, api-contract.md 구간
```

작성 의도, 대화 내용, "이렇게 고쳤다"는 설명은 주지 않는다. Reviewer는 코드와 문서만 보고 판단한다.

묶음 예:

| Reviewer | Section |
|---|---|
| 상태 / 계약 | A Spec, B Domain / State, C API Contract |
| 경계 / 보안 | D Boundary, E Security / Privacy |
| 테스트 | F Test |
| 화면 / 유지보수 | G Frontend UX, H 유지보수성 |

## 3. 반박

Finding마다 다른 Agent가 반증을 시도한다.

- 코드 경로를 따라가거나 관련 Test Class를 실제로 실행한다.
- "Test가 있다"는 근거가 아니다. 그 Test가 해당 실패 시나리오를 검증하는지 확인한다.
- 결과는 `CONFIRMED / PLAUSIBLE / REFUTED`다. 실행하지 않은 검증으로 REFUTED 처리하지 않는다.

`CONFIRMED`이면서 Confidence가 80 이상인 Finding만 감점한다. 나머지는 "확인 필요"로 남긴다.

## 4. 기록

`docs/reviews/<YYYY-MM-DD>-<feature>.md`에 Round를 추가한다. 재리뷰면 같은 파일에 이어 쓴다.

```markdown
# Round N (HEAD <sha>, 범위 <base>..<head>)

| Section | 점수 | Finding |
|---|---|---|
| A. Spec 일치 | 15 | |
| ... | | |
| **합계** | **NN → PASS / CONDITIONAL / FAIL** | |

## Finding
<code-review.md §2 형식, CONFIRMED만>

## 확인 필요
<PLAUSIBLE, Confidence < 80>

## 범위 밖
<변경과 무관한 기존 문제, 한 줄씩>
```

변경이 없는 Section은 이전 Round 점수를 그대로 쓴다.

## 5. 보고

사용자에게는 총점, 판정, P0 / P1 Finding만 짧게 알린다. 고칠지는 사용자가 정한다. 고친 뒤 재리뷰는 이전 리뷰 HEAD..현재 HEAD 범위로 한다.

## 금지

- 점수를 맞추려고 Severity를 낮추는 것
- 증거(file:line, 실패 시나리오) 없는 Finding
- Nit로 차단하는 것
- Reviewer에게 작성 맥락을 넘기는 것
