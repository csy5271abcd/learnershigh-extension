# [계정 A] A10 — HWP/HWPX 직접 미리보기, 다과목 확정값 연결, 학년도별 열람 실제 검증 (2026-11-15 작업, 보고서 기준일 2026-11-16)

> 시작 HEAD `94de0e6` → Commit은 §14. Push 없음 · 이력 재작성 없음 · 기존 Migration 수정 없음 · Student Care·AdminShell·계정 B 코드 변경 없음 · 0.3 Gate·다중 형식 실험 Flag·분석 수신 Flag 기본 OFF 유지.
> 표기: **[실제]** = 실제 B6 분석 서비스(`analysis-import-0.3`, `v21.4-dev`, 로컬·일회용 DB, 외부 전송 없음) · **[Stub]** = E2E 합성 응답 · **[코퍼스]** = 로컬 공개 평가계획서 원본 대조.

## 1. HWP 직접 미리보기 — **구현함**

## 2. HWPX 직접 미리보기 — **구현함**

방식 A(전용 렌더러)를 택했다. **PDF로 바꾸지 않고**, 서버가 원본 바이트를 직접 읽어 문단·표·병합 칸·캡션·글상자 글을 구조(JSON)로 돌려주고 화면이 그대로 그린다.

| 형식 | 판독 | 화면 |
|---|---|---|
| HWP 5.x | OLE(CFB) → `FileHeader`(압축·암호·배포용) → `BodyText/Section<n>` raw deflate → 레코드 나무(PARA_HEADER·PARA_TEXT·CTRL_HEADER·TABLE·LIST_HEADER) | 문단, 표(`rowSpan`·`colSpan`), 표 캡션, 칸 안 표(중첩), 글상자 글 |
| HWPX | ZIP → `Contents/section<n>.xml`(번호 순) → `hp:p`·`hp:run`·`hp:t`·`hp:tbl`·`hp:tc`(`cellAddr`·`cellSpan`·`subList`) | 같음 |

- 위치 체계: 분석 결과 `documentLocator`와 같은 `section`·`path` 규칙(`p<n>` · `.c<k>` · `.r<row>c<col>` · `.p<m>` · `.cap.p<m>` · `.x<m>`)으로 만든다 → 근거 위치를 **정확히 같은 칸·문단**에 표시할 수 있다(§8).
- 담지 않는 것: 쪽 나눔·글꼴·그림·도형·수식 배치(조판 결과가 아니라 문서 구조). 화면에 그렇게 안내한다.

## 3. 사용한 기술·라이선스

- **JDK 표준 기능만**(`java.util.zip.Inflater`·`ZipInputStream`, `javax.xml` DOM). 새 의존성·외부 프로그램·외부 서버·유료 SDK 없음 → 라이선스·배포 제약 없음, 문서가 서버 밖으로 나가지 않음.
- 위치 규칙은 계정 B DocumentModel(`tools/docmodel/hwp_model.py`·`hwpx_model.py`)의 **규칙을 읽고 같게 구현**했다(계정 B 코드 수정·복사 없음, 대조할 때만 읽기 전용 import).
- 검토했으나 택하지 않음: 방식 B(상용 뷰어 SDK — 구매·외부 업로드 승인 범위 밖), 방식 C(한컴 COM → PDF — A9에서 실행 정책 우회가 필요해 권한 단계에서 막혔고, 직접 렌더링이 더 적합해 이번에는 시도하지 않음. 실행 정책 낮춤·보안 모듈 등록·권한 상승 없음).

## 4. PDF 변환 대안 사용 여부

**사용하지 않음.** 파생 PDF·임시 파일 없음. 기존 `/preview`(PDF 전용, HWP·HWPX는 415)는 그대로다.

## 5. 변환·렌더링 품질 [코퍼스]

`references/curriculum-plan`의 HWP·HWPX **4,192건 전부**(HWP 3,283 · HWPX 909 — 확장자만 `.hwp`이고 실제로는 HWPX인 5건 포함)를 계정 A 판독기와 계정 B DocumentModel 판독기로 각각 읽어 위치·글자를 대조했다.

| 결과 | 건수 |
|---|---|
| 위치(section·path·kind)·글자 **완전 일치** | **4,192 / 4,192** |
| 병합 값만 다름(위치는 같음) | HWPX 4건 — 칸 안에 표가 있을 때 분석기는 안쪽 표의 `cellSpan`을 읽고, 계정 A는 그 칸의 직계 값을 쓴다(화면 배치가 원본에 맞음) |
| 판독 시간 | 최장 1.4초(약 10.8만 위치의 전 학년 묶음 문서), 대부분 수십 ms |

