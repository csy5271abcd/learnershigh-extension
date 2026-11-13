# AI 분석기 ↔ Backend 계약 차이 (2026-11-09)

> 번호 구분: **C-1~C-11** = Backend와 `api-contract.md` 사이 차이(`API-STATUS.md` §4). **C1~C8** = 계정 B 제안(`BACKEND-HANDOFF.md` §4). **G-1~G-11** = 이번 통합에서 정리한 분석기↔Backend 항목.
> `docs/api/api-contract.md`는 수정하지 않았다. 수신 Endpoint는 PROPOSED·기본 off로 그대로 둔다.

처리 구분: ① 현재 계약 그대로 사용 가능 ② Backend 소유 코드만 수정 ③ AI Adapter에서 해결 ④ Shared API 계약 변경 필요 ⑤ DB Migration 승인 필요 ⑥ 11월 12일 이후로 연기

## 1. 분석기 ↔ Backend 항목

| # | 항목 | 이번 확인 | 구분 | 처리 |
|---|---|---|---|---|
| G-1 | 분석 결과 수신 API의 공식 계약 등록 | v21 실제 출력이 현재 PROPOSED Shape으로 위반 0건 수신됨 | ④ | 계약 등록 승인 전까지 PROPOSED·기본 off 유지 |
| G-2 | 과목명 중복 (같은 문서에 같은 과목명 구간 2개) | 서버는 `subjects[].subjectName: duplicate`로 거절. Adapter는 두 번째 구간을 **보내지 않음**(개발 분할 6건) | ③ 지금 / ④ 근본 | 지금은 Adapter가 `warnings`에 남기는 현 방식 유지. 구간 key 추가는 C2와 함께 계약 결정 |
| G-3 | 학년·학기별 같은 과목 구분 | 등록 Revision이 학교·학년도·학년·학기 슬롯을 가지므로 1슬롯 1문서면 문제없음. 구간별 학년·학기는 보낼 곳이 없음(SUBJECT_CONTEXT 3건) | ① 단일 슬롯 / ④ 다학년 문서 | 여러 학년이 한 PDF에 있으면 C2 결정 필요 → ⑥ |
| G-4 | 필드별 presence (있음 / 원문에 없음 / 못 읽음 / 불확실) | 현재 null·빈 배열은 "못 읽음"과 "없음"을 구분 못 함. 이번 P02도 `content:null`이 "상세 표 연결 실패"인데 Backend는 구분 못 함 | ④ + ⑤ | ⑥. 그 전까지 관리자 화면은 빈 값을 "원문에 없음"으로 표시하지 말 것(Frontend 전달) |
| G-5 | 특수 규정(미제출·불참·추가 응시) | 보낼 필드 없음. `specialRules`를 보내면 `unknown_field`로 거절됨을 확인 | ④ | ⑥ (C3) |
| G-6 | PDF 이외 문서(HWP·HWPX) Locator | 등록 API가 PDF만 받음(415). Adapter도 HWP를 `importable=false`로 차단 | ④ + 등록 정책 | ⑥ (C8). 현재 동작 일관됨 |
| G-7 | `itemKey` 재분석 안정성 / 존재 확인 | Adapter key(`W01`·`P01`)는 문서 안 순번이라 재분석·개정 시 바뀔 수 있음. Backend는 확정 Revision의 **없는 itemKey(`P99`)도 참조 등록 허용**(관찰) | ③ 안정성 / ② 존재 확인 | 아래 §3 |
| G-8 | `source.sha256`과 실제 원본 | 등록 파일 SHA-256 = 분석기 SHA-256 = DB 값 확인. 다른 PDF는 `document_mismatch` | ① | 유지. 단, 원본 미보관이라 `extractedText`가 실제 쪽 글과 같은지는 서버가 대조하지 못함 → ⑥ (File Storage 결정 후) |
| G-9 | 추정 제출물(INFERRED) | Adapter 기본값이 STATED만 보냄 → 확정처럼 보이는 추정값 없음 | ③ (현행 유지) / ④ (C4) | `--include-inferred`는 계약 전까지 쓰지 말 것 |
| G-10 | 과목명 → 과목 ID 매핑 | 분석 과목명 `과학`과 학업 Context 과목(`통합과학1` 등)은 자동 매핑되지 않음. 검토자가 `reviewedSubjects[].subjectId`로 정함 | ① | 유지(자동 매핑하지 않음). 이번 시험의 `subj_12` 매핑은 시험용 가정 |
| G-11 | 권한 없는 관리자의 문서 경로 요청 상태코드 | 404 `NOT_FOUND`(존재 비노출). 학교 단위 목록·등록만 403 | ① | 계약 문서에 명시 필요(C-6과 같이) |

## 2. 계정 B 제안 C1~C8과의 관계

| 계정 B | 내용 | 관련 G | 판단 |
|---|---|---|---|
| C1 | 값마다 presence | G-4 | ④⑤, 우선순위 높음. 마감 전 변경 안 함 |
| C2 | 과목에 학년·학기·구간 key, 중복 허용 조건 | G-2, G-3 | ④, 마감 전 변경 안 함 |
| C3 | `specialRules[]` | G-5 | ④ |
| C4 | `submissions[]` 객체화(STATED/INFERRED) | G-9 | ④. 지금은 STATED만 보내는 방식이 안전 |
| C5 | `conditions[]` 구조화 | — | ④, 낮음 |
| C6 | rubric 모델·개수 구간·수준 라벨 | — | ④, 낮음 |
| C7 | `goals`·`standards`·`methods`·`baseScore`·`occurrences` | — | ④. 기본점수(BASE_SCORE)는 학생에게 의미가 있어 C1·C3 다음 후보 |
| C8 | HWP Locator | G-6 | ④ + 등록 API 형식 정책 |

