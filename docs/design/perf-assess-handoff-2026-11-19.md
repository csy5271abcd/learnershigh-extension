# 평가계획서 분석 인수인계 (2026-11-19)

## 지금 위치

- 저장소: `csy5271abcd/learnershigh-extension`, 브랜치 `feat/perf-assess-plan-extraction`
- PR: https://github.com/csy5271abcd/learnershigh-extension/pull/18
  - 수연님 PR #17 위에 쌓은 PR이다.
- 작업 폴더(worktree): `D:\univ\capstone\lhx-perf-assess`
- 마지막 푸시: `e161f15` refactor(assessment): remove external HTTP analyzer (Railway) connection

학교 이름을 넣으면 학교알리미에서 평가계획서를 받아 오고, 백엔드 안(`LocalPlanAnalyzer`)에서 표를 읽어 다음 값을 검토 후보로 저장한다.

- 과목
- 지필·수행 비율
- 수행평가 항목·비율
- 채점기준
- 시험 회차
- 월별 진도표

외부 분석기(Railway)는 쓰지 않는다. 관리자가 원문과 대조해 확정해야 학생에게 보인다.

## 커밋 흐름

| 커밋 | 내용 |
|---|---|
| `ad87bd8` | 정기시험 회차(`writtenEvaluation.exams`), 월별 진도표(`teachingPlan`) 읽기 |
| `4817c7e` · `e99a1b3` | 진도표의 ○ 표시 칸 제거, 좁은 검토 화면에서 채점기준을 요소별 블록으로 표시 |
| `3300690` | 스캔본 OCR(`ScanOcr`), 여러 학년이 한 파일인 문서를 학년별로 등록 |
| `4fefa90` | 검토 표 통합(DB 9개 → 7개, 마이그레이션 `V202611180100`), 학교알리미 불러오기를 비동기로 바꿈(202 + jobId, 진행바) |
| `9f63196` | 분석 결과 캐시(최근 8개), 과목 학년, 일괄 확인 버튼, OCR 메모리 절감 |
| `0544de5` | 검토 화면에서 다른 학년 과목 접기 |
| `e161f15` | 외부 분석기 연결 제거. 지운 것과 바꾼 것은 아래와 같다. |

`e161f15`에서 정리한 것:

- 지운 코드: `HttpPlanAnalyzerClient`, `AnalyzerTokenSource`
- 지운 설정: yml의 `base-url`·`token`
- 지운 시험: Railway E2E
- 시험 대체: 분석 결과 저장 규칙 시험 3개는 테스트용 `StubPlanAnalyzer`(같은 Envelope 모양)를 `@Primary` Bean으로 넣어 돌린다.

검증: 백엔드 단위 시험은 모두 통과했다. 통합 시험은 이번에 손댄 3개 클래스만 돌렸고 모두 통과했다.

| 시험 클래스 | 결과 |
|---|---|
| `PlanServerAnalysisApiTest` | 11/11 통과 |
| `PlanAnalysisContract03ClientApiTest` | 5/5 통과 |
| `TeachingPlanReviewApiTest` | 14/14 통과 |

## 커밋하지 않은 작업 (진행 중)

`RatioRules.java`와 `SubjectRules.java`가 수정된 채 커밋되지 않았다. 원문 대조에서 나온 틀린 유형을 고치는 중이며, 아직 회귀가 있어 그대로 커밋하면 안 된다.

### 넣은 규칙

**`RatioRules`**

- `PLACEHOLDER`에 번호만 있는 칸(①, 1), (가))을 추가해, 항목 이름으로 쓰지 않는다.
- `mergeUnderParent()`를 추가했다. 위쪽 '영역·과제' 행의 병합 칸이 이웃한 항목 열들을 덮으면 그 열들을 한 항목으로 합친다.
  - 합칠 때 비율·만점은 더하고, 시기는 첫 값을 쓴다.
  - 부모 칸이 라벨(`labelOf != null`)이거나 지필·수행 낱말이면 합치지 않는다.

**`SubjectRules`**

