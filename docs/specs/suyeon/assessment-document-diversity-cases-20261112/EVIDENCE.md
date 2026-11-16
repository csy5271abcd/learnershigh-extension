# 근거 목록

> `CA` = `C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis`(저장소 밖, Git 제외, 외부 전송 금지). `REPO` = `C:\learnershigh-extension`. `ORIG` = `REPO/references/curriculum-plan/`(원본, 읽기만 함).
> `SP` = 이번 세션 Scratchpad(`C:\Users\CHOISU~1\AppData\Local\Temp\claude\…\scratchpad\`). 원문이 담긴 중간 출력(`sens/`)은 여기에만 있다. **공유하지 않는다.**

## 1. 근거 수준 표기

| 표기 | 뜻 |
|---|---|
| [원본 확인] | 이번 조사에서 기존 Parser(`docmodel-0.1`)로 원본을 열어 DocumentModel의 문단·표·셀·병합·좌표를 확인함 |
| [본문 확인] | 학교명을 문서 본문 글자에서 확인함(김포고: '김포고등학교' 2회, 북일고: '북일고등학교' 45회) |
| [분석 기록 확인] | v3 Manifest·Probe(전수), 기존 보고서, 또는 도구(v21.1)가 만든 결과 |
| [추정] | 구조상 예상만 함(이번 문서에서는 2쪽 모아찍기 후보 1건) |

## 2. 사례 문서 50개 — 원본 폴더 (`ORIG/` 기준)

파일명은 적지 않는다(`flags=TEACHER_NAME_IN_FILENAME` 1,030개). fileId로 `CA/runs/v3-20261106/manifest_full.csv`에서 파일을 찾을 수 있다.

| fileId | 학교명 | 원본 폴더 | SHA-256 앞 12자 |
|---|---|---|---|
| F04424 | – | `general-high-school/seoul/solsaem/2024/second-grade/second-semester/` | `b818d8ecb056` |
| F02267 | 현일고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hyeonil/2026/` | `32dd0be1f740` |
| F02449 | 진양고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/jinyang/2025/first-grade/first-semester/` | `e4171537c6b8` |
| F04382 | – | `general-high-school/seoul/samgaksan/2024/first-grade/first-semester/` | `15e63ae63fb2` |
| F00385 | – | `autonomous-private-high-school/hana/2024/first-grade/first-semester/` | `9a493ce48bda` |
| F01516 | 우송고 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/woosong/2026/second-grade/first-semester/` | `a00b4a6fca2b` |
| F01201 | 경일고 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/gyeong-il/2026/third-grade/first-semester/` | `a78bfafc5136` |
| F04033 | 자양고 | `general-high-school/seoul/jayang/2025/second-grade/second-semester/` | `717ed6e3ee77` |
| F01270 | 해강고 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/haegang/2024/first-grade/first-semester/` | `205b88c26c9a` |
| F01124 | 휘문고 | `autonomous-private-high-school/whimoon/2025/second-semester/` | `7a700831e0e6` |
| F04404 | – | `general-high-school/seoul/solsaem/2024/first-grade/second-semester/` | `9bdea184a9ad` |
| F00439 | – | `autonomous-private-high-school/paichai/2025/first-grade/first-semester/` | `bdc33c87e556` |
| F01609 | 김포고 [본문 확인] | `general-high-school/gyeong-gi/gimpo/2025/second-grade/first-semester/` | `e202ebe51390` |
| F02957 | 고운고 | `general-high-school/sejong·gang-won·chungbug·chungnam/goun/2025/second-semester/` | `c94b9c958274` |
| F01621 | 광명고 | `general-high-school/gyeong-gi/gwangmyeong/2025/first-grade/first-semester/` | `49cc95148d55` |
| F02556 | 완주고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/wanju/2025/second-grade/first-semester/` | `c5462158e3af` |
| F04320 | – | `general-high-school/seoul/poongmoon/2026/second-grade/second-semester/` | `c72fbd334425` |
| F01686 | 세종고 | `general-high-school/gyeong-gi/sejong/2024/third-grade/second-semester/` | `b0f663b9ed1a` |
| F01939 | 한림고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hanlim/2025/second-semester/` | `8e05f99fa578` |
| F04034 | 자양고 | `general-high-school/seoul/jayang/2025/third-grade/first-semester/` | `ce2a2637dec9` |
| F01627 | 광명고 | `general-high-school/gyeong-gi/gwangmyeong/2026/first-grade/first-semester/` | `4cd9f4405f82` |
| F00016 | 북일고 [본문 확인] | `autonomous-private-high-school/bugil/2026/second-grade/second-semester/` | `0d8e1483e28a` |
| F00020 | 김천고 | `autonomous-private-high-school/gimcheon/2024/first-grade/first-semester/` | `c6015607d81e` |
| F01287 | 해강고 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/haegang/2026/third-grade/first-semester/` | `425f17f176da` |
| F01821 | 가좌고 | `general-high-school/incheon/gajwa/2024/first-semester/` | `406445f490f7` |
| F02041 | 호남제일고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/honamjeil/2024/second-grade/second-semester/` | `fe6cce4c3eb7` |
| F02256 | 현일고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hyeonil/2024/first-grade/second-semester/` | `1f7d57be3c2b` |
| F02532 | 완주고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/wanju/2025/first-grade/first-semester/` | `a02a120199e6` |
| F03312 | 대신고 | `general-high-school/seoul/daeshin/2024/first-semester/` | `d53f9e24eb5a` |
| F04754 | 명지고 | `general-high-school/seoul/myeongji/2024/first-grade/first-semester/` | `ce5611e208fb` |
| F01258 | 계성고 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/gyeseong/2025/first-grade/first-semester/` | `80bd032849fe` |
| F01239 | 계성고 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/gyeseong/2024/third-grade/first-semester/` | `ec882ecdf047` |
| F01086 | 세화고 | `autonomous-private-high-school/sehwa/2025/second-grade/first-semester/` | `7b4fcd7ad51b` |
| F01831 | 가좌고 | `general-high-school/incheon/gajwa/2024/second-semester/` | `c337ab5f35e2` |
| F05106 | 명지고 | `general-high-school/seoul/myeongji/2026/third-grade/first-semester/` | `14cdb60acd81` |
| F03755 | 한영고 | `general-high-school/seoul/hanyoung/2024/second-semester/사회과/` | `b85f53f4cb59` |
| F00067 | 김천고 | `autonomous-private-high-school/gimcheon/2024/second-grade/first-semester/` | `84f10aaca23c` |
| F03143 | 서원고 | `general-high-school/sejong·gang-won·chungbug·chungnam/seowon/2024/third-grade/second-semester/` | `879ab4d20ef8` |
| F02019 | 호남제일고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/honamjeil/2024/second-grade/first-semester/` | `270387839c8b` |
| F02100 | 호남제일고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/honamjeil/2024/third-grade/first-semester/` | `61fd37c5f674` |
| F02782 | 다정고 | `general-high-school/sejong·gang-won·chungbug·chungnam/dajeong/2024/third-grade/first-semester/` | `bcbed98102ae` |
| F03502 | 대신고 | `general-high-school/seoul/daeshin/2025/second-semester/` | `99271ae29db4` |
| F02322 | 효암고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hyoam/2026/first-grade/second-semester/` | `23942ca9fab5` |
| F00717 | – | `autonomous-private-high-school/sangsan/2024/second-grade/first-semester/` | `c8c2af1e84fc` |
| F01672 | 주엽고 | `general-high-school/gyeong-gi/juyeob/2025/third-grade/first-semester/` | `104e3e027b9e` |
| F01122 | 휘문고 | `autonomous-private-high-school/whimoon/2025/first-semester/` | `a4a8f39d7975` |
| F04436 | – | `general-high-school/seoul/solsaem/2024/second-grade/second-semester/` | `c0f032ae3e83` |
| F04114 | – | `general-high-school/seoul/poongmoon/2024/third-grade/first-semester/` | `94c69b8eb06f` |
| F02599 | 완주고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/wanju/2025/third-grade/first-semester/` | `d96911af4065` |
| F01383 | 수완고 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/suwan/2024/second-grade/first-semester/` | `2a66361771c8` |

## 3. 사례 문서 선정 규칙

1. 기존 Golden 파일럿 10개(F00016 · F00020 · F01124 · F01287 · F01821 · F02041 · F02256 · F02532 · F03312 · F04754)는 그대로 넣었다.
2. 전수 Probe에서 특징이 극단적인 문서를 넣었다:
   - 병합·Span 상위: F01609 · F02957 · F01621 · F01627 · F01686 · F01939 · F04034
   - 가로 쪽: F04424 · F02267 · F02449 · F00385 · F01516 · F01201 · F04033 · F01270
   - 쪽 번호 재시작: F04382
   - 스캔: F00439
   - 확장자 불일치: F02556 · F04320
3. 학교 수를 늘리려고 `run_cases.py`의 `pick()`으로 학교·형식·분할·문서 유형 조건마다 **파일 크기 중앙값 파일 1개**를 골랐다. PDF는 160쪽 이하, 텍스트가 있는 것만 골랐다.
4. 따라서 이 50개는 무작위 표본이 아니다. 도구 결과의 비율을 코퍼스 전체 성공률로 쓰면 안 된다.

## 4. 원천 자료

| 근거 | 쓰인 곳 |
|---|---|
| `CA/runs/v3-20261106/manifest_full.csv` | 학교별 형식·연도·분할·문서 유형·확장자 불일치(`flags`) |
| `CA/runs/v3-20261106/office_probe.jsonl` | HWP·HWPX 표·셀·병합·최대 Span(전수) |
| `CA/runs/v3-20261106/pdf_probe.jsonl` | PDF 쪽 수·가로 쪽·쪽 크기·텍스트 쪽(전수) |
| `CA/runs/v3-20261106/features.jsonl` | 인쇄 쪽 번호 재시작·한 쪽 두 번호(2-up 후보)·이미지 쪽 |
| `CA/tools/docmodel/{build,hwp5,hwp_model,hwpx_model,pdf_model,model}.py`, `CA/tools/java/PdfLayout.java` | Parser(이번 실행) · 격자 검산(`model.grid_check`: OK / AMBIGUOUS = 겹침·범위 이탈) · PDF 중첩 표(`parentTable`) |
| `CA/tools/llmprep/{analysis_result,assessment_assembly03,rubric_structure,rubric_structure2,task_detail}.py` | 평가 조립·표 역할·채점 모델 분류(이번 실행, 프로필 `v21.1`) |
| `CA/tools/docmodel/README.md` | Parser 제약: 쪽 넘김 표 미연결, 2-up 미분류, HWP·HWPX 쪽 없음 |
| `REPO/docs/specs/suyeon/assessment-technical-research-20261112/DOCUMENT-REPRESENTATIVE-CASES.md` | 기존 Golden 10개의 기존 기록(G001~G039) |
| `REPO/docs/specs/suyeon/assessment-technical-research-20261112/SCHOOL-INVENTORY.md` | 학교명(파일명 표기). 이번에 47/13으로 정정함 |

## 5. 이번 조사에서 만든 중간 출력 (`SP/`, 저장소 밖)

| 파일 | 내용 | 원문 포함 |
|---|---|---|
| `div_agg2.py` → `div_agg.json` | Manifest + Probe 학교별·파일별 집계 | 아니오(경로 미포함) |
| `fmt_cat.py` → `fmt_cat.json` | 학교 형식 분류, 대신고 HWP·HWPX 내부 목록, 확장자 불일치 ZIP 목록 | 아니오 |
| `run_cases.py` → `sens/*.docmodel.json`, `sens/*.analysis.json`, `cases_summary.json`, `cases_post.json` | 50개 문서 Parser·분석 실행, 요약 | **예(`sens/`)** — 요약 JSON은 개수·상태만 |
| `nest.py` → `nest.json` | Office 중첩 표 수(셀 안의 표) | 아니오 |
| `xpage.py` → `xpage.json` | PDF 쪽 경계 표 이어짐 후보(좌표) | 아니오 |
| `kw.py` → `kw.txt` | 감점·체크리스트·개수 표현 개수(짧은 조각 포함) | 일부 조각 |
| `peek.py`, `peek2.py` → `peek.txt`, `peek2.txt` | 채점표 구조 확인(셀 앞 22~26자) | **예** — 콘솔·임시 파일로만 보고, 보고서에는 숫자와 구조만 옮김 |
| `namecheck.py` → `namecheck.txt` | 학교명이 파일명에 나오는 개수 | 아니오(학교명만) |

실행 명령(모두 읽기 전용, 외부 호출 없음):

```text
python -I div_agg2.py                       # 전수 기록 집계
python -I run_cases.py                      # 50개 문서 Parser + 분석(v21.1), 약 6분
python -I run_cases.py --post               # 저장된 결과로 요약만 다시 계산
python -I nest.py ; python -I xpage.py ; python -I kw.py ; python -I namecheck.py
```

- 첫 요약에는 표 역할 집계 버그가 있었다(조립 결과에서 내부 표 참조가 지워져 첫 채점표 뒤 집계가 멈춤). 표 ID로 다시 찾게 고쳐 `--post`로 다시 계산했다. 보고서 수치는 모두 고친 결과(`cases_post.json`)다.
- 원본 변경, DB 접근, 서버 시작·종료, 테스트 실행, LLM·외부 API 호출은 하지 않았다.

## 6. 수치별 근거 빠른 찾기

| 수치 | 근거 |
|---|---|
| HWP 3,280 · PDF 981 · HWPX 904 · DOCX 5, 확장자 기준 3,285 · 899 | `manifest_full.csv`의 `format` · `extension` |
| PDF만 16 · HWP 80% 이상 18 · HWPX 과반 6 · 세 형식 10 · 주 형식 변경 21 | `SP/fmt_cat.json`, 동률 제외 재계산 |
| 광명고 병합 8,648(Probe) / 8,643(DocumentModel) | `office_probe.jsonl` F01627 / `cases_post.json` |
| 김포고 134행 병합 | `office_probe.jsonl` `maxSpan` 134 · DocumentModel 135×5 표 첫 열 |
| 중첩 39 · 19 · 19 · 81 · 84 | `SP/nest.json`(Office), `cases_post.json` `nestedTables`(PDF `parentTable`) |
| 격자 모호 59/287 등 | `cases_post.json` `gridStatus` |
| 쪽 경계 이어짐 후보 101/250 등 | `SP/xpage.json` |
| 평가 993 · 지필 155 · 수행 697 · 인용 1,036/1,036 · Locator 12,484/12,484 | `cases_post.json` 합계 |
| 채점 방식 사례 | `SP/peek.txt`, `SP/peek2.txt`의 표 구조 + `cases_post.json` `rubrics[].model` |
