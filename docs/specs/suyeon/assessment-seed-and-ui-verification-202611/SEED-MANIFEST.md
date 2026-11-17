# Seed Manifest — [DEMO-1112] 합성 데이터

> 기계용 원본: `seed-manifest.json` (인증 정보 없음). 등록 스크립트: `scripts/seed-assessment-demo.ps1` → `seed-assessment-demo.mjs`.
> 대상: Backend `http://localhost:18080` · Schema `lh_demo_manual_20261111`(실행자가 `-ConfirmSchema`로 확인) · Student `stu_001`(김서준, 예시고등학교 1학년) · Admin `adm_demo_gangnam` · 2026학년도 1학기.
> 모든 데이터는 합성이다. 실제 학생 정보·학교 문서·측정값이 아니다.

## 실행 기록

| 실행 (UTC) | 생성 | 재사용 | 확인 | 비고 |
|---|---:|---:|---:|---|
| 2026-11-11T22:44:00Z (11-12 07:44 KST) | 18 | 0 | 30/31 | 실패 1건은 스크립트 판정 버그(학생 목록 응답이 `student.studentId`로 중첩) → 수정 |
| 2026-11-11T22:44:14Z | **0** | 17 | **30/30** | 재실행: 중복 생성 없음 확인 |

## 생성 ID

| 항목 | ID | 내용 |
|---|---|---|
| 수행평가 A | `assessment_3f17c8d2-a9ba-4fad-8d8f-12958eb3dfff` | [DEMO-1112] 과학 실험 보고서 작성 · 통합과학1(`subj_12`) · IN_PROGRESS · 마감 11-27 · **중요** |
| 수행평가 B | `assessment_b925f800-937a-41ad-baa8-271eedc25c38` | [DEMO-1112] 문학 작품 분석 발표 · 공통국어1(`subj_11`) · BEFORE_START(예정) · 12-04 |
| 수행평가 C | `assessment_220a200f-a863-4cf0-b6d5-1fa2fb039bc7` | [DEMO-1112] 영어 주제 탐구 발표 · **통합사회1(`subj_13`, 대체)** · IN_PROGRESS · 11-20 · **중요** |
| 수행평가 D | `assessment_e4a7194d-762e-4d1b-9db5-606e9522229b` | [DEMO-1112] 수학 실생활 활용 보고서 · **과학탐구실험1(`subj_14`, 대체)** · COMPLETED · 10-30 |
| Note | `note_a4f5ae21-03c3-467b-b15c-dae818ffa3aa` | [DEMO-1112] 온도 변화에 따른 물질의 용해도 탐구 (수행평가 A) |
| NoteRevision v1 | `rev_6c55d186-10c1-4efa-be42-27a72c642a9c` | 목적·가설·과정 4단계 |
| NoteRevision v2 | `rev_e403ab73-64e2-48db-9906-58b156d05822` | v1 + 실험 결과(합성)·오차 원인·개선 방향 |
| Artifact (PDF) | `artifact_62bf190c-38ff-4ccc-bac9-44954065cb52` | [DEMO-1112] 과학탐구 보고서 |
| ArtifactVersion v1 | `version_dfc7c49f-0ffa-478a-b7e5-2e02036cce15` | `[DEMO-1112] 과학탐구 보고서 v1.pdf` · 982 B · SHA-256 `2420f6bd8a75667de0ae2783b4f63e0135b4f9c2cb1f9dd357c7af40b64c1468` |
| ArtifactVersion v2 | `version_0950337a-bef2-4bdb-abdd-ffbfc2aa4646` | `[DEMO-1112] 과학탐구 보고서 v2.pdf` · 1,083 B · SHA-256 `25e63839faa382bc3063e0bdf789cbeecac129acf3444199f9d30a286e9bde7f` |
| Artifact (PNG) | `artifact_8d57a643-952a-4f9a-99ba-78ac5a62c1fe` | [DEMO-1112] 용해도 실험 그래프 |
| ArtifactVersion v1 | `version_a5f9794d-f713-4bb6-b7a7-aa5a382ff5e4` | `[DEMO-1112] 용해도 실험 그래프.png` · 960×600 · 7,251 B · SHA-256 `04aa5a8796d64e233e194ffc500ac2e545e42324b407391fe6289d1638469b7e` (**합성 그래프, 실제 측정값 아님**) |
| FeedbackRequest | `feedback_6234267d-5d69-4e6f-8e24-466fc0f0e4c9` | Snapshot = NoteRevision v2 + PDF v2 · DELIVERED |
| GrowthRecord | `growth_244ee193-ceaa-43fc-ba46-c9bcdbe1801e` | [DEMO-1112] 용해도 실험을 통해 배운 탐구 설계 · 관련 수행평가 A · 연결 결과물 PDF |
| 학생 자료 A | `resource_cdfae384-1717-4ac6-a018-55ad4889da11` | [DEMO-1112] 과학탐구 참고자료 · LINK · https://scienceon.kisti.re.kr/ (카탈로그 `ref_09`) |
| 학생 자료 B | `resource_3dc959c8-7a9e-4341-895a-4f61e221ea92` | [DEMO-1112] 발표 자료 구성 참고 · LINK · https://www.riss.kr/ (`ref_03`) · **삭제·복원 시험 대상** |
| 관리자 자료 A | `scrap_ac4139ef-ad45-4edc-8081-6a4fcca58cbf` | [DEMO-1112] 과학탐구 학습 자료 · https://www.scienceall.com/ (`ref_13`) · **학생 공개** |
| 관리자 자료 B | `scrap_b7d3a15a-f001-46ae-8f67-149f1188761c` | [DEMO-1112] 보고서 작성 참고자료 · https://www.nl.go.kr/ (`ref_02`) · **비공개** |
| 중요 표시 | `SCHOOL_ASSESSMENT:A`, `SCHOOL_ASSESSMENT:C` | 아래 "요청과 다른 점" |

