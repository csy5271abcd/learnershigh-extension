# 분석기 v21 합성 PDF Fixture

**모두 합성 자료다.** 가상 학교(가상고등학교)·가상 과목 내용이며 실제 학교 평가계획서에서 온 글이 없다.

| 파일 | 내용 |
|---|---|
| `synthetic-plan.pdf` | 2쪽 합성 평가계획서. `generator/SynthPlanPdf.java`(PDFBox 3.0.5, 맑은 고딕)로 생성. SHA-256 `f5839c052602a228ed2074aa593f0e58a8ad30986c4fd81c18c4e45a37f9a274` |
| `synthetic-plan.backend-import.json` | 위 PDF를 계정 B 분석기 v21 실제 파이프라인(PdfLayout → DocumentModel → 평가 조립 → 상세 추출 → `backend_adapter`)에 넣어 나온 `payload`를 **수정 없이** 저장한 것 |
| `generator/SynthPlanPdf.java` | PDF 생성기 원본(컴파일 대상 아님). `javac -encoding UTF-8`로 컴파일해야 한글이 깨지지 않는다 |
| `generator/run_v21.py` | 계정 B 모듈을 수정 없이 import해 작업·출력 폴더만 바꿔 실행하는 래퍼(`python -I -B`) |
| `generator/e2e_http.py` | 실제 서버(18080)·로컬 Docker MySQL E2E Schema 대상 HTTP·DB 검증 스크립트 |

- 표 내용은 계정 B v21 단위 테스트의 합성 DocumentModel(`TEACHING`·`SUMMARY`·`DETAIL`·`AMBIG`)과 같다.
- 분석 실행: 2026-11-09 22:56, 계정 B 폴더는 수정하지 않고 작업·출력 폴더만 계정 A scratchpad로 바꿔 `analysis_result.analyze_file` → `backend_adapter.to_import_request`를 호출했다.
- 실행 시점 계정 B 모듈 SHA-256: `analysis_result.py` 47c0f88c…, `backend_adapter.py` be8135db…, `assessment_assembly03.py` 92d4a5c3…, `task_detail.py` b82cd99e…, `PdfLayout.class` 1c516c36… (전체 값: `docs/specs/suyeon/backend-run-2026-11/AI-BACKEND-E2E-RESULT.md`)
- 분석기를 다시 돌려 결과가 바뀌면 이 파일을 새 결과로 교체하고, 바뀐 이유를 위 문서에 남긴다. 테스트를 통과시키려고 JSON을 손으로 고치지 않는다.
