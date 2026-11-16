# 회귀·자동화 검증 결과 (실행한 것만)

## 이번 작업에서 실행

| 검증 | 대상 | 결과 |
|---|---|---|
| Student 실제 화면 (5173) | 15개교 대표 학생: 학교·제목·마감일·전환 패널·§9-1 | **76/76** (2회 실행, 마지막은 Header 함수 수정 뒤) |
| 노트 작성·수정 (5173 → 5174) | A·B·C지점 3건 | **18/18** |
| Admin 실제 화면 (5174) | 관리자 4명 목록·학교 필터·상세·범위 밖 안내 | **21/21** (2회) |
| Admin 평가계획서 검토 (5174) | 합성 PDF·HWP 분석 후보·근거·검토 상태·권한 | **12/12** |
| 결과물 뷰어 (5173) | 한글 PDF v3·PNG v2 | **2/2** |
| 60명 데이터 정합성 (`verify-seed.mjs`) | 관리자 범위·지점 간 차단 80건·카탈로그·정합성·기존 데이터 보존 | **833/833** |
| 학교 매핑 실시간 재조회 | 60명 §9-1(1·2학기)·관리자 목록 | 불일치 0, 예시고 0 |
| Seed 재실행(제주고) | 생성 0, 제목·마감일 유지 | 85/85, 23/23 |
| 마감일·제목 수정 재실행 | 멱등 | 변경 0 |
| Student Care 실행 API | 지점 목록·시연 지점 board | 강남 10·분당 3 그대로, `br_demo_a` 404 |
| Frontend typecheck(전체)·oxlint(Student·Admin) | | PASS |
| Frontend build Student·Admin | | PASS |
| Production 번들 개발 문자열 | 전환 패널·명단·`devStudent`·Mock Header 이름·`dev-analysis` | **0건** (수정 전 3파일 → 조기 반환 복원 후 0) |
| 분석기 실제 문서 | PDF 3·HWP 3·HWPX 2 + 오류 4 | 응답 확인, 정확도 표본 대조(`DOCUMENT-EXTRACTION-ACCURACY.md`) |

## 기존 기능

| 기능 | 근거 |
|---|---|
| 기존 학생 `stu_001`·예시고 Fixture | 보존(선택 목록에 기존 Mock으로 남음, `verify-seed` 보존 영역 PASS) |
| 기존 관리자 `adm_demo_gangnam`·`adm_gangnam`·`adm_bundang` | 범위 그대로, 시연 학생 미노출(PASS) |
| Seed 수행평가 360·노트 60·피드백 36·성장 기록 60 | 보존(`verify-seed`) |
| NoteRevision·ArtifactVersion·FeedbackSnapshot 불변 | 노트 v1 불변, Snapshot Revision 그대로, Seed 결과물 버전 67개 보존 |
| Student Care 코드·API·DB | 변경 없음(Backend 변경 자체가 없음) |

## 실행하지 않은 것

- Backend 단위·통합 테스트: 이번에 **Backend 코드 변경이 없어** 다시 실행하지 않았다(직전 작업: 단위 272/272, 통합 144/144).
- Student Care Playwright E2E(`e2e/`): e2e 전용 Backend Profile이 필요해 미실행.
- 관리자 참고자료실·정적 심화 탐구 브라우저 회귀(38·36항목): 이번 변경과 무관한 화면이라 다시 돌리지 않았다(직전 작업 PASS).
- 화면에서의 학생 분석 미리보기·Admin 자동 분석: 5173·5174 실행 설정(토큰·Proxy) 때문에 불가 — `SERVER-CONNECTION-VERIFICATION.md`.