피드백 문구: 관리자 초안 "탐구 목적과 가설이 명확하게…" → 학생에게 보이지 않음 확인 → 최종 "물의 양, 용질의 종류, 실험 시간을…" 전달. 질문 필드는 계약(§31 `CreateFeedbackRequestBody`)에 없어 만들지 않았다.

합성 파일 원본은 `seed-files/`(pdfV1.pdf, pdfV2.pdf, png.png)에 있다. 결정적 바이트라 다시 실행해도 SHA가 같다. URL은 모두 정적 자료원 카탈로그(`referenceSourcesFixture.ts`)의 실제 대표 주소다.

## 요청과 다른 점

| 요청 | 실제 | 이유 |
|---|---|---|
| C 과목 = 영어, D 과목 = 수학 | C = 통합사회1, D = 과학탐구실험1 (제목은 요청 그대로) | `stu_001` 2026-1 학업 Context 과목은 공통국어1·통합과학1·통합사회1·과학탐구실험1뿐. 과목 ID를 임의로 만들지 않음 |
| 중요 표시 = 수행평가 A + **개인 참고자료 A** | 수행평가 A + **수행평가 C** | `PUT /archive/favorites`는 `SCHOOL_ASSESSMENT`만 받는다(`StudentRecordAccess.ownedAssessment`). 자료 중요 표시는 계약에 없어 API를 바꾸지 않음 |
| 질문 문장 `[DEMO-1112] 실험 보고서의…` | 넣지 않음 | 피드백 요청 계약에 질문 필드 없음(임의 필드 금지) |
| 성장 기록 "문제 해결" | `difficulty`(어려웠던 점)·`solution`(해결한 문제) 두 칸에 나눔 | 원문 문장 중 "온도 유지의 어려움"은 계약 필드 `difficulty`, 나머지는 `solution` |
