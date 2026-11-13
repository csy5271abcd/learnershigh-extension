# 데이터 정합성 검증

> `scripts/verify-seed.mjs` 실행 2026-11-12T03:12:53.990Z · API `http://localhost:8080` · **833/833 PASS**. 원자료: `DATA-VALIDATION.json`.
> 데이터를 만들지 않는다. 거절을 기대하는 쓰기 2종(다른 지점 피드백 초안 저장, 미수강 과목 등록)만 시도했고 모두 거절됐다.

| 영역 | 통과/전체 |
|---|---|
| 관리자 범위 | 10/10 |
| 기존 관리자 보존 | 3/3 |
| 지점 간 차단 | 84/84 |
| 학생 간 차단 | 1/1 |
| 카탈로그 | 31/31 |
| 정합성 | 697/697 |
| 기존 데이터 보존 | 7/7 |

## 확인 내용

- **관리자 범위**: 관리자 4명 × 2학기 목록 = 담당 지점 20명과 정확히 일치. A01·A02 목록·활동 집계 동일. `adm_demo_all` 같은 전 지점 계정은 401. 기존 `adm_demo_gangnam`·`adm_gangnam`·`adm_bundang` 목록에 시연 학생 없음.
- **지점 간 차단**: 관리자마다 다른 지점 학생 2명 + 기존 강남 학생(stu_001)에 대해 학생 상세·학기 수행평가·수행평가 단건·성장 기록·학생 화면 보기(학업 Context·노트)·피드백 상세를 조회 → 모두 404. 다른 지점 피드백 초안 저장 → 404(저장 안 됨). 피드백 목록은 담당 지점 학생만.
- **학생 간 차단**: 학생이 다른 학생 수행평가 ID로 조회 → 404.
- **카탈로그**: 학년별로 서로 다른 학교·지점 학생 2명의 `catalogSubjects`가 같은 학년·학기에서 완전히 같다(학교별 필터 없음). `enrolled=true` = 학생 수강 과목. 미수강 후보로 등록 → 400 `subjectId`.
- **정합성**: 60명 관리자 상세의 학교·학년·반·번호 = 명단. 모든 수행평가 과목 = 그 학기 수강 과목, 학기당 2~4건. 결과물 버전 수 = Manifest. 피드백 Snapshot = 요청 당시 노트 최신 Revision. 미전달 요청의 관리자 초안은 학생 응답에 없음(`reply=null`). 성장 기록 = 노트의 수행평가에 연결.
- **기존 데이터 보존**: 이전 시연 Seed(`stu_001`)의 수행평가 4건·피드백·성장 기록 존재, `stu_001` 수강 과목 `subj_01~04` 그대로.

## 수량

| 항목 | 값 |
|---|---|
| 학교별 학생 | 운정고등학교 4, 문현고등학교 4, 호서고등학교 4, 인천하늘고등학교 4, 세화고등학교 4, 대신고등학교 4, 한림고등학교 4, 진양고등학교 4, 삼각산고등학교 4, 가좌고등학교 4, 충무고등학교 4, 광명고등학교 4, 세종고등학교 4, 한솔고등학교 4, 제주고등학교 4 |
| 학년별 학생 | 1학년 20, 2학년 20, 3학년 20 |
| 학생·학기 수강 과목 수 | 최소 7 · 최대 9 · 평균 7.57 |
| 지점 간 접근 시도 | 80건 (모두 404) |

## 지점 간 접근 시도 상세

