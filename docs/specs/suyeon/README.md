# Suyeon Feature Specs

> 위치: `docs/specs/suyeon/`  
> 목적: 최수연 담당 **LearnersHigh Assessment**의 Domain, Feature Behavior, 진행 상태와 담당 경계를 관리한다.  
> 이 폴더는 사람 이름으로 Source Code를 나누기 위한 폴더가 아니다. 구현 코드는 Feature / Domain 기준으로 구성한다.

---

## 1. 담당 범위

Suyeon의 현재 신규 개발 범위는 기존 LearnersHigh에 추가되는 **Assessment 학생·관리자 기능**이다.

```text
LearnersHigh Assessment
├─ Student
│  ├─ 학교·학업 정보 / 학교 평가계획서 활용
│  ├─ 학교 수행평가 등록·상태·평가기준
│  ├─ 심화 탐구 Task / 탐구 과정 노트
│  ├─ 결과 파일 / 버전 / 자료함
│  ├─ 관리자 피드백 요청·확인
│  └─ 성장 기록 / 개인 아카이브
└─ Admin (기존 Admin Shell 안에 추가)
   ├─ 전체 현황 / 학생 Assessment 열람
   ├─ 피드백 요청·답변 관리
   ├─ 학교별 평가계획서·지필/수행평가 분석
   ├─ 심화 탐구 Task / 모의고사 소재 / 대학 공개 자료 운영
   └─ 관리자 참고자료실
```

코드는 사람 이름이 아니라 Feature / Domain 기준으로 둔다. 경로는 **목표 예시**이며 실제 생성 여부는 Repository에서 확인한다.

```text
frontend/student/src/features/assessment/
frontend/admin/src/features/assessment/
backend/src/main/java/com/learnershigh/extension/assessment/
```

금지:

```text
frontend/**/suyeon/
backend/**/suyeon/
backend/**/ext/
```

기존 Suyeon 범위였던 Mentor Hub / Mentor Surface / School & Admissions / Admin Student Management / Parent Progress는 **새 개발 범위에서 폐기**한다. 구형 Source Code 및 참조를 확인하고 제거하며, 완규 담당 Student Care·상담과 기존 LearnersHigh의 공통 기능은 유지한다. 구형 기능의 이름 또는 데이터 모델을 새 Assessment에 자동 승계하지 않는다.

---

## 2. 이 폴더의 문서

현재 작성되어 있는 핵심 문서:

```text
docs/specs/suyeon/
├─ README.md       # 담당 영역과 문서 읽기 순서
├─ domain.md       # Assessment Entity / State / Invariant
└─ progress.md     # 실제 작업 상태 / 검증 / 제거 작업
```

Frontend Stage 1 지원 문서 (DRAFT, Requirement Source 아님):

```text
docs/specs/suyeon/
├─ assessment-design-principles.md # Assessment 디자인 원칙 (Mockup 직접 기준 + Daglo 보완, TDS 미사용) · 실측 Token
├─ assessment-screen-map.md         # 화면 ↔ Mockup ↔ Spec ↔ Contract, Mockup 불일치(MM-xx)
├─ assessment-frontend-mock.md      # Contract 기반 Mock Adapter / Fixture / Open Decision 처리
├─ assessment-frontend-quality.md   # Stage 1 완료 기준 L1~L6, 시각 비교 절차
├─ legacy-cleanup-plan.md           # 구형 Suyeon Frontend 코드 참조 조사 · 정리 순서
└─ harness-change-proposals.md      # Shared 영역 변경 제안 (미적용, 팀 승인 대기)
```

기능 상세 명세는 아래 **작성된 4개 파일**로 나뉜다. 파일의 존재는 확인된 문서 작업이며, 설계 보완 사항과 실제 API/코드 구현 완료를 뜻하지 않는다.

```text
docs/specs/suyeon/features/             # 현재 작성된 Feature Spec 4종
├─ assessment-student.md                # 학교 수행평가 / 학교·학업 정보
├─ assessment-inquiry.md                # 심화 탐구 / 노트 / 파일 / 자료 / 성장·아카이브
├─ assessment-feedback.md               # Student ↔ Admin 피드백
└─ assessment-admin.md                  # 관리자 Assessment 운영
```

