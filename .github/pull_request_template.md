# Pull Request

## 1. Summary

<!--
이 PR에서 무엇을 변경했는지 2~5줄로 작성합니다.
"화면 구현", "API 추가"처럼 너무 넓게 쓰지 말고
사용자/시스템 관점의 실제 변경을 설명합니다.
-->

- 

---

## 2. Related Scope

### Owner

- [ ] Suyeon
- [ ] Wankyu
- [ ] Shared / Cross-owner

### Surface

- [ ] Student
- [ ] Admin
- [ ] Mentor
- [ ] Backend only
- [ ] Database only
- [ ] Docs / Harness only

### Feature / Domain

<!-- 예: Mentor Hub, School & Admissions, Student Management, Parent Progress -->

- 

---

## 3. Source of Truth

이 PR을 구현할 때 확인한 문서에 체크합니다.

- [ ] `CLAUDE.md`
- [ ] `docs/SOURCE_OF_TRUTH.md`
- [ ] `docs/OWNERSHIP.md`
- [ ] 관련 Feature Spec
- [ ] 관련 `domain.md`
- [ ] `docs/api/api-contract.md`
- [ ] `docs/architecture/integration-boundary.md` — 기존 LearnersHigh 연동 시
- [ ] `docs/architecture/shared-conventions.md`
- [ ] `docs/design/tds-web-guidelines.md` — UI 변경 시
- [ ] 관련 ADR
- [ ] 관련 Reference / Mockup

관련 문서:

```text

```

---

## 4. Changes

### Frontend

- [ ] 변경 없음
- [ ] Student
- [ ] Admin
- [ ] Mentor
- [ ] Shared

주요 변경:

- 

### Backend

- [ ] 변경 없음
- [ ] API
- [ ] Application
- [ ] Domain
- [ ] Infrastructure / Integration
- [ ] Common

주요 변경:

- 

### Database

- [ ] 변경 없음
- [ ] Migration 추가
- [ ] Seed 변경
- [ ] Index / Constraint 변경
- [ ] 기존 LearnersHigh Mapping 영향

주요 변경:

- 

### Documentation

- [ ] 변경 없음
- [ ] Feature Spec
- [ ] Domain
- [ ] API Contract
- [ ] Architecture
- [ ] ADR
- [ ] Progress
- [ ] Harness / Rule

---

## 5. API Contract

- [ ] API 변경 없음
- [ ] `docs/api/api-contract.md`를 먼저 수정했다.
- [ ] Request / Response / Error 변경을 문서화했다.
- [ ] Breaking Change 여부를 확인했다.
- [ ] Frontend와 Backend가 동일한 Contract를 사용한다.

추가/변경 Endpoint:

```text

```

Breaking Change:

- [ ] 없음
- [ ] 있음 — 아래에 영향 범위 작성

```text

```

---

## 6. Domain / State

- [ ] Domain 변경 없음
- [ ] 관련 `domain.md`에 Entity / State 의미가 정의되어 있다.
- [ ] UI State를 Domain State로 새로 만들지 않았다.
- [ ] 미확정 Open Decision을 구현 편의로 임의 확정하지 않았다.
- [ ] Cross-Surface 상태 전파를 확인했다.

State Transition:

```text

```

---

## 7. Existing LearnersHigh Integration

- [ ] 기존 LearnersHigh 연동 변경 없음
- [ ] 기존 기능을 중복 구현하지 않았다.
- [ ] 기존 API / DB / 인증 구조를 추측하지 않았다.
- [ ] Integration Boundary / Adapter를 사용했다.
- [ ] Integration Error를 Empty State로 숨기지 않았다.

영향받는 기존 기능:

```text

```

---

## 8. Ownership / Boundary

- [ ] 다른 담당자의 Feature를 임의 수정하지 않았다.
- [ ] Shared 변경이면 다른 담당자 영향 범위를 확인했다.
- [ ] Source Code를 `suyeon/`, `wankyu/`, `ext/` 같은 사람/확장명 기준 폴더로 만들지 않았다.

### Counseling boundary

- [ ] 이 PR은 상담 기능과 무관하다.
- [ ] 상담 관련 변경이며 Wankyu-owned 영역에서 처리한다.
- [ ] Suyeon Feature에 Counseling Entity/API/DB/CRM/Brief/Follow-up을 추가하지 않았다.
- [ ] Parent Progress / Today Board / Operations에 상담 파생 데이터를 임의 추가하지 않았다.

---

## 9. Privacy / AI