| 관리자 | 대상 학생 | 경로 | HTTP |
|---|---|---|---|
| adm_demo_a01 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021` | 404 |
| adm_demo_a01 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/school-assessments` | 404 |
| adm_demo_a01 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/school-assessments/assessment_4f463095-9a36-4fd7-b8c8-d8ad1f343dc7` | 404 |
| adm_demo_a01 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/growth-records` | 404 |
| adm_demo_a01 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/student-view/academic-context` | 404 |
| adm_demo_a01 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/student-view/notes` | 404 |
| adm_demo_a01 | stu_demo_021 | `/api/admin/assessment/feedback-requests/feedback_34cc45de-0726-48b7-9c96-54b8d9de0219` | 404 |
| adm_demo_a01 | stu_demo_021 | `PUT reply-draft` | 404 |
| adm_demo_a01 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023` | 404 |
| adm_demo_a01 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/school-assessments` | 404 |
| adm_demo_a01 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/school-assessments/assessment_6aa172c1-6def-4b8e-a161-1ce9e661b647` | 404 |
| adm_demo_a01 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/growth-records` | 404 |
| adm_demo_a01 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/student-view/academic-context` | 404 |
| adm_demo_a01 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/student-view/notes` | 404 |
| adm_demo_a01 | stu_001 | `/api/admin/assessment/students/stu_001` | 404 |
| adm_demo_a01 | stu_001 | `/api/admin/assessment/students/stu_001/school-assessments` | 404 |
| adm_demo_a01 | stu_001 | `/api/admin/assessment/students/stu_001/school-assessments/assessment_3f17c8d2-a9ba-4fad-8d8f-12958eb3dfff` | 404 |
| adm_demo_a01 | stu_001 | `/api/admin/assessment/students/stu_001/growth-records` | 404 |
| adm_demo_a01 | stu_001 | `/api/admin/assessment/students/stu_001/student-view/academic-context` | 404 |
| adm_demo_a01 | stu_001 | `/api/admin/assessment/students/stu_001/student-view/notes` | 404 |
| adm_demo_a02 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021` | 404 |
| adm_demo_a02 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/school-assessments` | 404 |
| adm_demo_a02 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/school-assessments/assessment_4f463095-9a36-4fd7-b8c8-d8ad1f343dc7` | 404 |
| adm_demo_a02 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/growth-records` | 404 |
| adm_demo_a02 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/student-view/academic-context` | 404 |
| adm_demo_a02 | stu_demo_021 | `/api/admin/assessment/students/stu_demo_021/student-view/notes` | 404 |
| adm_demo_a02 | stu_demo_021 | `/api/admin/assessment/feedback-requests/feedback_34cc45de-0726-48b7-9c96-54b8d9de0219` | 404 |
| adm_demo_a02 | stu_demo_021 | `PUT reply-draft` | 404 |
| adm_demo_a02 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023` | 404 |
| adm_demo_a02 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/school-assessments` | 404 |
| adm_demo_a02 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/school-assessments/assessment_6aa172c1-6def-4b8e-a161-1ce9e661b647` | 404 |
| adm_demo_a02 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/growth-records` | 404 |
| adm_demo_a02 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/student-view/academic-context` | 404 |
| adm_demo_a02 | stu_demo_023 | `/api/admin/assessment/students/stu_demo_023/student-view/notes` | 404 |
| adm_demo_a02 | stu_001 | `/api/admin/assessment/students/stu_001` | 404 |
| adm_demo_a02 | stu_001 | `/api/admin/assessment/students/stu_001/school-assessments` | 404 |
| adm_demo_a02 | stu_001 | `/api/admin/assessment/students/stu_001/school-assessments/assessment_3f17c8d2-a9ba-4fad-8d8f-12958eb3dfff` | 404 |
| adm_demo_a02 | stu_001 | `/api/admin/assessment/students/stu_001/growth-records` | 404 |
| adm_demo_a02 | stu_001 | `/api/admin/assessment/students/stu_001/student-view/academic-context` | 404 |
| adm_demo_a02 | stu_001 | `/api/admin/assessment/students/stu_001/student-view/notes` | 404 |
| adm_demo_b01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001` | 404 |
| adm_demo_b01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/school-assessments` | 404 |
| adm_demo_b01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/school-assessments/assessment_a053131c-6b44-4847-81b8-5d747a99d845` | 404 |
| adm_demo_b01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/growth-records` | 404 |
| adm_demo_b01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/student-view/academic-context` | 404 |
| adm_demo_b01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/student-view/notes` | 404 |
| adm_demo_b01 | stu_demo_001 | `/api/admin/assessment/feedback-requests/feedback_f719d295-53b6-414b-aebe-405fad47c975` | 404 |
| adm_demo_b01 | stu_demo_001 | `PUT reply-draft` | 404 |
| adm_demo_b01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003` | 404 |
| adm_demo_b01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/school-assessments` | 404 |
| adm_demo_b01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/school-assessments/assessment_d499b44b-90b8-40dc-8a48-8683241ef3e6` | 404 |
| adm_demo_b01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/growth-records` | 404 |
| adm_demo_b01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/student-view/academic-context` | 404 |
| adm_demo_b01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/student-view/notes` | 404 |
| adm_demo_b01 | stu_001 | `/api/admin/assessment/students/stu_001` | 404 |
| adm_demo_b01 | stu_001 | `/api/admin/assessment/students/stu_001/school-assessments` | 404 |
| adm_demo_b01 | stu_001 | `/api/admin/assessment/students/stu_001/school-assessments/assessment_3f17c8d2-a9ba-4fad-8d8f-12958eb3dfff` | 404 |
| adm_demo_b01 | stu_001 | `/api/admin/assessment/students/stu_001/growth-records` | 404 |
| adm_demo_b01 | stu_001 | `/api/admin/assessment/students/stu_001/student-view/academic-context` | 404 |
| adm_demo_b01 | stu_001 | `/api/admin/assessment/students/stu_001/student-view/notes` | 404 |
| adm_demo_c01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001` | 404 |
| adm_demo_c01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/school-assessments` | 404 |
| adm_demo_c01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/school-assessments/assessment_a053131c-6b44-4847-81b8-5d747a99d845` | 404 |
| adm_demo_c01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/growth-records` | 404 |
| adm_demo_c01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/student-view/academic-context` | 404 |
| adm_demo_c01 | stu_demo_001 | `/api/admin/assessment/students/stu_demo_001/student-view/notes` | 404 |
| adm_demo_c01 | stu_demo_001 | `/api/admin/assessment/feedback-requests/feedback_f719d295-53b6-414b-aebe-405fad47c975` | 404 |
| adm_demo_c01 | stu_demo_001 | `PUT reply-draft` | 404 |
| adm_demo_c01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003` | 404 |
| adm_demo_c01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/school-assessments` | 404 |
| adm_demo_c01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/school-assessments/assessment_d499b44b-90b8-40dc-8a48-8683241ef3e6` | 404 |
| adm_demo_c01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/growth-records` | 404 |
| adm_demo_c01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/student-view/academic-context` | 404 |
| adm_demo_c01 | stu_demo_003 | `/api/admin/assessment/students/stu_demo_003/student-view/notes` | 404 |
| adm_demo_c01 | stu_001 | `/api/admin/assessment/students/stu_001` | 404 |
| adm_demo_c01 | stu_001 | `/api/admin/assessment/students/stu_001/school-assessments` | 404 |
| adm_demo_c01 | stu_001 | `/api/admin/assessment/students/stu_001/school-assessments/assessment_3f17c8d2-a9ba-4fad-8d8f-12958eb3dfff` | 404 |
| adm_demo_c01 | stu_001 | `/api/admin/assessment/students/stu_001/growth-records` | 404 |
| adm_demo_c01 | stu_001 | `/api/admin/assessment/students/stu_001/student-view/academic-context` | 404 |
| adm_demo_c01 | stu_001 | `/api/admin/assessment/students/stu_001/student-view/notes` | 404 |
