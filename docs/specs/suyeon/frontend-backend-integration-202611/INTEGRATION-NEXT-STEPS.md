# 통합 다음 단계 (2026-11-10 기준)

## 1. 승인 대기 (Shared·운영)

| 대상 | 내용 |
|---|---|
| 실제 인증 | Mock Header Adapter → 기존 LearnersHigh 인증(API-OD-A01). Backend는 `AssessmentActorProvider` 구현체, Frontend는 `devAuthHeaders()`만 바꾸면 된다 |
| `api-contract.md` | C-1~C-11 + 이번 추가: C-2(현재 학기 기준), C-3(PATCH 편집 필드), §12 itemKey 사유 `unknown`·`not_allowed`, 분석 수신 Endpoint 등록, 문서 경로 404 정책 |
| 학교·학생 정보 원천 | Admin 담당 학교 목록·학생 목록/상세(§34) Shape (OD-A08, API-OD-A01) |
| 학업 Context 원천 | OD-A04. Backend Mock이 `source: EXISTING_LEARNERSHIGH`로 응답하는 문제 — 실제 원천 연결 전까지 값 표기 방법 결정 필요 |
| 검토 대체 규칙 | 같은 Revision 재검토 시 이전 검토를 대체하는지(domain "대체됨" 상태). 현재 itemKey는 "검토된 Run 중 하나" 기준 |
| 공용 E2E | `scripts/browser-e2e.mjs` 흐름을 `e2e/tests/`에 등록할지 |

## 2. Shared 변경안 (미적용)

`frontend/student/vite.config.ts`에 Admin과 같은 개발 Proxy 추가:

```ts
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:8080'
// server: { port: 5173, strictPort: true, proxy: { '/api': apiTarget } }
```

- 영향: Student 개발 서버만. Build 결과물 변화 없음. 2026-11-10 확인: Student 소스에서 `/api`를 부르는 곳은 Assessment `api/http/`뿐이다.
- 대안: 현재처럼 검증용 외부 설정(`scripts/vite.student-http.config.ts`)을 쓴다.

## 3. 아직 Mock / 미연결

- 인증(Mock Header), 학업 Context·학교·학생 정보(Mock), 평가계획서 운영 권한(`adm_plan_operator` → `school_001`만)
- Student: 학업 Context 변경, 과목 직접 추가, 개인 PDF·분석·개인 검토, 노트·결과물·피드백·심화·자료함·성장 기록·보관함
- Admin: Overview, 학생 목록·상세, 피드백, 심화 콘텐츠, 참고자료실, 서버 분석 실행, 검토 확정 화면
- Fixture 불일치: Frontend Fixture `stu_001` = 최하은, Backend Mock 학생 Client `stu_001` = 김서준. http 화면은 이름을 표시하지 않아 영향 없음. 원천 연결 시 정리 필요

## 4. 11월 12일 오전까지

1. 계정 B 산출물이 바뀌면 v21.1 Fixture 교체 + `AnalyzerV211ImportAndItemKeyApiTest` 재실행(JSON 손수정 금지)
2. 마감 직전 `scripts/verify-backend.ps1`, `scripts/verify-frontend.ps1` 재실행
3. 신규 기능 추가 없이 안정화

## 5. 11월 12일 이후

- Admin 검토 확정 화면: 분석 과목 → 학업 과목 ID 선택 UI, `fieldPath` 생성, 근거 쪽 입력 → PUT review 연결
- Student 수행평가 수정 UI(제목·설명·마감일) 연결
- Admin PDF 업로드·개정 브라우저 검증, 413·422 화면 오류
- 학생 평가계획서 상세 화면이 필요한지 Spec 확인
- `GET .../analysis`의 "가장 최근 Run" 동률 처리(같은 시각 수신 시 순서 기준) 정리
- 동시성(같은 Revision 동시 수신·검토) 테스트
- 실제 학교 PDF 수준 3 연동(승인 후)