`LINK_CONFIDENCE`(연결 신뢰 단계)를 보내지 않는다는 계정 B의 판단에 동의한다. 서버는 `confidence` 같은 내부 필드를 `unknown_field`로 거절하며, 이번 시험에서 확인했다.

## 3. G-7 `itemKey` 처리 제안 (마감 전 미적용)

현재 상태:

- 학생은 확정된 Revision의 아무 `itemKey`나 참조할 수 있다.
- 확정값(`confirmedFields`)은 `fieldPath`(예: `performanceEvaluation.items[0].weightPercent`) 기준이고 `itemKey`가 없다. 그래서 "확정된 항목인지"를 Key로 검사할 근거가 DB에 없다.

선택지:

| 안 | 내용 | 구분 | 영향 |
|---|---|---|---|
| A | 검토한 분석 Run의 `result_json`에 그 `itemKey`가 있는지 확인(없으면 400 `unknown`) | ② | Assessment 소유 Service만 수정. 단, "확정 항목 = 사람이 확인한 항목"까지는 보장하지 못함 |
| B | 검토 Request에 확정 항목 `itemKey` 목록을 받고 그 안에서만 참조 허용 | ④⑤ | 계약·DB 변경 |
| C | 현행 유지(OD로 기록) | — | 잘못된 Key 참조가 저장될 수 있음 |

권장: 마감(11/12)까지는 C(현행 유지 + 이 문서에 기록). 이후 A를 먼저 적용하고 B는 계약 결정 후 진행한다. A도 기존 동작을 바꾸므로 승인 후 적용한다.

**갱신(2026-11-10): A안 적용됨**(작업 지시에 따름). 지필 Key는 §12에 따라 `not_allowed`로 거절한다. 상세: `../frontend-backend-integration-202611/ITEMKEY-VALIDATION.md`.

## 4. C-1~C-11 처리 상황

| # | 내용 | 이번 변화 |
|---|---|---|
| C-1 | §12 목록 `sort` 허용 값 | 변화 없음 |
| C-2 | §9-1 Query 필수 여부 | 변화 없음 |
| C-3 | §12 PATCH 편집 필드 | 변화 없음 |
| C-4 | 등록 시 `status` 생략 | 변화 없음 |
| C-5 | 같은 상태 재요청 200 | 변화 없음 |
| C-6 | 평가계획서 Not Found 전용 code 없음 | G-11과 같이 정리 필요 |
| C-7 | `confirmedFields`의 `subjectName` vs `subjectId` | 변화 없음(계약대로 `subjectId`) |
| C-8 | `PageResponse.page` 평면/객체 | 변화 없음 |
| C-9 | 중복 등록 알림 필드 없음 | 변화 없음 |
| C-10 | 수신 Endpoint 계약 미등록 | **실제 v21 출력으로 수신 검증됨(G-1)**. 등록 여부는 여전히 승인 대기 |
| C-11 | `fileRef: null` | 변화 없음(원본 미보관 유지 확인) |

## 5. 승인 필요 항목

1. `api-contract.md`에 수신 Endpoint와 `AnalysisImportRequest` Shape 등록 여부(G-1, C-10)
2. presence 표현(C1) 방식과 저장 위치(⑤)
3. 과목 구간 key·학년·학기(C2)
4. G-7 안 A 적용 여부
5. 평가계획서 Not Found code와 문서 경로 404 정책 명시(C-6, G-11)
6. 실제 학교 PDF(수준 3)의 로컬 DB 반입 범위와 담당자

## 6. 계정 B 전달 사항

1. 실제 출력에 `subjects[].sources`가 들어 있다. Backend는 받는다. 예시 파일(`examples/`)에도 반영해 두면 혼동이 줄어든다.
2. 예시 `synthetic.backend-import.json`의 `sha256`이 `aaa…`라 실제 서버에는 그대로 넣을 수 없다. 이번에 만든 합성 PDF(`backend/src/test/resources/assessment/analyzer-v21/synthetic-plan.pdf`)를 공통 합성 원본으로 쓰자고 제안한다.
3. `run_pdf_layout`의 작업 폴더가 `sensitive/v21/work`로 고정되어 있다. 다른 계정이 읽기 전용으로 실행하려면 `--work` 인자가 있으면 좋다. 이번에는 모듈을 직접 호출해 우회했다.
4. `itemKey`(G-7): 같은 PDF를 다시 분석하면 같은 Key가 나오는지, 개정본에서도 유지할 규칙이 있는지 답이 필요하다(인계서 B-2).
5. 실행 중 `assessment_assembly03.py`가 바뀌었다. 결과가 달라지면 Fixture를 교체해야 하니 변경 시 알려 달라.
6. 인계서 `docs/specs/suyeon/assessment-ai-integration-handoff.md`는 현재 있다(계정 B 확인 시점에는 없었다). §3 Schema가 실제 DTO와 같다.