### `domain.md`

담당 영역의 Entity, Relationship, State, State Transition, Cross-Surface Propagation, Invariant, 권한·저작권 경계, Open Decision을 정의한다. 화면의 버튼별 상세 동작이나 JSON Schema를 중복 정의하지 않는다.

### `features/*.md`

각 기능의 User Goal, Actor, Entry, Screen, Interaction, Data, Empty / Loading / Error, Cross-Surface Effect, Permission, Acceptance Criteria, Visual Reference를 정의한다. **현재 네 파일이 존재하지만 계약 공백/Open Decision 보완 중**이며, 문서 존재만으로 실제 구현 완료를 주장하지 않는다.

### `progress.md`

실제 Current / In Progress / Next / Done / Blocked / Verification만 기록한다. 기존 Prototype 이력, 새로운 Assessment 구현 상태, Repository 문서 반영 여부를 구분한다.

---

## 3. 읽는 순서

담당 기능 작업 전:

```text
1. /CLAUDE.md
2. /docs/SOURCE_OF_TRUTH.md
3. /docs/OWNERSHIP.md
4. 이 README
5. domain.md
6. 관련 Assessment Feature Spec (작성본 4종, 미확정 사항 확인)
7. /docs/api/api-contract.md (Assessment API 초안 및 미해결 계약 공백 확인)
```

신규 Assessment UI:

```text
+ references/claude-design-mockup/LearnersHighAssessment/Student/
+ references/claude-design-mockup/LearnersHighAssessment/Admin/Assessment-Management/
+ references/design/daglo/
+ docs/specs/suyeon/assessment-design-principles.md (Assessment 디자인 원칙·Token)
```

- **Feature Spec**: 기능과 사용자 동작 기준
- **Claude Design Mockup**: 화면 구성·배치와 색상·Typography·Spacing까지 포함한 **직접 시각 구현 기준**
- **Daglo 이미지**: Mockup의 기반 디자인 언어. Mockup에 없는 Hover·Focus·Drawer 등 세부 표현만 보완
- **기존 LearnersHigh**: 기존 Navigation / Shell / Context / IA 유지

기존 `docs/design/tds-web-guidelines.md`, `docs/design/student-care-ux.md`는 보존한다. 새 Assessment의 Daglo 스타일을 완규의 Student Care와 팀 공통 화면에 강제하지 않는다.

기존 LearnersHigh 연동 작업:

```text
+ /docs/architecture/integration-boundary.md
+ /docs/architecture/existing-learnershigh-data.md
+ /docs/product/existing-runners-high-analysis.md
+ 관련 references/existing-runners-high/screens/
```

---

## 4. Feature Map

학생 기능 **ST-01~ST-20**과 관리자 기능 **AD-01~AD-17**의 상세 요구사항은 2026-10-24 통합 기능 정리문을 기준으로 후속 Feature Spec에 나누어 반영한다. 아래는 **담당 영역 지도**이며 상세 구현 계약을 대체하지 않는다.

| 영역 | 학생 기능 | 관리자 기능 |
|---|---|---|
| 학교·평가정보 | ST-01 학업정보, ST-02 PDF 분석, ST-03 수행평가 관리, ST-04 AI 평가기준 설명 | AD-03 학교별 PDF, AD-04 지필·수행 통합 분석, AD-05 추출 검토 |
| 탐구 준비·자료 | ST-05 꿀팁, ST-06 주제명 추천, ST-07 모의고사 카드, ST-10 자료 추천, ST-11 자료 수집 | AD-06 모의고사 소재, AD-07 참고자료실, AD-08 스크랩·메모 |
| 탐구·노트·산출물 | ST-08 노트, ST-09 템플릿 10종, ST-12 결과 파일, ST-13 파일 버전, ST-16 심화 Task | AD-09 심화 Task 운영, AD-11 노트 열람, AD-12 파일 열람, AD-13 버전 비교 |
| 피드백 | ST-14 요청, ST-15 확인·반영 | AD-14 요청 관리, AD-15 문서·부분별 피드백, AD-16 후속 추천 |
| 확장·기록 | ST-17 대학 공개 PDF, ST-18 AI 도우미, ST-19 성장 기록, ST-20 아카이브 | AD-10 대학 자료 관리, AD-17 활동 현황 |
| 관리자 진입·학생 조회 | — | AD-01 통합 관리자 화면, AD-02 학생 Assessment 관리 |

