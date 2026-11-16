# 현재 구현 현황 (2026-11-12 기준)

> 근거: 코드(저장소 `C:\learnershigh-extension`, 분석기 `CA/`), 최신 보고서 `docs/specs/suyeon/assessment-phase-b-and-ux-completion-202611/`(11-12 05:37), `assessment-db-integration-202611/`(11-11 15:20), `assessment-demo-final-check-202611/`, 분석기 `runs/v22-*`.
> 주의: `assessment-full-integration-202611/FEATURE-MATRIX.md`(11-11 13:28)의 "연결 전" 항목 상당수는 그 뒤 `assessment-db-integration-202611`에서 구현됐다. 이 표는 **최신 보고서와 코드** 기준이다.
> 상태: **완료(실행 확인)** / **완료(개발 전용)** / **일부 구현** / **설계만** / **미구현** / **비활성**

## 1. AI 분석기

| 기능 | 상태 | 근거 |
|---|---|---|
| PDF 분석 | 완료(실행 확인) — 텍스트 PDF만, 괘선 의존 | 실문서 4·합성 1. 실문서 4개 모두 `PARTIAL` |
| HWP 분석 | 완료(실행 확인) | 실문서 5·합성 1 |
| HWPX 분석 | 완료(실행 확인) | 실문서 1(평가 없음)·합성 1 |
| DOCX·스캔 PDF | 미구현 | `UNSUPPORTED_FORMAT`, OCR 없음 |
| 평가정보 추출(목록·비율·만점·시기·지필/수행) | 일부 구현 — 실문서 84구간 중 49구간 목록 생성 | `VERIFIED-EXPERIMENT-RESULTS.md` §5 |
| 채점기준 추출 | 일부 구현 — 요소별 수준·개수 구간·특수 구간. 감점형·괘선 없는 채점표 취약 | v20·v21.1 |
| 수행평가 상세(활동·제출물·조건) | 일부 구현 — HWP 23/23, PDF 32/77 | 같음 |
| 운영계획(교수학습 운영표) | 표 분류만, 구조화·전송 안 함 | `DOCUMENT-MODEL-AND-EXTRACTION.md` |
| 원문 근거 검증 | 완료 — Locator 존재·인용 일치·범위 | `analysis_result.validate` |
| Backend Import 변환 | 완료 — PDF 공식, HWP·HWPX 실험 | Adapter 0.2 / 0.1-draft |
| 로컬 HTTP 서비스 | 완료(개발 전용) | 615/615, 시연 8765 |
| LLM 결합 | 미구현(현재 경로). 과거 합성 실험만 | `AI-TECH-STACK.md` §3 |
| 사람 검토 정답셋(Golden) | 설계만 — 스키마·검토 도구·워크북은 있음, 판정 0건 | `CA/golden/SCHEMA-golden-0.2.md`, `review_workbench.py` |
| v21.2-quality 개선 | 완료(개발 프로필) — 기본 미반영 | v21.2 REPORT |

## 2. Backend·DB

| 기능 | 상태 | 근거 |
|---|---|---|
| 평가계획서 등록·Revision | 완료(실행 확인) — 원본 미저장(SHA·크기만) | `EvaluationPlanService` |
| 분석 결과 수신(analysis-imports) | 완료(개발 전용, Flag 기본 off, 계약 PROPOSED) | `AdminPlanAnalysisImportController` |
| PDF 관리자 검토·확정 | 완료(실행 확인, Mock 인증) — 중복 fieldPath·비정규 색인 거절(Phase B) | Phase B REPORT §2 |
| HWPX 공식 검토 | 완료(개발 전용) — 브라우저 E2E 44/44 | 같음 |
| HWP 공식 검토 | 완료(개발 전용) — 통합 테스트만, 브라우저 E2E 없음 | 같음 |
| HWP·HWPX 운영 확정 | 미구현(차단) — 실제 인증 필요(`verified_auth_required`) | `application.yml` |
| 학생 수행평가 CRUD·상태·삭제 | 완료(실행 확인) | §12 |
| 노트·Revision·결과물·Version·다운로드·미리보기·비교 | 완료(실행 확인). 비교는 메타데이터만(내용 Diff 없음) | db-integration, Phase B |
| 피드백 요청·Snapshot·답변·전달 | 완료(실행 확인) | 19/19 |
| 성장 기록·자료함·중요 표시 | 완료(실행 확인) | 11/11 |
| 휴지통(soft delete)·복원 | 완료(실행 확인). 보존 기간·영구 삭제 미정 | Phase B |
| 관리자 학생 화면 보기(읽기 전용) | 완료(실행 확인) | 같음 |
| 관리자 참고자료실·공개 | 완료(실행 확인) | 같음 |
| 실제 학생·관리자 인증 | 미구현 — Mock Header | `MockHeaderAssessmentActorProvider` |
| 학업 Context 실제 연동 | 미구현 — Mock Provider | `MockAcademicContextProvider` |
| 운영 File Storage | 미구현 — 개발용 로컬 | `LocalFileArtifactStorage` |
| Backend Claude 분석 | 비활성(구현은 있음, 미호출) | `AssessmentAiConfig` |
| 비동기 분석·상태 관리·재시도 | 미구현 — 분석 실행 상태 Enum도 REVIEW_REQUIRED/FAILED뿐 | `PlanAnalysisStatus` 주석 |

## 3. Frontend

| 기능 | 상태 |
|---|---|
| Student http 연결(수행평가·노트·결과물·피드백·성장·자료·보관함·휴지통) | 완료(실행 확인) |
| Student 분석 미리보기 결과 페이지 | 완료(개발 Flag 전용, 저장 안 함) |
| Student 공식 평가정보 | 확정 상태·itemKey 참조만(값 표시 없음) |
| Student 심화 탐구(정적) | 완료 |
| Student 학업 정보 수정·과목 추가 | 미구현(API 없음) |
| Admin 등록 → 분석 → 수신 → 검토 | 완료(개발 Flag 전용) |
| Admin PDF 검토·확정, HWPX 원문 대조 검토 | 완료(개발) |
| Admin "원본 PDF 보기" | 비활성(원본 Storage 결정 전) |
| Admin 학생 기록·피드백·참고자료실·학생 화면 보기 | 완료(실행 확인) |
| Admin 전체 현황 KPI http | 미구현 |
| Frontend 단위 테스트 | 미구성 |

## 4. 교차 데이터·운영

| 항목 | 상태 |
|---|---|
| Student/Admin 같은 DB 교차 확인 | 완료(19/19, 11/11, 44/44) |
| 시연 환경 | Backend 18080 · Student 5173 · Admin 5174 · 분석기 8765, 시연 Schema(`lh_demo_*`) |
| 기본 개발 DB Migration 이력 불일치(`202610150300`) | 원인 미확인(수정 금지로 남김) |
| PR 단계 공동 Review(Migration 3개, `docs/api/`) | 미완료 — 사용자 전달 승인만 있음 |
