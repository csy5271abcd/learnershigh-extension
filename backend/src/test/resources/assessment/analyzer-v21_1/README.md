# 분석기 v21.1 합성 PDF Fixture

**합성 자료.** 가상 학교(가상고)·가상 과목(가상과학탐구)·2099학년도. 실제 학교 문서 문장이 없다.

| 파일 | SHA-256 | 출처 |
|---|---|---|
| `synthetic-e2e.pdf` (30,783 byte, 2쪽) | `ab52297581ef154dbd0abe00a0cffcceec01513248bb60416fd2f5909173b404` | 계정 B `runs/v21-pdf-quality-backend-bridge-20261109/e2e/synthetic-e2e.pdf` 바이트 복사 |
| `analysis-import.json` | `585a69a9b0090fc503d5aa55ddb0062dfe39cb63ecdc36df544505dc3ad2cb11` | 같은 폴더 `analysis-import.json`(Adapter 0.2 출력) 바이트 복사 |

- 2026-11-09 복사. 두 파일 모두 수정하지 않았다. 테스트를 통과시키려고 손으로 고치지 않는다.
- 분석 경로(계정 B 기록): PdfLayout → DocumentModel → 조립 0.3 → task-detail 0.1 → Adapter 0.2, `analyzer.version = v21.1/backend-adapter-0.2`.
- 기존 v21 Fixture(`../analyzer-v21/`)는 그대로 둔다.
