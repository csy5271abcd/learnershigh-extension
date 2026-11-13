# 학교 평가계획서 PDF 분석 — 목표 구조·검증 계획

> 위치: `docs/specs/suyeon/assessment-pdf-analysis-plan.md`  
> 상태: **DRAFT (2026-11-03).** 설계 제안이다. Entity·State·API·Provider·라이브러리를 확정하지 않는다. 확정은 `domain.md` §9, `api-contract.md` §10·11·38·39(Shared 승인), 신규 ADR(P-39)에서 한다.  
> 관련 기능: ST-02 (`features/assessment-student.md` §5), AD-03~05 (`features/assessment-admin.md` §5·§6)  
> 관련 코드(Untracked, Suyeon 작성 — `progress.md` 2026-10-29 기록): `backend/src/main/java/com/learnershigh/extension/assessment/**`

## 1. 이 문서의 역할

| 문서 | 담당 |
|---|---|
| Feature Spec (student §5, admin §5·§6) | 사용자 동작·화면 상태·수용 기준 |
| `domain.md` §9 | 개념 Entity·데이터 계층·불변조건 |
| **이 문서** | 분석 파이프라인, 목표 결과 구조(이중 Schema 통합 방향), 기존 코드 재사용, 한계 재검토, Golden Corpus·정확도 평가, 미결정 목록 |
| `api-contract.md` | HTTP 계약 (변경안은 `harness-change-proposals.md` P-35) |

## 2. 데이터 계층 (2026-11-03 결정 반영)

다음 다섯 계층은 서로 다른 데이터로 저장·표시한다. 한 계층의 변경이 다른 계층을 자동으로 바꾸지 않는다.

| 계층 | 개념 (제안 이름) | 쓰는 사람 | 바뀌는 방식 |
|---|---|---|---|
| ① 원본 | `EvaluationPlanSlot` → `PlanDocument` → `DocumentRevision` (+ `PageMap`) | Admin(공통) / Student(개인 비공개) | 새 Revision 추가만. 덮어쓰기 없음 |
| ② AI 결과 | `AnalysisRun` → `SubjectSegment` → `ExtractedCandidate` | 시스템 | 재분석 = 새 Run. 이전 Run 보존 |
| ③ 근거·검증 | `Evidence {pdfPage, printedPage, quote, bbox?}` + `VerificationResult` | 시스템 | 후보마다 고정 |
| ④ 관리자 확정 | `ReviewDecision` / `ConfirmedValue` | Admin | 확정 기록 추가. 개정본이 오면 이전 확정본은 대체 표시(SUPERSEDED 후보) |
| ⑤ 학생 개인 | `PersonalCorrection` + `AppliedItem`(→ `SchoolAssessment.evaluationItemRef`) | Student | 학생 본인 기록만 변경 |

- 학생 화면의 표시 우선순위(제안): 학생 개인 정정 > 관리자 확정값 > AI 후보(“확인 필요” 표시). 각 값의 출처 계층을 함께 보여준다.
- 학생 `SchoolAssessment.evaluationItemRef {documentRevisionId, subjectId, itemKey}`(현행 Student Mock)는 ⑤ → ① 연결로 재사용한다.

## 3. 분석 대상 항목

| 영역 | 항목 | 현행 Backend `AiSchemas` | 현행 Student Mock `types.ts` |
|---|---|---|---|
| 기본정보 | 학교·학년도·학년·학기·과목·교사(문서에 있으면)·문서 제목·개정 표시 | 학교·학년도·학년·학기·과목 | 과목명 |
| 교수·학습 계획 | 월/주차, 단원, 성취기준(코드·문장), 교수학습 활동, 평가 방법 | 단원·성취기준·교수방법(목록) | `teachingPlan: string[]` |
| 지필평가 | 1·2차, 문항 형식(선택형/서술형·논술형), 반영비율, 만점·배점, 시기 | 이름·시기·비율·만점 | 차수·비율·문항 형식 |
| 수행평가 | 평가명, 영역, 유형, 시기, 반영비율, 만점, 내용, 성취기준 연결, 평가기준 | 영역·유형·시기·비율·만점·채점기준 | 항목 키·이름·비율·만점·시기·채점기준 문장 |
| 세부 채점기준 | 평가 요소, 수준별 기준 문장·점수, 유의사항(결시·미제출·감점 등) | **없음** (채점기준 1개 필드) | `rubric: string[]` |
| 성취수준 | 성취도 체계, 기준 성취율 | 성취수준 목록 | standards·levels·thresholds |
| 근거 | PDF 쪽(1-based), 인쇄 쪽, 위치, 인용, 불명확 항목 | `AiField{pdfPage, printedPage, evidenceQuote}` + 서버 검증 | `sources[]`, `sourcePdfPageNumber` |
| 문서 수준 | 과목별 쪽 범위, 판독 불가 쪽, 정정·개정 안내 | `unreadableNotes` | 과목 단위 `extractionFailed` |

