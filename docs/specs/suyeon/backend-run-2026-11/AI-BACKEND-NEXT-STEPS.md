# AI × Backend 다음 단계 (2026-11-09 기준)

## 1. 11월 12일 오전까지 (신규 기능 추가 없음)

1. 계정 B가 v21 모듈을 바꾸면 `generator/run_v21.py`로 합성 PDF를 다시 분석한다. 결과가 바뀌면 Fixture를 교체하고 `AnalyzerV21SyntheticImportApiTest`를 다시 돌린다(JSON 손수정 금지).
2. 마감 직전 `scripts/verify-backend.ps1` 1회 재실행(셸 작업 폴더가 `backend/build` 밖인지 먼저 확인).
3. 승인 요청 정리: `AI-BACKEND-CONTRACT-GAPS.md` §5의 6개 항목.

## 2. 남은 연동 작업

| 작업 | 조건 |
|---|---|
| 실제 학교 PDF 1건 수준 3 연동 | 담당자 승인, 로컬 전용 Schema, 결과를 보고서·Git에 원문으로 남기지 않기 |
| `itemKey` 존재 확인(G-7 안 A) | 승인 후 Assessment Service만 수정 |
| presence(C1)·과목 구간 key(C2)·특수 규정(C3) | `api-contract.md` 결정 → DTO·Validator·(필요 시) Migration |
| HWP·HWPX(C8) | 등록 API 형식 정책 결정 |
| 원문 대조 | File Storage 결정 후 서버가 `extractedText`를 실제 쪽 글과 대조 |
| 수신 경로 운영 방식 | Endpoint를 켤지, 배치·CLI로 바꿀지 결정 |

## 3. Frontend HTTP 연결에 필요한 정보

| 항목 | 값 |
|---|---|
| 개발 서버 | `http://localhost:18080` (`bootRun --args='--server.port=18080'`, `DB_URL`·`DB_USERNAME`·`DB_PASSWORD` 필요) |
| 개발 인증 Header | 학생 `X-Assessment-Student-Id: stu_001`, 관리자 `X-Assessment-Admin-Id: adm_plan_operator` / `adm_gangnam` / `adm_bundang`. 없으면 401 |
| 관리자 분석 화면 | `GET /api/admin/assessment/evaluation-plans/{planId}/revisions/{revisionId}/analysis` → `subjects`(AI 후보), `confirmedFields`(사람 확정), `reviewStatus`, `warnings`, `analyzer`, `review` |
| 빈 값 표시 | `null`·`[]`은 "원문에 없음"이 아니라 "못 읽었을 수도 있음"이다(G-4). 문서 상태 `PARTIAL` 같은 정보는 아직 Backend에 오지 않으므로 화면은 "확인 필요"로 표시 |
| 학생 화면 | 평가계획서 목록·상세는 메타데이터와 `reviewStatus`만 온다. AI 후보는 오지 않는다 |
| 학생 항목 참조 | `reviewStatus=CONFIRMED`인 Revision만 가능. 아니면 400 `not_confirmed` |
| 권한 없는 문서 | 문서 경로는 404, 학교 단위 목록·등록은 403 |
| 수신 Endpoint | Frontend에서 쓰지 않는다(기본 off, 분석기 전용) |

## 4. 11월 12일 이후

- 동시성 테스트(같은 Revision 동시 수신·동시 검토, 개정 등록 경쟁)
- 413·422 업로드 통합 테스트
- 실제 인증·학업 Context·운영 권한 Adapter 교체(OD-A08, OD-A04, API-OD-A01)
- Frontend Adapter 교체 후 Playwright Cross-Surface E2E(등록 → 분석 수신 → 검토 → 학생 참조)
- 로컬 공용 DB의 구형 mentor Migration 이력 정리(팀 결정)
