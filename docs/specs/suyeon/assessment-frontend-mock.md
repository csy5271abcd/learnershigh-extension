# Assessment Frontend Mock 정책 (Stage 1)

> 위치: `docs/specs/suyeon/assessment-frontend-mock.md`
> 상태: **DRAFT — Suyeon 작성, 팀 검토 전.** Assessment Feature 내부(`frontend/{student,admin}/src/features/assessment/**`)에만 적용한다.
> `frontend/shared/**`, `e2e/**`, Admin Shell/Router에 영향을 주는 항목은 **제안**이며, `harness-change-proposals.md`의 승인 절차를 따른다.
> 상위 기준: `CLAUDE.md` §18 (설계 게이트 + 구현 Stage).

## 1. 목적과 원칙

Backend가 없는 Stage 1에서도 Student/Admin Assessment 화면의 디자인·Interaction·상태를 실제 서비스 수준으로 검증하기 위해 **계약 기반 Mock Adapter**를 사용한다.

허용과 금지를 다음과 같이 구분한다.

| 허용 (계약 기반 Mock) | 금지 (근거 없는 데이터·로직) |
|---|---|
| `api-contract.md`에 있는 Endpoint의 Request / Response / Error Shape을 그대로 흉내 내는 Adapter | 계약에 없는 필드·Endpoint·Enum을 Mock에서 먼저 만들기 |
| `domain.md`에 정의된 Invariant를 Mock 안에서 재현 (예: Snapshot 고정, Artifact별 Version 증가) | Open Decision을 Mock 동작으로 닫기 (예: 역전이 허용, 재요청 허용, 휴지통 복원) |
| 단일 Canonical Fixture에서 계산한 파생 값 (예: 피드백 대기 수) | 화면에 숫자를 하드코딩한 KPI / Counter |
| 시연·테스트용 실패·지연 시나리오 | Mock 성공을 "서버에 저장됨"처럼 보이게 하기 |
| Student와 Admin이 같은 ID 체계를 쓰는 Fixture | Surface별로 Student / Assessment를 따로 만든 복제 Fixture |

계약에 없는 정보가 Mockup에 보이면 다음 순서를 따른다.

```text
Mockup 요소 발견 → 화면 매핑표(assessment-screen-map.md)에 "계약 없음" 기록
→ Domain / api-contract 개정 요청 (또는 Open Decision 등록)
→ 개정 전에는 해당 요소를 구현하지 않거나, 비활성 + "준비 중" 사유 표시
```

## 2. 계층 구조

```text
features/assessment/
├─ routes/ · pages/ · components/   # 화면. api/ 이외의 데이터 출처를 import하지 않는다.
├─ model/                           # 화면 상태, 파생 표시 값, 화면용 Hook
└─ api/
   ├─ <resource>Api.ts              # 화면이 호출하는 함수 시그니처 (계약 §번호 주석)
   ├─ http/                         # Stage 2: fetch 기반 실제 구현
   └─ mock/                         # Stage 1: 같은 시그니처의 Mock 구현 + In-memory Store
```

- 화면 컴포넌트는 Fixture 파일을 **직접 import하지 않는다.**
- Mock과 HTTP 구현은 **같은 함수 시그니처와 같은 반환 Type**을 가진다. 전환할 때 화면 코드는 바뀌지 않아야 한다.
- 오류는 `api-contract.md` §5 공통 Error Format(`code` / `message` / `details`)과 §53 Error Code로 표현한다. Mock이라고 `[]`나 `null`로 오류를 숨기지 않는다.
- 참고 선례: Wangyu Student Care의 `api/apiClient.ts` · `model/useRemote.ts` 패턴. **Wangyu 소유 코드이므로 import·수정하지 않는다.** 같은 원칙을 Assessment 안에서 따로 구현하며, 공용화는 Shared 승인 후 검토한다.

## 3. Mock / Real 전환

- Data Source는 **Surface당 하나의 스위치**로 고른다. **Student 결정(2026-10-26):** `VITE_ASSESSMENT_DATA_SOURCE = mock | http` (`frontend/student/src/features/assessment/api/dataSource.ts`). 지정이 없으면 개발 서버 `mock`, Production Build `http`. Stage 2 http Adapter가 없는 동안 `http`는 "서버 연결 전" 오류를 돌려준다(Mock 코드는 번들에 포함되지만 실행되지 않는다).
- 기본값은 보수적으로 정한다.
  - Stage 1 개발 서버: `mock`
  - Production Build: `http` 또는 Build 실패. Mock 코드가 실제 배포물에서 실행되지 않게 한다.
- Stage 2 전환은 **Resource 단위**로 한다 (예: SchoolAssessment만 먼저 `http`). Resource별 전환 상태는 `progress.md`에 기록한다.
- 전환 완료 기준: 같은 화면이 Real API로 동작하고, Contract Test와 Cross-Surface 검증을 통과한 상태.

## 4. Canonical Fixture와 공유 Type

### 4-1. 단일 정의

