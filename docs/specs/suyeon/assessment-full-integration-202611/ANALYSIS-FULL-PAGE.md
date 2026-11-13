# 평가계획서 분석 결과 — 전체 페이지 (2026-11-11)

## 1. 이전 구조

| Surface | 이전 | 문제 |
|---|---|---|
| Student | 개발 Flag의 "평가계획서 분석하기" **Modal 안에** 결과 미리보기(배지·과목·수행 후보 목록)를 그렸다 | 결과 본문이 Modal에 갇힘. 지필·운영·근거를 펼칠 공간 없음 |
| Admin | 등록 Modal → 서버 "분석 요청"(http에서는 미구현 503) → 결과는 외부 수신으로만. 결과 화면 자체는 이미 **전체 페이지**(`/assessment/evaluation-plans/{planId}/revisions/{revisionId}`) | 등록 화면에서 실제 분석기로 이어지는 연결이 없음 |

## 2. 목업 기준

- Student: `SA-LIST-02_PDF-Import-Modal.png`(파일 선택 Modal)만 있다. `SA-LIST-05~07`은 실제로 열어 보니 진행 상태 필터 화면이며 분석 흐름 목업이 아니다. screen-map S5도 "결과 검토 화면은 Mockup 미제공(Stage 7 보완 UI)"으로 적혀 있다.
  → 지시서 2-2 마지막 항목대로 **기존 S5 결과 전체 페이지(`PdfImportReviewRoute`)의 레이아웃**(뒤로 → 제목 → 문서 줄 → 후보 안내 → 과목 탭 → 지필 표/수행 카드/운영/근거 블록, 같은 CSS)을 기준으로 삼았다.
- Admin: `AM-07_Evaluation-Plan-List.png`, `AM-08_Evaluation-Plan-Upload-Modal.png`. 결과 화면은 기존 검토 Route를 그대로 쓴다(이번에 레이아웃 변경 없음).

## 3. 변경한 Route와 화면

### Student

| 항목 | 내용 |
|---|---|
| 새 Route | `/assessment/school-assessments/analysis-preview/:previewId` (`routes/AnalysisPreviewResultRoute.tsx`) |
| 기존 Route 재사용 여부 | 기존 `/school-assessments/pdf-import/:documentRevisionId`는 공식 §11 분석(학교 공통 문서) 전용이며 데이터 형태·쓰기 동작(이름 정정·가져오기)이 달라 **화면 구조만 재사용**하고 Route는 분리했다 |
| Modal | `AnalysisPreviewModal`은 이제 **파일 선택·형식 검증·분석 요청·실패 안내만**. 성공하면 Modal을 닫고 결과 페이지로 이동. 결과 컴포넌트(`ResultPreview`)는 Modal에서 삭제 |
| 진입 | 학교 수행평가 목록·홈의 "평가계획서 가져오기"(개발 Flag일 때 이름). Modal 안 "학교 공통 평가계획서에서 고르기"로 기존 공식 가져오기 화면 전환 |
| 결과 보관 | `model/analysisPreviewSession.ts` — **탭 메모리 전용**(최대 5개). localStorage·sessionStorage·서버 저장 없음 |
| 새로고침·직접 URL | "분석 결과를 다시 불러올 수 없어요 — 저장되지 않는 미리보기라 다시 분석해 주세요" + 목록 이동. 가짜 결과를 보여 주지 않음 |
| 뒤로/앞으로 | 뒤로 → 목록, 앞으로 → 같은 탭 메모리 결과 다시 표시 |

페이지 구성(값은 분석기 응답에서만, 없으면 표시 구분)

| 영역 | 표시 | 원천 |
|---|---|---|
| 문서 정보 | 파일명·형식(확장자 불일치 표시)·쪽 수 또는 구역 수·분석 상태·검토 상태(`DRAFT_UNREVIEWED`)·분석기 버전/채널/Adapter·**원본 SHA-256 일치 여부**(브라우저 계산 ↔ 분석기 수신)·문서에서 읽은 학년도·학년·학기 | `source`, `analyzer`, `backendImport`, `analysis.segments[].context` |
| 평가 요약 | 과목·지필·수행 개수, 근거 위치 미확인, 분석 경고(카드 + 경고 목록) | `payload.subjects`, `summary`, `warnings` |
| 과목 탭 | 과목별 패널 | `payload.subjects[]` |
| 지필평가 | 표: 시험 구분·반영비율·시기·만점·문항 유형·근거 위치. 평가 범위 = "분석기 미지원" | `writtenEvaluation.exams[]` |
| 수행평가 | 카드: 평가명·영역·반영·만점·시기·평가 내용·제출물·조건/활동·채점 요소×수준×배점 표·근거 N건(펼치면 인용) | `performanceEvaluation.items[]` |
| 운영계획 | 교수·학습 운영표(추출 개수 또는 "미추출"), 평가 운영 언급 수, 성취기준 = "분석기 미지원", 평가 방법 = 수행 항목으로 표시 | `analysis.segments[].teaching` |
| 원문 근거 | PDF: "PDF n쪽 (문서 표기 m쪽)" + 인용 / HWP·HWPX: "구역·표·행·열·path" + 인용(쪽 번호 만들지 않음) | `sources[]` |
| 안내 | 배지 **"자동 분석 후보 · 관리자 확인 전"**, 규칙 기반·AI 호출 없음, HWP·HWPX 실험 Adapter, 저장 안 됨, 요청 ID | — |