- [ ] Mentor에게 Student 실명/학교/기관/상세 관리 데이터를 노출하지 않는다.
- [ ] Record / Case의 PII 검수 경계를 유지한다.
- [ ] AI는 Analysis / Suggestion / Draft / Candidate까지만 수행한다.
- [ ] AI/Admin이 Student 원문 또는 Reflection을 대신 작성하지 않는다.
- [ ] Parent Output에 Raw AI / 내부 Feedback 원문을 노출하지 않는다.
- [ ] `candidate` School Record를 `confirmed`처럼 표현하지 않는다.
- [ ] Student 미동의 Artifact를 Parent Report에 첨부하지 않는다.
- [ ] 해당 없음

---

## 10. UI / UX

UI 변경이 있는 경우:

- [ ] 관련 Claude Design Mockup을 확인했다.
- [ ] `tds-web-guidelines.md`를 확인했다.
- [ ] 기존 LearnersHigh 전체 UI를 재디자인하지 않았다.
- [ ] TDS Mobile Layout을 Web에 그대로 복사하지 않았다.
- [ ] Loading / Empty / Error를 구분했다.
- [ ] Disabled 상태가 있다면 이유를 표시했다.
- [ ] Keyboard / Focus 접근성을 확인했다.
- [ ] Back Context가 필요한 화면에서 상태를 유지한다.
- [ ] Tablet / Desktop / Mobile 재배치를 확인했다.
- [ ] UI 변경 없음

스크린샷 / 영상:

<!-- 필요 시 첨부 -->

---

## 11. Database Checklist

DB 변경이 있는 경우:

- [ ] Migration을 추가했다.
- [ ] Migration 없이 수동 Schema 변경만 하지 않았다.
- [ ] 기존 LearnersHigh Table/Column을 추측하지 않았다.
- [ ] 같은 Business Entity를 Surface별 중복 Table로 만들지 않았다.
- [ ] 미확정 Status를 DB에 먼저 고정하지 않았다.
- [ ] Seed가 여러 Surface에서 같은 Entity ID를 사용한다.
- [ ] 데이터 손실 가능성을 확인했다.
- [ ] DB 변경 없음

Migration:

```text

```

---

## 12. Verification

실제로 실행한 명령만 체크/작성합니다.

### Full

- [ ] `.\scripts\verify.ps1`
- [ ] `.\scripts\verify.ps1 -Strict`

### Frontend

- [ ] `.\scripts\verify-frontend.ps1`
- [ ] Typecheck
- [ ] Lint
- [ ] Unit / Component Test
- [ ] Build
- [ ] 해당 없음

### Backend

- [ ] `.\scripts\verify-backend.ps1`
- [ ] Compile / Build
- [ ] Unit Test
- [ ] Application / Service Test
- [ ] Repository / Integration Test
- [ ] 해당 없음

### Database / E2E

- [ ] Migration 적용
- [ ] Seed 확인
- [ ] E2E
- [ ] 해당 없음

실행 결과:

```text

```

---

## 13. Cross-Surface Verification

해당되는 Flow를 확인합니다.

- [ ] Student Version → AI → Admin Feedback → Student Feedback
- [ ] Student Question → Mentor Inbox → Mentor Answer → Student Q&A
- [ ] Activity → Feedback → Reflection → Archive
- [ ] Mentor Plan → Existing Student Plan
- [ ] Parent Report → Validation → Generate → Send
- [ ] 해당 없음

---

## 14. Open Decisions / Blockers

- [ ] 없음
- [ ] 있음

남은 Open Decision / Blocker:

```text

```

미확정 사항을 코드에서 임의로 닫지 않았는지 확인합니다.

---

## 15. Shared Impact

다음 Shared 영역을 변경했는지 확인합니다.

- [ ] `docs/api/api-contract.md`
- [ ] `frontend/shared/**`
- [ ] `backend/**/common/**`
- [ ] `database/**`
- [ ] `docs/architecture/**`
- [ ] `docs/adr/**`
- [ ] 해당 없음

다른 Feature / Owner 영향:

```text

```

---

## 16. Progress

- [ ] 관련 `docs/specs/<owner>/progress.md`를 갱신했다.
- [ ] 아직 갱신하지 않았으며 이유를 아래에 작성했다.
- [ ] 해당 없음

```text

```

---

## 17. Reviewer Notes

Reviewer가 특히 확인해야 할 부분:

```text

```

---

## 18. Final Checklist

- [ ] 요구사항을 구현했다.
- [ ] Scope 밖의 기능을 함께 만들지 않았다.
- [ ] 기존 LearnersHigh 기능을 중복 구현하지 않았다.
- [ ] Ownership을 침범하지 않았다.
- [ ] API / Domain / DB 문서와 구현이 일치한다.
- [ ] Loading / Empty / Error를 확인했다.
- [ ] Privacy / Permission을 확인했다.
- [ ] 관련 테스트를 실제로 실행했다.
- [ ] 검증하지 않은 내용을 "완료"라고 표현하지 않았다.
- [ ] 남은 Blocker / Open Decision을 숨기지 않았다.
