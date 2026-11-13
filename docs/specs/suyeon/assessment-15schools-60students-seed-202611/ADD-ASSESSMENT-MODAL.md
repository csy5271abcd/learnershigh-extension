# 수행평가 추가 모달 — 학년·학기 과목 카탈로그

> `frontend/student/src/features/assessment/components/AddSchoolAssessmentModal.tsx` · 계약 §9-1 `catalogSubjects` (DRAFT, 승인 대기)

## 1. 동작

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 과목 후보 | 학생 Context의 `subjects`(Mock 4과목) | 같은 학년도·학년·학기 **공통 카탈로그**(10~41과목) |
| 선택 가능 | `subjects` 전부 | **수강 과목(`enrolled=true`)만** 라디오로 선택 |
| 미수강 후보 | 없음 | "수강하지 않는 이 학기 공통 과목 K개 보기"로 펼침. 교과군별 비활성 목록(라디오 아님, 스크린리더에 "선택 불가" 안내) |
| 안내 | 없음 | "N학년 M학기 공통 과목 X개 중 내 수강 과목 Y개를 고를 수 있어요." (과목 Fieldset `aria-describedby` 연결) |
| 학교별 분기 | — | **없음.** 학교 Dropdown·학교별 배열·학교별 조회 분기 없음 |
| 등록 검증 | 서버: 수강 과목만 | 그대로. 미수강 ID로 요청 시 `400 subjectId: unknown` → 기존 문구 "선택한 학기에 없는 과목이에요" |

## 2. 학년·학기 변경

- **학기**: 좌측 학기 선택(`TermSelector`)으로 바꾸면 Layout이 그 학기 Context(§9-1)를 다시 쓰고, 모달은 새 Context의 후보·수강 과목으로 열린다. 이전 선택은 새 학기 수강 과목에 없으면 비워진다(`initialSubjectId` 유효성 검사, 기존 로직).
- **학년**: 학생의 학년은 학생 Context가 정한다. 모달에서 학년을 바꾸지 않는다(학생 학년 임의 수정 금지). 다른 학년 시연은 그 학년의 시연 학생 Context(다른 개발 서버)로 한다.
- 등록 시 서버가 그 학기 Context로 다시 검증한다.

## 3. 검증 (실행함)

| 확인 | 방법 | 결과 |
|---|---|---|
| 6개 학년·학기 후보 = 카탈로그, 학교가 달라도 같음 | `verify-seed.mjs` 카탈로그 영역(학년마다 다른 학교·지점 학생 2명 × 2학기) | PASS (`DATA-VALIDATION.md`) |
| `enrolled` = 수강 과목 | 같은 스크립트 | PASS |
| 미수강 후보 등록 거절 | `POST` 시도 → 400 `subjectId` | PASS |
| 라디오 수 = 2학기 수강 과목, 안내 문구, 미수강 비활성 수, 학교 선택 UI 없음 | `ui-verify-e2e.mjs` 학생 6명(1·2·3학년, 일반·자사) | PASS |
| 2학기 → 1학기 전환 시 후보·수강 과목 갱신 | 같은 스크립트(학기 선택 메뉴 → 1학기 → 모달) | 6명 PASS |
| 모달 등록 → 목록 → 새로고침 유지 → 상세 | `stu_demo_001`(1학년) | PASS (1건 등록: `[DEMO-15S-2026][UI] 모달 등록 확인 stu_demo_001`) |
| 타입 검사·Lint | `npm run typecheck --workspaces`, `oxlint` | PASS |

캡처: `screenshots/student/*-02-modal-catalog.png`, `*-02b-modal-semester1.png`, `stu_demo_001-03-modal-created-detail.png`.

## 4. 남은 점

- 카탈로그는 15개교 문서에서 모은 **참고 후보**다. 학교 실제 개설 여부를 뜻하지 않으므로 안내 문구에 "공통 과목"으로만 표현했다.
- 학생이 직접 과목을 추가하는 기능(P-26)은 http에서 여전히 "연결 전"이다(이번 범위 밖).
