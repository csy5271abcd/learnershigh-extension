# HWP 평가계획서 업로드·분석 결과

> 분석기: 로컬 `curriculum-analysis` 서비스(127.0.0.1:8765, 이미 실행 중인 것 재사용), **v21.1 규칙 기반 구조 분석 · LLM 호출 없음(`llmCalls=false`)**. 결과는 모두 **자동 분석 후보 · 사람 검토 전(`DRAFT_UNREVIEWED`)**이다.
> 실제 학교 문서는 **저장하지 않는 분석 미리보기**로만 분석했다(공식 DB 반입 승인 없음). DB 등록·분석 후보 저장·Admin 검토 화면은 정답이 있는 **합성 문서**로 검증했다.

## 1. Admin 등록 → 분석 → 분석 후보 저장 → 5174 검토 화면 (합성 문서)

| 단계 | HTTP | 내용 |
|---|---|---|
| 1-등록 | 201 | {"schoolId":"school_001","academicYear":2026,"grade":1,"semester":1,"fileRef":null,"analysisStatus":"NOT_REQUESTED","reviewStatus":"UNREVIEWED"} |
| 2-분석 | 200 | {"status":"OK_REVIEW_REQUIRED","version":"v21.1","llmCalls":false,"summary":{"segments":2,"segmentsExtracted":1,"subjects":["가상과학탐구"],"assessments":3,"written":1,"performance":2,"performanceWithActivities":2,"locatorsUnr |
| 3-분석 후보 수신 | 201 | {"analysisStatus":"REVIEW_REQUIRED","reviewStatus":"UNREVIEWED","analyzer":{"origin":"EXTERNAL_IMPORT","name":"curriculum-analysis","version":"v21.1/multiformat-adapter-0.1-draft"},"receivedAt":"2026-11-12T14:52:44.01239 |

- 슬롯: 시연 DB 예시고등학교(school_001) 2026학년도 1학년 1학기 · 운영 권한 계정 `adm_demo_gangnam` · 파일 36864B · SHA-256 `581cc33d951d26b8…`
- 등록 응답 `fileRef=null`: **서버는 원본 바이트를 보관하지 않는다**(기존 정책 그대로). 분석은 같은 바이트를 로컬 분석기로 보낸 결과다.
- 분석 후보는 `REVIEW_REQUIRED`·`UNREVIEWED`로 저장 — 자동 확정 없음. 검토 화면: 5174 `/assessment/evaluation-plans/{planId}/revisions/{revisionId}` (`plan-import-hwp.json`).
- 정답 대비(분석기 `runs/v21-pdf-quality-backend-bridge-20261109/e2e/EXPECTED-RESULT.md`): 과목 가상과학탐구 1 · 지필 1(1차 40%) · 수행 2(탐구 보고서 30%·토론 활동 30%) — **분석 결과 개수·비율 일치**, 5174 화면 표시 확인(`ADMIN-UI-VERIFICATION.md` plans 12/12).
- HWP 등록은 Backend 실험 플래그(`assessment.multiformat.experimental=true`)가 켜져 있어 허용됐다. **공식 검토 확정은 막혀 있다**: 화면 안내 "실제 관리자 인증이 없으면 서버가 확정을 거절해요(개발 합성 시험에서만 허용)" · `structured-confirm-dev` 기본 false 유지.
- HWP 근거는 **PDF 쪽 번호를 만들지 않고** `구역 0 · 표 1 · 3행 2열 · 경로 p3.c0.r2c1 — "1차 지필평가(40%)"`처럼 구역·표·행·열·인용으로 표시된다.

## 2. 실제 학교 HWP 분석 미리보기

| ID | 학교 폴더 | 형식 | 크기 | SHA-256 | 쪽/구역 | 분석 상태 | 과목 구간(추출/전체) | 지필 | 수행 | HWP 인용 일치 |  |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2f11289c5f0f | daeshin | HWP | 100KB | 2f11289c5f0f | 구역 1 | PARTIAL | 1/1 | 0 | 1 | 3/3 | 603 |
| 4b56c9c47590 | daeshin | HWP | 192KB | 4b56c9c47590 | 구역 1 | PARTIAL | 1/1 | 0 | 1 | 3/3 | 255 |
| bb08ce7572e9 | gajwa | HWP | 1056KB | bb08ce7572e9 | 구역 13 | PARTIAL | 6/7 | 10 | 15 | 323/323 | 513 |

### 2f11289c5f0f · daeshin (PARTIAL)

경고: 세부 표 연결이 없어 상세정보를 추출하지 못한 수행평가 1개 / HWP/HWPX 결과는 계정 A 실험 DTO 모양(source.format·documentLocator) — Backend 실험 플래그가 켜진 경우에만 수신 가능, 공식 PDF 계약 아님

| 과목 | 수행평가 후보(비율·만점·시기) |
|---|---|
| 인공지능수학 | — (항목 없음) |

### 4b56c9c47590 · daeshin (PARTIAL)

경고: 세부 표 연결이 없어 상세정보를 추출하지 못한 수행평가 1개 / HWP/HWPX 결과는 계정 A 실험 DTO 모양(source.format·documentLocator) — Backend 실험 플래그가 켜진 경우에만 수신 가능, 공식 PDF 계약 아님

| 과목 | 수행평가 후보(비율·만점·시기) |
|---|---|
| 문학과 영상 | — (항목 없음) |

### bb08ce7572e9 · gajwa (PARTIAL)

경고: 세부 표 연결이 없어 상세정보를 추출하지 못한 수행평가 2개 / HWP/HWPX 결과는 계정 A 실험 DTO 모양(source.format·documentLocator) — Backend 실험 플래그가 켜진 경우에만 수신 가능, 공식 PDF 계약 아님

| 과목 | 수행평가 후보(비율·만점·시기) |
|---|---|
| 공통수학1 | 실생활 속 사례 분석 (20%·20·6월 3주) / 문제 해결 포트폴리오 (20%·20·수시) |
| 대수 | 수학적 문제해결 (20%·20·6월 3주) / 수학 창의융합 프로젝트 (10%·10·6월 2주) / 수학 성장 디딤돌 (10%·10·4월 4주 6월 4주) |
| 기하 | 공학도구를 활용한 이차곡선 문제 설계 (20%·20·4월 2주) / 주제탐구보고서 (20%·20·6월 2주) |
| 확률과 통계 | 포트폴리오 (20%·20·수시) / 주제탐구보고서 (20%·20·5월 4주) |
| 미적분 | 미적분 독서 프로젝트 (30%·30·5월 2주~ 6월 4주) / 포트폴리오 (10%·10·수시) |
| 경제수학 | 문제해결능력 (40%·40·수시) / 경제 단어장 (16%·16·수시) / 경제기사 스크랩 (30%·30·4월 2주 6월 2주) / 포트폴리오 (14%·14·수시) |

정확도(사람이 원문과 대조한 범위): `DOCUMENT-EXTRACTION-ACCURACY.md`.
