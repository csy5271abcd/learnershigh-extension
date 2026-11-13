# 대표 평가계획서 사례 (실제 학교 문서 10개)

> 이 10개는 분석기가 실제로 DocumentModel·분석 결과를 만든 실제 학교 문서 전부다(Golden 파일럿 `G001~G039`, `runs/v4-pilot-20261106/pilot_files.json`).
> 일반고·자사고, PDF·HWP·HWPX, 단순·복잡 문서가 섞여 있다. 학교는 분할 규칙상 모두 **개발(development) 분할**이다(`split_v3.json`: 개발 40 · 검증 10 · 시험 10개교).
> 파일명은 교사 이름 노출 정책 때문에 적지 않고, 폴더 경로·fileId·SHA-256 앞 12자로 식별한다. 본문 인용은 하지 않았다.
> 수치 출처: `sensitive/v21-pdf-quality/results/<G>.analysis.json`·`.backend-import.json`에서 **상태·개수만** 집계(이번 조사), `runs/v21-pdf-quality-backend-bridge-20261109/PDF-BEFORE-AFTER.md`, `runs/v21-assessment-detail-integration-20261109/TASK-EXTRACTION-RESULT.md`. 모두 **도구 기준 개수이며 정확도가 아니다**(사람 정답 0건).

## 1. 식별 정보 [원본 확인]

| ID | fileId | SHA-256 앞 12자 | 원본 폴더(`references/curriculum-plan/` 기준) | 유형 | 형식 | 크기 | 쪽 |
|---|---|---|---|---|---|---:|---:|
| G001 | F01287 | `425f17f176da` | `general-high-school/busan·…/haegang/2026/third-grade/first-semester/` | 일반고 | PDF | 2.6MB | 220 |
| G003 | F00016 | `0d8e1483e28a` | `autonomous-private-high-school/bugil/2026/second-grade/second-semester/` | 자사고 | PDF | 3.3MB | 346 |
| G009 | F01124 | `7a700831e0e6` | `autonomous-private-high-school/whimoon/2025/second-semester/` | 자사고 | PDF(가로) | 1.4MB | 70 |
| G013 | F02256 | `1f7d57be3c2b` | `general-high-school/jeonbug·…/hyeonil/2024/first-grade/second-semester/` | 일반고 | PDF | 1.4MB | 100 |
| G024 | F02532 | `a02a120199e6` | `general-high-school/jeonbug·…/wanju/2025/first-grade/first-semester/` | 일반고 | HWP | 0.3MB | – |
| G027 | F01821 | `406445f490f7` | `general-high-school/incheon/gajwa/2024/first-semester/` | 일반고 | HWP | 1.0MB | – |
| G031 | F03312 | `d53f9e24eb5a` | `general-high-school/seoul/daeshin/2024/first-semester/` | 일반고 | HWP | 85KB | – |
| G033 | F02041 | `fe6cce4c3eb7` | `general-high-school/jeonbug·…/honamjeil/2024/second-grade/second-semester/` | 일반고 | HWPX | 78KB | – |
| G036 | F00020 | `c6015607d81e` | `autonomous-private-high-school/gimcheon/2024/first-grade/first-semester/` | 자사고 | HWP | 171KB | – |
| G039 | F04754 | `ce5611e208fb` | `general-high-school/seoul/myeongji/2024/first-grade/first-semester/` | 일반고 | HWP | 229KB | – |

## 2. 구조와 분석 결과 (v21.1, 저장된 결과 집계)