굵게 표시한 **없음**과 월/주차·유의사항·과목 쪽 범위·개정 정보는 현행 두 구조 모두에 없다.

## 4. 목표 결과 구조 (이중 Schema 통합 방향)

**결정(2026-11-03):** `api-contract.md` §11 Resource 모델을 중심으로 통합하고, §47-A `AiField`의 근거·검증 정보를 유지한다.

```text
AnalysisResult (§11 모델 유지: analysisId, documentRevisionId, status)
└─ subjects[]                      ← SubjectSegment
   ├─ subjectName, pageRange, segmentStatus(성공/부분/실패)
   ├─ teachingPlan[]   { period(월·주차), unit, standards[], activities, assessmentMethod }
   ├─ writtenEvaluation { totalWeight, exams[]{ round, format[], weight, maxScore, timing } }
   ├─ performanceEvaluation { totalWeight, items[]{ itemKey, name, area, type, timing, weight, maxScore,
   │                                                content, standards[], criteria[], rubric } }
   │     rubric { elements[]{ name, levels[]{ label, description, score } }, cautions[] }
   ├─ achievement { system, levels[], thresholds[] }
   └─ warnings[] (합계 불일치 등 — 자동 보정 없음)

모든 leaf 값 = Field<T> {
  value: T | null
  presence: FOUND | NOT_IN_DOCUMENT | UNREADABLE     ← "미기재" / "판독 불가" / 0 구분
  evidence: { pdfPage, printedPage | null, quote(≤80자) } | null
  verification: { verified, reason | null }           ← AiEvidenceVerifier 결과
}
```

- 필드 이름은 **예시**다. 실제 이름·Enum은 api-contract 개정(P-35)에서 정한다.
- `itemKey`는 개정본 사이에서 같은 항목을 찾기 위한 안정 키 후보다. 생성 규칙은 미결정(§10).
- Admin 확정(§39)과 학생 정정(§11 personal-review)은 이 구조의 `fieldPath`를 가리키는 **별도 기록**이다.

## 5. 지원할 문서 형식

| 형식 | 처리에 필요한 것 | 1차 범위 (제안) |
|---|---|---|
| 통합형 (여러 과목 한 PDF) | 과목 경계 분할 | 포함 |
| 과목별 PDF 여러 개 | 슬롯에 여러 문서 | 포함 |
| 다학년 통합 | 학년 경계 분할 | 포함 |
| 가로형 페이지 | 회전 감지·텍스트 순서 | 포함 |
| 2-up (한 PDF 쪽에 인쇄 쪽 2개) | PageMap에서 `printedPage` 2개, 좌우 분할 | 포함 |
| 여러 쪽에 걸친 표 | 표 연속성 판단 | 포함 (정확도 측정 대상) |
| 셀 병합 표 | 표 구조 인식 | 포함 (텍스트 추출만으로 어려움 — §6 B안 검토) |
| 스캔본(이미지 PDF) | OCR 또는 이미지 입력 | **현행 422 거절**. 2차 이후 |
| 정정·개정본 | Revision 추가, 이전 확정본 대체 표시 | 포함 |
| HWP/HWPX | 변환기 | **보류** (PDF 이후 별도 검토) |

## 6. 파이프라인 (제안)

```text
업로드 (SHA-256로 같은 파일 감지)
→ PageMap: PDF 쪽 ↔ 인쇄 쪽, 가로형·2-up 감지
→ 쪽 분류(교수학습 계획 / 평가 계획 / 채점 기준 / 기타) + 과목·학년 경계 → SubjectSegment
→ 과목별 구조화 추출 (과목 단위 호출 → 토큰 한도·부분 실패 격리)
→ 서버 검증 (인용·숫자·쪽 범위·합계·다쪽 표 연속성)
→ 결과 상태 → Admin 검토 → 확정 → 학생 공개
```