### 학교 수행평가와 심화 탐구

```text
SchoolAssessment
→ 학교가 실제로 부여한 평가 / 학교 공식 채점기준·일정

EnrichmentTask
→ 학생이 선택하거나 작성하는 자율 심화 탐구
→ 학교 성적에 자동 반영되지 않음
```

두 기능은 관련 탐구 기록을 연결할 수 있지만 별개의 업무 객체다. **강제 8단계 수행평가, 주제 승인·반려, 필수 재제출, 대학 면접 모듈**은 신규 범위에 없다.

### 학생 화면

기존 LearnersHigh Student Navigation을 보존하고 Assessment 진입점을 추가한다. 수행평가 관리, 심화 탐구, 피드백, 자료함, 성장 기록, 보관함 등 내부 화면은 최신 Mockup에 맞춘다.

### 관리자 화면

기존 Admin Shell에 **`Assessment 관리`** 메뉴를 추가한다. 별도 선생님 Role / Surface를 생성하지 않는다. 단, 통합 관리자라고 해서 모든 학생 정보에 무제한 접근하는 것은 아니며, 기존 기관·담당 범위의 권한을 따른다.

---

## 5. Counseling / Student Care Boundary

상담 및 Student Care의 실제 구현과 문서 소유권은 Wangyu에 있다.

```text
Wangyu-owned
→ Counseling / Student Care / 관련 API·DB·상담 메모

Suyeon-owned
→ Assessment 학생 기록 / 학업·탐구·산출물 / 선택형 피드백
```

Assessment의 피드백은 상담 CRM이 아니며, 상담 Entity / API / UI를 재생성하지 않는다. Admin Shell에 이미 존재하는 Student Care 화면·Route·기능을 삭제하거나 덮어쓰지 않는다.

연결이 필요한 경우 Shared Contract 및 권한 영향 검토 후 담당자 합의를 거친다.

---

## 6. Shared Feedback Queue

**ADR-0009(문서상 Accepted)**가 기존 ADR-0003을 대체하고 Assessment의 **공용 피드백 요청함, Staff/과목 자동 배정 없음**을 규정한다. 과거 Queue의 승인·반려·검수 단계는 신규 Assessment에 이식하지 않는다. 팀의 실제 승인 여부는 별도 확인 대상이다. 신규 Assessment 피드백은 다음과 같다.

```text
학생이 질문 없이 요청
→ 요청 당시 노트·선택 파일 버전 Snapshot 고정
→ 관리자 요청 열람 / 자유 의견 / 위치별 의견
→ 학생에게 답변 표시
```

승인/반려 및 강제 재제출은 없다. 답변 상태와 수행평가 진행 상태는 독립이다. **공용 요청함의 설계 방향은 ADR-0009 기준으로 문서상 결정**되었고, 기존 구현/API의 물리적 재사용 및 API-OD-A09 문구 정리는 별도로 검토한다. 관리자 답변의 임시저장·전달과 요청 완료 전이는 `domain.md` §16-1을 따른다.

---

## 7. Existing LearnersHigh

기존 LearnersHigh의 Plan, Library, Study Time, 보고서, 관리자 학생·지점 관리, 기존 수행평가 데이터는 소유권과 실체를 확인한 뒤 Adapter를 통해 재사용한다.

```text
기존 수행평가 기본정보가 존재
→ 동일 Record 무단 복제 금지
→ Assessment 과정 노트·결과 파일·피드백은 별도 확장 책임 검토
```

기존 데이터의 PK / 테이블 / 인증 / Write Owner를 문서만 보고 추측하지 않는다. 기존 학교 수행평가 관리 기능과 신규 Assessment 화면은 명칭만 같다고 동일 데이터로 간주하지 않는다.

