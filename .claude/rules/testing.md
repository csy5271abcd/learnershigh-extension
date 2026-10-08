# Testing Rules

이 규칙은 구현 완료 판단과 테스트 작업에 적용한다.

## 1. 원칙

화면이 보인다고 기능 완료가 아니다.

완료 기준:

```text
Requirement
+ Domain
+ API Contract
+ Interaction
+ Cross-Surface State
+ Loading / Empty / Error
+ Permission / Privacy
+ Test
```

## 2. 검증 우선순위

변경한 범위에 맞는 가장 작은 검증부터 실행하고,
완료 전 전체 관련 검증까지 확장한다.

예:

```text
Unit
→ Feature
→ Integration
→ Build
→ E2E
```

## 3. 공통 Script

준비된 경우:

```powershell
scripts/verify.ps1
```

Frontend:

```powershell
scripts/verify-frontend.ps1
```

Backend:

```powershell
scripts/verify-backend.ps1
```

스크립트가 아직 없으면
프로젝트의 실제 package/build 설정을 확인해 동등한 검증을 실행한다.

명령을 추측하지 않는다.

## 4. Frontend

Frontend 변경 시 가능한 범위에서 확인:

```text
Typecheck
Lint
Unit / Component Test
Build
주요 Interaction
```

UI 작업이라도 단순 Screenshot 일치만 확인하지 않는다.

## 5. Backend

Backend 변경 시 확인:

```text
Compile
Unit Test
Application/Service Test
Repository/Integration Test
API Contract
```

## 6. Database

DB 변경 시:

```text
Migration 적용
Repository Mapping
Seed
관련 Integration Test
```

를 확인한다.

## 7. Contract Test

Frontend/Backend가 동일 Contract를 사용하는지 검증한다.

우선 대상:

```text
Task Detail
Version Submit
AI Status
Feedback Queue
Feedback Review
Mentor Q&A
Parent Report
```

## 8. Cross-Surface E2E

중요 Flow:

```text
Student Version Submit
→ AI Analysis
→ Admin Feedback Queue
→ Admin Review
→ Student Feedback
```

```text
Student Question
→ Mentor Inbox
→ Mentor Answer
→ Student Q&A
```

```text
Student Activity
→ Optional Feedback
→ Reflection
→ Archive
```

```text
Parent Report
→ Validation
→ Generate
→ Send
```

```text
Mentor Plan
→ Existing Student Plan Integration
```

## 9. State Transition

다음은 정상 경로뿐 아니라 잘못된 전이도 테스트한다.

예:

```text
Draft Activity → Archive 직접 시도
미동의 Artifact → Parent Report 첨부
AI Processing 중 Retry 중복
```

Expected Error가 발생해야 한다.

## 10. Loading / Empty / Error

핵심 화면은 다음을 필요한 만큼 검증한다.

```text
Loading
Empty
Search Empty
Filter Empty
Error
Retry
Disabled
Success
```

Empty와 Integration Error를 같은 상태로 테스트하지 않는다.

## 11. Privacy

반드시 확인:

```text
Mentor Response에 Student PII 없음
Parent Output에 Raw AI/Internal Feedback 없음
candidate SchoolRecord 오표현 없음
미동의 Artifact 미첨부
```

## 12. Ownership Regression

Shared 변경 후 다른 담당자 Feature가 깨지지 않는지 확인한다.

특히:

```text
api-contract
frontend/shared
backend/common
database
```

변경 시 영향 범위를 넓게 본다.

## 13. Seed Consistency

같은 Student / Task / Mentor가
Student/Admin/Mentor View에서 동일 Identity를 사용하는지 확인한다.

화면마다 다른 Fixture 때문에 테스트가 통과하는 구조를 피한다.

## 14. Snapshot / Time

시간 기반 기능은 기준 시점을 명시한다.

예:

```text
최근 7일
해당 월
D-3
48h 초과
72h 미답변
```

현재 시간을 암묵적으로 가정한 불안정 Test를 피한다.

가능하면 Clock/Fixture를 통제한다.

## 15. Retry

Retry는 실제 실패 이후 정상 복구를 테스트한다.

예:

```text
AI 실패 → Retry → Success
Integration 실패 → Retry → Success
```

## 16. Idempotency

중복 요청 위험이 있는 Command는 가능한 경우 검증한다.

```text
Parent Report Send
Mentor Plan Apply
Question Answer
Version Submit
```

중복 클릭이 중복 데이터 생성을 유발하지 않는지 확인한다.

## 17. Visual QA

UI 변경 후:

```text
Mockup 핵심 구조
Responsive
Light/Dark
긴 Text
긴 파일명
Focus
Keyboard
Disabled 이유
```

를 확인한다.

Pixel-perfect만을 목표로 하지 않는다.

## 18. Test 수정 원칙

기존 Test를 통과시키기 위해 Requirement를 약화하지 않는다.

Test가 Spec과 다르면:

```text
Spec 확인
→ Test가 낡았는지 판단
→ Test 수정
```

한다.

## 19. 실패 처리

Test 실패 시:

```text
원인 확인
관련 변경 최소화
재실행
```

한다.

실패한 Test를 임시 skip해서 완료 처리하지 않는다.

## 20. 완료 보고

반드시 실제 실행한 검증만 적는다.

좋은 예:

```text
- frontend typecheck: pass
- backend test: pass
- parent-report E2E: pass
```

피해야 할 예:

```text
- 문제없을 것으로 보임
- 테스트 완료
```

실행하지 않은 검증을 완료했다고 쓰지 않는다.

## 21. Blocked

환경 문제로 검증할 수 없다면:

```text
무엇을 실행했는지
어디서 실패했는지
코드 실패인지 환경 실패인지
남은 검증이 무엇인지
```

를 보고한다.

검증 불가 상태를 `Done`으로 표시하지 않는다.

## 22. 금지

```text
Test 실패 무시
skip 남발
Mock만 통과하고 실제 Contract 미검증
화면 존재만으로 완료 판단
Privacy Test 생략
Cross-Surface 상태 미검증
실행하지 않은 Test를 완료 보고
```