| ID | 문서 구조 | 과목 구간 | 구간 상태 | 지필/수행 | 활동 찾음(수행) | Locator 확인 | 인용 일치 | 문서 상태 | Backend 처리 |
|---|---|---:|---|---|---|---|---|---|---|
| G001 | 학기 전체 과목 통합, 표 526(중첩 81), 병합 3,144 | 24 | 추출 21 · 목록 미탐지 3 | 1 / 44 | 32 (+사람 확인 연결 6) | 1,207/1,207 | 112/112 | PARTIAL | PDF 공식 · 전송 45 |
| G003 | 통합, 표 572, 표 복원 손상 | 23 | 추출 12 · 미탐지 10 · 신호 없음 1 | 15 / 20 | 0 | 131/131 | 0/0 | PARTIAL | 전송 23 · 이름 손상 제외 11 · 차수 미명시 제외 1 |
| G009 | 가로 쪽, 2단 배치, 쪽 번호 없음 | 11 | 추출 5 · 미탐지 6 | 8 / 8 | 0 | 108/108 | 0/0 | PARTIAL | 전송 4 · 이름 손상 제외 4 · 차수 미명시 제외 8 |
| G013 | 통합, 괘선 일부 누락 채점표 | 13 | 추출 1 · 미탐지 12 | 2 / 5 | 0 | 67/67 | 0/0 | PARTIAL | 전송 7 |
| G024 | 과목 1개, 요약표(가로·세로) + 채점표 2 | 1 | 추출 1 | 2 / 2 | 2 | 141/141 | 46/46 | OK_REVIEW_REQUIRED | HWP — 공식 경로 차단, 실험 DTO 전송 4 |
| G027 | 학년 통합 7과목, 중첩 채점표 | 8 | 추출 7 · 신호 없음 1 | 8 / 19 | 19 | 758/758 | 154/154 | OK_REVIEW_REQUIRED | 실험 DTO 전송 27 |
| G031 | 과목 1개, 감점형 채점 | 1 | 추출 1 | 0 / 0 (종류 미상 1) | – | 4/4 | 0/0 | OK_REVIEW_REQUIRED | 종류 미상 제외 1 |
| G033 | 교수학습 운영표만(표 3) | 1 | 평가 신호 없음 | 0 / 0 | – | 2/2 | – | NO_ASSESSMENTS_EXTRACTED | 없음 |
| G036 | 평가 1개 세부 계획표 = 채점표, 체크 상자 | 1 | 추출 1 | 2 / 2 | 2 | 86/86 | 3/3 | OK_REVIEW_REQUIRED | 전송 2 · 차수 미명시 제외 2 |
| G039 | 약식 성취기준(`[문학1]`형), 두 줄 머리행 | 1 | 목록 미탐지 | 0 / 0 | – | 2/2 | – | NO_ASSESSMENTS_EXTRACTED | 없음 |

- "Locator 확인"은 결과 JSON의 모든 근거 위치가 DocumentModel에 있는지 본 것이고, "인용 일치"는 추출 글이 그 위치 글 안에 공백 무시로 그대로 있는지 본 것이다(`analysis_result.validate`). **자기 일관성 검사이며 정답 대조가 아니다.**
- PDF는 Backend 공식 계약에 맞는 Payload가 만들어진다(`importable=true`). 하지만 **실제 학교 문서를 Backend DB에 반입한 적은 없다**(승인 대상, `runs/v21-pdf-quality-backend-bridge-20261109/REPORT.md` §6).

## 3. 사례별 분석 난이도와 알려진 오류

| ID | 난이도 | 알려진 오류·한계(보고서 근거) |
|---|---|---|
| G001 | 높음(220쪽, 21과목) | 지필 '선택형'·'서답형' 오탐 → v21.1에서 수정. 과목명이 교과군으로 잡히던 문제 → 머리표 과목명 복원으로 수정. 수준 문장 조각 의심 8, 공유 문장 19행 |
| G003 | 매우 높음 | PdfLayout 표 복원 손상(괘선), 평가명 손상 11 → 전송 제외. 활동 0. 파서 재설계 범위로 남김 |
| G009 | 높음 | '비율(%)' 라벨 미인식 → v21.1 수정(목록 구간 1→5). 2단 배치에서 평가요소가 괘선 없는 문단으로 흩어져 활동 0. 지필 '중간·기말' 차수 미명시 |
| G013 | 높음 | 2단 행 머리글 요약표 미인식으로 12구간 목록 미탐지 → v21.2-quality에서 목록 구간 1→11(기본 v21.1에는 미반영). 채점표 칸 글 섞임 |
| G024 | 보통 | 사람 검토 초안 대조에서 구조 일치(채점 관점 6, 개수 구간). 제출물 '활동 보고서'는 원문에 '제출' 표현이 없어 INFERRED. 시기 출처 3곳 표현 차이(VARIANTS) |
| G027 | 높음 | 중첩 채점표 19개 연결, 계획표 값과 17/17 일치(v20). 글 안 '기본점수' 19건은 요약표에 없어 표시만 |
| G031 | 보통 | 감점형 채점("N점 감점")은 규칙 채점표 추출 대상이 아님(v4 실패 사례 3) |
| G033 | 낮음 | 평가 부분이 이 파일에 없음(교수학습만). 추출 실패가 아님 |
| G036 | 보통 | 요소별 '기본 점수' 수준을 평가 기본점수로 혼동하지 않게 `baseLevel` 처리. 차수 미명시 지필 2개 전송 제외 |
| G039 | 보통 | 두 줄 머리행. 약식 성취기준 39개는 원문 유지(정규화 코드 없음). 평가 목록 미탐지 |

## 4. 현재 Parser 지원 여부

| 형식 | 이 10개에서 | 비고 |
|---|---|---|
| PDF | 4/4 파싱 성공 | 표 재구성은 괘선 의존. 스캔 PDF 없음(이 10개 중) |
| HWP | 5/5 파싱 성공 | HWP·HWPX 표 163개 모두 격자 검산 일치(v4), 텍스트 보존율 1.000 |
| HWPX | 1/1 파싱 성공 | 표 3개, 캡션은 파서 0.2(개발 프로필)에서만 보존 |
