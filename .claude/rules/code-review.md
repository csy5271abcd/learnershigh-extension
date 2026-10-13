# Code Review Rules

이 규칙은 PR 리뷰와 Feature 완료 전 자체 리뷰에 적용한다.
리뷰는 "통과시키기"가 아니라 **실패 경로를 찾는 일**이다.

## 1. 근거 (References)

| # | Reference | 이 Rubric에 가져온 것 |
|---|---|---|
| R1 | Google Engineering Practices — What to look for in a code review | Design → Functionality → Complexity → Tests → Naming 순서, "코드 건강도를 낮추지 않으면 승인" 기준 |
| R2 | Google Engineering Practices — The Standard of Code Review | 완벽이 아니라 개선 여부로 판단, Nit은 차단하지 않음 |
| R3 | Conventional Comments | `issue / suggestion / nitpick / question` Label과 `(blocking)` 표기 |
| R4 | Anthropic Claude Code `code-review` Plugin | 관점별 병렬 Reviewer, Confidence 0~100, 80 미만 Finding 제외 |
| R5 | Trail of Bits `differential-review` Skill | Risk-first(인증 / 외부 호출 / 상태 변경), Blast Radius, 변경 부분 Test Coverage 확인 |
| R6 | Adversarial Review Skills (claudskills 등록 Skill들) | 작성 맥락이 없는 새 Reviewer, Finding마다 증거, 반박 시도 후 남은 것만 인정 |
| R7 | OWASP Code Review Guide v2 | 입력 검증, 접근 제어, IDOR, 오류 처리 / 정보 노출 Checklist |
| R8 | OWASP ASVS 5.0 | 접근 제어 · 입력 검증 · 오류 처리 요구사항을 L1 수준으로 적용 |
| R9 | SmartBear / Cisco Code Review Study | 한 번에 400 LOC 이하, 60분 이하, Checklist 사용이 결함 발견률을 높임 |
| R10 | Bacchelli & Bird, ICSE 2013 (Microsoft) | 리뷰의 핵심 비용은 변경 이해 → PR 설명 / 문서 일치를 평가 항목에 포함 |
| R11 | Greiler Code Review Checklist | 질문형 Checklist (예 / 아니오 / 해당 없음) |

프로젝트 고유 기준은 `CLAUDE.md`, `.claude/rules/*.md`, `docs/SOURCE_OF_TRUTH.md`를 따른다.

## 2. Severity

| Severity | 의미 | 감점 | 예 |
|---|---|---|---|
| `P0 Blocker` | 데이터 손상 / 보안 / Privacy 위반 / Spec 핵심 동작 불일치 | -15 | 다른 지점 학생 조회 가능, 상태 전이 우회, Mentor에 실명 노출 |
| `P1 Major` | 실제 사용 경로에서 오동작, Contract 불일치, 잘못된 전이 Test 누락 | -8 | 409 대신 500, Empty와 Error 혼동, 중복 클릭으로 중복 생성 |
| `P2 Minor` | 드문 경로 / 유지보수 위험 / 문서와 경미한 불일치 | -3 | 경계값 Off-by-one, Layer 책임 혼재 |
| `P3 Nit` | 취향 / 표현 | 0 | 이름, 주석 문구 |

Finding 형식 (R3):

```text
<label> (<blocking|non-blocking>) [P0~P3] [Section] file:line
- 문제: 한 문장
- 실패 시나리오: 구체 입력 / 상태 → 잘못된 결과
- 근거: Spec / Rule / Reference
- Confidence: 0~100
- 제안: 최소 수정
```

`Confidence < 80`은 점수에 반영하지 않고 "확인 필요"로만 남긴다 (R4).

## 3. Section과 배점 (100점)

| Section | 배점 | 확인 질문 |
|---|---|---|
| A. Spec 일치 | 15 | Feature Spec / domain.md의 동작이 모두 구현됐나? Spec에 없는 동작을 만들지 않았나? Open Decision을 임의로 닫지 않았나? |
| B. Domain / State | 15 | 상태 전이가 domain.md 표와 같나? 잘못된 전이가 막히나? 동시 요청 / 중복 클릭에도 Invariant가 유지되나? 시간 기준(asOf, Timezone)이 일관되나? |
| C. API Contract / Error | 10 | Request / Response / Error Code가 api-contract.md와 같나? 4xx / 5xx 구분이 맞나? 입력 검증이 Server에 있나? |
| D. Boundary / Ownership | 10 | Existing 기능을 중복 구현하지 않았나? Existing 접근이 Integration Client 안에 있나? 다른 담당자 영역을 건드리지 않았나? |
| E. Security / Privacy | 15 | 접근 제어(지점 / 역할), IDOR, 입력 길이 / 범위, 오류 응답의 정보 노출, Test 전용 Endpoint 격리, PII 노출 범위 (R7, R8) |
| F. Test | 15 | 정상 + 잘못된 전이 Test, 시간 통제, Empty와 Error 분리, Integration(MySQL) / E2E 핵심 흐름, Test가 Spec을 약화하지 않았나? |
| G. Frontend UX / 접근성 | 10 | Loading / Empty / Error / Disabled 이유, Keyboard / Focus / ARIA, 반응형, 중복 제출 방지, Server 오류 표시 |
| H. 유지보수성 | 10 | Layer 규칙(ADR-0005), 복잡도, 중복, 이름, 문서 / PR 설명과 코드 일치 (R1, R10) |

Section 점수 = `max(0, 배점 − 해당 Section 감점 합)`.

## 4. 판정

| 결과 | 조건 |
|---|---|
| `PASS` | 총점 85 이상, P0 없음 |
| `CONDITIONAL` | 총점 70~84, P0 없음 → P1 수정 후 Merge |
| `FAIL` | 총점 70 미만 또는 P0 1개 이상 |

## 5. 적대적 리뷰 절차 (R4, R5, R6)

```text
1. 범위 고정: Base..Head Diff, 400 LOC 단위로 나눈다 (R9)
2. Risk 순서: 상태 변경 / 접근 제어 / 외부 연동 / 시간 계산부터 (R5)
3. 관점별 독립 Reviewer: 작성 맥락 없이 Section별로 Finding 수집
4. 반박 단계: 다른 Reviewer가 각 Finding을 코드 / Test로 반증 시도
   → CONFIRMED / PLAUSIBLE / REFUTED
5. CONFIRMED + Confidence ≥ 80만 감점
6. 점수표 + Finding 목록 + 판정 기록
```

반박 단계에서 "Test가 있으니 괜찮다"는 근거가 아니다. Test가 그 실패 시나리오를 실제로 검증하는지 확인한다.

## 6. 금지

```text
- 증거(file:line, 실패 시나리오) 없는 Finding
- 취향(Nit)으로 차단
- 점수를 맞추려고 Severity 낮추기
- 실행하지 않은 검증을 근거로 REFUTED 처리
```
