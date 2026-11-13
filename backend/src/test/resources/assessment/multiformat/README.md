# 다중 형식(HWP·HWPX) 실험 Fixture

**모두 합성 자료다.** 실제 학교 문서가 아니다.

| 파일 | SHA-256 | 내용 |
|---|---|---|
| `synthetic-plan.hwpx` | `19cd28b637611e1e72f40ad823c2842122ddf9bcff77833100ddd712ec81beaf` | 계정 A 생성기 `docs/specs/suyeon/assessment-multiformat-202611/scripts/make_synthetic_hwpx.py`로 만든 HWPX(ZIP: `mimetype` + `Contents/section0.xml`). XML 규칙은 계정 B `tests/test_docmodel.py`의 `make_hwpx`를 따른다. 내용은 PDF 합성 Fixture와 같은 평가계획(과학, 지필 1 + 수행 2) |
| `synthetic-plan.hwpx.draft-import.json` | `4be010982591d99a614d113655786aeadf9f2cd91c209b0839e650bd778c64cf` | 위 HWPX를 계정 B v21.1 **실제 HWPX 파서·분석기**(무수정)로 분석한 뒤, **계정 A 임시 변환기**(`scripts/draft_hwpx_payload.py`)가 다중 형식 초안 Shape으로 만든 수신 JSON. **계정 B Adapter 출력이 아니다**(B Adapter는 HWPX를 `FORMAT_NOT_ACCEPTED`로 막음). 값은 B Adapter의 `shapePreview` 그대로이고, 근거는 B DocumentModel의 실제 locator 객체·원문이다 |

HWP 바이너리 Fixture는 없다. 테스트의 HWP 바이트(`DocumentFormatInspectorTest.hwpSignatureBytes`)는 **서명 검사용 합성 바이트**(OLE 서명 + 한글 FileHeader 서명·버전·속성)이며 실제 한글 문서가 아니고 분석기로 읽을 수 없다.

실행 시점 계정 B 모듈 SHA-256(2026-11-10): `hwpx_model.py` af3be551…, `build.py` dea297e9…, `analysis_result.py` 052a7adc…, `backend_adapter.py` b481754c…, `assessment_assembly03.py` 158ee3ce…, `task_detail.py` 3f728561….
