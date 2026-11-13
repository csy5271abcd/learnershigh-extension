# 발견한 문제와 처리

| # | 문제 | 원인 | 처리 |
|---|---|---|---|
| I-1 | Admin 심화 탐구 3탭이 http 모드에서 항상 오류 | 콘텐츠 함수가 Mock 그대로 → `503 ASSESSMENT_API_NOT_CONNECTED` | **해결**: Student 정적 원천으로 전환(`ADMIN-ENRICHMENT-STATIC.md`) |
| I-2 | `/content/universities/ai-analysis`·`/content/sources`가 정적 화면으로 가지 않음(첫 E2E 실패) | `AssessmentAdminRoute.tsx`가 `university-ai`를 AI 화면으로 직접 분기, `sources` view 미등록 | **해결**: 두 view를 `ContentRoute`로 보냄 |
| I-3 | 학생 화면 보기의 숨은 안내문 파일 입력칸이 읽기 전용에서 disabled 아님 | 여는 버튼만 비활성 | **보강**: `disabled={readOnly}` 1줄. 실제 쓰기 경로는 원래 없었음(서버 저장 없는 브라우저 임시 기능, 버튼 비활성) |
| I-4 | 학업 Context에 영어·수학 과목 없음 | 개발용 학업 정보(stu_001 2026-1) 과목 4개 | C→통합사회1, D→과학탐구실험1 대체(제목 유지). 과목 ID 생성 안 함 |
| I-5 | Student 상단 기존 헤더 학생 이름 "최하은" vs Assessment 주체 김서준(stu_001) | 기존 LearnersHigh Shell 개발 표시 | 범위 밖(Assessment 아님) — 변경 안 함, 기록만 |
| I-6 | 중요 표시를 자료에 할 수 없음 | `PUT /archive/favorites`는 SCHOOL_ASSESSMENT만 | 수행평가 A·C로 대체. API 변경 안 함 |
| I-7 | Admin `FeedbackDetailRoute`(후속 추천)·`ReferenceLibraryRoute`(스크랩 Modal)가 아직 Mock `listCatalog`·`listMockExamMaterials`를 부름 | 이전 심화 Task 추천·연결 UI 잔존 | **남김**: http에서 조용히 빈 결과(네트워크 요청 없음, 화면 오류 없음). 명세 §10 정리 대상(P-32 `relatedCatalogTaskIds`, P-35 추천 링크 형식) — Open Decision이라 이번에 닫지 않음 |
| I-8 | "원문 미포함" 안내를 실제 화면으로 확인 못 함 | 이 PC에 원문 로컬 파일 60개 모두 있음 | 미확인으로 기록 |
| I-9 | MySQL 행 직접 대조 못 함 | DB 자격증명 탐색 거부(우회 안 함) | API 재조회로 확인, `scripts/verify-seed.sql` 사용자 실행 대기 |
| I-10 | 시험 스크립트 판정 오류 4건(학생 목록 응답 중첩 필드, iframe 안 본문, 조회용 버튼을 쓰기로 분류, 참고자료실 기본 탭) | 스크립트 | 스크립트만 수정(화면·Requirement 약화 없음) |
