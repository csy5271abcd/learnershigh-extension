# Student 시연 학생 Context 전환 검증

## 구현 (개발 서버 전용)

| 요소 | 내용 |
|---|---|
| 패널 | 화면 왼쪽 아래 "개발용 · 시연 학생: 시연학생006 · 문현고등학교 2학년" 버튼 → 지점 → 학교 → 학년 → 학생 → "이 학생으로 보기". "실행 설정으로 되돌리기" 제공. Esc로 닫기, 첫 입력에 Focus |
| 시연 링크 | `/assessment?devStudent=stu_demo_006` |
| 명단 | `frontend/student/src/features/assessment/dev/demoContextRoster.json`(합성 60명 + 기존 Mock 13명, ID·표시 이름·지점·학교·학년만) — `build-demo-roster.mjs`가 생성 |
| 전환 | 선택을 저장소에 쓰고 `/assessment`를 새로 불러온다 → 이전 학생의 메모리 캐시·화면 상태가 남지 않음 |
| 보안 | 고른 ID는 기존 Mock Header로만 쓴다. 서버가 학생 본인 자료만 준다(다른 학생 수행평가 ID 조회 404). 관리자 "학생 화면 보기"(읽기 전용 iframe)에서는 패널을 숨긴다 |
| 운영 | `import.meta.env.DEV`에서만 동적 import → Production 번들에 패널·명단·`devStudent`·Header 이름 0건(빌드 검사) |
| 표기 | "개발용"·"실제 로그인 아님" 문구. 로그인·로그아웃 기능이 아니다(API-OD-A01) |

## 검증 (실제 5173)

| 확인 | 결과 |
|---|---|
| 15개교 대표 학생(A·B·C, 1·2·3학년)으로 전환 → 학교명·학년 표시, 예시고등학교 없음 | 15/15 |
| 전환 후 그 학생의 수행평가 제목(정리된 제목)·건수 | 15/15 |
| 전환 패널에 현재 학생 표시 | 15/15 |
| §9-1 API 학교·학년 = 명단 | 15/15 |
| 학생 전체 수행평가 마감일 > 기준일 | 15/15 |
| 학기 전환(2학기 → 1학기) 시 모달 후보·수강 과목 갱신 | 이전 작업에서 6명 검증(`assessment-15schools-60students-seed-202611/STUDENT-UI-VERIFICATION.md`) |

상세: `STUDENT-UI-VERIFICATION.md`, 학교 표시: `STUDENT-SCHOOL-DISPLAY.md`.
