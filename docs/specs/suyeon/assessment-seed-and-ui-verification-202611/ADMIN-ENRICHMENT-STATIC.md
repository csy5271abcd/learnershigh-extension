# 관리자 심화 탐구 → 정적 콘텐츠 전환

기준: `features/assessment-enrichment-content.md` §2(AD-06·09·10 = 읽기 전용 열람)·§4(Admin 화면)·§6(단일 원본). 명세가 이미 정한 동작을 구현한 것이며 새 계약·Endpoint·DB는 없다.

## 1. 기존 오류 원인

`frontend/admin/src/features/assessment/api/assessmentAdminApi.ts`가 `listCatalog`·`getCatalogTask`·`listMockExamMaterials`·`getMockExamMaterial`·`listUniversityResources`·`getUniversityResource`를 **Mock 함수 그대로** 내보냈다. Mock 런타임(`adminMockRuntime.ts:48`)은 http 모드에서 `503 ASSESSMENT_API_NOT_CONNECTED`로 거절하므로, http 시연(5174)의 심화 탐구 콘텐츠 3탭은 항상 오류 화면이었다. 네트워크 요청 없이 실패해 브라우저 Network 탭에도 보이지 않았다.

## 2. 이전 호출 구조 → 바뀐 구조

| | 이전 | 지금 |
|---|---|---|
| 데이터 | Admin Mock Store(`assessmentAdminMock.ts`, 편집·공개 상태 포함) | Student 정적 원천 `student/.../content/enrichmentContent.ts` |
| 경로 | 화면 → `assessmentAdminApi.ts` → Mock(503 in http) | 화면 → `api/canonicalSource.ts`(Admin의 유일한 Student import 입구) → `enrichmentContent.ts` 동기 함수 |
| Backend | 없음(Mock) | 없음 — `dataSource`(mock\|http)와 무관 |
| Loading/Error | `RemoteView` | 없음(동기 조회). 없는 ID는 "찾을 수 없음" |

`canonicalSource.ts`에 추가한 export: `catalogSubjectLabels`, `listCatalogContent`, `getCatalogContent`, `listMockExamContent`, `getMockExamContent`, `mockExamPassageCount`, `listUniversityExamContent`, `getUniversityExamContent`, `EnrichmentContentItem` 타입, `mockExamSourceLabel`. Student 파일의 Export는 바꾸지 않았다(Admin Vite 모듈 그래프 위험 없음, `ADMIN-5174-RECOVERY.md` 사례).

## 3. 화면

`routes/StaticContentRoutes.tsx`(신규) + `ContentRoute.tsx`·`paths.ts`·`AssessmentAdminRoute.tsx` 수정. Admin Sidebar·상단 탭·`assessmentAdmin.module.css` 클래스(표·카드 Grid·Split·PdfViewer)를 그대로 썼다.

| 탭 | 주소 | 목록 | 필터·검색 | 상세 |
|---|---|---|---|---|
| 탐구 라이브러리 | `/assessment/content/tasks` | 표 8건 | 교과 Chip(콘텐츠의 교과 이름), 검색(주제·목표·방법) | `/content/tasks/:id` 목표·방법·출처 |
| 모의고사 지문 | `/content/mock-exams` | 카드 60(영어 30·국어 30) | 과목 Chip, 학년도, 학년, 검색 | 시험·문항·원본 쪽, **원문 지문(로컬 파일 있을 때) / "원문 미포함" 안내**, LH 탐구 제안(원문과 구분) |
| 대학별 자료 | `/content/universities` | 표 27(서울대·KAIST) | 대학 Chip, 학년도, 분야, 유형, 검색 | PDF Viewer(Admin 개발 서버 `/__dev/university-exams`) + 문항 목차·자료 정보 |
| 참고자료원 (신규 탭) | `/content/sources` | 표 24 | 과목 영역 Chip, 유형, 검색 | 실제 대표 URL 링크 |

필터·검색은 URL Query에 둔다(새로고침·뒤로 가기 유지).

## 4. 제거한 기능 (화면·Navigation에서만, 데이터·코드 삭제 없음)

새 Task·Task 수정·공개/비공개 전환·학생용 공개·새 탐구 소재 등록·지문 편집·관리자 원문 입력·Task 연결·대학 자료 정보 수정·자료 등록·"새 PDF AI 문항 분석" 진입.
이전 주소 `/content/tasks/new`, `/content/mock-exams/new`, `/content/mock-exams/:id/edit`, `/content/universities/ai-analysis`는 "심화 탐구 콘텐츠는 읽기 전용이에요" 안내와 목록·상세로 가는 버튼을 보여준다(Admin Router에 replace 이동 API가 없고 공용 `app/adminLocation.ts`를 바꾸지 않기 위해 자동 이동 대신 안내). `/content/tasks/:id`는 같은 ID의 정적 상세로 열린다.
이전 편집 코드(`CatalogTaskRoutes.tsx`·`MockExamRoutes.tsx`·`UniversityRoutes.tsx`·`ai/UniversityExamAiRoute.tsx`, Mock CRUD)는 명세 §10 사용처 정리 전이라 **삭제하지 않았다**(Route에서만 뺌).

## 5. 관리자 참고자료실 유지

`/assessment/references`(AD-07·08)는 손대지 않았다. "추천 사이트"(정적 카탈로그)·"내 스크랩"(실제 Resource API·MySQL)·링크 직접 저장·공개/비공개·휴지통이 그대로다. 정적 심화 콘텐츠를 DB에 자동 복제하는 동작은 없다.

## 6. 검증 (`scripts/admin-enrichment-static-e2e.mjs`, 1920×1080 Chrome)

| 조건 | 결과 |
|---|---|
| Backend **꺼짐** (Student 5173·Admin 5174만 실행) | **38/38** |
| Backend **켜짐** (시연 18080 + Seed 데이터) | **36/36** |

주요 확인:
- 같은 원천: 두 개발 서버에서 콘텐츠 모듈을 각각 import → 라이브러리 8·모의고사 60·대학 27·자료원 24의 **ID·제목·과목·SHA·URL 배열이 완전히 같음**
- 화면 개수: 라이브러리 표 8, 모의고사 카드 60·영어 30·국어 30, 대학 표 27, 자료원 24 + 링크 = 카탈로그 URL
- 검색·필터 결과와 URL 반영, 상세, 없는 ID → "찾을 수 없음"(다른 콘텐츠를 보여주지 않음)
- 대학 PDF: 개발 경로 200, Viewer canvas 실제 렌더링(944×1334)
- Task 생성·공개 버튼 0, 이전 주소 → 안내 화면
- 심화 탐구 화면에서 `/api` 심화 관련 요청 **0건**
- Backend 꺼짐: 심화 탐구는 정상, 학생 목록·Student 수행평가는 **연결 오류 표시**(Mock 대체 없음), 참고자료실 "내 스크랩" 오류 표시
- Backend 켜짐: 참고자료실 "내 스크랩"에 실제 DB 자료 A·B
- Admin Shell·학생 케어 메뉴 렌더링, 페이지 예외 0

**확인하지 못한 것:** "원문 미포함" 안내 화면. 이 PC에는 Git 제외 로컬 원문 파일이 60개 모두 있어 그 분기가 나오지 않는다(`mockExamPassageCount()` = 60). 분기 코드는 Student와 같은 조건(`research.passage` 비어 있음)이다.
