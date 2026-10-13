# Wangyu Feature Specs

> 위치: `docs/specs/wangyu/`  
> 목적: 유완규 담당 LearnersHigh Extension 기능의 **Domain, Feature Behavior, 진행 상태**를 관리한다.  
> 이 폴더는 담당자별 요구사항과 책임 경계를 문서화하기 위한 공간이다. Source Code는 Feature / Domain 기준으로 둔다.

## 1. 담당 범위

```text
상담 관련 기능 전체 (docs/OWNERSHIP.md §4)
학생 케어 (Student Care)
```

학생 케어는 "평소와 달라진 학생을 찾고, 사유를 확인하고, 약속을 정하고, 같은 기준으로 다시 확인하는" Admin 기능이다.
면담·통화 메모가 케어 건에 남으므로 상담 경계와 같은 담당자가 소유한다.

코드 위치:

```text
backend/src/main/java/com/learnershigh/extension/studentcare/
frontend/admin/src/features/student-care/
e2e/tests/student-care.spec.ts
database/migrations/V*__*student_care*.sql
```

## 2. 문서

```text
docs/specs/wangyu/
├─ README.md
├─ domain.md                    # Entity / State / 신호 정의
├─ progress.md                  # 구현 상태 (Requirement Source 아님)
└─ features/
   └─ student-care.md           # 기능 동작 / 화면 / 흐름
```

API 형식은 `docs/api/api-contract.md` §65 학생 케어를 따른다.

## 3. 다른 담당자와의 경계

| 대상 | 경계 |
|---|---|
| Today Board / Student 360 (Suyeon) | 학생 케어 신호는 `studentcare` Domain이 계산한다. Today Board와의 공유 방식(`StudentCareQueryService` 소비 등)은 Suyeon과 합의 전 **제안**이다 (`docs/OWNERSHIP.md` §17). |
| 성적·시험 (발표자료 기능 1) | 이번 범위에서 제외. 등급 하락 / 정답률 하락 신호와 "성적·시험 현황에서 시작"은 구현하지 않는다. |
| Existing LearnersHigh 출결·학습·계획 | `common/integration/learnershigh`의 `ExistingStudentClient` / `ExistingStudyClient`로만 읽는다. 실제 API가 확정되기 전까지 Mock 구현을 쓴다. |
| Existing 학습계획 변경 | 학생 케어는 기존 계획을 수정하지 않는다. 약속은 케어 건에만 기록한다. |

## 4. 원본 자료

- 발표자료 「러너스하이 기능 제안 v2」 §2 학생 케어 (슬라이드 25~40)
- 시안 화면: 콘솔 › 학습관리 › [지점]학생 케어. 현재 화면 기준은 `docs/design/student-care-ux.md`
