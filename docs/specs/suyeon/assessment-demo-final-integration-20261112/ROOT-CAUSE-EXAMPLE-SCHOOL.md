# '예시고등학교' 표시 원인과 해결

## 결론

**원인**: Student 5173이 `VITE_ASSESSMENT_DEV_STUDENT_ID=stu_001`로 실행되어 있다. `stu_001`은 기존 Mock 학생이고, 기존 학업 Context Mock이 모든 기존 학생을 `school_001 예시고등학교 1학년`으로 돌려준다(의도된 기존 Fixture, 보존 대상). 합성 학생을 고를 방법이 없어서 화면은 늘 이 학생을 보였다.

**원인이 아닌 것** (코드로 확인)

| 의심 | 확인 결과 |
|---|---|
| Admin `-PlanSchools school_001:예시고등학교` | Admin 평가계획서 **운영 학교 목록 표시용**(`assessmentAdminHttp.ts listSchoolsHttp`)만 쓴다. 학생 학교 Context와 무관 |
| Backend가 기본 학교명 반환 | 아니다. `stu_demo_*`는 명단의 실제 학교명을 돌려준다(§9-1 `school.name`, 60명 재조회 불일치 0 — `SCHOOL-MAPPING-VERIFICATION.md`) |
| Frontend 하드코딩 | 아니다. 학교명은 §9-1 응답 `school.name` → `TermSelector`·목록 헤더 |
| Student/Admin 원천 불일치 | 아니다. 둘 다 같은 Backend 학업 Context Provider(`MockAcademicContextProvider` → `DemoRoster`) |

## 해결 (서버 재시작 없음, Vite HMR)

1. **개발용 시연 Context 선택 패널**(Student·Admin 왼쪽 아래 "개발용" 버튼): 지점 → 학교 → 학년 → 학생 / 관리자 선택 → 저장소에 저장 후 시작 화면을 새로 불러온다(이전 학생 데이터 캐시 제거).
2. **시연 링크**: `http://localhost:5173/assessment?devStudent=stu_demo_006`, `http://localhost:5174/assessment/students?devAdmin=adm_demo_b01` — 값을 저장하고 주소에서 지운다.
3. 고른 ID는 기존 개발용 Mock Header로 보낸다. 서버가 그 ID의 권한(학생 본인 / 관리자 지점)을 그대로 검사한다. 실제 로그인 아님. Production 번들에는 패널·명단·Header 이름이 없다(빌드 검사 0건).

기존 `stu_001`·예시고등학교 Fixture는 바꾸지 않았다(선택 목록에 "예시고등학교(기존 Mock)"로 남음).

## 검증

- 실제 5173에서 15개교 대표 학생(1·2·3학년, A·B·C지점) 화면: 학교명 표시·예시고등학교 없음 15/15 (`STUDENT-UI-VERIFICATION.md`).
- 60명 전원 API 재조회: 학생 §9-1(1·2학기)·관리자 목록 학교명 = 명단, 예시고등학교 0명.
- 남은 표시: 화면 맨 위 기존 LearnersHigh 상단바의 이름("최하은")은 Assessment 밖 기존 Shell 고정값이라 학생을 바꿔도 그대로다(`ISSUES.md` B-2).
