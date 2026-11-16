# 다음 단계 (2026-11-12 이후)

## 1. 승인 대기 (Shared·계약)

| 항목 | 내용 |
|---|---|
| Student 개발 Proxy | `PROXY-AND-CONTRACT.md` §1 방법 A Diff 적용 여부 |
| 관리자 슬롯 과목 목록 | 과목 목록에서 고르는 매핑 UI의 전제(F-1) |
| `checksum` 응답 필드 | 형식(hex)·노출 범위(F-2) |
| 검토 과목 슬롯 검증 | 계약 문구 반영(F-3) |
| §12 상세 `description` | 수정 화면에서 기존 설명 표시(F-4) |
| 학생에게 보일 Revision 규칙 | 개정본이 생겼을 때 확정된 이전 Revision을 보일지(F-5) |
| 재검토 정책 | 이전 확정 대체 여부("대체됨" 상태) — 결정 전까지 화면 추가 확정 차단 유지 |
| 분석 수신 Endpoint 등록 | C-10 |

## 2. 운영 전 필수 보완

1. 실제 기존 LearnersHigh 인증 연결: Backend `AssessmentActorProvider`, Frontend `devAuthHeaders()` 교체. Mock Header 경로 제거 확인
2. 학업 Context·학교·학생 원천 연결(OD-A04, API-OD-A01): `AcademicContextProvider.find`/`findSlot` 실제 구현, `source` 값 정리
3. 평가계획서 운영 권한(OD-A08) 실제 규칙
4. File Storage 결정(API-OD-A03): 원본 보관 시 서버 원문 보기·`extractedText` 대조로 원본 대조 단계 대체 검토
5. 동시성: 같은 Revision 동시 확정·동시 수신, 업로드 경쟁 테스트
6. 공용 E2E 등록: `scripts/final-browser-e2e.mjs` 흐름을 `e2e/tests/`로(Shared 승인)

## 3. 이후 기능 개발

| 영역 | 내용 |
|---|---|
| 검토 고도화 | 목록 값(제출물·조건·채점 기준) 확정 규칙, 값 단위 presence(C1), 특수 규정(C3) |
| 노트·NoteRevision | Backend·DB·API (API-OD-A04) |
| Artifact·ArtifactVersion | Backend·File Storage |
| FeedbackRequest·Snapshot | Backend (API-OD-A06) |
| HWP·HWPX | 등록 API 형식 정책 + Locator 계약(C8) |
| 학생 평가계획서 상세 화면 | Spec 확인 후 |
| 실제 학교 PDF 수준 3 | 승인 후 로컬 전용 |