**기술 대안**

| 안 | 내용 | 판단 |
|---|---|---|
| A | 현행: Spring + PDFBox 텍스트 + LLM 구조화 출력 | 기반으로 사용 (ADR-0005 구조와 맞음) |
| B | A + 표·스캔 쪽만 페이지 이미지/PDF를 LLM에 입력 | A의 표·2-up 약점 보완 후보. Provider 지원·비용 확인 필요 |
| C | 별도 Python 문서 분석 서비스 | 새 언어·배포 → ADR 필요. A+B가 정확도 기준 미달일 때 재검토 |
| D | 외부 Document AI/OCR | 개인정보 전송 검토 필요. 스캔 대응 후보 |

Provider·OCR 라이브러리·Python 분리는 **이 문서에서 정하지 않는다**(API-OD-A10, OD-A03).

**분석 상태 후보 (확정 아님)**

```text
분석: NOT_REQUESTED → QUEUED → PROCESSING → REVIEW_REQUIRED | PARTIAL | FAILED
검토: UNREVIEWED → IN_REVIEW → CONFIRMED  (개정본 확정 시 이전 것은 SUPERSEDED)
```

`PARTIAL`은 일부 과목만 성공한 경우다. 실패한 과목은 빈 값이 아니라 실패 상태로 남긴다. 성공 응답도 항상 사람 검토가 필요하다(현행 `REVIEW_REQUIRED` 원칙 유지).

## 7. 기존 Backend 코드 재사용과 한계

| 현행 코드 | 재사용 | 다음 단계에서 바꿀 것 |
|---|---|---|
| `PdfTextExtractor` (PDFBox, 쪽별 텍스트, SHA-256) | 그대로 | PageMap(2-up·가로형) 단계 추가 |
| `AssessmentAiClient` Interface, `AnthropicAssessmentAiClient`, `UnconfiguredAssessmentAiClient` | 그대로 (Provider 경계) | Provider 확정 전 기본값 `none` 유지 |
| `AiEvidenceVerifier` | 그대로 | 다쪽 표·과목 쪽 범위·rubric 점수 검증 추가 |
| `AssessmentAiService` | 프롬프트·검증 흐름 | 단일 호출 → 과목별 호출, 동기 → 비동기 Job, 결과 저장 |
| `AssessmentAiController` `/api/admin/assessment/ai/*` | `/status`만 | 평가계획서 분석은 §38·39 Resource 아래로 이동. 대학·모의고사 2개는 **사용 중지 대상**(사용처 확인 후 제거) |
| 메모리 Idempotency (200개, 재시작 시 사라짐) | — | §51 Idempotency-Key 저장 방식으로 교체 |

**재검토해야 할 현행 제한 (실제 PDF로 측정 후 결정)**

| 제한 | 현재 값 | 문제 |
|---|---|---|
| 쪽 수 | 120쪽 (`MAX_PAGES`) | 통합형 문서가 넘을 수 있음. 과목별 분할 후 다시 정함 |
| 파일 크기 | 20MB (Service), multipart 전역 100MB (`application.yml`, Shared) | 전역 설정 변경은 Wangyu 리뷰 필요 |
| 호출 방식 | 문서 전체 1회 호출, 출력 16,000 토큰 | 다과목 문서에서 출력 잘림(`AI_OUTPUT_INVALID`) 가능성 큼 |
| 시간 | 동기 300초, 재시도 1회 | HTTP 시간 초과 → 비동기 Job 필요 |
| 인증 | 없음 | **운영 사용 금지**. Existing Auth 확인 전 |
| 저장 | 없음 | 계층 ①~⑤ 저장 필요 (DB Migration은 Shared) |

## 8. Golden Corpus와 정확도 평가 계획

**현재 Blocker:** Repository에 학교 평가계획서 샘플 PDF가 **한 건도 없다.**

### 8-1. 수집

- 학교알리미 공시 PDF를 형식(§5)별로 모은다. 목표: 형식마다 2~3건, 전체 20~30건.
- 파일은 Git에 넣지 않는다. 로컬 폴더(예: `references/evaluation-plans/` — `.gitignore` 보호 후)에 두고, Git에는 **Manifest**(파일명·SHA-256·학교 익명 ID·학년도·형식 태그·쪽 수)만 둔다. 대학 PDF Manifest 방식과 같다.
- 공시 자료라도 교사 이름 등 개인정보가 있을 수 있다. Manifest에 개인정보를 적지 않는다.

