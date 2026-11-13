# 다음 단계 (2026-11-12 이후)

## 1. 바로 이어서 할 일 (Assessment 소유, 승인 불필요)

1. Frontend Student Adapter를 Real HTTP로 교체(§12·13·§9-1·§10-1): `schoolAssessmentApi.ts` 등의 `httpNotConnected()` 경로. 개발용 Header 주입 방식은 Frontend와 합의가 필요하다.
2. Admin Frontend 평가계획서 화면을 §38·§39 실제 응답에 연결(API-STATUS §4의 C-7·C-8 차이 정리)
3. 보강 Test: 동시 개정 등록(409), 413·422 업로드 경로, 학생 평가계획서 상세, 권한 밖 확정 시도
4. PATCH 동시 수정에 `expectedVersion` / `updatedAt` 전제조건을 쓸지 계약과 맞추기(§52)

## 2. 미구현 기능

| 기능 | 막힌 이유 |
|---|---|
| §12 DELETE / 휴지통·복원 | OD-A11 / API-OD-A08 |
| §9-2 학업 Context 변경 | 학교·학적 Write Owner(API-OD-A01) |
| §34 관리자 학생 목록·상세 | 응답 Shape이 계약에 없음(Admin Frontend는 P-27 가정) |
| §33 Overview / §47 활동 집계 | P0 범위 밖. 실제 Entity에서 계산하는 방식으로 구현 예정 |
| §39 POST 서버 분석 실행 | 원본 PDF 보관(File Storage, API-OD-A03) |
| §10-2 학생 개인 PDF, §11 개인 분석·정정 | File Storage, OD-A13 |
| §30 중요 표시(즐겨찾기) | P0 범위 밖 |
| P1 Note / NoteRevision / Artifact / ArtifactVersion / FeedbackRequest·Snapshot | 미착수. Revision 전략(API-OD-A04), Storage(API-OD-A03), Snapshot 보존(API-OD-A06) 결정 필요 |

## 3. Shared 승인 대기

| 대상 | 제안 |
|---|---|
| `docs/api/api-contract.md` | API-STATUS §4의 C-1~C-11 반영. 특히 외부 분석 결과 수신 Endpoint 등록 여부, 평가계획서 Not Found code |
| 인증 | Mock Header Adapter를 실제 기존 LearnersHigh 인증으로 교체(API-OD-A01). `AssessmentActorProvider` 구현체만 바꾸면 된다 |
| 평가계획서 운영 권한 | OD-A08 확정. 현재는 Mock 운영자 1명(`adm_plan_operator` → `school_001`)만 |
| 학업 Context 원천 | OD-A04 확정 후 `AcademicContextProvider` 실제 구현 |
| 로컬 DB 이력 | 공용 로컬 Volume의 구형 mentor Migration 이력 정리(repair 또는 Volume 재생성) 여부 — 팀 결정 |
| `application.yml` | `assessment.analysis-import.enabled` 키 추가 사실 공유 |

## 4. AI 분석기 연동 잔여 작업

1. 계정 B 변환기 결과로 실제 PDF 1건 이상 End-to-end 수신 시험(인계서 §8)
2. 인계서 §9의 B-1~B-6 답변 반영(특히 `itemKey` 안정성, 값 단위 presence)
3. 원본 보관이 정해지면 서버가 `extractedText`를 실제 쪽 텍스트와 대조(§47-A `AiEvidenceVerifier` 재사용 검토)
4. 성취수준·교수학습계획 수신 범위 확대 여부 결정
5. 수신 Endpoint를 운영에서 켤지, 배치/CLI 방식으로 바꿀지 결정(현재 기본 off)
