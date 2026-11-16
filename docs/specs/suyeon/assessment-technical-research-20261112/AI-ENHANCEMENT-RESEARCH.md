# 분석 정확도 향상·AI 고도화 방향 (조사)

> 이 문서는 **이미 있는 실험 기록과 코드에서 확인된 방향**만 정리한다. 새 모델·새 실험을 제안하더라도 상태를 "향후"로 표시한다.
> 근거: `CA/runs/v5~v21.2` 보고서, 호출 원장, `CA/tools/llmprep/*`, Backend `AssessmentAiService`.

## 1. 지금까지 확인된 사실

| 사실 | 근거 | 상태 |
|---|---|---|
| 현재 분석기는 LLM 없이 규칙으로 동작한다 | `analysis_service.py` `ANALYSIS_MODE`, 워커 네트워크 차단 | 코드 확인 |
| LLM 실험은 합성 3개 문서, 22회 요청뿐이다 | 원장 9개 | 연구 기록 |
| 초기 실험(v6~v9)에서 Claude 1단계 전체 추출은 FAILED 3·NEEDS_REVIEW 1 | v6~v9 REPORT | 연구 기록 |
| 2단계 분할(평가 목록 → 평가별 채점표)과 경량 형식(rubric-lite)으로 바꾼 뒤 Claude OK 2(v15·v16), Gemini OK 2(v17·v17.1) | 원장 | 연구 기록 |
| 실패 원인은 주로 **형식·숫자 계약 위반**(비율 comparator 누락, 반복 머리 칸을 채점표 위치로 지목 등)이었다 | v16 `conv_diag`, v17 `anchors.py`, v17.1 `numeric_contract.py` | 연구 기록 |
| 근거 검증(Locator + 원문 글자 일치)이 LLM 출력의 환각을 걸러내는 장치로 설계됐다 | `quote_strict.py`, `crosscheck.py`, `verify.py` | 코드 확인 |
| 실제 학교 문서는 개인정보 마스킹·승인 Gate 없이 보낼 수 없다 | `privacy.py`(fail-closed), `gate.py`, `approvals/real-docs.json` 모두 false | 코드 확인 |
| v19부터 방향을 규칙 조립으로 바꿨고, 이후 개선(v20~v21.2)은 모두 규칙 | v19~v21.2 REPORT | 연구 기록 |
| 실제 문서 정확도는 한 번도 측정되지 않았다 | 사람 판정 0 | 연구 기록 |

## 2. 정확도 향상의 전제: 사람 정답 데이터

| 항목 | 현재 | 필요한 것 |
|---|---|---|
| 정답 스키마 | `CA/golden/SCHEMA-golden-0.2.md` | 그대로 사용 |
| 검토 도구 | `review_workbench.py`, `tools/v19/review_tool.py`(review·adjudicate는 터미널 진술 필수) | 그대로 |
| 정답 상태 | DRAFT → SINGLE_REVIEWED → DOUBLE_REVIEWED → ADJUDICATED | 10개 문서 ADJUDICATED |
| 지표 계산 | `real_metrics.py`(ADJUDICATED가 아니면 `NOT_MEASURABLE`) | 정답만 있으면 바로 계산 |
| 분할 | 학교 단위 개발 40 / 검증 10 / 시험 10 | 시험 분할은 개발 미참여 검토자 |

## 3. 규칙 기반 개선 후보 (P1)

| 문제 | 실제 문서 | 접근(기존 기록) |
|---|---|---|
| PDF 세부표 ↔ 평가 연결 | G013·G003·G009 수행 활동 0 | 표 제목 문단·캡션·평가명·표 순서를 함께 근거로(하나로 연결 금지) |
| PDF 표 복원 손상 | G003 | PdfLayout 칸 복원 개선 — 새 파서 버전 |
| 2단 행 머리글 요약표 | G013 | v21.2-quality에 구현됨(기본 미반영) |
| 쪽 넘김 표 | PDF 후보 259 | 머리글 반복·연속 판정 |
| 긴·여러 줄 평가명 | G009 | 줄 구조 규칙 + `nameQuality` |
| 감점형·기본점수·미제출 | G031, G024 | 구조 표시 → 계약 확장(P2-12) |
| 운영계획 | 전 문서 | 운영표 분류는 있음 → 행 구조화 |

## 4. LLM 결합 방향 (향후, P3-01)

기존 실험에서 확인된 설계 요소를 바탕으로, 결합한다면 다음 조건이 필요하다(**향후 — 구현 없음**).

| 조건 | 이유(기록) |
|---|---|
| **선택적 호출**: 규칙이 `ASSESSMENT_LIST_NOT_EXTRACTED`·`NOT_EXTRACTED`·`SOURCE_STRUCTURE_BROKEN`을 낸 구간·표만 | 실문서 84구간 중 32구간이 목록 미탐지, PDF 수행 45개가 활동 없음 — 규칙이 이미 잘하는 부분까지 보낼 필요 없음 |
| 입력은 DocumentModel 표·칸 + Locator id | v11~v17 wire 형식(평탄·중첩)에서 위치 근거를 돌려받는 방식이 이미 있음 |
| 출력은 원문 인용 + Locator 필수, 검증 실패 값은 버림 | `quote_strict`·`crosscheck` 재사용 |
| 숫자는 basis·comparator 계약 | v17.1 숫자 계약 위반이 주 실패 원인 |
| 2단계 분할 | v15 이후 성공 사례가 모두 분할 방식 |
| 개인정보 마스킹 + 승인 Gate + 비용 상한 | `privacy.py`, `gate.py`, `run_live171.py` 누적 비용 상한 |
| 효과 판단은 같은 시험 분할에서 규칙 대비 | P1-02 Baseline 없이는 판단 불가 |

### Backend 쪽 Claude 경로와의 관계

Backend에는 PDF 쪽 텍스트 → Claude Structured Output → `AiEvidenceVerifier` 경로가 별도로 구현돼 있다(기본 비활성). 분석기의 DocumentModel·Locator 검증과 **연결되어 있지 않다**. 둘 중 무엇을 운영 경로로 쓸지는 결정되지 않았다(API-OD-A10).

## 5. OCR (향후, P3-02)

- 대상: 텍스트를 찾지 못한 PDF 120개(코퍼스의 12.2%)와 이미지 전용 쪽이 있는 PDF 144개.
- 전제: OCR 결과에도 쪽·좌표 Locator가 있어야 근거 검증을 유지할 수 있다.
- 현재 코드·의존성 없음.

## 6. 기타 고도화 후보

| 후보 | 상태 | 비고 |
|---|---|---|
| DOCX | 없음 | 코퍼스 5개(1개교)뿐 — 우선순위 낮음 |
| 개정본 비교 | 없음 | 원본 보관(P2-05) 선행 |
| 처리 속도 | 측정만 | PDF 346쪽 33.4초 + PdfLayout. 비동기(P2-08)와 함께 |
| 모델 학습 | 없음 | 수집 문서는 학습 데이터가 아니다. 학습 계획 기록도 없음 |