### 8-2. 정답 데이터

- 사람이 원본을 보고 §4 구조로 정답 JSON을 작성한다(로컬 전용).
- 문서마다 과목 쪽 범위, 비율·만점, 수행평가 항목, 채점 기준 수준·점수, 근거 쪽을 기록한다.
- 두 번째 사람이 표본을 다시 확인한다.

### 8-3. 지표

| 지표 | 목표 (제안) |
|---|---|
| 근거 없는 숫자 값 (비율·만점·점수) | **0건** |
| 숫자 필드 Precision / Recall | 측정 후 기준 설정 |
| 과목 분할 정확도 (쪽 범위 일치) | 측정 후 기준 설정 |
| `verification.verified` 비율 | 측정 후 기준 설정 |
| `NOT_IN_DOCUMENT`를 0으로 낸 경우 | 0건 |
| 문서당 관리자 검토 시간 | 기록 |
| 문서당 비용·시간 | 기록 (Provider 결정 자료) |

### 8-4. 실행 방식

- 자동 테스트(CI): Fake `AssessmentAiClient` + 작은 합성 PDF로 파이프라인·검증·상태 전이만 확인한다(현행 `AssessmentAiServiceTest` 방식). 실제 Provider를 부르지 않는다.
- 정확도 측정: 로컬에서 별도 명령으로 실행하고 결과를 기록한다. 실제 Provider 호출은 승인(API-OD-A10) 후에만 한다.

## 9. 학생 개인 PDF 외부 전송 선결 조건 (2026-11-03 결정: 조건부 허용)

아래가 모두 해결되기 전에는 **학생 PDF를 외부 AI Provider로 보내지 않는다.** 그 전까지 학생 개인 PDF는 업로드·원본 열람·수동 입력만 지원한다.

| # | 조건 | 확인 대상 |
|---|---|---|
| 1 | 학생 PDF에 들어 있을 수 있는 개인정보(이름·학번·메모·필기) 파악과 최소화 방법 | Privacy |
| 2 | Provider의 데이터 처리·보관·학습 사용 정책 | API-OD-A10 |
| 3 | 이용자 고지·동의 (보호자 동의 필요 여부 포함) | 운영·법무 |
| 4 | 인증·인가, 본인 문서만 분석 요청 가능 | Existing Auth (API-OD-A01) |
| 5 | 원본 파일 보관 기간·삭제 정책 | OD-A07, OD-A11 |
| 6 | 외부 전송 실패·재시도·비용 상한 | API-OD-A10 |

`domain.md` OD-A13으로 추적한다.

## 10. 확정되지 않은 사항

1. Provider·모델·비용 상한 (API-OD-A10)
2. 표·스캔 처리 방식 (B안 이미지 입력 / OCR / 외부 서비스) — Golden Corpus 측정 후
3. 파일 저장소·보관 기간 (OD-A07, API-OD-A03)
4. 분석·검토 상태 Enum (§6은 후보)
5. `itemKey` 생성 규칙과 개정본 간 항목 대응
6. Admin 확정 범위 권한 (전체/기관/지점, OD-A08)
7. 기존 LearnersHigh 수행평가와 중복 확인 (OD-A01 — 기존 API·DB 미확인)
8. 연도별 비교의 과목 Identity (과목명 변경·교육과정 개정) — §11
9. 학생 개인 PDF 외부 전송 (§9, OD-A13)
10. 120쪽·20MB·단일 호출 제한의 새 값

## 11. 후속: 연도별 비교·3개년 변화

- 확정(CONFIRMED)된 값끼리만 비교한다. AI 후보끼리 비교하지 않는다.
- 선행 조건: 같은 학교·학년·학기·과목의 여러 학년도 확정 데이터, 과목 Identity 대응 규칙(OD-A14).
- 화면에서 전년도 자료는 “과거 참고자료”로 표시하고 올해 일정으로 쓰지 않는다(현행 규칙 유지).
- 별도 Feature Spec 절로 나중에 정의한다. 이번 단계에서는 Entity·API를 만들지 않는다.