표시 규칙: `미추출` = 분석기가 그 문서에서 값을 찾지 못함 / `분석기 미지원` = 분석 결과 형식에 항목 자체가 없음 / `원문 확인 필요` = 근거 위치 없음. 성취기준·평가 범위는 v21.1 결과 형식에 항목이 없어 만들지 않았다. 교수·학습 운영표는 결과 형식에 `teaching.tables`가 있지만 계정 B의 합성·저장 산출물 어디에도 실제 예시가 없어 표 렌더러를 만들지 않고 개수만 표시한다.

### Admin

| 항목 | 내용 |
|---|---|
| Route | 변경 없음 — 기존 전체 페이지 `/assessment/evaluation-plans/{planId}/revisions/{revisionId}` (원문 PDF 대조·과목 연결·필드 확인·확정 패널, HWP·HWPX 확정 준비 점검표) |
| 등록 Modal | 파일 선택용으로 유지. 개발 Flag(`VITE_ASSESSMENT_DEV_ANALYZER=true`)일 때 "등록하고 분석" = ① Revision 저장(기존 API) → ② **같은 File 바이트**를 로컬 분석기로 → ③ `backendImport.payload`를 기존 수신 Endpoint(`POST …/revisions/{revisionId}/analysis-imports`, PROPOSED C-10)로 저장 → ④ Modal 닫고 검토 전체 페이지로 이동 |
| 분석 실패 | Revision은 이미 저장됨 → Modal을 닫지 않고 실제 오류(분석기 연결 실패·지원하지 않는 문서·원문 추출 실패·분석 실패·저장 거절)와 "분석 다시 시도"(같은 Revision, 새 버전 안 만듦) / "분석 없이 닫기" |
| 새로고침·직접 URL | DB(Revision·AnalysisRun)에서 다시 조회 |
| 확정 | PDF = 기존 공식 검토·확정 그대로. HWP·HWPX = 확정 버튼 비활성·점검표 "승인 대기" 유지 |

## 4. 브라우저 검증 결과 (Headless Chrome 1920×1080)

### Student — `scripts/student-analysis-page-e2e.mjs` **30/30** (5173, 계정 B 실제 분석기)

- PDF: Modal 닫힘 → 전체 페이지, 분석 200·v21.1 DEFAULT, payload = 계정 B `analysis-import.json`과 동일, 문서 정보(파일명·PDF·2쪽·v21.1·SHA 일치·문서 학기 "2099학년도 1학년 1학기"), 요약(과목 1·지필 1·수행 2), 화면 값 = 분석 값(탐구 보고서 반영 30%·만점 100점·시기 4월), 채점 표(실험 설계 50점), 운영계획 미추출/미지원 구분, PDF 쪽 근거·인용 펼침
- 뒤로 가기 → 목록, 앞으로 → 결과, 새로고침 → "다시 불러올 수 없어요", 없는 ID 직접 URL → 같은 안내
- HWP·HWPX: 200 → 전체 페이지, SHA 일치, 쪽 번호 대신 "구역 1개", 실험 Adapter 안내, "구역·표·행·열" 근거, 수행 상세
- 손상 PDF: Modal 안 "원문 추출 실패", 페이지 이동 없음 / 학교 공통 평가계획서 화면 전환
- Backend 쓰기 0건, 브라우저 저장소에 결과 없음, 페이지 예외 0

### Admin — `scripts/admin-analysis-page-e2e.mjs` (격리 Backend 18081 + 격리 Admin 5184, 시연 Schema 미사용)

| 형식 | Schema·Flag | 결과 |
|---|---|---|
| PDF | `lh_demo_pdf`, 분석 수신 ON, 실험 OFF | **13/13** — 등록 201 → 분석기 200 → 수신 201 → 전체 페이지, 후보(가상과학탐구·탐구 보고서·토론 활동), Backend GET = 화면, Revision SHA = 원본 SHA, `UNREVIEWED`(자동 확정 없음), 새로고침·뒤로·새 탭 직접 URL |
| HWPX | `lh_demo_mf2`, 분석 수신 ON, 실험 ON | **15/15** — 위 + 확정 버튼 비활성·점검표 "승인 대기" |
| HWP | 같음 | **15/15** |

## 5. 캡처 (직접 열어 확인함)

| 파일(scratchpad `full/`) | 내용 |
|---|---|
| `s01-modal.png` | Student 파일 선택 Modal(결과 영역 없음) |
| `s02-pdf-page.png` / `-viewport.png` | Student PDF 결과 전체 페이지 — 기존 상단 메뉴·좌측 Assessment Sidebar 유지, 채점 표·근거 펼침 |
| `s03-refresh.png` | 새로고침 후 안내 |
| `s04-hwp-page.png`, `s04-hwpx-page.png` | HWP·HWPX 결과 전체 페이지(구역·표 위치 근거) |
| `a02-pdf-review-page-viewport.png` | Admin 검토 전체 페이지 — 기존 관리자 Sidebar·Header, 원본 PDF 대조·과목 연결·필드 확인 표 |
| `a03-hwpx-gate.png`, `a03-hwp-gate.png` | Admin HWP·HWPX 확정 차단·점검표 |

## 6. 남은 차이

- Student 결과 페이지의 "목업과 시각 비교"는 대응 PNG가 없어 기존 S5 화면과의 일관성으로만 확인했다.
- Admin 검토 페이지 제목은 `추출 결과 검토 · {revisionId}`로 Revision ID가 그대로 보인다(기존 화면, 이번 범위 밖). 파일명 표시로 바꾸는 것은 작은 후속 개선이다.
- 교수·학습 운영표의 실제 렌더링 형식은 계정 B가 실제 문서 예시를 주면 정한다.
