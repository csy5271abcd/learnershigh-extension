# Wangyu Progress

> 위치: `docs/specs/wangyu/progress.md`  
> Progress는 Requirement Source가 아니다. 실제 구현 상태에 맞춰 갱신한다.

## 학생 케어 (Student Care)

| 단계 | 상태 | 비고 |
|---|---|---|
| Spec / Domain / API Contract | DONE | `features/student-care.md`, `domain.md`, `api-contract.md` §65 |
| Backend | DONE | `studentcare` Domain, Migration `V202610131200` |
| Admin Frontend | DONE | `frontend/admin/src/features/student-care/` |
| E2E | DONE | `e2e/tests/student-care.spec.ts` (7 Scenario) |
| 최소 UX 재구성 | DONE | `docs/design/student-care-ux.md`: 단일 화면, 상담 기록, 약속·지점 요약·약속 수정 제거 |

### 검증 (2026-10-13, 로컬, 최소 UX 재구성 후)

```text
backend  ./gradlew clean build integrationTest : 322 tests, 0 fail (Unit 222 + Integration 100)
frontend npm run typecheck / lint / build      : pass
e2e      npm run typecheck / playwright test   : 7 passed
```

### 남은 항목 / Open Decision

```text
Existing LearnersHigh 실제 출결·학습·계획 API (현재 Mock Client)
Authentication / 관리자 권한 범위 (현재 지점 단위 접근 제어 없음)
ADR-0006 / ADR-0007 Proposed
성적 신호(등급 하락, 정답률 하락) — 범위 제외
```