- 대조 중 고친 것: 끝의 줄바꿈 없는 공백(U+00A0) 처리(Python `strip`과 같게), 한도 60,000 → 250,000 위치(전 학년·전 과목 묶음 문서 15건이 한도에 걸렸음).
- 표·병합 칸·채점기준표·운영계획 표: 합성·실제 화면 확인(§11 스크린샷). 한국어 글자는 원본 문자 그대로(글꼴은 브라우저 기본).
- 실제 문서에서 분석기가 가져온 사용자 정의 문자(U+F8F7, 과목명 앞 기호)는 바꾸지 않고 그대로 보인다.

## 6. 미리보기 Backend·Frontend

- Backend: `GET .../evaluation-plans/{planId}/revisions/{revisionId}/structure`(§38-6) — `HwpStructureReader`·`HwpxStructureReader`·`StructureBudget`·`PlanStructurePreviewQueryService`, 관리자 상세 `file.structurePreviewAvailable`(학생 응답 없음), 오류 `422 PLAN_PREVIEW_FAILED`(+`parse_failed`·`limit_exceeded`·`timeout`·`protected`).
- 한도: 위치 250,000·글자 8,000,000·중첩 16단계·압축 해제 128MB(HWPX ZIP 100MB·항목 2,000)·시간 10초(설정). 원본 20MB 한도는 등록 단계 그대로.
- 보안: 관리자 인증·평가계획서 운영 권한(OD-A08), 다른 문서 Revision 404, 원본 크기·SHA-256 재확인(다르면 409), HWPX DOCTYPE 금지·외부 엔터티/DTD/스키마 접근 금지, ZIP 경로 이탈 거절, `no-store`·`nosniff`, 글자는 React 문자열로만 출력. 예외 문장·문서 내용을 오류·로그에 싣지 않는다.
- Frontend: `PlanStructureViewer`(표·병합 칸·캡션·글상자, 원문에서 찾기 ↑↓, 근거 위치 강조, 큰 문서 400블록씩 나눠 그리기 — 근거·찾은 곳이 뒤에 있으면 그 지점까지 자동으로 그림), `PlanOriginalViewer`가 HWP·HWPX에서 이 Viewer를 쓴다(열람 Modal·검토 화면 원문 영역 공통). 오류는 사유별 안내 + 재시도(일시 오류만), 원본 내려받기는 그대로.

## 7. 원본 보존·SHA

원본·Revision·Storage에 쓰지 않는다(파생·임시 파일 없음, 결과 저장 없음 — Revision 원문이 바뀌지 않으므로 캐시 무효화 문제도 없다). 시험: 미리보기 뒤 내려받은 바이트 = 등록 바이트, Storage 파일 수 불변, Revision SHA 불변, 바뀐 원문은 409 [IT·E2E·실제].

## 8. 형식별 Locator 처리

| 형식 | 근거 위치 | 이동 |
|---|---|---|
| PDF | `pdfPageNumber` | 기존 PDF Viewer 쪽 이동(변경 없음) |
| HWP·HWPX | `documentLocator.section`·`path` | 구조 미리보기에서 **정확히 같은 위치만** 강조·스크롤. 없으면 강조하지 않고 "찾지 못함" 안내. 변환 PDF 쪽으로 바꾸지 않는다(변환 없음) |

[실제] B6 분석 결과의 근거 위치 전수: HWP 151/151, HWPX 70/70이 구조 미리보기에 존재. 브라우저에서 근거 버튼 전부 클릭: HWP 54/54, HWPX 9/9 강조, '찾지 못함' 0.

## 9. 다과목 확정값 연결 수정

- 원인: PDF 확정 요청은 `analysisSubjectIndex`를 `not_allowed`로 막고, DB CHECK도 PDF 행의 값을 금지 → 초안 `subjectLinks`가 없으면 확정값을 분석 과목에 붙일 근거가 없었다.
- 수정: PDF 요청에서 `reviewedSubjects[].analysisSubjectIndex`를 **선택 항목**으로 받는다(범위 밖 `unknown`, 중복 `duplicate`). 확정값 행에 저장하고 관리자 응답에만 돌려준다(학생 응답 제외). 관리자 확정 화면은 PDF도 번호를 보낸다. 과목명·배열 순서로 추측하지 않는다.
- Migration `V202611151300__assessment_plan_confirmed_pdf_subject_index`: CHECK 제약 `ck_assessment_plan_confirmed_evidence_shape` 교체만(PDF 행의 `analysis_subject_index` 허용, HWP·HWPX 분기 동일). 데이터 변경 없음.
- 열람 화면 연결 우선순위: ① 확정값의 번호 ② 초안 `subjectLinks`(①에 없는 번호·과목만) ③ 분석 과목 1 + 확정 과목 1. 그 밖에는 '후보'.
- 같은 결과 안에 같은 과목명이 반복되면 기존 수신 규칙대로 400 `duplicate`(저장 안 함) — 과목을 구분할 근거가 없으므로 그대로 둔다.

