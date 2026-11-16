# LearnersHigh Assessment 기술 조사 — 요약 (2026-11-12)

> 읽기 전용 조사. 코드·원본·DB·서버는 바꾸지 않았다. 외부 API 호출·테스트 재실행·재분석은 하지 않았다. Commit·Push하지 않았다.
> 상세는 같은 폴더의 문서 26개. 근거 경로는 `SOURCE-EVIDENCE-INDEX.md`.

## 1. 평가계획서 원본 (실제 확인)

- **60개교 확인: 일반고 50, 자사고 10.** 일반고 지역 묶음별 학교 수(서울 8 · 경기 10 · 인천 4 · 광역시 묶음 10 · 세종·강원·충청 묶음 8 · 전라·경상·제주 묶음 10)는 사용자 기준과 일치한다.
- 시·도별 2개교 배분, 자사고 지역, 학생 수는 **자료가 없어 확인 불가**다.
- 파일 **5,170개**(일반고 4,022 · 자사고 1,148), 2.42 GiB. 2026-11-12에 전수 SHA-256을 다시 계산했고 분석기 v3 Manifest와 **완전히 같았다**. 고유 내용은 5,132개(중복 사본 38개).
- 형식(매직 바이트): HWP 3,280 · PDF 981 · HWPX 904 · DOCX 5. 확장자 `.hwp`인 HWPX가 5개 있다.
- 문서 유형 후보: 교수학습·평가 통합 4,766 · 평가만 162 · 교수학습만 114 · 기타 127 · 텍스트 없음 1.
- 다양성: 학교당 파일 6~418개, PDF 최대 1,046쪽(120쪽 초과 398), Office 문서 94.7%가 병합 셀 20개 이상, 텍스트 없는 PDF 120개.

## 2. 집계 구분

수집 5,170 → 텍스트 Probe(전수) → DocumentModel·평가 분석 **실제 문서 10개** → 평가 목록 생성 8개 → 실제 학교 문서 LLM 호출 **0** → 사람 정답 **0** → 분석기 테스트 615건 통과(대부분 합성·Mock).

## 3. AI 분석 기술 (실제 코드)

- **규칙 기반 구조 분석기, LLM 없음**(`analysisMode.llmCalls=false`, 워커가 네트워크·LLM SDK 차단).
- 실행 환경: Python 3.12.9(분석 경로는 표준 라이브러리만), OpenJDK 17.0.18 + **Apache PDFBox 3.0.5**.
- PDF: Java `PdfLayout`이 단어 좌표·괘선 추출 → Python이 괘선으로 표 격자 재구성.
- HWP: OLE/CFB·HWP 5 레코드를 **직접 구현**한 파서(`zlib` raw deflate).
- HWPX: `zipfile` + `ElementTree`로 OWPML 파싱.
- 공통 DocumentModel(docmodel-0.1, 결정적 Locator) → 과목 구간(제목 정규식·머리표·인쇄 쪽 재시작) → 평가 조립 0.3(표 역할·가로/세로 요약표·지필/수행·비율/만점/시기·채점표 연결 5단계) → 수행평가 상세 0.1(평가 범위 고정, 활동·제출물 STATED/INFERRED·조건·특수 규정) → 검증(Locator 존재·원문 인용·범위) → Backend Adapter(PDF 공식 / HWP·HWPX 실험).
- 서비스: 표준 라이브러리 HTTP(127.0.0.1:8765), 개발용 공유 토큰, 요청별 하위 프로세스 + Job Object 메모리 상한, ZIP 폭탄·경로 이탈 방어.
- 과거 LLM 실험: Claude Sonnet 5.5·Gemini 3.8 Flash, **합성 문서 3개에 22회**(약 1.09 USD). 현재 경로와 연결되지 않음.
- Backend에 별도 Claude 분석 코드(anthropic-java 3.2.0)가 있지만 **기본 비활성·미호출**.

## 4. 실제 분석 과정 사례

실제 HWP 1건(G024, 일반고, 2025 1학년 1학기)의 수행평가 P01을 원본 바이트부터 Backend Payload까지 23단계로 추적했다(`REAL-DOCUMENT-CASE-STUDY.md`).

- 결과: 반영비율 20%, 만점 20점(3곳 일치), 기본점수 7점, 시기 VARIANTS → Backend `timing=null`.
- 채점표는 충족 개수 구간 7단계(20~10점, 특수 7점)이고, 연결 단계는 LINKED_CONFIDENT다.
- 제출물은 INFERRED라 전송하지 않았다.
- 근거 대조 69/69, 계약 위반 0.
- **Backend DB에는 반입하지 않았다.**

## 5. 아키텍처 파일

- `ARCHITECTURE-ANALYZER.mmd` + `-EXPLAINED.md` — 분석기 내부
- `ARCHITECTURE-ASSESSMENT-E2E.mmd` + `-EXPLAINED.md` — Frontend(React 19.3·Vite 8.3) · Backend(Java 21·Spring Boot 4.1.1·JPA·Flyway) · 분석기 · MySQL · 로컬 Storage
- `ARCHITECTURE-FUTURE.mmd` + `-EXPLAINED.md` — 목표(현재/미구현 구분)
- SVG·PNG는 렌더러가 없어 만들지 않았다.

## 6. 현재 상태 핵심

- **완료(실행 확인):** PDF·HWP·HWPX 분석, Admin 등록 → 분석 → 수신 → 검토(합성), 학생 기록·피드백·휴지통·학생 화면 보기.
- **완료(개발 전용):** HWPX 공식 검토. HWP 공식 검토는 통합 테스트만.
- **미구현:** 실제 인증(Mock Header), 운영 Storage(원본 미보관), 비동기 분석, OCR, DOCX, 운영계획 구조화.
- **미측정:** 실제 문서 정확도.

## 7. 향후 작업 (상위)

| 우선 | 작업 |
|---|---|
| P0 | 빈 Schema 기준선 재실행, 낡은 브라우저 스크립트 갱신, 개발 DB Migration 이력 확인 |
| P1 | **사람 정답 10개 → 실제 Baseline 지표**, PDF 세부표 연결·표 복원·쪽 넘김 표, v21.2 기본 반영 결정, 실문서 E2E, 전수 실행 |
| P2 | 실제 인증, HWP·HWPX 운영 확정, 운영 Storage·악성 파일 검사, 분석기를 Backend 뒤로, 계약 확장·문서화 |
| P3 | 선택적 LLM(규칙 실패 구간만, 근거 검증 필수), OCR, 개정본 비교, 학생 확정값 표시 |

전체 목록과 선행 관계는 `FUTURE-WORK-BACKLOG.md`·`FUTURE-WORK-DEPENDENCIES.md`에 있다.

## 8. 확인하지 못한 것

학생 수, 시·도별 배분·자사고 지역, 13개교 학교명, 실제 정확도, 전수 처리율, 실제 문서 Backend 반입, 최신 회귀 일부, 다이어그램 이미지(`RESEARCH-GAPS.md`).
