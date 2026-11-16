# Student 5173 화면 검증

`scripts/seed-ui-verification-e2e.mjs` — Chrome 1920×1080, `http://localhost:5173`(http, stu_001, 2026-1), Backend 18080. 검증 중 쓰기 요청 0, API 4xx/5xx 0, 페이지 예외 0. **Student·Admin 합계 38/38.**

| 화면 | 확인 | 결과 |
|---|---|---|
| Assessment 홈 | 진행 중 수행평가, 사이드 개수(학교 수행평가 4·자료함 2·과목별 1) | PASS |
| 학교 수행평가 목록 | A·B·C·D 제목, 진행 중·시작 전·완료 표기 / 새로고침 유지 | PASS |
| 상세 A | 제목·노트 v2 본문("개선 방향")·결과물 2개(PDF "피드백 대상 v2(최신)", PNG) / 새로고침 유지 | PASS |
| 노트 수정 이력 | v1·v2 두 Revision | PASS |
| 피드백 | 최종 답변 표시, 관리자 초안 문구 없음 / 새로고침 유지 | PASS |
| PDF 미리보기 v2 | blob = 1,083 B, `%PDF-` (업로드와 동일) | PASS |
| 버전 비교 v1↔v2 | 좌우 PDF 2개 + 파일 정보 | PASS |
| 이미지 미리보기 | PNG 실제 그려짐 960×600 | PASS |
| 성장 기록 목록·상세 | 동기·역할·과정·어려움·해결·배운 점·후속 활동, 연결 결과물, "관련 활동 보기" → 수행평가 A / 새로고침 유지 | PASS |
| 자료함 | 개인 자료 A·B + 선생님 공개 자료 A, 비공개 B 없음 | PASS |
| 보관함 중요 | A·C (B 없음) | PASS |
| 휴지통 | 복원된 자료 B 없음 | PASS |
| 과목별 추천 자료원·자료함 | 열림 | PASS |
| 심화 탐구·모의고사 지문·대학별 자료 | 정적 콘텐츠 열림(503 없음) | PASS |

이전 Student 심화 탐구 회귀 `assessment-ui-analysis-connection-202611/scripts/enrichment-static-e2e.mjs`(up): **36/36**.

캡처: `SCREENSHOTS.md` s01~s12.

관찰(코드 변경 없음): Student 상단 기존 LearnersHigh 헤더의 학생 이름은 "최하은"(기존 Shell의 개발용 표시)이고, Assessment 데이터 주체는 `stu_001`(관리자 화면 표기 김서준)이다. Assessment 범위 밖 기존 Shell이라 바꾸지 않았다 → `ISSUES.md` I-5.
