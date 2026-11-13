# Admin 5174 화면 검증

`scripts/seed-ui-verification-e2e.mjs`(실데이터)와 `scripts/admin-enrichment-static-e2e.mjs`(심화 탐구) — Chrome 1920×1080, `http://localhost:5174`(http, `adm_demo_gangnam`, 개발용 Mock 인증 Header).

## 실데이터 화면 (Student·Admin 합계 38/38)

| 화면 | 확인 | 결과 |
|---|---|---|
| 학생 목록 | 김서준(stu_001) | PASS |
| 학생 상세 | 수행평가 4건 같은 제목, 성장 기록 같은 제목 | PASS |
| 기록 열람 A (`/students/stu_001/school/{A}`) | 학생 화면 iframe에 노트 v2·결과물 2개, "읽기 전용 · 학생 원본은 수정할 수 없어요" / 새로고침 유지 | PASS |
| 기록 열람 쓰기 컨트롤 | 활성 쓰기 컨트롤 0 (진행 상태·평가 정보 수정은 disabled, 노트 제목은 readOnly) | PASS (아래 보강 후) |
| 피드백 관리 목록·상세 | 요청 A, 전달한 최종 의견, 요청 당시 노트 v2 | PASS |
| 학생 화면 보기 (`/students/stu_001/view?path=…A`) | 같은 A 상세, 활성 쓰기 컨트롤 0 | PASS |
| 관리자 참고자료실 "내 스크랩" | 자료 A(공개)·B(비공개) / 새로고침 후 유지 | PASS |
| 학교별 평가계획서 | 화면 열림(오류 아님). 이 Schema의 `school_001` 평가계획서는 0건(기존 상태, 변경 없음) | PASS |

API 수준(Seed 10단계): 학생 화면 보기 경로로 4건 같은 ID, 다른 지점 `adm_bundang` → **404**, 학생 화면 보기 경로 POST → **405**, 관리자 미리보기 바이트 = 학생 업로드 v2.

### 검증 중 보강한 1건

학생 화면 보기의 "안내문·첨부"에 있는 **숨은 파일 입력칸**(`aria-hidden`, `tabIndex=-1`)이 읽기 전용에서도 `disabled`가 아니었다. 여는 버튼은 이미 비활성이고 서버에 저장하지 않는 브라우저 임시 기능이라 실제 쓰기 경로는 없었지만, 입력칸에도 `disabled={readOnly}`를 추가했다(`student/.../components/detail/NoticeAttachments.tsx`, 1줄, Export 변경 없음).

## 심화 탐구 콘텐츠

Backend 꺼짐 38/38 · 켜짐 36/36 — `ADMIN-ENRICHMENT-STATIC.md` §6.

## 기존 시연 점검

`assessment-phase-b-and-ux-completion-202611/scripts/demo-readonly-smoke.mjs`: **13/13** (Student 7·Admin 6, API 4xx/5xx 0, 쓰기 0).

캡처: `SCREENSHOTS.md` a01~a08, static-*.
