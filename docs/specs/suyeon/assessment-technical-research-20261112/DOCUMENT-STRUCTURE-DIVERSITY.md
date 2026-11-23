# 평가계획서 문서 구조의 다양성

> 근거: 파서 코드(`curriculum-analysis/tools/docmodel/*`), 전수 Probe 통계(`runs/v3-20261106/stats.txt`), 실제 문서 10개 구조 점검(`runs/v19-real-document-validation-20261109/DOCUMENT-FORMAT-AUDIT.md`, `format_audit.json`), v4 파일럿(`runs/v4-pilot-20261106/baseline_report.md`).
> 실제 학교 문서의 본문은 옮기지 않았다. 개수와 구조 이름만 적는다.

## 1. 파일 형식별 내부 구조

### PDF [실제 코드에서 확인]

| 항목 | 내부 구조 | 분석기 처리 |
|---|---|---|
| 텍스트 | 쪽 Content Stream의 글리프. 읽기 순서 정보가 없다 | PDFBox `PDFTextStripper` 하위 클래스(`PdfLayout.Words`)가 단어마다 좌표(x0,y0,x1,y1)를 기록 → `pdf_model._words_to_text`가 y좌표 3pt 차이로 줄을 나눔 |
| 쪽 | 물리 쪽 번호(1부터) + 문서에 인쇄된 쪽 번호(별개) | `pdfPage`(물리)와 `printedPage`(정규식으로 찾은 인쇄 번호)를 따로 저장 |
| 좌표 | 좌하단 원점 pt | `PdfLayout`이 좌상단 원점으로 바꿔 저장 |
| 표 | **표 개념이 없다.** 선(괘선)과 사각형 경로만 있다 | `PdfLayout.Rules`(`PDFGraphicsStreamEngine`)가 `lineTo`·`appendRectangle` 경로를 수집 → `pdf_model._segments/_components/_table`이 수평·수직 선을 2pt 허용오차로 묶어 격자 재구성 → 단어 중심점이 들어간 칸에 배정 |
| 병합 셀 | 칸을 나누는 선이 없는 부분 | 내부 선이 없는 원자 칸을 합쳐 rowSpan·colSpan 계산. 직사각형이 아닌 병합은 `nonRectangular` 표시 |
| 한계 | 괘선 없는 표, 여러 쪽에 걸친 표, 회전된 쪽 | 재구성하지 않음(`integrity.limits`에 기록). 회전 쪽은 표 `UNAVAILABLE` |
| 원문 근거 | 쪽 + 좌표 | Locator `PDF_TEXT {pdfPage, bbox, printedPage}`, `PDF_TABLE_CELL {pdfPage, table, row, col, bbox}` |

### HWP 5.x [실제 코드에서 확인]

| 항목 | 내부 구조 | 분석기 처리 |
|---|---|---|
| 컨테이너 | OLE Compound File(CFB). 시그니처 `D0 CF 11 E0 A1 B1 1A E1` | `docmodel/hwp5.py` `Cfb` — **외부 라이브러리 없이 직접 구현**한 CFB 판독기(FAT·DIFAT·MiniFAT·디렉터리 트리) |
| 스트림 | `FileHeader`(압축·암호·배포 플래그), `BodyText/Section0..N` | `hwp_model.parse_hwp`가 플래그를 읽고, 암호·배포용이면 거절. Section 스트림은 `zlib.decompress(body, -15)`(raw deflate) |
| 레코드 | 4바이트 헤더(tag 10비트·level 10비트·size 12비트, size=0xFFF면 다음 4바이트) | `hwp_model.records()` |
| 문단 | `PARA_HEADER(66)` → 자식 `PARA_TEXT(67)`(UTF-16LE, 확장 컨트롤 8글자 건너뜀) | `hwp5.para_text()` |
| 표 | `CTRL_HEADER(71)` id `'tbl '` → `TABLE(77)`(행·열 수) → 칸마다 `LIST_HEADER(72)`(문단 수·col·row·colSpan·rowSpan) → 칸 문단 | `_Parser.table()` — 칸 좌표·병합 Span을 레코드 값 그대로 보존하고 `grid_check`로 검산 |
| 글상자 등 | 표가 아닌 컨트롤 안 문단 | `CONTROL_TEXT`(칸 좌표 `UNAVAILABLE`) |
| 쪽 | **쪽 정보 없음**(렌더링해야 생김) | 쪽 번호를 만들지 않는다 |
| 원문 근거 | 구역·문단 경로·표 칸 | Locator `HWP_PARAGRAPH {section, path}`, `HWP_TABLE_CELL {section, path, table, row, col, rowSpan, colSpan}` — 예: `F02532#s0.p111.c0.r6c7` |

