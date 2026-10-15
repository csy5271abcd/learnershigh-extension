---
name: comment-cleanup
description: 변경한 코드의 불필요한 주석을 지운다. 코드를 다시 말하는 주석, 나열형 설명, "추가했다/변경했다" 같은 작업 서술을 정리할 때 사용. "주석 정리", "AI 주석 지워" 요청에 사용.
---

# Comment Cleanup

주석은 코드가 말하지 못하는 것만 남긴다. 코드로 읽히는 내용은 지운다.

## 1. 범위

기본 범위는 변경분이다.

```bash
git diff --name-only origin/main...HEAD -- frontend backend e2e database
```

`references/**`, `docs/source/**`, 생성 파일, lockfile은 건드리지 않는다.

## 2. 지운다

| 유형 | 예 |
|---|---|
| 코드를 그대로 다시 말함 | `// 학생 목록을 불러온다` 위의 `loadStudents()` |
| 작업 서술 | `// 리뷰 반영으로 추가`, `// 이번 변경에서 수정함`, `// NEW` |
| 나열 / 열거 | 함수 위에 단계 1, 2, 3을 늘어놓은 블록. 함수 이름과 본문으로 읽히면 지운다 |
| 구역 배너 | `// ===== Handlers =====` |
| 주석 처리된 코드 | 사용하지 않는 옛 구현 |
| 타입이 이미 말하는 것 | `/** @param id 학생 ID */` 위의 `id: StudentId` |
| 근거 없는 확신 | `// 항상 안전함`, `// 문제없음` |

## 3. 남긴다

- 왜 이렇게 했는지: 제약, 우회한 버그, 순서가 중요한 이유
- Source of Truth 참조: `// domain.md §5-1`, `// ADR-0007`, `// api-contract.md §65`
- 동시성, 시간대, 경계값처럼 코드만 보고 놓치기 쉬운 불변식
- 담당자나 이슈가 있는 TODO
- Lint / 타입 억제의 이유 (`// oxlint-disable-next-line ... — 이유`)

남길 주석도 한 줄로 줄일 수 있으면 줄인다. 문장은 짧은 평서문으로 쓰고, 주변 주석과 문체를 맞춘다.

## 4. 바꾸지 않는 것

- 동작. 주석만 고친다. 이름을 바꿔야 주석이 필요 없어지는 경우에는 바로 바꾸지 않고 제안만 한다.
- 다른 담당자 영역의 파일. `docs/OWNERSHIP.md`로 확인한다.

## 5. 검증

변경한 쪽만 돌린다.

```bash
cd frontend && npm run typecheck && npm run lint
cd backend && ./gradlew compileJava compileTestJava
```

## 6. 보고

지운 주석 수와 파일 수, 판단이 애매해서 남긴 주석만 알린다. 지운 주석 목록은 나열하지 않는다. Diff가 기록이다.