---

## 8. API

Frontend ↔ Backend 공통 Contract:

```text
docs/api/api-contract.md
```

현재 API Contract에는 **신규 Student/Admin Assessment 계약 초안(DRAFT)**이 작성되어 있다(§9~47). 학생 두 버전 비교(§25-1)와 심화 Task 출처 연결 `sourceReference`(§18)도 초안에 포함되어 있다. 휴지통 대상별 삭제·복원은 §30 표와 API-OD-A08에서 **미확정 범위로 추적**하며, 형식별 비교 지원·출처 검증 세부는 API-OD-A12에 남아 있다. 기존 Student Care 계약(§65)은 유지한다.

```text
Feature Spec / Domain 작성됨 · API Contract 초안 작성됨
≠ Backend 구현됨 ≠ Frontend 구현됨 ≠ 통합 테스트 완료
```

```text
Feature Requirement
→ Domain 확인
→ Shared API 영향 검토 / Contract 개정
→ Backend
→ Frontend
→ Test
```

---

## 9. Design

신규 Assessment:

```text
Feature Spec           → Behavior / Permission
Claude Design Mockup    → Layout / Navigation / Visual (Color·Type·Spacing) — 직접 기준
Daglo Screenshots       → Mockup에 없는 세부 표현·UX 패턴 보완
TDS                     → 신규 Assessment에 사용하지 않음 (기존 기능에는 보존)
Existing LearnersHigh   → 기존 Student / Admin Shell 보존
```

Daglo 브랜드·로고·기능을 그대로 복제하지 않는다. 화면의 위치와 기능 의미는 Assessment Spec·Mockup을 우선하며, 디자인 이미지는 새로운 Entity나 권한의 근거가 아니다.

---

## 10. Open Decisions

`domain.md` 및 실제 `api-contract.md`의 미확정 사항은 임의로 닫지 않는다. 특히 다음 항목은 별도 확인이 필요하다.

- 기존 수행평가 원본 데이터와 신규 Assessment 기록의 매핑 / Write Owner
- 기존 학생·관리자 인증 및 접근 범위
- PDF 분석·AI / File Storage Provider 및 HWP·Office Preview 지원 범위
- Artifact 파일 버전 비교의 포맷별 구현 범위
- 노트 자동 저장·수정 이력 저장 방식과 피드백 Snapshot 구조
- ADR-0008·0009의 실제 팀 승인 확인(문서상 Accepted, 기존 0001·0003·0004 대체) 및 구형 코드 정리 범위
- 학생 두 Version 비교 Endpoint, 모의고사·대학 자료 → Task 출처 연결 필드, 휴지통·삭제·복원 API 보완
- FeedbackRequest/Reply 상태와 API 초안 정합성(세부 취소/재요청은 미확정)
- 관리자 공통 콘텐츠의 기관·지점별 운영·공개 권한(OD-A08)

---

## 11. 완료 기준

화면이 보이는 것만으로 완료가 아니다.

```text
Requirement
+ Domain State / Invariant
+ API Contract
+ Student / Admin 실제 연결
+ Loading / Empty / Error
+ Snapshot / Version Integrity
+ Permission / Privacy
+ Relevant Test
```

검증 상태는 `progress.md`에 기록한다. 사용자가 제공한 Mockup이 존재한다는 사실은 신규 기능 구현 완료 증거가 아니다.

---

## 12. 핵심 원칙

```text
Spec은 기능을 정의한다.
Domain은 상태와 불변식을 정의한다.
API Contract는 Front/Back 연결을 정의한다.
Progress는 실제 진행 상태를 기록한다.

Assessment는 새로 구현한다.
기존 LearnersHigh와 Wangyu 기능은 보호한다.
하나의 업무 객체는 Student/Admin에서 같은 Identity를 사용한다.
AI 결과와 공식 평가정보·학생 원문을 구분한다.
구형 Suyeon 명세는 신규 구현의 Source of Truth로 사용하지 않는다.
```