### HWPX (OWPML) [실제 코드에서 확인]

| 항목 | 내부 구조 | 분석기 처리 |
|---|---|---|
| 컨테이너 | ZIP. `mimetype`(application/hwp+zip), `Contents/section*.xml` | `build.actual_format`이 ZIP 앞부분에서 `Contents/section`·`mimetypehwp` 확인. 서비스는 `upload_guard.check_zip`이 먼저 경로 이탈·압축 폭탄 검사 |
| XML | `hp:p > hp:run > (hp:t | hp:tbl | 기타 개체)` | `hwpx_model.py` — 표준 라이브러리 `zipfile` + `xml.etree.ElementTree` |
| 표 | `hp:tbl[rowCnt,colCnt] > hp:tr > hp:tc > hp:cellAddr(colAddr,rowAddr) · hp:cellSpan(colSpan,rowSpan) · hp:subList > hp:p` | 칸 주소·Span을 XML 속성 그대로 보존 |
| 캡션 | `hp:caption` | 파서 0.1은 버림 → 파서 0.2(`docmodel_v02`, v21.2-quality 프로필 전용)가 `CONTROL_TEXT .cap.p<n>`로 보존 |
| 쪽 | 쪽 정보 없음 | 쪽 번호를 만들지 않는다 |
| 원문 근거 | HWP와 같은 모양 | `HWPX_PARAGRAPH`·`HWPX_TABLE_CELL`. 같은 내용이라도 HWP는 `p0.c2…`, HWPX는 `p0.c0…`처럼 경로가 다르게 나온다(합성 실험, `runs/v21-multiformat-backend-bridge-20261110`) |

### DOCX [실제 코드에서 확인]

- 수집 문서에는 5개(`sangsan`)가 있다. v3 Probe(`office_probe.py`)는 텍스트를 읽었지만 문서 유형은 5개 모두 `OTHER_OR_UNREADABLE`이다.
- 분석기 파이프라인은 **DOCX를 지원하지 않는다**. `actual_format`이 `ZIP_OTHER`로 판정 → `UNSUPPORTED_FORMAT`. 서비스는 415로 거절한다.

## 2. 문서 작성 방식 [연구 기록]

| 방식 | 근거(전수 v3 규칙 판정) |
|---|---|
| 과목별 단일 문서 | `SINGLE_SUBJECT` 3,096 |
| 몇 과목·교과군 묶음 | `FEW_SUBJECTS` 772 |
| 학년·학기 전체 통합 | `MULTI_SUBJECT` 1,162 — PDF가 491로 많다. 최대 1,046쪽 |
| 여러 학년 통합 | `MULTI_GRADE` 141 파일 |
| 학기별 분리 | 학기 폴더 2,570 / 2,589. 학기 미상 11 |
| 평가계획 단독 | `EVALUATION_ONLY` 162 (PDF 143) |
| 교수학습·평가 통합 | 4,766 (92.2%) |
| 교수학습계획만 | 114 (HWPX 81) — 예: G033 |
| 수정본·같은 파일 사본 | 파일명 '수정본' 등 33.9%(용어 빈도), SHA 중복 38 |

