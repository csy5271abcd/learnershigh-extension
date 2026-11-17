# PDF · HWP · HWPX 분석 비교

> 근거: 파서 코드(`CA/tools/docmodel/`), Adapter(`backend_adapter.py`, `multiformat_adapter.py`), 실제 문서 10개 점검(v19 `DOCUMENT-FORMAT-AUDIT.md`, v21.1 결과 집계), 합성 3형식 결과(`CA/runs/v21-multiformat-backend-bridge-20261110`, v22 `examples/`), Backend `DocumentFormatInspector`·`EvaluationPlanService`.
> **실문서**(Golden 10개: PDF 4 · HWP 5 · HWPX 1)와 **합성 문서**(가상 학교, 같은 내용을 세 형식으로 저장)를 구분해 적었다.

| 항목 | PDF | HWP | HWPX |
|---|---|---|---|
| 내부 파일 구조 | 쪽 Content Stream(글리프·좌표·선). 표·문단 개념 없음 | OLE/CFB 컨테이너 → `FileHeader`, `BodyText/Section*`(raw deflate) → 레코드 트리 | ZIP → `Contents/section*.xml`(OWPML) |
| 사용 Parser | Java 17 + **PDFBox 3.0.5** `PdfLayout`(단어 좌표·괘선) → Python `pdf_model` 0.1 | Python 자체 구현 `hwp5.Cfb` + `hwp_model` 0.1 | Python `zipfile`+`ElementTree` `hwpx_model` 0.1(기본) / 0.2(개발, 캡션 보존) |
| 텍스트 추출 방식 | `PDFTextStripper` 단어 → y좌표 3pt 차이로 줄 구성 | `PARA_TEXT` UTF-16LE, 확장 컨트롤 건너뜀 | `hp:t` 텍스트, `hp:tab` → 탭 |
| 표·셀 처리 | **괘선으로 재구성**(2pt 허용오차). 괘선 없는 표·쪽 넘김 표는 재구성 안 함. 실문서 4개: 표 1,476, AMBIGUOUS 47 | 레코드의 행·열·Span 그대로. 실문서 HWP·HWPX 163개 표 격자 검산 모두 일치 | XML 속성 그대로. 0.1은 중첩 표 칸 좌표 결함 있음(0.2에서 수정, 기본 미반영) |
| 과목 구역 탐지 | 쪽 단위: 쪽 위 35% 제목·머리표·**인쇄 쪽 번호 재시작** | 블록 단위: 제목 문단·머리표·1×1 제목 상자 | HWP와 같음 |
| 지필·수행 추출 | 같은 조립 0.3. 실문서에서 표 손상·2단 배치로 **목록 미탐지 구간이 많음**(G003 10, G009 6, G013 12) | 같은 조립 0.3. 실문서 목록 미탐지 G039 1구간 | 같은 조립 0.3. 실문서 1개는 평가 부분 없음 |
| 근거 Locator | `PDF_TEXT{pdfPage,bbox,printedPage}`, `PDF_TABLE_CELL{pdfPage,table,row,col,bbox}` → Backend `pdfPageNumber`+`extractedText` | `HWP_PARAGRAPH`·`HWP_TABLE_CELL{section,path,table,row,col,rowSpan,colSpan}`, `CONTROL_TEXT` → Backend `documentLocator` | `HWPX_*` 같은 모양 → `documentLocator` |
| 쪽 번호 | 물리 쪽 + 인쇄 쪽 | **만들지 않음**(가짜 쪽 번호 금지) | 만들지 않음 |
| Backend Import | 공식 `AnalysisImportRequest`(backend-adapter-0.2), Flag 1개(`ASSESSMENT_ANALYSIS_IMPORT_ENABLED`) | 실험 DTO(multiformat-adapter-0.1-draft, `source.format`+`documentLocator`), Flag 2개(+`ASSESSMENT_MULTIFORMAT_EXPERIMENTAL`) | HWP와 같음 |
| Backend 등록 검사 | PDF 서명·쪽 수(`PdfInspector`) | CFB 서명 등(`DocumentFormatInspector`, 실험 Flag일 때만 받음) | ZIP·mimetype 등(같음) |
| 관리자 검토·확정 | 기본 허용(PDF 쪽 기준 근거) | `structured-confirm-dev=true`일 때만. 원본 SHA 재확인·Locator 경로 일치·명시적 수동 대조 확인 필요. 기본은 `verified_auth_required`로 거절 | HWP와 같음. 브라우저 E2E 44/44(개발) |
| 오류 처리 | Java 실패 → `PARSE_FAILED`. 회전 쪽 표 `UNAVAILABLE`, 표 손상 `structureFlags`, 손상 이름 평가 전송 제외 | 암호·배포용 거절, 칸 문단 수 불일치 기록 | ZIP 방어(서비스), XML 오류 → `PARSE_FAILED` |
| 처리 시간(실측) | 220쪽 8.5초 · 346쪽 33.4초(+PdfLayout 1.8~14.9초) | 0.1~0.5초 | 0.1초 |
| 실제 지원 범위 | 텍스트 PDF만. 스캔 PDF(텍스트 없음 120개) 불가. 괘선 의존 | 5.x 일반 문서. 배포용·암호 문서 불가(코퍼스에 0개) | 일반 문서. 캡션은 개발 프로필에서만 |

## 형식 간 동일성 (합성 문서) [테스트 기록]

- 같은 내용을 PDF·HWP·HWPX로 저장한 합성 문서 3개는 **근거를 뺀 평가 값이 세 형식 모두 같다**(지필 W01 40%·5월, 수행 P01·P02 각 30%·100점, 수행 전체 60%) — `CA/runs/v21-multiformat-backend-bridge-20261110/REPORT.md` §3, v22 `ASSESSMENT-INTEGRATION.md`.
- 근거 원문 대조: 합성 41/41, 실제 HWP G024 92/92 · G027 439/439 · G036 47/47 · G031 6/6(다중 형식 Adapter `quoteCheck`).
- 같은 내용이라도 Locator 경로는 형식마다 다르다(HWP `p0.c2…`, HWPX `p0.c0…`). Backend Validator는 마지막 `r<행>c<열>` 구간이 칸 좌표와 맞는지 검사한다(`lastCellSegmentMatches`).

## 형식별 실문서 결과 차이 (v21.1, 도구 기준 개수)

| | PDF 4개 | HWP 5개 | HWPX 1개 |
|---|---|---|---|
| 문서 상태 | PARTIAL 4 | OK_REVIEW_REQUIRED 4 · NO_ASSESSMENTS 1 | NO_ASSESSMENTS 1(평가 없는 문서) |
| 수행평가 중 활동 찾음 | 32/77 (G001만) | 23/23 | – |
| 인용 일치 | 112/112 | 203/203 | – |

PDF가 낮은 이유는 표 재구성 손상·2단 배치·쪽 넘김 표이고, HWP·HWPX는 표 구조를 파일에서 그대로 읽기 때문이다. **이는 10개 문서의 도구 지표이며 형식별 정확도가 아니다.**