- Fixture는 `domain.md` §25 조건을 따른다. Student와 Admin이 **같은 studentId / assessmentId / noteId / revisionId / artifactId / versionId / requestId**를 사용한다.
- 날짜·D-day는 Fixture에 고정 기준 시각(`asOf`)을 두고 계산한다. 실행 시점의 현재 시간에 의존하지 않는다 (`.claude/rules/testing.md` §14).
- 학교명·학생명은 실존 인물·학교로 오해되지 않는 시연용 값을 사용한다. Mockup 문구를 그대로 쓰는 경우에도 "시연 데이터" 표시를 유지한다.

### 4-2. 위치 (제안 — 승인 필요)

Student와 Admin은 별개의 Vite 앱이므로 단일 정의를 공유할 위치가 필요하다.

| 선택지 | 장점 | 단점 | 상태 |
|---|---|---|---|
| A. `frontend/shared/assessment/` (contract Type + Fixture + 읽기 전용 Note Renderer 등) | 단일 정의, One Entity 원칙 충족 | `frontend/shared/**`는 Shared 영역, workspace 또는 alias 설정 필요 | **권장**, Wangyu 리뷰 필요 |
| B. Student에 두고 Admin이 상대 경로로 import | 설정 최소 | workspace 경계 침범, 의존 방향 불명확 | 비권장 |
| C. Surface별 복제 | 독립적 | One Entity 위반 | **금지** |

**승인 전 진행 방법:** 먼저 Student 화면만 구현한다. Type과 Fixture는 `frontend/student/src/features/assessment/api/mock/`에 두되, **Admin 화면에서 사용하기 시작하기 전에** 승인된 공유 위치로 옮긴다. 복제본을 만들어 Admin을 먼저 진행하지 않는다.

## 5. 저장 범위와 지속성

| 항목 | Stage 1 정책 |
|---|---|
| 저장 위치 | 앱 Instance별 In-memory Store (Fixture로 초기화) |
| 새로고침 | 초기 Fixture 상태로 복귀 (기본) |
| 브라우저 저장소 | 기본 사용하지 않는다. 사용하려면 이 문서에 범위·초기화 방법을 먼저 기록한다 |
| Student ↔ Admin | **런타임 동기화 없음.** 두 앱은 별도 Origin(5173 / 5174)이며 각자 Store를 가진다 |
| 파일 업로드 | 실제 파일 내용을 저장하지 않는다. 파일명·크기·형식 메타데이터만 Version으로 만든다. Preview는 Fixture에 등록된 시연 자산만 사용하고, 업로드한 파일을 실제로 변환한 것처럼 그리지 않는다 |

## 6. Stage 1 / Stage 2 공유 범위

| 범위 | Stage 1 (Mock) | Stage 2 (Backend) |
|---|---|---|
| 같은 ID·같은 초기 데이터 | 공통 Fixture로 보장 | DB로 보장 |
| 학생 요청 → 관리자 목록 반영 | 각 앱에서 **사전 정의 시나리오**로 각각 검증 (예: "요청 후" 시나리오를 Admin에서 로드) | 실제 왕복 E2E로 검증 |
| 관리자 답변 → 학생 답변 완료 | 위와 동일 | 실제 왕복 E2E |
| Snapshot 불변·Version 독립 | Mock Store 안에서 재현해 화면 표현 검증 | Backend Invariant Test와 E2E |
| 권한·타 학생 접근 차단 | 화면의 권한 없음 상태만 재현 | 서버 인가 Test |
| KPI / 카운트 | Fixture Entity에서 계산 | DB Query에서 계산 |

## 7. 상태·지연·오류 시나리오 (개발 전용)

- Mock Adapter는 시나리오로 다음을 재현할 수 있어야 한다: 성공, 지연(Loading), 빈 데이터(Empty), 검증 오류(400), 권한 없음(403), 충돌(409 `RESOURCE_VERSION_CONFLICT`), 서버 오류(500), Integration 오류(§6 Integration Error), 업로드 실패.
- 시나리오 선택 수단은 개발 모드에서만 동작한다. **Student 결정(2026-10-26):** URL Query `?mockScenario=a,b` (`api/mock/mockRuntime.ts`, Mock 모드에서만 읽음). 현재 이름: `slow`, `empty`, `listError`, `contextError`, `createError`, `createValidation`, `academicLocked`, `statusConflict`, `noteError`, `artifactError`, `uploadError`, `feedbackListError`, `feedbackEmpty`, `feedbackError`, `enrichmentEmpty`, `catalogError`, `catalogDetailError`, `taskListError`, `taskCreateError`, `materialError`, `universityError`, `resourceEmpty`, `resourceListError`, `resourceDetailError`, `resourceRecommendationError`, `resourceCreateError`, `resourceUpdateError`, `noteSaveError`, `noteConflict`(다른 기기 저장을 Revision으로 남긴 뒤 409), `growthEmpty`, `growthListError`, `growthSaveError`, `archiveError`, `favoriteError`, `archiveTrashDemo`(휴지통 화면 확인용 시연 항목 1개, 실제 삭제 결과 아님). Assessment 홈은 새 시나리오 없이 기존 `listError`·`empty`·`slow`·`feedbackListError`·`archiveError`로 영역별 상태를 재현한다. 수행평가 꿀팁은 §15가 허용한 코드 정적 콘텐츠라 Mock Adapter·시나리오가 없다. 노트 자동 저장 간격(1.5초)은 Mock 전용으로 `model/noteAutosavePolicy.ts`에만 둔다(API-OD-A04 미정). 이름 끝에 `Once`를 붙이면 첫 호출만 실패한다(실패 → 재시도 → 성공 검증).
- 고정 기준일(`asOf`)은 Fixture의 `2026-10-16`이며 D-day·Mock 생성 시각에 사용한다. 화면은 `api/runtimeInfo.ts`로만 이 값을 읽는다.
- Mockup에 보이는 "시연: 다음 요청 전송 실패시키기", "시연: 선생님 답변 도착시키기", "시연: 전송 실패" 버튼은 **시나리오 제어 UI**다. Mock 모드에서만 보이게 하고, 제품 기능으로 구현하지 않는다.
- Playwright 등 자동 테스트는 같은 시나리오 이름을 사용해 결정적(deterministic)으로 재현한다.

