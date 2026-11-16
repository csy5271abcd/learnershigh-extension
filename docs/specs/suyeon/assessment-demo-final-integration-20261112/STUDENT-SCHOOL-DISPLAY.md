# Student 학교 정보 표시

| 위치 | 표시 | 원천 |
|---|---|---|
| 왼쪽 위 학기 선택 | "충무고등학교 · 2026학년도 2학년 1학기" | §9-1 `school.name`, `grade`, 선택 학기 |
| 학교 수행평가 헤더 | "학교 수행평가 2026학년도 3학년 1학기 · 4개" | 같은 Context |
| 왼쪽 과목 목록 | 그 학기 수강 과목(학생마다 다름) | §9-1 `subjects` |
| 수행평가 추가 모달 | 학년·학기 공통 후보(학교 무관) + 수강 과목만 선택 | §9-1 `catalogSubjects`(DRAFT) |
| 학업 정보 | 학교·학년·학기 | §9-1 |

검증: 15개교 대표 학생 15/15(`STUDENT-UI-VERIFICATION.md`), 60명 API 재조회 불일치 0(`SCHOOL-MAPPING-VERIFICATION.md`). 캡처: `student-stu_demo_001-unjeong-list.png`, `student-stu_demo_018-sehwa-list.png`, `student-stu_demo_059-jeju-list.png`.

학교별 과목 Dropdown은 만들지 않았다(모달 후보는 학년·학기 공통 카탈로그 그대로).
