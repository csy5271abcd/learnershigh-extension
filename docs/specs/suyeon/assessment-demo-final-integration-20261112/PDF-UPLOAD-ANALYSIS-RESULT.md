# PDF 평가계획서 업로드·분석 결과

> 분석기: 로컬 `curriculum-analysis` 서비스(127.0.0.1:8765, 이미 실행 중인 것 재사용), **v21.1 규칙 기반 구조 분석 · LLM 호출 없음(`llmCalls=false`)**. 결과는 모두 **자동 분석 후보 · 사람 검토 전(`DRAFT_UNREVIEWED`)**이다.
> 실제 학교 문서는 **저장하지 않는 분석 미리보기**로만 분석했다(공식 DB 반입 승인 없음). DB 등록·분석 후보 저장·Admin 검토 화면은 정답이 있는 **합성 문서**로 검증했다.

## 1. Admin 등록 → 분석 → 분석 후보 저장 → 5174 검토 화면 (합성 문서)

| 단계 | HTTP | 내용 |
|---|---|---|
| 1-등록 | 201 | {"schoolId":"school_001","academicYear":2026,"grade":1,"semester":2,"fileRef":null,"analysisStatus":"NOT_REQUESTED","reviewStatus":"UNREVIEWED"} |
| 2-분석 | 200 | {"status":"OK_REVIEW_REQUIRED","version":"v21.1","llmCalls":false,"summary":{"segments":1,"segmentsExtracted":1,"subjects":["가상과학탐구"],"assessments":3,"written":1,"performance":2,"performanceWithActivities":2,"locatorsUnr |
| 3-분석 후보 수신 | 201 | {"analysisStatus":"REVIEW_REQUIRED","reviewStatus":"UNREVIEWED","analyzer":{"origin":"EXTERNAL_IMPORT","name":"curriculum-analysis","version":"v21.1/backend-adapter-0.2"},"receivedAt":"2026-11-12T14:52:33.269011+09:00"," |

- 슬롯: 시연 DB 예시고등학교(school_001) 2026학년도 1학년 2학기 · 운영 권한 계정 `adm_demo_gangnam` · 파일 30783B · SHA-256 `ab52297581ef154d…`
- 등록 응답 `fileRef=null`: **서버는 원본 바이트를 보관하지 않는다**(기존 정책 그대로). 분석은 같은 바이트를 로컬 분석기로 보낸 결과다.
- 분석 후보는 `REVIEW_REQUIRED`·`UNREVIEWED`로 저장 — 자동 확정 없음. 검토 화면: 5174 `/assessment/evaluation-plans/{planId}/revisions/{revisionId}` (`plan-import-pdf.json`).
- 정답 대비(분석기 `runs/v21-pdf-quality-backend-bridge-20261109/e2e/EXPECTED-RESULT.md`): 과목 가상과학탐구 1 · 지필 1(1차 40%) · 수행 2(탐구 보고서 30%·토론 활동 30%) — **분석 결과 개수·비율 일치**, 5174 화면 표시 확인(`ADMIN-UI-VERIFICATION.md` plans 12/12).

## 2. 실제 학교 PDF 분석 미리보기

| ID | 학교 폴더 | 형식 | 크기 | SHA-256 | 쪽/구역 | 분석 상태 | 과목 구간(추출/전체) | 지필 | 수행 | HWP 인용 일치 |  |
|---|---|---|---|---|---|---|---|---|---|---|---|
| beb4930c52ee | chungmu | PDF | 1050KB | beb4930c52ee | 81 | PARTIAL | 12/13 | 10 | 20 | PDF 쪽 근거 | 2538 |
| d2c8f93f02ea | samgaksan | PDF | 2402KB | d2c8f93f02ea | 71 | PARTIAL | 11/11 | 7 | 21 | PDF 쪽 근거 | 4053 |
| eb6fbaa0b421 | jinyang | PDF | 1046KB | eb6fbaa0b421 | 117 | PARTIAL | 2/13 | 0 | 1 | PDF 쪽 근거 | 4046 |

### beb4930c52ee · chungmu (PARTIAL)

경고: 세부 표 연결이 없어 상세정보를 추출하지 못한 수행평가 17개

| 과목 | 수행평가 후보(비율·만점·시기) |
|---|---|
| 공통국어2 | 2차 시험 논증하는 글쓰기 (25%·100·9~10월) |
| 공통영어2 | 2차 시험 학습 포트폴리오 (25%·100·8~11월) / 영어 어휘 노트 (25%·100·8~11월) |
| 공통수학2 | — (항목 없음) |
| 통합사회2 | 2차 시험 사회문제 톺아보기 (40%·100·10~11월) |
| 한국사2 | 근현대사 가상 일기 (40%·100·10월) |
| 통합과학2 | 2차 시험 자유주제 탐구보고서 (40%·100·9월) |
| 과학탐구실험2 | 프로젝트 (50%·100·10~11월) / 학습지 포트폴리오 (50%·100·8~9월) |
| 기술·가정 | 출산장려정책 (20%·100·8월) / 내가 제안하는 3D모델링으로 가구 설계하기 (20%·100·9월) / 목공작품 제작하기 (20%·100·10~11월) |
| 정보 | 파이선 기초 프로그래밍 (30%·100·11월) |
| 음악 | 가창 활동을 통한 음악 표현 (50%·100·8~9월) / 칼림바로 그리는 음악 (50%·100·11~12월) |
| 미술 | 디지털 드로잉 (50%·100·8월~9월) / 캘리그래피 (50%·100·10월~11월) |
| 체육2 | 윗몸일으키기 (30%·100·9~10월) / 맨몸 크로스핏 (70%·100·11월) |

### d2c8f93f02ea · samgaksan (PARTIAL)

경고: 세부 표 연결이 없어 상세정보를 추출하지 못한 수행평가 20개

| 과목 | 수행평가 후보(비율·만점·시기) |
|---|---|
| 반 | 수행평가 (60%·—·—) |

### eb6fbaa0b421 · jinyang (PARTIAL)

경고: 평가 신호가 있는데 목록을 만들지 못한 구간 11개

| 과목 | 수행평가 후보(비율·만점·시기) |
|---|---|
| 체육1 | 수행평가 (50%·100·3월 ~ 4월) |
| 진로 직업 탐구 | — (항목 없음) |

정확도(사람이 원문과 대조한 범위): `DOCUMENT-EXTRACTION-ACCURACY.md`.