## 8. "서버에 저장되지 않음" 표시

- Mock 모드의 Assessment 화면에는 **항상 보이는 배지 또는 배너**를 둔다 (Mockup 문구 예: "시연용 샘플 데이터예요", "시연용 화면이에요. 실제로 전송되지 않아요").
- 저장·전송 성공 Toast는 Domain상 성공 의미를 유지하되, 위 표시 덕분에 실제 서버 저장으로 오해되지 않아야 한다.
- Mock 모드 표시를 숨기는 옵션은 시각 비교 캡처에서만 허용하고, 그 사실을 캡처 기록에 남긴다.

## 9. Open Decision 처리 규칙

| 항목 (근거) | Stage 1 처리 |
|---|---|
| 수행평가 상태 역전이 (API §13, domain §10-1 / Mockup "언제든 자유롭게 바꿀 수 있어요") | 결정 전에는 순방향 전이만 활성. 역방향 선택지는 비활성 + 사유 표시. 결정되면 이 표를 갱신 |
| 피드백 재요청·대기 중 중복 요청 (API-OD-A06) | 같은 범위의 중복 제출만 방지. "답변 후에만 새 요청" 같은 문구를 확정 규칙으로 쓰지 않음 |
| 피드백 요청 취소 | UI 미제공 |
| 휴지통·삭제·복원 (OD-A11 / API-OD-A08) | 메뉴·탭은 표시 가능. 삭제·복원 동작은 비활성 + "정책 확정 전" 표시. 단, §12 `SchoolAssessment DELETE` 후보는 결정 전 비활성 |
| 위치별 피드백 (PDF 쪽 / 슬라이드) (API-OD-A07) | 문서 전체 의견만 제공. 가짜 위치 마커 금지 |
| 파일 Preview·두 버전 비교 형식 (API-OD-A12) | Fixture에 있는 시연 PDF·이미지만 Preview. 그 외 형식은 "미리보기 미지원 + 다운로드" 상태 |
| AI 설명·추천·도우미 (API-OD-A10) | 고정 Suggestion 응답 + 실패·재시도 상태. "AI Suggestion" 라벨, 학생 원문 자동 반영 금지 |
| Home 요약·알림 (계약 없음) | 다른 목록 API의 Mock 결과를 조합해서만 표시. 알림 발송·읽음 상태는 구현하지 않음 |
| 계약에 없는 상세 필드 (평가 유형·평가일 텍스트·반영비율·정보 출처·담당 선생님·안내문 첨부 등) | 계약 개정 전 구현 보류. 화면 매핑표에 "계약 없음"으로 기록 |
| 담당 선생님 표기·AI 제한 배지 | 명세상 시연 표현. 새 Actor / 정책을 만들지 않음. 표시 여부는 계약 개정과 함께 결정 |

## 10. Backend Mock과의 구분

| 구분 | Frontend Mock Adapter (이 문서) | Backend `MockExisting*Client` |
|---|---|---|
| 위치 | `frontend/*/src/features/assessment/api/mock/` | `backend/.../common/integration/learnershigh/` |
| 대체 대상 | Extension Backend API 전체 (`/api/{student,admin}/assessment/**`) | **기존 LearnersHigh** 외부 시스템 응답 |
| 사용 단계 | Stage 1 | Stage 2 이후 (기존 시스템 연동 전 · 테스트) |
| 소유 | Suyeon (Assessment) | Shared (`common/`), Wangyu Student Care가 사용 중 |

Frontend Mock은 Backend Mock을 대신하지 않고, Backend Mock은 Frontend 개발용으로 쓰지 않는다. Stage 2에서 Frontend가 `http`로 전환되면, 기존 시스템 부분은 Backend Mock으로 계속 대체될 수 있다.

## 11. 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-26 | 최초 DRAFT (1차 하네스 정비) |