- 머리 표 `과목명 | 과목명 | 생명과학Ⅱ`처럼 라벨 칸이 복제된 경우, 오른쪽으로 건너뛰어 값을 찾는다. 예전에는 아래 칸 '대상'을 과목명으로 잡았다.
- '관찰', '대상', '발표' 같은 평가 방법 낱말은 과목명에서 뺀다(`bad()`).
- 사전에 있는 과목 뒤에 3~9가 붙으면(`기하3`) 숫자를 뗀다. 숫자는 학점이다. `공통국어2`의 1·2는 과목명의 일부라 건드리지 않는다.

### 표본 20곳에서 확인한 결과

전후 비교 파일은 `docs/design/perf-assess-accuracy/extract-before-wip.txt`와 `extract-after-wip.txt`에 있다.

| 구분 | 학교 · 과목 | 바뀐 내용 |
|---|---|---|
| 좋아짐 | 오산 | '대상' → 생명과학Ⅱ |
| 좋아짐 | 마장 | '관찰' → 미술과매체 |
| 좋아짐 | 관악 | '기하3' → 기하 |
| 좋아짐 | 상원 | ①② → 실제 항목 이름 |
| 좋아짐 | 소래 통합사회2 | 하위 칸 두 줄 → 한 항목 25% |
| 좋아짐 | 청명 통합사회·통합과학, 토평 과학탐구실험 | 유형 칸별 두 줄 → 한 줄 |
| 회귀 | 토평 한국사2·통합사회2 | 같은 칸이 복제된 열을 더해 비율이 두 배(20 → 40, 30 → 60) |
| 회귀 | 토평 체육2 | 서로 다른 과제(서브·리시브)가 상위 칸 '미니배구'로 합쳐짐 |
| 회귀 | 경복 공통영어2, 고촌 정보 | 부모 칸이 유형 낱말이라 잘못 합침('서・논술형', '실습형') |

토평 회귀의 원인은 `mergeUnderParent` 호출 위치다. 바로 아래 '병합 칸 복제 제거(uniq)' 블록보다 먼저 돌아서 중복 열을 더한다.

경복·고촌 회귀의 원인은 부모 칸 거르기다. '・'(U+30FB)가 `NOT_ITEM` 패턴의 가운뎃점 목록에 없다.

### 다음에 할 일 (이 순서로)

1. `RatioRules.famCol`에서 `items = mergeUnderParent(...)` 호출을 uniq 블록 뒤로 옮긴다.
2. `mergeUnderParent` 안에서, 묶인 자식 중 이름·비율·만점·시기가 모두 같은 것은 먼저 하나로 줄인다. 더하지 않는다.
3. 부모 칸이 유형 낱말로만 이뤄져 있으면 합치지 않는다. 예: 서·논술형, 실습형, 활동형.
4. 자식 이름이 모두 비었거나, 부모와 같거나, 유형 낱말이면 한 항목으로 합친다(비율 합). 자식이 서로 다른 실제 과제 이름이면 합치지 않고 이름을 `부모 › 자식`으로 바꾼다. 예: 미니배구 › 서브.
5. 4에서 이름이 바뀌면 `PlanExtractor`가 이름으로 채점기준표를 붙이는 부분이 그대로 붙는지 확인한다. 토평 체육2는 예전에 서브·리시브에 채점기준이 붙어 있었다.
6. 표본 재실행으로 전후를 비교하고, 113곳 코퍼스(`ExtractCorpusTest`)로 전체 수치를 다시 잰다. 회귀가 없으면 커밋한다. 수치는 과목 5,084 · 통과 4,122 · 항목 13,275 · 채점기준 7,519 · 배점합 일치 7,200이다.

## 정확도 측정

측정 방법:

1. 113곳에서 무작위로 20곳을 뽑았다(seed 20261119).
2. HWP 5곳은 원문을 따로 열어 볼 도구가 없어 뺐다.
3. 남은 15곳에서 '자동 검사 통과' 과목을 학교당 최대 2개씩, 모두 23개를 뽑았다(seed 11).
4. 뽑은 과목을 pymupdf(HWPX는 XML)로 꺼낸 원문 표와 대조했다.

