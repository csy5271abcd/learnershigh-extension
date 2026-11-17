# 평가계획서 자동 수집·과목 목록 추출 (조사용 스크립트)

학교알리미 공시 "교과별(학년별) 교수·학습 및 평가계획" 파일을 받아, AI·OCR 없이 규칙으로 과목 목록과 수행평가 표를 뽑는 조사용 스크립트다. 서비스 코드가 아니라 정확도 측정과 재현을 위한 것이다. 결과와 과정은 `docs/design/perf-assess-plan-extraction-report-2026-11-17.html`에 정리했다.

## 흐름

```bash
# 1) 수도권 일반고·자율고 목록 (학교알리미 지도 API + NEIS schoolInfo 유형 확인, 키 없음)
python list_new.py OUT/schools.json 20 DL_DIR_TO_EXCLUDE...

# 2) 공시 파일 받기 (id:<학교알리미 ID> 또는 학교명). 일시 오류는 최대 4번 재시도
python fetch_plan.py OUT/dl id:<uuid> ...

# 3) HWP·HWPX·PDF 표 추출 → JSONL
python dump_tables.py OUT/tables.jsonl OUT/dl

# 4) 정답 대비 과목 목록 누락·끼어든 줄 측정 (subjlist2 = 규칙 r3)
python fnfp3.py ground_truth/acc2b_subjects.json GATES.json OUT/tables.jsonl DICTIONARY_TABLES.jsonl[,...]
```

`GATES.json`은 `gates.py`(평가표 게이트) 결과다. `fnfp3.py`는 기본값(`USE_UNITS=0`)에서 게이트 결과를 쓰지 않지만 인자는 받는다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `fetch_plan.py` | 학교알리미 검색·다운로드·ZIP 해제, 재시도 |
| `list_new.py` | 수도권 일반고·자율고 표본 고르기 |
| `tables.py`, `dump_tables.py` | HWP 레코드 / HWPX XML / PDF(pymupdf) 표를 칸 단위로 추출 |
| `gates.py`, `code_map_base.json` | 평가표 게이트(열·행·머리+항목·항목·요약), 성취기준 코드→과목 대응표 |
| `subjlist2.py` | 과목 목록 먼저 뽑기 (머리 표 과목 칸, 요약 표, 제목 줄, 파일명) — 현재 규칙 r3 |
| `subjlist.py`, `presence.py`, `pool.py`, `toc.py` | 정답 만들기 보조 (후보 묶음, 목차 출력) |
| `fnfp3.py` | 정답 대비 누락(FN)·끼어든 줄(FP)·중복·이름 오류 집계 |
| `ground_truth/*.json` | 원문으로 확인한 과목 정답 (학교 → 학년 → 과목) |
| `results/r3_all_schools.txt` | 규칙 r3로 정답 학교 76곳을 돌린 결과 |

## 정답 세트

| 파일 | 용도 |
| --- | --- |
| `gt_subjects.json`, `gt2_subjects.json`, `acc1*`, `acc2_subjects.json` | 규칙을 고칠 때 본 학교 (조정용) |
| `acc1c_subjects.json`, `acc2b_subjects.json` | 규칙 r3 고정 후 처음 본 20곳 (판정용) |

정답은 머리 표 과목 칸·제목 줄·목차·과목별 파일명을 원문으로 대조해 만들었다. 이 근거가 모두 놓친 과목은 정답에도 없을 수 있다. 측정 후 정정한 항목은 각 파일의 `_note`에 적었다.

## 한계

- 표본: 수도권 일반고·자율고, 2026학년도 2학기.
- 측정 대상은 과목 목록이다. 과목별 비율 값·평가기준 정확도는 이 표본으로 다시 재지 않았다.
- 스캔본(글자 없음)은 추출 불가로 표시한다.
- 다운로드한 원본 파일과 표 JSONL은 용량 때문에 커밋하지 않았다.
