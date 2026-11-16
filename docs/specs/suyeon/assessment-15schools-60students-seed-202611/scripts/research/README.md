# 평가계획서 조사 스크립트 (읽기 전용)

순서대로 실행한다. 원본(`references/curriculum-plan`)은 읽기만 한다. 추출 텍스트(교사명 등이 들어 있을 수 있음)는 **저장소 밖** 작업 폴더에만 둔다.

```powershell
# 작업 폴더(저장소 밖)에 복사한 뒤 그 폴더에서 실행 (text15/ 가 그 아래 생긴다)
python -I extract15.py                 # 15개교 2026 파일 → text15/*.txt + index.jsonl (학교별 순차, 재실행 시 이어서)
python -I analyze15.py                 # 학교·학년·학기별 과목 출현 → analysis15.json
python -I refs15.py <문서폴더>\ASSESSMENT-REFERENCE-SOURCES.json   # 수행평가 유형 키워드 근거 쪽
node ..\build-grade-semester-subject-catalog.mjs --analysis <작업폴더>\analysis15.json
node ..\build-docs.mjs --index <작업폴더>\text15\index.jsonl
```

- HWP 파서는 기존 분석기 `curriculum-analysis/tools/docmodel/hwp5.py`를 읽기 전용으로 import한다(`extract15.py`의 `TOOLS` 경로).
- PDF 추출은 Git for Windows의 `pdftotext`를 쓴다.