시험(지시 9의 사례): 과목 1개(기존 시험)·과목 4개·이름이 비슷한 과목(통합과학2/통합사회2, 과학탐구실험2/과학탐구실험2 심화)·같은 과목명 반복(거절)·일부 과목만 확정·과목별 수행평가 수(2/1/3/1)·과목별 채점기준·과목별 운영계획(기존 행 단위 `analysisSubjectIndex`)·초안 종료 뒤 조회·번호 없는 이전 방식 확정·학생 공개 경계 [IT·E2E·실제].

## 10. 과거 Revision 영향

기존 확정값·Revision을 수정·삭제·보정하지 않았다. 번호 없이 확정된 이전 PDF 값은 `analysis_subject_index = NULL` 그대로이며 응답 JSON도 이전과 같다(NON_NULL). 시연 DB의 확정값은 0건이라 보정 대상 자체가 없다.

## 11. 학년도별 열람 실제 0.3 검증 [실제]

일회용 MySQL + 실제 B6(`--enable-contract03`, 별도 포트) + 계정 A Backend(Gate ON은 그 프로세스에만) + 관리자 화면. 공개·합성 문서 10건:

| 문서 | 결과 | 과목 | 수행 | 채점 요소 | 운영계획 행 |
|---|---|---|---|---|---|
| 실제 다과목 PDF E(1학년 1학기 전과목) | PARTIAL | 12 | 27 | 0 | 0 |
| 실제 다과목 PDF C(1학년 1학기 전과목) | PARTIAL | 13 | 1 | 0 | 106(한 과목 24행) |
| 실제 다과목 PDF D(1학년 1학기 전과목) | PARTIAL | 10 | 3 | 0 | 114 |
| 실제 공동교육과정 교과별 PDF | PARTIAL | 1(나누지 못함) | 3 | 4 | 0 |
| 실제 교과별 PDF 2건 | **FAILED** | 0 | — | — | — |
| 실제 HWP(단일 과목) | PARTIAL | 1 | 4 | 15 | 7 |
| 실제 HWPX(단일 과목) | REVIEW_REQUIRED | 1 | 2 | 1 | 5 |
| B6 합성 PDF(전체) | PARTIAL | 1 | 2 | 0 | 6 |
| B6 합성 PDF(운영계획만) | PARTIAL | 1 | 0 | 0 | 6 |

- 다과목 PDF E: 과목 0·3·4·6만 번호와 함께 확정 → 열람 화면에서 그 과목만 '확정', 1·8 등은 '후보'; 새로고침 뒤 유지; 학생 응답에 번호 없음·확정 과목 ID 4개만. 1024·390 폭 가로 넘침 0.
- 운영계획 여러 쪽(C의 24행 과목)·운영계획만 있는 PARTIAL 문서(수행 0, 운영계획 6행) 표시 확인. 모든 문서 내려받기 바이트 = 원본.
- **분석 품질은 계정 B 범위**: 다과목 문서 일부는 과목을 나누지 못하거나 실패했고, 실제 다과목 문서의 채점기준은 대부분 추출되지 않았다(값을 만들지 않고 '찾지 못함' 안내). 계정 A는 수정하지 않았다.
- 학업 과목 슬롯은 개발용 Mock(2학기 과목)이라 1학기 문서 과목과 이름이 다르다 — 이 검증은 **연결 메커니즘** 확인이며 과목 대응의 정답 검증이 아니다.
- 정리: 분석기·Backend·화면 프로세스 종료, 일회용 DB 삭제. 계정 B 서비스(8765·8766)는 실행 중이 아니었고 건드리지 않았다.

## 12. UI/UX

- 원문 Viewer: 흰 문서 면 + 1px 선 표, 근거 칸 파란 테두리 + 연파랑, 찾은 곳 연노랑, 도구 줄(형식·문단·표 수, 찾기, ↑↓), "PDF 변환 없음" 안내, 이어서 보기(알약 버튼). 색은 기존 `--as-*` Token만(다크 모드 호환).
- 열람 화면: HWP·HWPX 근거를 "구역 n · 표 n · n행 n열" 버튼으로 바꿔 누르면 그 위치를 연다(이전엔 글자만 표시). Modal 안내 문구 갱신.
- 검토 화면 원문 영역: HWP·HWPX도 구조 미리보기·전체 화면 사용 가능. (검토 화면의 필드별 근거 강조 연결은 하지 않았다 — §15.)

## 13. 테스트 결과

