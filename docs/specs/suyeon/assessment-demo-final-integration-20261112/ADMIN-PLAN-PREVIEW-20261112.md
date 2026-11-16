# 지점 관리자 평가계획서 FORBIDDEN 해결 · 자동 분석 미리보기 (2026-11-12 저녁)

## 1. 원인 (코드·API 확인)
- **FORBIDDEN**: 시연 관리자 4명은 명단에서 만들어질 때 평가계획서 운영 학교가 빈 값이다(`MockHeaderAssessmentActorProvider.java:57`, `Set.of()`). `PlanAccess.requireSchool`은 OD-A08에 따라 운영 학교로 명시된 곳만 허용한다. 학생 기록 조회 권한(branchIds)과는 일부러 분리돼 있다. gangnam만 `school_001`(예시고)을 운영한다.
- **학교 목록이 비었던 이유**: Admin `listSchoolsHttp`는 개발 설정 `VITE_ASSESSMENT_DEV_PLAN_SCHOOLS`(예시고)의 학교만 대상으로, 학교마다 평가계획서 목록 API를 불렀다. 시연 관리자는 그 호출이 403이 되고, 하나라도 실패하면 목록 전체가 "볼 수 있는 권한이 없어요 (FORBIDDEN)"가 된다. 그러면 학교가 선택되지 않아 "담당 학생의 학교가 없어요"가 뜬다.
- 가설 1(gangnam만 허용) 맞음 · 2(별도 학교 목록만 참조) 맞음 · 4(Admin ID 전달)는 정상 · 8(캐시)은 해당 없음.

## 2. 수정 (Frontend만, Backend·권한 변경 없음)
| 파일 | 내용 |
|---|---|
| `frontend/admin/.../api/http/assessmentAdminHttp.ts` | 학교 목록 = 개발 서버에서 지점 권한으로 조회한 담당 학생의 학교(Mock과 같은 규칙) ∪ 설정 운영 학교. 403은 `planOperable=false`로 표시한다. 설정에만 있고 담당 학교도 아닌 곳은 운영 권한이 없으면 뺀다 |
| `frontend/admin/.../api/mock/assessmentAdminMock.ts` | 반환 타입만 맞춤 |
| `frontend/admin/.../routes/EvaluationPlansRoute.tsx` | 운영 권한 없는 학교는 403이 나는 목록·학년도 조회를 하지 않고 자동 분석 미리보기 패널을 연다. 운영 학교는 기존 화면 그대로 |
| `frontend/admin/.../routes/PlanAnalysisPreviewPanel.tsx` (신규) | 학년도·학년·학기·파일(PDF·HWP·HWPX) → 기존 `/dev-analysis` Proxy → 결과. "자동 분석 — 사용 가능 / 공식 확정 — 제한" 안내. 저장 없음 |
| `frontend/admin/.../components/canonicalUi.ts`, `api/canonicalSource.ts` | Student 결과 본문·`fileSha256` 재사용 export |
| `frontend/student/.../components/pdf-import/AnalysisPreviewResult.tsx` (신규) | Student 분석 결과 본문을 Router 없이 분리(내용 동일). Student 결과 Route는 이를 사용 |

분석 미리보기는 개발 서버 + 분석기 Flag에서만 열린다. 운영 Build에는 `dev-analysis` 문자열이 0건이다.

## 3. 검증 (실제 5174·8765·18080)
| 관리자 | 학교 표시 | PDF 분석 | HWP 분석 | 원문 근거 |
|---|---|---|---|---|
| adm_demo_a01 | 5개 | PASS | PASS | PASS |
| adm_demo_a02 | 5개 | PASS | PASS | PASS |
| adm_demo_b01 | 5개 | PASS | PASS | PASS |
| adm_demo_c01 | 5개 | PASS | PASS | PASS |

- `scripts/admin-plan-preview-e2e.mjs`: 49/49 PASS. 분석 API(`/dev-analysis/analyze-preview`) 8회 모두 200, pageErrors 0.
  - PDF(충무고 1학년 2학기): 체육2 30%·70%·9~10월·11월.
  - HWP(가좌고 수학): 공통수학1 20%·6월, 경제수학 40·16·30·14%.
- gangnam: 예시고 공식 화면(등록 버튼·학년 칸·등록 문서) 유지. API 200.
- 공식 권한 유지: a01·c01의 평가계획서 목록 403, c01의 충무고 공식 등록 시도 403 FORBIDDEN, a01→stu_demo_041 404.
- 회귀:
  - 학생 분석 10/10, 관리자 21/21, 대표 학생 17/17.
  - verify-seed 833/833(수행평가 360 + UI 생성 1).
  - Student Care 200.
  - Admin·Student tsc·oxlint·build 통과.
- 캡처: `screenshots/plan-preview/plan-preview-<관리자>-pdf|hwp.png`, `plan-gangnam-official.png`.

## 4. 남은 제약
- 지점 관리자의 공식 평가계획서 등록·검토·확정은 OD-A08 결정 전까지 불가하다(의도된 제한).
- 미리보기 결과는 저장되지 않는다. 학년도·학년·학기 선택은 표시용이고, 문서 내용과 자동으로 대조하지 않는다.
- 실제 학교 문서의 분석 정확도 한계(채점기준표 미추출 등)는 `DOCUMENT-EXTRACTION-ACCURACY.md`와 같다.
