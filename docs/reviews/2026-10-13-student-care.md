# Review — 학생 케어 (2026-10-13)

> 기준: `.claude/rules/code-review.md`  
> 범위: `d0c62d6..daa15a9` (PR #7) Backend studentcare / common, Migration, Admin Frontend, E2E, CI  
> 방식: Section별 독립 Reviewer 4명 → 핵심 Finding 코드 재확인(반박 단계) → Confidence ≥ 80 + CONFIRMED만 감점

## 1. 점수

| Section | 배점 | 감점 근거 | 점수 |
|---|---|---|---|
| A. Spec 일치 | 15 | P2 ×2 | 9 |
| B. Domain / State | 15 | P1 ×1, P2 ×2 | 1 |
| C. API Contract / Error | 10 | P1 ×1, P2 ×2 | 0 |
| D. Boundary / Ownership | 10 | — | 10 |
| E. Security / Privacy | 15 | — (확인 필요 3건) | 15 |
| F. Test | 15 | P1 ×1, P2 ×11 | 0 |
| G. Frontend UX / 접근성 | 10 | P2 ×6 | 0 |
| H. 유지보수성 | 10 | P3만 | 10 |
| **합계** | 100 | | **45 → FAIL** (P0 없음) |

## 2. CONFIRMED — P1

| ID | Section | 위치 | 문제 |
|---|---|---|---|
| B-1 | B | `StudentCareService.decide / addNote`, `GlobalExceptionHandler` | 같은 건 동시 결정 / 메모 → `@Version` 충돌 / sequence Unique 위반이 500으로 나감 (409 기대) |
| C-1 | C | `StudentCareService.java` REVISE | Contract의 top-level `recheckDate`를 무시하고 `plan.recheckDate`만 읽음 → Contract 예시대로 보내면 422 |
| F-1 | F | `StudentCareCaseApiTest` | 진행 중 건이 있을 때 EXPECTED_CHANGE / RECORD_ISSUE로 새 건을 여는 경우 Test 없음 (Service 검사 삭제해도 통과) |

## 3. CONFIRMED — P2

| ID | Section | 문제 |
|---|---|---|
| A-1 | A | cooldown으로 신호가 모두 빠진 판단 보류 학생이 보드 어디에도 안 나옴 (deferred를 cooldown 전에 확정) |
| A-2 | A | cooldown이 "가장 최근 종결 건"이 아니라 기간 내 모든 종결 건 baseline의 합집합 |
| B-2 | B | 지표를 정수 반올림한 뒤 Threshold 비교 → 59.6% 실행률 미검출, 비중 차이 14.2%p 오검출 |
| B-3 | B/C | 사유 메모 1000자 + 접두어 → Event content 1000자 절단, 메모 끝 손실 |
| C-2 | C | 415 / 406(Content-Type 오류)이 500으로 나감 |
| C-3 | C | `PUT /api/test/integration`이 Contract / ADR-0007에 없음 |
| F-2~12 | F | Threshold 경계값, 시작 시각 3일 규칙, 기준값 key별 반영, 비교 최소 폭 경계, 재점검일 asOf+1, cooldown 만료 / 다른 Type, 503 (상세 / POST / 결정 / 요약), Empty 상태, 기준값 범위 8 key, 동시성, 정렬 / 요약 Counter Test 부재 (Mutation 26건 중 18건 생존) |
| G-1 | G | 탭 전환 시 입력 중인 사유 / 약속 / 메모 소실 |
| G-2 | G | 저장 / 종결 / 탭 이동 후 Focus 유실 |
| G-3 | G | 데이터가 있는 상태에서 보드 Reload 실패 시 오류 안내 없음 |
| G-4 | G | 지금 값 계산 불가(now=null)에 "비슷함" / "변화 없음" 표시 |
| G-5 | G | 기준값 소수 입력이 서버에서 정수로 잘려 저장, 성공 안내 |
| G-6 | G | Light 모드 대비 미달 (선택 지점 3.71:1, Toast 4.34:1 등) |

## 4. 확인 필요 (점수 미반영)

- 학생 기록 / 케어 건 변경 API의 지점 범위 미검사 (전학 / ID 지점 간 유일성 미정) → Open Decision 후보
- E2E 전용 Endpoint가 `@Profile("e2e")` 하나로만 격리
- 사유 확인(즉시 종결) 동시 2회 → 중복 종결 건
- `DataIntegrityViolationException` 전체를 `ACTIVE_CARE_CASE_EXISTS`로 변환
- Mock 연동이 기본값 (domain.md가 실제 API 확정 전 Mock 사용을 명시 → P3로 하향)
- OWNERSHIP.md에 Today Board(Suyeon)의 `StudentCareQueryService` 소비 제약 추가 — 합의 기록 없음
- Toast live region, 결정 후 버튼 재활성, 자정 경계 재점검일, cooldown 경계 포함 여부

## 5. P3 (감점 없음)

Plan 길이 초과 오류 코드, Contract Error 목록 누락, enum 오류 field 표기, 지점 0개 Empty 문구, 그래프 대체 텍스트, 탭 `aria-controls` / Home·End, Reload 방식 3종 혼재, 서버 필드 오류 미연결, FE/BE 상수 중복, 오류 정규화 중복, Mapper 규약 불일치, 비교 중복 계산.

## 6. 잘 된 점 (Reviewer 확인)

- 신호 기간 / 0 나누기 / 미입실 시 학습량 계열 제외, 재점검 도래 / 범위, 비교 결과 집계, Baseline 불변, Event append-only
- Existing 접근은 Integration Client 경유, Ownership 폴더 규칙 준수, Mentor 노출 없음
- 시간 통제(AdjustableClock), E2E 고정 대기 없음, CI e2e Gate
- Frontend 날짜 처리 Timezone 안전, 요청 경쟁 상태 처리, 중복 제출 방지