## 3. 표 구조 차이 [연구 기록 — 실제 문서 10개 구조 점검]

| 구조 | PDF 4개 | HWP 5개 | HWPX 1개 |
|---|---:|---:|---:|
| 표 | 1,476 | 160 | 3 |
| 중첩 표 | 219 | 0 | 0 |
| 병합 셀 | 6,836 | 1,224 | 24 |
| 머리 2행에 병합 있는 표(다단 머리글 후보) | 593 | 97 | 0 |
| 격자 검산 AMBIGUOUS | 47 | 0 | 0 |
| 쪽 넘김 표 후보(머리글 반복 / 없이 이어짐) | 183 / 76 | 측정 불가 | 측정 불가 |
| 표 밖 규정 문단(결시·미제출·재평가) | 404 | 83 | 0 |
| 평가 요약표 가로형 / 세로형 | 56 / 58 | 9 / 2 | 0 / 0 |
| 채점표 후보 LIKELY / POSSIBLE | 149 / 56 | 41 / 4 | 1 / 0 |

LIKELY 채점표의 채점 모형:

| 형식 | 요소별 수준 | 수준 1개 요소 | 복합(감점 포함) | 충족 개수 구간 | 전체 구간 |
|---|---:|---:|---:|---:|---:|
| PDF | 87 | 42 | 15 | 2 | 3 |
| HWP | 37 | 2 | 2 | 0 | 0 |
| HWPX | 1 | 0 | 0 | 0 | 0 |

실제 문서에서 확인된 표 다양성(분석기 조립 0.3 주석과 보고서에 기록된 일반 규칙):

| 다양성 | 실제 예 | 분석기 대응 |
|---|---|---|
| 가로형 요약표(평가가 열) / 세로형(평가가 행) | 둘 다 다수 | `matrix_entries` / `list_entries` |
| 세로형 요약표에서 병합된 시험 칸 아래 문항 유형 행 | G001 '1차 고사' 아래 선택형·서답형 | 조립 0.3 `group_question_type_rows` — 독립 평가가 아니라 구성요소로 묶음 |
| 라벨 단위 꼬리 '(%)'·'(점)' | G009 '비율(%)' | 조립 0.3 `field_of`·`parse_with_label` |
| 2단 행 머리글 가로형 요약표 | G013 | 조립 0.4-dev(v21.2-quality 전용) |
| 채점표 머리글 낱말 없음 | 여러 문서 | 점수 열 모양 + 개수 구간 판정 |
| 충족 개수 구간('모든 항목 20, 5개 18 …') | G024 | `count_bands` |
| 감점형 채점 | G031 | 복합 모형 표시(규칙 추출 한계로 기록) |
| 요소마다 '기본 점수' 수준 | G036 | `baseLevel`로 표시(평가 기본점수로 옮기지 않음) |
| 바깥 계획표 안 중첩 채점표 | G027 | 중첩 표 부모·칸 기록 |
| '30점(20점)' 같은 부분집합 표기 | 다수 | 괄호 값 = SUBSET, 합계에서 제외 |
| 주차가 달마다 1부터 다시 시작하는 운영표 | 다수 | 시간 단위 열 + 단원·성취기준 열 → 운영표(채점표 아님) |
| 미제출·결시 규정이 표 밖 문단 | PDF 404, HWP 83 | `SPECIAL_RULE_PARAGRAPHS` 검사 → 특수 규정 후보 |
| 체크 상자(■/□) 평가 방법 | G036 | `checkbox_candidates`(■ 선택, □ 비선택) |
| 여러 쪽에 걸친 표 | PDF 259 후보 | **연결하지 않음**(파서 한계) |
| 2단 가로 배치·괘선 없는 평가요소 | G009 | 해결 못 함(레이아웃 영역 해석 필요) |
| PDF 괘선 일부 누락으로 칸 글 섞임 | G003, G013 | 손상 표시(`structureFlags`), 이름 손상 평가는 전송 제외 |
