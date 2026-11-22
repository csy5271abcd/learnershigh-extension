# Assessment 평가계획서 분석기 설정

> 근거 코드: `backend/.../assessment/integration/analysis/PlanAnalyzerConfig.java`, `service/plan/LocalPlanAnalyzer.java`, `service/plan/extract/`
> 2026-11-19: 예전 외부 분석기(Railway, `HttpPlanAnalyzerClient`·토큰) 연결은 걷어 냈다. 분석은 Backend 안에서 한다.

```text
관리자 React ──/api──▶ Spring Boot(Assessment) ──▶ LocalPlanAnalyzer (PDF·HWP·HWPX 표 읽기, 스캔본은 OCR)
```

## 설정 (`backend/src/main/resources/application.yml`)

| 키 | 기본값 | 환경 변수 |
|---|---|---|
| `assessment.analyzer.mode` | `local` (`none` = 미설정, 503) | `ASSESSMENT_ANALYZER_MODE` |
| `assessment.analyzer.ocr` | `auto` (Tesseract → Windows 내장 OCR → 없음) · `tesseract` · `windows` · `none` | `ASSESSMENT_ANALYZER_OCR` |
| `assessment.analyzer.timeout-millis` | `150000` (문서 하나 분석 제한) | `ASSESSMENT_ANALYZER_TIMEOUT_MILLIS` |
| `assessment.analyzer.version` / `contract03-version` | `v21.1` / `v21.10-b16-dev` (결과 기록용 프로필, 서로 달라야 함) | `ASSESSMENT_ANALYZER_VERSION` / `ASSESSMENT_ANALYZER_CONTRACT03_VERSION` |

- 원문은 서버 밖으로 나가지 않는다. 토큰이 필요 없다.
- Linux 서버에서 스캔본을 읽으려면 `tesseract`(한국어 `kor`)를 설치한다. 없으면 스캔 쪽은 건너뛴다.
- 시험(`src/test/resources/config/application.yml`)은 `mode: none` 이 기본이다. 분석 결과 저장 규칙 시험은 `StubPlanAnalyzer` 를 `@Primary` Bean 으로 넣는다.

## 보안 메모

예전 `application.yml` 에 들어 있던 Railway 분석기 토큰은 Git 이력에 남아 있다. Railway 서비스를 계속 쓴다면 그쪽 토큰(`CURRICULUM_ANALYSIS_TOKEN`)을 새 값으로 바꿔 무효화한다.