'자동 검사 통과'는 지필+수행 = 100, 항목 비율 합 = 수행 비율 같은 합 검사에 걸리지 않은 과목이다. 113곳 전체의 81%(4,122/5,084)가 여기 들고, 나머지 19%는 검토 화면에서 '확인 필요'로 뜬다. 이번 표본은 그 19%를 빼고 뽑았다.

판정 표는 `docs/design/perf-assess-accuracy/judged.md`에 있다. 스크립트는 같은 폴더의 `acc_pick.py`, `pick2.py`, `gt.py`다.

| 필드 | 맞음 (수정 전 코드) |
|---|---|
| 지필·수행 비율 | 21/23 |
| 항목 비율 | 21/23 |
| 과목 이름 | 19/23 |
| 항목 이름 | 18/23 |
| 항목 나눔 | 17/23 |
| 다섯 필드 전부 | 13/23 |

틀린 10과목은 이렇게 나뉜다.

- 원문에 있는 값을 잘못 읽은 경우 8개: 과목명, 항목 이름 대신 번호, 한 항목이 두 줄로 나뉨.
- 아예 못 읽은 경우 2개: 관악고의 비율표 없는 서식.

남은 한계:

- 표본 23개는 작다. 비율 하나에 ±10%p쯤 흔들린다.
- '확인 필요' 과목과 HWP는 이 측정에 들어가지 않았다.
- 시험 회차, 진도표, 채점기준 값 자체는 대조하지 않았다.

다음 측정은 표본을 늘리고(예: 40곳 · 과목 60개 이상), '확인 필요' 과목도 따로 뽑는 것이 맞다.

## 하지 않기로 한 것

스캔본에서 표 좌우 바깥 테두리를 채우는 보완을 시도했다. 한 쪽에서는 첫·끝 열이 살아났지만, 두 스캔 학교(명신여고·인명여고) 전체에서는 과목 수가 6 → 4, 6 → 5로 줄었다. 그래서 되돌렸다. 스캔본은 113곳 중 이 2곳뿐이다.

## 실행 방법

백엔드 단위 시험:

```bash
cd backend && ./gradlew.bat test
```

통합 시험(Docker 필요):

```bash
cd backend && ./gradlew.bat integrationTest --tests '*PlanServerAnalysisApiTest'
```

로컬 원문 폴더로 추출 결과 보기(결과는 그 폴더의 `_java_extract.txt`):

```bash
cd backend && EXTRACT_SAMPLE_DIR=<원문 폴더> ./gradlew.bat test --tests '*ExtractSampleTest' --rerun
```

표 덩어리만 보기(결과는 `_java_tables.txt`):

```bash
cd backend && EXTRACT_SAMPLE_DIR=<원문 폴더> EXTRACT_FULL_PAGE=<쪽> ./gradlew.bat test --tests '*PdfTablesSampleTest' --rerun
```

스캔본까지 읽으려면 위 두 명령에 `EXTRACT_OCR=windows`를 붙인다.

## 설정·보안

- `assessment.analyzer.mode`는 `local`(기본) 또는 `none`이다. 그 밖의 값이면 기동하지 않는다.
- `assessment.analyzer.ocr`은 `auto`가 기본이다. Linux 서버에서 스캔본을 읽으려면 tesseract(kor)를 설치한다.
- 학교알리미(NEIS) 키는 환경 변수 `NEIS_API_KEY`로만 넣는다. 저장소에 넣지 않는다.
- 예전 Railway 분석기 토큰이 Git 이력에 남아 있다. Railway 서비스를 계속 쓴다면 그쪽 `CURRICULUM_ANALYSIS_TOKEN`을 바꿔 무효화해야 한다. 수연님 쪽 결정이다.

## 공유 자료

- 성과 문서(링크 공유됨): https://claude.ai/artifact/PjEx1K15gijxcTL4zfoTNW
  - 정확도 칸은 위 '수정 전 코드' 수치다. 규칙 수정을 커밋한 뒤 다시 재서 고쳐야 한다.
- 백엔드 연동 보고서: `docs/design/perf-assess-backend-integration-report-2026-11-18.html`
- 화면 캡처: `docs/design/perf-assess-screens/`
