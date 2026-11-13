# Student ↔ Admin 교차 확인

> 같은 MySQL·같은 ID를 Student와 Admin이 함께 보는지 확인했다. 근거: `DATA-VALIDATION.md`(API), `STUDENT-UI-VERIFICATION.md`·`ADMIN-UI-VERIFICATION.md`(화면).

| 흐름 | Student | Admin | 결과 |
|---|---|---|---|
| 학교·학년·반·번호 | §9-1 Context(학생 Header) | 학생 상세 `academicContexts` | 60명 모두 명단과 일치(API) · 화면 프로필 "N반 M번"(관리자 4명 화면) |
| 수강 과목 | 모달 라디오·사이드바 과목 | 학생 상세 과목 칩 | 같은 ID·이름(화면) |
| 수행평가 | 학기 목록·상세 | 학생 기록 학기 목록 | 같은 ID 360건, 학기 소속 일치(API) |
| 탐구 노트·Revision | 상세 "저장됨 · vN" | 학생 화면 보기(읽기 전용) 노트·이력 | Revision 수 일치(API) |
| 결과물·버전 | PDF·PNG 뷰어 | 학생 화면 보기 결과물 버전 | 버전 수 = Manifest, 다운로드 SHA-256 = 업로드(Seed 검사 67건) |
| 피드백 | 요청 → 전달 결과(전달 24건) / 미전달 12건은 `reply=null` | 요청 상세 Snapshot = 요청 당시 최신 Revision | 36건 일치. 관리자 초안 6건 학생 비노출 |
| 성장 기록 | 상세 | 학생 성장 기록 목록 | 같은 recordId 60건 |
| 관리자 A01·A02 | — | 같은 20명·같은 활동 집계 | 일치(API·화면) |
| 수행평가 상태 ↔ 피드백 | 전달 후에도 수행평가 상태 불변 | — | 전달이 상태를 바꾸지 않음(Seed 계획 상태 = 재조회 상태) |

학생 화면 보기는 관리자 전용 읽기 경로(`/api/admin/.../student-view/...`)로만 조회하며 학생 Header를 쓰지 않는다(가장 없음).
