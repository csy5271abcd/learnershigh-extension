# 결과물 PDF·PNG 품질 점검과 개선

## 기존 결과물 (Seed)

| 항목 | 상태 |
|---|---|
| PDF | 1~3KB, 1쪽, **영문** Helvetica(한글 미포함), 막대 2개 — 열림·SHA 일치는 정상이지만 시연에는 빈약 |
| PNG | 480×300 막대 그래프, 라벨 없음(합성) |
| 다운로드 SHA-256 | 일치(이전 Seed 검사 67건) |

## 개선 (새 버전 추가, 기존 버전 보존)

스크립트 `scripts/improve-artifacts.mjs` — 실제 Chrome으로 한글 HTML을 PDF(A4)·PNG로 만들어 **각 결과물에 새 버전**으로 올렸다(`expectedLatestVersionId`로 순서 보장, 덮어쓰기 없음). 모든 파일에 "합성 시연 결과물 · 실측값 아님"을 적었다.

| 학생 | 학교·학년 | 결과물 | 새 버전 | 크기 | 다운로드 SHA |
|---|---|---|---|---:|---|
| stu_demo_001 | 운정고 1 | 한국사2 탐구 보고서(한글).pdf | v3 | 54KB | 일치 |
| stu_demo_004 | 운정고 1 | 통합사회2 탐구 보고서(한글).pdf | v2 | 54KB | 일치 |
| stu_demo_021 | 대신고 1 | 통합사회2 탐구 보고서(한글).pdf | v3 | 54KB | 일치 |
| stu_demo_022 | 대신고 2 | 영어Ⅱ 탐구 보고서(한글).pdf | v2 | 52KB | 일치 |
| stu_demo_041 | 충무고 1 | 통합과학2 탐구 보고서(한글).pdf / 결과 그래프(한글).png | v3 / v2 | 53KB / 9KB | 일치 |
| stu_demo_044 | 충무고 2 | 화학 반응의 세계 탐구 보고서(한글).pdf / 결과 그래프(한글).png | v2 / v2 | 55KB / 10KB | 일치 |

PDF 내용: 제목·학교·학년·학기·과목, 1 탐구 주제와 동기, 2 탐구 과정(단계·활동·산출 표), 3 결과, 4 어려웠던 점과 개선 방향, 5 배운 점, 합성 안내.

## 화면 확인 (실제 5173)

- PDF v3: 브라우저 PDF 뷰어에 한글·표 정상(`screenshots/student-artifact-pdf-korean.png`), 버전 목록 v1·v2·v3, 비교 대상 선택 가능.
- PNG v2: 이미지 뷰어 정상(`screenshots/student-artifact-png-korean.png`).
- 피드백 Snapshot은 요청 당시 버전 그대로(예: stu_demo_001 요청 기록 "결과물 v2" — `screenshots/student-feedback-delivered.png`).
- 60명 데이터 검증에서 Seed 버전 67개 전부 보존 + 추가 8개 = 75개(`DATA-VALIDATION` 재실행).

나머지 30명의 결과물은 개선하지 않았다(선별 개선 요청 범위).
