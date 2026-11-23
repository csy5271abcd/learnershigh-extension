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

- **현재 코드**: Railway 를 쓰지 않는다(`http` 모드 없음, 토큰 설정 없음). 2026-11-24 사용자 결정으로 Railway 는 현행 운영·배포 대상이 아니다.
- **과거 토큰(미해결 경고)**: 예전 `application.yml` 에 들어 있던 Railway 분석기 토큰 형태의 값이 과거 Git 커밋에 남아 있다(값은 문서에 다시 적지 않는다). 그 토큰(`CURRICULUM_ANALYSIS_TOKEN`)이 Railway 쪽에서 무효화됐는지는 **확인이 필요**하다 — 외부 서비스 조작이라 1팀·Railway 관리자와 조율한다. Git 이력 재작성 여부는 팀 결정 사항이다.

## A27-UX 통합 메모 (2026-11-19, 최종 보고서 부록 D)

- 이 Worktree에는 PR #18의 서버 안 분석기(`local`)·학교알리미 불러오기를 A27-UX 화면과 함께 합쳤다.
- **E2E 전용 `loopback-stub` 모드**: Playwright Assessment E2E는 화면 흐름을 고정된 합성 결과로 시험하려고 Backend를 `assessment.analyzer.mode=loopback-stub`으로 띄운다. `assessment.analyzer.stub.base-url`이 127.0.0.1·localhost·::1이 아니면 Backend가 시작하지 않는다(원격 분석기·Railway로 원문을 보낼 수 없다). 토큰은 시험용 고정 값이다.
- Railway 원격 서비스·별도 분석기 저장소·Railway 쪽 환경 변수는 이 작업에서 **지우거나 끄지 않았다**(별도 승인 필요). 위 '토큰 무효화'도 사용자 결정 사항이다.

## 학교알리미 최근 3개 학년도 자동 확인 설정 (2026-11-19, 최종 보고서 부록 E · api-contract §38-12)

| 설정 (환경 변수) | 기본값 | 뜻 |
|---|---|---|
| `assessment.schoolinfo.base-url` (`ASSESSMENT_SCHOOLINFO_BASE_URL`) | `https://www.schoolinfo.go.kr` | 이 주소만 허용한다. 다른 주소면 기동 거부 |
| `assessment.schoolinfo.allow-loopback` | `false` | **시험 전용**: 127.0.0.1·localhost 의 가상 학교알리미 허용 |
| `assessment.schoolinfo.year-query-verified` | `false` | 학교알리미 학년도 지정 조회(`JG_YEAR` 등)의 의미를 **실측하기 전에는 false**. false 면 받은 파일을 모두 '출처 확인 필요'로 두고 슬롯에 등록하지 않는다 |
| `assessment.schoolinfo.sync-ttl-hours` | `24` | 마지막 확인이 이 시간 안이면 외부 요청 없이 기록으로 답한다(실패한 학년도는 매번 다시 확인) |
| `assessment.schoolinfo.polite-delay-millis` · `retry-base-millis` | `500` · `1000` | 파일 사이 대기 · 일시 오류 재시도 대기(지수) |

- 관리자 평가계획서 탭에서 학교를 고르면 화면이 자동으로 `POST …/schoolinfo-sync`를 보낸다(버튼 없음). 수동 '평가계획서 등록'은 그대로다.
- 실제 학교알리미에서 연도 조회를 실측하려면 별도 승인을 받은 뒤, 일회용 DB로 띄운 Backend에서 `year-query-verified`를 켜고 결과(학년도별 되돌려 준 공시연도·파일 이름·원문 표기)를 비교한다. 사용자 DB로 띄운 서버에서 먼저 켜지 않는다.
- 새 표 Migration: `V202611190200__assessment_schoolinfo_sync.sql`(추가만). 사용자 DB 적용은 별도 승인.