| 범위 | 결과 |
|---|---|
| Backend Unit | **305건, 실패 0**(생략 1 = 기본 꺼진 코퍼스 덤프 도구, Student Care 145 포함) — 신규 `PlanStructureReaderTest` 7(분석기 위치 Golden 대조·병합/캡션/중첩·손상·암호·XXE·경로 이탈·압축 폭탄·중첩 한도·시간 초과) |
| Backend Integration | **190건**(A9 184 + 신규 `PlanStructurePreviewApiTest` 3·`PlanMultiSubjectConfirmApiTest` 3). 전체 실행에서 실패 1 = 기존 `PlanServerAnalysisApiTest`가 응답 **본문 전체**에 "55"가 없는지 검사해 무작위 planId(`…cb551701`)에 걸린 우연한 실패 → 확정값만 검사하도록 고친 뒤 그 클래스 11/11 통과. 나머지(Student Care 포함) 실패 0 |
| Frontend typecheck·lint·build (student·admin·shared) | 통과 |
| Assessment E2E (Edge, 일회용 DB, Stub 분석기 + 합성 수신 JSON) | **9/9**(기존 7 + 신규 `preview-subjects.spec.ts` 2) |
| 코퍼스 대조 | 4,192/4,192 위치·글자 일치(§5) |
| 실제 B6 + 브라우저 | §8·§11 |
| 시연 DB | `V202611151300` 적용(§13-1) |

### 13-1. 시연 DB Migration

| 단계 | 결과 |
|---|---|
| 대상 | `learnershigh-mysql` / `lh_demo_manual_20261111`, 적용 전 v202611150200(12건) |
| 백업 | `mysqldump --single-transaction` 731,699 byte, 사용자 홈 `.learnershigh-extension/backups/a10-demo-20261115/`(저장소 밖). Storage는 이 Migration과 무관(원문 접근 없음) |
| 복원 검증 | 일회용 MySQL(tmpfs) 복원 → 26개 테이블 건수 전부 일치 |
| 시험 적용 | 복원본: validate 13 → 1건 적용, 변화 = `flyway_schema_history` +1, CHECK 교체 |
| 시연 적용 | 성공(now v202611151300), 건수 = 시험 결과와 동일, 문서 5·분석 5(REVIEW_REQUIRED) 그대로, 확정값 0건 |
| 정리 | 일회용 컨테이너 삭제, 시연 컨테이너는 원래대로 중지. 리셋 API·데이터 삭제 없음, 0.3 Gate 미변경 |

## 14. Git Commit·HEAD

| Commit | 내용 |
|---|---|
| `51f01d5` | 다과목 PDF 확정값 분석 과목 번호(Backend·Migration `V202611151300`·확정 화면·열람 연결·시험, 기존 불안정 단언 수정) |
| `725f09e` | HWP·HWPX 구조 미리보기(Backend 판독기·API·오류 코드, Viewer·열람/검토 연결, 합성 Fixture·Golden·시험) |
| `e7ac982` | E2E `preview-subjects.spec.ts` + E2E 일회용 Backend Flag |
| `8015375` | `api-contract.md` Assessment 절(§38-1·§38-5·§38-6·§39-7·§53) |
| (이 보고서) | `docs(assessment): A10 report` |

Branch `feature/assessment-student-integration-enhancement`, Push 없음. 다른 담당자·이전 작업의 미Commit 파일(`.claude/rules/*`, ADR 0008·0009, seed·증거 폴더, `backend/bin/`, `references/**` 등)은 Stage하지 않았다.

## 15. 남은 승인·제약

- 검토 화면(확정 Wizard)의 HWP·HWPX 필드별 근거 버튼 → 구조 미리보기 강조 연결은 하지 않았다(열람 화면만 연결). 다음 작업 후보.
- 쪽 번호·글꼴·그림 재현은 범위 밖(구조 미리보기). 인쇄 모양 그대로가 필요하면 별도 결정(로컬 변환 엔진, 실행 권한 필요).
- 계정 B 분석 품질: 다과목 분리 실패·FAILED·채점기준 미추출 사례(§11) — 계정 B에 전달 필요.
- D-A8-1 운영계획만 있는 문서 학생 공개, D-A8-2 0.3 운영 활성화, D-A8-3 실패 결과 저장 정책 — 그대로 미결.
- 1팀: 실제 학교 Master·학업 과목 원천(현재 Mock 슬롯).
- E2E 설정은 일회용 Backend에서만 `ASSESSMENT_ANALYSIS_IMPORT_ENABLED`·`ASSESSMENT_MULTIFORMAT_EXPERIMENTAL`을 켠다(합성 수신 JSON 주입용). 애플리케이션 기본값은 false.
