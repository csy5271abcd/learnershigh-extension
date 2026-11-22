# [계정 A] A28 — Assessment 실제 사용자 수동 검증 및 최종 안정화

- 작성: 2026-11-22 (KST)
- 진행 단계: **Phase 1 완료(환경 준비)** · 사용자 검증 결함 개선(아래 'A28 개선 작업') **구현·회귀 완료(X-9)** · 사용자 직접 검증 대기
- 증거 폴더(저장소 밖, Git 미포함): `C:\learnershigh-local-run\a28-20261122\`
- 이 문서는 A27 최종 보고서의 부록이 아닌 A28 독립 보고서다. 완료하지 않은 Phase 를 완료로 표시하지 않는다.

---

## A28-1. 환경 준비 보고서 (Phase 1)

### 1-1. 요약

| 항목 | 결과 | 근거(이번 실행) |
|---|---|---|
| 관리자 Frontend 5174 | **정상** | node PID 18668, `/assessment` 200, 탭 11개 화면 GET 오류 0 |
| 학생 Frontend 5173 | **정상** | node PID 20108, `/assessment` 200, 화면 16개 GET 오류 0 |
| Backend 8080 | **정상** | java PID 23308, `local-run` 프로필, 기동 13.7초 |
| MySQL | **정상** | 기존 컨테이너 `lh-local-run-mysql` 재시작(새 컨테이너 아님), 127.0.0.1:33307 |
| Flyway | **26건 성공 · 실패 0 · 최신 `202611210200` · 대기 0** | 기동 로그 'Successfully validated 26 migrations', 'Schema `lh_local_run` is up to date. No migration necessary.' checksum `526702866`·`1041331618` 부록 Q 와 동일 |
| 실제 HTTP API | **정상** | 아래 1-5 |
| 개발 인증 | **사용 가능**(local-run 전용 개발 Header) | 인증 없음·모르는 ID → 401 |
| Mock fallback | **없음** | `.env` 파일 없음, 데이터 소스 기본값 http(Mock 은 `VITE_ASSESSMENT_DATA_SOURCE=mock` 명시 때만). 화면 27개에서 Mock 배지 0 |
| 기존 데이터 보존 | **확인** | 표별 행 수 = 부록 Q 종료값과 완전 동일(40표·8,543행), Storage 303개 SHA 전부 일치 |
| 직접 수동 테스트 | **준비 완료(조건 있음)** | 1-6 자동 쓰기 요청 TTL 주의 |

### 1-2. 시작 시 발견 사항

1. **모든 사용자 서버가 꺼져 있었다.** 5173·5174·8080 리스닝 없음, `lh-local-run-mysql`·`lh-qa-mysql` 모두 `Exited (255)`(종료 시각 2026-11-22 00:41 KST).
   - 부팅 시각은 2026-11-21 18:41 인데 `explorer` 가 00:35 에 새로 시작됐다 → **00:35경 Windows 로그오프/재로그인**으로 사용자 세션 프로세스와 Docker Desktop 이 함께 종료된 것으로 추정한다(시스템 이벤트 로그는 확인하지 않음 — 추정).
   - 조치: 기존 공식 절차대로 `docker start lh-local-run-mysql` → `start-backend.ps1` → `start-student.ps1`·`start-admin.ps1`. 스크립트는 수정하지 않았다. 세션 종료에 휩쓸리지 않도록 부록 R 과 같은 WMI 프로세스 생성으로 띄웠다.
   - 부록 R 의 QA 컨테이너 `lh-qa-mysql` 은 A28 지시(별도 QA 환경 미사용)에 따라 **시작하지 않았다**.
2. **Git 작업 트리:** HEAD `9755581`(부록 Q 기준과 동일), staged 0, 변경 165 · 삭제 14 · 미추적 187. A27-UX~부록 Q 작업 전체가 미커밋 상태다. Commit 금지 규칙에 따라 그대로 두었다.
3. **가용 메모리가 매우 낮다:** 총 15.6GB 중 가용 0.37~0.76GB(WSL 2.2GB, Chrome·Notion·Discord·ChatGPT 등). 화면 점검은 Headless 1개 페이지·순차로만 했다. Phase 4 회귀 테스트 전에는 다른 앱을 닫아야 한다.

### 1-3. 실행 중 프로세스

| 구성 | 주소 | PID(실행기) | 로그 |
|---|---|---|---|
| Backend | http://localhost:8080 | java 23308 (powershell 5132) | `C:\learnershigh-local-run\backend-20261122-004655.log` (UTF-16) |
| 학생 Frontend | http://localhost:5173/assessment | node 20108 (powershell 28212) | `C:\learnershigh-local-run\student-20261122-*.log` |
| 관리자 Frontend | http://localhost:5174/assessment | node 18668 (powershell 25404) | `C:\learnershigh-local-run\admin-20261122-*.log` |
| MySQL | 127.0.0.1:33307 · `lh_local_run` | Docker `lh-local-run-mysql` | — |
| Storage | `%USERPROFILE%\.learnershigh-extension\local-run-storage` (303개, 361MB) | — | — |

- Backend 연결 대상(로그): `jdbc:mysql://127.0.0.1:33307/lh_local_run` · `ASSESSMENT_STORAGE_ROOT` = 위 Storage · 시연 명단 켬 · 분석기 `local (ocr=windows)` · 학교알리미 `ttlHours=24` · HWP 변환기 이미지 `lh-plan-preview-converter:e6b3e1dd2ee1` 이미 있음(자동 빌드 없음).
- Frontend `/api` 프록시 → `http://localhost:8080`(기본값). 프록시 경유 인증 없는 요청 401 확인.

### 1-4. 백업 (이번 실행)

| 대상 | 경로 | 결과 |
|---|---|---|
| DB 전체 덤프 | `C:\learnershigh-local-run\a28-20261122\db-backup\lh_local_run-full-20261122-004502.sql` | 34,826,649B, SHA-256 `a42728b930c726e56c4cddd346e6745611c12d5d9e2070e9260d344826e11ba0`, 종료 코드 0, CREATE TABLE 40, 'Dump completed' |
| Storage SHA 목록 | `...\db-backup\storage-sha256-start.txt` | 303개 |
| Storage 사본 | `...\storage-backup\` | 303개 복사 후 SHA 전부 일치 |
| 행 수 기준값 | `...\rowcounts-start.tsv` | 40표 · 8,543행 = 부록 Q `rowcounts-final.tsv` 와 diff 0 |

- 덤프 옵션은 부록 Q 와 같다(`--single-transaction --routines --triggers --events --hex-blob --databases lh_local_run`). 기존 백업은 덮어쓰지 않았다. 계정·암호는 컨테이너 환경에서만 읽고 출력하지 않았다.
- **복구 절차(실행하지 않음, 사용자 확인 필요):** 8080 중지 → `docker exec -i lh-local-run-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < <덤프>` → Storage 를 사본과 대조·복원 → 8080 재시작. 이 덤프는 Migration 26건 적용 후 상태라 재기동 시 재적용이 없다.

### 1-5. 읽기 API 확인 (이번 실행, GET 만)

| API | 결과 |
|---|---|
| `GET /api/student/assessment/current-term` (stu_demo_037) | 200 `{2026, 2, KST_CALENDAR_MARCH_SEPTEMBER}` |
| `GET /api/admin/assessment/current-term` | 200 같은 값 |
| 인증 Header 없음 / 모르는 학생 ID | 401 `UNAUTHORIZED` |
| `GET /api/admin/assessment/schools?query=가좌` | 200 가좌고등학교 · 평가계획서 150 · 최신 2026 |
| `GET /api/admin/assessment/schools/directory?query=한솔고` | 200 세종·성남 2곳 (학교알리미 검색 = 외부 읽기 1회, DB 쓰기 0) |
| `GET /api/admin/assessment/evaluation-plans?schoolId=sch_demo_gajwa&academicYear=2026` | 200 문서 목록 |
| `GET /api/student/assessment/school-assessments?academicYear=2026&semester=2` | 200 0건(이 학생의 개인 수행평가 없음) |

### 1-6. 화면 접속 점검 (이번 실행)

- 방법: Headless Chromium 1366×768, `/api` 의 **GET 이 아닌 요청은 모두 차단하고 기록만** 했다. 스크립트 `ui-smoke.mjs`·`ui-smoke-admin.mjs`, 결과 `ui-smoke*.json`, 캡처 `screens\*.png`(27장).
- 관리자(adm_plan_operator): 전체 현황 · 학생 Assessment · 피드백 관리 · 평가계획서 · 분석 · 월별 운영계획 · 심화 콘텐츠(과제·모의고사·대학·자료원) · 관리자 참고자료실 = 11개 화면. GET 오류 0, 가로 넘침 0, 콘솔 오류 0(평가계획서 제외 — 차단 때문).
- 관리자(`?devAdmin=adm_demo_b01` 전환): 전체 현황·학생 Assessment·피드백 관리 GET 오류 0.
- 학생(stu_demo_037, 가좌고 1학년 2학기): 홈 · 학교 수행평가(과목 4개 포함) · 학교 평가 정보 · 월별 운영계획 · 심화 탐구 · 선생님 피드백 · 자료함 · 참고자료 · 성장 기록 · 보관함 · 수행평가 꿀팁 = 16개 화면. GET 오류 0, 가로 넘침 0.
- 화면 진입만으로 발생한 쓰기 요청(차단됨):
  - 관리자 평가계획서 탭: `POST /api/admin/assessment/evaluation-plans/schoolinfo-sync` 1회
  - 학생 홈·학교 평가 정보: `POST /api/student/assessment/evaluation-plans/official/ensure` 각 1회
  - 차단 때문에 해당 카드에 '자동 확인을 하지 못했어요 / 공식 원본 상태를 확인하지 못했어요'가 표시됐다. **차단 효과이며 결함이 아니다**(사용자가 직접 열면 요청이 정상 전송된다).
- 심화 탐구에서 감지된 '저장되지 않아요' 문구는 정적 참고자료 안내(`EnrichmentLibraryRoute.tsx:104`)로 Mock 노출이 아니다.
- 점검 후 행 수 diff 0, Storage 303개 유지(`rowcounts-after-phase1.tsv`).

### 1-7. 화면 진입 자동 쓰기 요청 — 위험 분석

코드 근거: `useSchoolInfoSync.ts`(관리자 평가계획서 탭), `useOfficialEnsure.ts`(학생 홈·학교 평가 정보·상세), `SchoolInfoSyncService.start()`(`SchoolInfoSyncService.java:253-289`).

| 조건 | 서버 동작 |
|---|---|
| 그 학교 3개 학년도 확인 기록이 모두 24시간 안 | 메모리 작업만 만들고 기록으로 답한다. **외부 요청 0 · DB 쓰기 0** |
| 기록이 없거나 24시간 지남, 또는 FAILED | 백그라운드로 **학교알리미 실제 조회 → 새 원본 파일·문서·Revision 저장**(DB·Storage 쓰기) |
| 관리자 '다시 확인' / 학교 검색 후 선택 | force — TTL 무시하고 3개 학년도 재확인 |

현재 학교별 확인 기록(저장값은 UTC, 아래는 KST 환산):

| 학교 | 상태 | 마지막 확인 | **TTL 만료(이후 진입 시 실제 수집)** |
|---|---|---|---|
| 가좌고 `sch_demo_gajwa` | PARTIAL | 11-21 07:17~07:18 | **11-22 07:17 KST** |
| 대신고 `sch_demo_daeshin` | SCHOOL_AMBIGUOUS | 11-21 07:16 | 11-22 07:16 KST |
| 운정고 `sch_demo_unjeong` | COMPLETED | 11-21 07:20~07:21 | 11-22 07:20 KST |
| 한림고 `sch_demo_hanlim` | COMPLETED | 11-21 07:32~07:33 | 11-22 07:32 KST |
| 그 외 시연 명단 11개 학교 | 기록 없음 | — | **즉시**(첫 진입부터 실제 수집) |

- 판단: 기존 확정값·관리자 검토값·기존 원본은 덮어쓰지 않는 설계(새 Revision 추가·중복 SHA 재사용)지만, **사용자 DB 에 새 행과 Storage 파일이 생긴다.** 그래서 07:17 KST 이후, 또는 다른 학교 학생으로 전환할 때는 대상을 정하고 진행해야 한다.
- 제어 방식 제안(구현하지 않음, 사용자 승인 필요): 확인 주기를 늘리는 `assessment.schoolinfo.sync-ttl-hours` 설정값이 이미 있다(`SchoolInfoSyncService.java:107`). Backend 를 재시작할 때 환경 변수 `ASSESSMENT_SCHOOLINFO_SYNC_TTL_HOURS`(Spring relaxed binding, 바인딩 여부는 미검증) 로 늘리면 코드 변경 없이 수동 검증 동안 자동 재수집을 막을 수 있다. 재시작이 필요하므로 이번에는 적용하지 않았다.

### 1-8. 개발 인증 · 사용자 전환

- 실제 로그인이 아니다. Frontend 가 고른 ID 를 Backend 개발 Header(`X-Assessment-Student-Id` / `X-Assessment-Admin-Id`)로 보내고 서버가 권한을 검사한다. 운영 이름 프로필(prod·production·staging)에서는 항상 401 이다. 비밀번호는 없다.
- 기본값: 학생 `stu_demo_037`(가좌고 1학년, 지점 `br_demo_b`) · 관리자 `adm_plan_operator`(평가계획서 운영 전용, **학생 기록 지점 없음** → 학생 Assessment·피드백 목록이 비어 보인다).
- 전환(개발 서버 전용, 주소에 붙여 한 번 열면 저장됨):
  - 관리자: `http://localhost:5174/assessment?devAdmin=adm_demo_b01` (지점 `br_demo_b` — stu_demo_037 의 피드백 처리 가능)
  - 학생: `http://localhost:5173/assessment?devStudent=<학생 ID>` — **다른 학교 학생으로 바꾸면 그 학교 학교알리미 수집이 바로 시작될 수 있다(1-7).**
  - 전환 패널: `?devPanel=1`
- 화면의 학생 이름은 시연 명단의 합성 이름이다.

---

## A28-2. 수동 검증 체크리스트

상태: `PASS` · `FAIL` · `PARTIAL` · `NOT RUN`. 'Phase 1' 열은 이번 실행에서 확인한 것(읽기·접속만)이다. **사용자 직접 검증 결과는 아직 없다.**

데이터 영향: `읽기` = DB 변화 없음 · `본인` = 테스트 학생 본인 데이터만 생성·변경 · `⚠대상` = 기존 공유 자료에 영향, **대상 선택 후 진행**

### 관리자 (http://localhost:5174/assessment)

| ID | 기능 | 데이터 영향 | Phase 1 | 사용자 검증 |
|---|---|---|---|---|
| ADMIN-01 | 전체 현황 · 8개 탭 · 필터 · KPI · Calendar · 최근 활동 | 읽기 | 접속 PASS | NOT RUN |
| ADMIN-02a | 학교명 검색 · 동명 학교 · 지역·주소 · 결과 없음 | 읽기(학교알리미 검색은 외부 읽기) | API PASS(한솔고 2곳) | NOT RUN |
| ADMIN-02b | 학교 후보 **선택** → Context 변경 | ⚠대상(매핑 생성 + 18구간 강제 수집) | — | NOT RUN |
| ADMIN-03a | 평가계획서 18구간 · 원본 목록 · 다운로드 · 개정 이력 · 미분류 | 읽기(단 탭 진입 시 자동 sync — 1-7) | 접속 PASS | NOT RUN |
| ADMIN-03b | '다시 확인' · 평가계획서 등록 · 분류 지정 | ⚠대상 | — | NOT RUN |
| ADMIN-04 | 분석 목록 · 원문 미리보기 · 페이지 이동 · 과목 검색 · 수행평가·반영비율·배점·채점기준 · 운영계획 · AI/검토값 비교 | 읽기 | 접속 PASS | NOT RUN |
| ADMIN-04b | AI 분석 실행·재분석 | ⚠대상(분석 결과 행 추가) | — | NOT RUN |
| ADMIN-05 | 4단계 검토 · 과목 연결/제외/되돌리기 · 평가정보·운영계획 수정 · 원본 SHA 대조 · 한 번에 확정 · 최종 확정 · 재검토 | ⚠대상(확정은 학생 공개 변경) | — | NOT RUN |
| ADMIN-06 | 피드백 관리: 요청 확인 · 답변 (`?devAdmin=adm_demo_b01`) | 본인(테스트 학생 요청에 한함) | 접속 PASS | NOT RUN |
| ADMIN-07 | 월별 운영계획 · 심화 콘텐츠 · 관리자 참고자료실 | 읽기 / 등록은 ⚠대상 | 접속 PASS | NOT RUN |

### 학생 (http://localhost:5173/assessment, stu_demo_037)

| ID | 기능 | 데이터 영향 | Phase 1 | 사용자 검증 |
|---|---|---|---|---|
| STUDENT-01 | Dashboard: 학적 · KPI 4개 · 바로가기 · 공식 원본 3개년 · Calendar · 다가오는 수행평가 · 피드백 · 최근 기록 · 사이드바 접기 | 읽기(진입 시 ensure — 1-7) | 접속 PASS | NOT RUN |
| STUDENT-01b | 개인 메모 | 본인 | — | NOT RUN |
| STUDENT-02 | 공식 평가계획서: 학교 Context · 학년도별 원본 · 다운로드 · 다른 학교 자료 차단 · 확정 전 비공개/확정 후 공개 | 읽기 | 접속 PASS | NOT RUN |
| STUDENT-02b | 동명 학교 선택·변경·철회 | ⚠대상(가좌고는 관리자 매핑이 있어 **선택 화면이 안 나오는 것이 정상**) | — | NOT RUN |
| STUDENT-03 | 개인 수행평가 추가·과목 선택·개인 과목·유형·평가일·마감·반영비율·제출물·상태 변경/되돌리기·인라인 편집·새로고침 유지·삭제·이력 | 본인 | — | NOT RUN |
| STUDENT-04 | 탐구노트: 생성 · **한글 IME 실제 입력** · 자동 저장 · 굵게/기울임/밑줄 · 링크 · Markdown 단축키 · Undo/Redo · 새로고침 복원 | 본인 | — | NOT RUN |
| STUDENT-05 | 파일: 안내문 첨부 · 자료함 업로드 · Drag & Drop · PDF/HWP/HWPX/DOCX/XLSX/PPTX/이미지 · 다운로드 · 미리보기 지원 표시 · 교체/제거 · 버전 · 잘못된 형식·크기 오류 | 본인(Storage 에 새 파일 추가) | — | NOT RUN |
| STUDENT-06 | 피드백 요청 · 답변 확인 · 참고자료 · 심화 탐구 · 성장 기록 · 보관함 | 본인 | 접속 PASS | NOT RUN |

### 연동 시나리오 (관리자·학생 동시)

| ID | 시나리오 | 데이터 영향 | 사용자 검증 |
|---|---|---|---|
| X-1 | 학교 선택 → 수집 → 원본 → AI 분석 → 검토·수정 → 확정 → 학생 조회(같은 학교·학년도·학기·Revision, 확정 전 비공개, 새로고침 유지) | ⚠대상 | NOT RUN |
| X-2 | 학생 수행평가 등록 → 수정 → 상태 변경 → 노트 → 파일 → 새로고침 | 본인 | NOT RUN |
| X-3 | 학생 피드백 요청 → 관리자(adm_demo_b01) 확인·답변 → 학생 확인 → 노트 수정 후 **요청 당시 Snapshot 유지** | 본인 | NOT RUN |

### 해상도 (사용자 발견 문제 우선)

| 화면 | 800×900 | 1366×768 | 1600×900 | 1920×1080 |
|---|---|---|---|---|
| 관리자 주요 탭 | NOT RUN | 넘침 0(Phase 1 자동) | NOT RUN | NOT RUN |
| 학생 주요 화면 | NOT RUN | 넘침 0(Phase 1 자동) | NOT RUN | NOT RUN |

---

## A28-3. 결함 기록

| # | 등급 | 기능 | 화면 | 재현 절차 | 기대 | 실제 | 원인 | 수정 파일 | 재검증 |
|---|---|---|---|---|---|---|---|---|---|
| — | — | (Phase 1 에서 발견한 코드 결함 없음) | | | | | | | |

환경 이슈(코드 결함 아님): 1-2 의 서버 전체 종료(로그오프 추정), 낮은 가용 메모리.

---

## A28-4. 변경 · 보존 (현재까지)

- 저장소 변경: 이 보고서 파일 1개 추가. 코드·설정·스크립트 변경 0. Commit·Push·PR 0.
- 저장소 밖: `C:\learnershigh-local-run\a28-20261122\`(백업·스냅샷·점검 스크립트·캡처).
- 사용자 DB: 쓰기 0(행 수 diff 0). Storage: 변경 0.
- 프로세스: MySQL 컨테이너 재시작, 8080·5173·5174 새로 기동(모두 꺼져 있었음). QA 컨테이너 미기동.
- 분석기·Student Care·1팀 영역 변경 0.

## A28-5. 남은 일 · Open

1. Phase 2: 사용자 직접 검증(위 체크리스트). ⚠대상 항목은 대상 학교·문서를 정해 알려 주면 예상 데이터 변경을 먼저 안내한다.
2. 07:17 KST 이후 자동 재수집 허용 여부 결정(1-7 제어 방식 제안).
3. 관리자 `adm_demo_b01` 의 평가계획서 운영 권한 여부는 이번에 확인하지 않았다(피드백 시나리오에만 사용 권장).
4. Phase 4 회귀 테스트는 일회용 인프라에서, 메모리 확보 후 순차 실행한다. **이번 실행에서 자동화 테스트는 실행하지 않았다** — 부록 Q 수치(Unit 445/3 skip, IT 233, Node 152, E2E 67, REPLAY 8)는 이번 결과가 아니다.

---

# A28 개선 작업 — 3개년 평가계획서 조회 · 전국 학교 조회 · 기본 승인/최종 승인 · 확정 후 수정 (2026-11-22)

- 요청: 사용자 수동 검증에서 발견한 3가지(이미지 1 학생 대신고 3개년 카드 · 이미지 2 관리자 학교 Dropdown · 이미지 3 검토 0/168).
- 원칙: 기존 API·서버 검증 재사용, 새 Migration 없음, 사용자 DB 쓰기 0(Claude 실행분), Commit 0.
- 수정 전 사본: `C:\learnershigh-local-run\a28-20261122\pre-edit\`(Git 상태 `git-status-before.txt` 367줄, diffstat 179 files).

## X-1. 요구사항별 기존 구현 상태와 원인

| 요구 | 기존 상태 | 분류 | 실제 원인(코드·DB 근거) |
|---|---|---|---|
| A28-01 과거 학년도 원본 | 학적이 없는 학년도는 서버가 칸을 만들지 않음 | **정책 변경 필요** | `OfficialPlanQueryService.studentGet`이 `contexts.find(학생, 학년도, 학기)`가 없으면 무조건 `contextFound=false`·문서 0(학교 공개 자료와 학적을 구분하지 않음) |
| A28-01 대신고 '가져오지 못했어요' | 학생 동명 학교 선택 기능(§38-16)은 있음 | **서버 상태 계산 결함** | 사용자 DB `sch_demo_daeshin` 3개 학년도 기록 = `SCHOOL_AMBIGUOUS`(11-20 22:16Z, TTL 안). Backend 재시작(00:47) 뒤 동명 후보가 메모리에 없어 `SchoolInfoSyncService.start()`가 기록만으로 작업을 만들고 `selectionReason=null` → `schoolSelection=null`, 세 학년도 모두 `HARD_FAIL` → 상태 `FAILED` → 학생에게 '가져오지 못했어요'. 외부 장애가 아님(로그에 오류 0) |
| A28-01 학년·학기 선택 | 없음 | 신규 구현(화면+선택 파라미터) | — |
| A28-02 전국 학교 검색·동명 선택·3개년 수집 | §38-15 검색·선택·18구간 자동 확인 **구현됨** | 화면 연결 문제 | Dropdown이 담당 학교와 외부 학교를 구분 없이 나열, 외부 학교 표시 없음, '이 학교 선택'을 누르면 **확인 없이 즉시 수집 POST** |
| A28-02 담당 관계·학적 불변 | 선택 API는 학교 매핑(`si_`)만 만들고 학적·담당은 안 바꿈(§38-15) | 이미 구현됨 | — |
| A28-03 기본 승인 | §39-13 '한 번에 확정'(AI 후보 기본 포함·관리자 결정 보존·서버 동일 검증) **구현됨** | 화면 연결 문제 | 화면 중심 지표가 '검토 0/168', 일괄 확정은 최종 확정 4번째 하위 단계 아래 보조 패널로만 있고 하위 단계 3이 '확정할 값 0개 · 미확인 168개'로 계산돼 관리자가 168개를 눌러야 하는 것처럼 보였다 |
| A28-03 승인 이력 | 확정 기록(관리자·시각·Revision·확정값 Snapshot) 불변 저장, `bulk` 요청 표시 | 대부분 구현됨 | 항목별 '기본 승인/관리자 수정' 출처 열은 저장하지 않음(§39-13: 별도 열 없음) |
| §5 확정 후 수정·재확정 | §39-8 reopen·새 확정 기록·이전 기록 불변·재검토 중 학생 공개값 유지 **구현됨** | 화면 연결 문제 | 결과 화면에 진입 버튼 없음(검토 화면 '재검토 시작'으로만), 이력에 변경 전·후 없음 |

## X-2. 구현 내용

### Backend (A28-01만, 새 표·열·Migration 없음)
- `OfficialPlanQueryService`
  - 칸 규칙 `slotOf()`를 목록·내려받기·미리보기가 함께 쓴다: ① 학적 칸 ② 최근 3개 학년도(서버 KST) 안이면 그 해 학적 학교 → 없으면 현재 학교(ensure와 같은 `currentContext`)의 공개 원본 칸 ③ 그 밖 칸 없음. 학교는 요청에서 받지 않는다.
  - 응답 `basis`(`ACADEMIC_RECORD`·`SCHOOL_PUBLIC`·null) 추가, `contextFound`는 학적 유무 그대로.
  - ensure: 저장 기록이 `SCHOOL_AMBIGUOUS`이고 관리자 매핑·학생 선택이 없으면 `FAILED` 대신 `SCHOOL_CONFIRMATION_REQUIRED`. 실제 연결 실패는 그대로 `FAILED`.
- `StudentEvaluationPlanController`·`AdminStudentViewController`: `official`·`files/{id}`·`preview`에 선택 `grade`(1~3, 범위 밖 400).
- `StudentOfficialPlanResponse`: `basis` 필드 + 기존 생성자 호환.

### Frontend 학생
- 홈 '학교 평가계획서 원본 · 3개년' 카드(레이아웃 유지): 학년·학기 선택(기본 = 내 학년·현재 학기, '내 학년·학기로'), 연도 칸마다 학년도·고n·학기·학교명·'현재 학교 공개 원본 · 재학 기록 아님'/'같은 학교 다른 학년 공개 원본' 배지·'해당 학년도 학적 정보 없음'(자료 없음과 별도 줄)·원본 수·파일명·형식·**학교알리미** 출처·**원본 보기**(PDF)·내려받기. 긴 목록은 칸 안 스크롤.
- 상태 문구 6종 구분: 확인 중 / 학교 선택 필요 / 확인 실패(+ '학교알리미 다시 확인' 버튼) / 공개 원본 없음 / 조회할 학교 없음 / 학적 정보 없음.
- '학교 평가 정보' 원본 영역도 같은 규칙. 내려받기·미리보기는 칸 학년을 함께 보낸다(서버가 같은 칸으로 재검증).

### Frontend 관리자
- 평가계획서 학교 선택: `담당 학교` / `조회한 외부 학교` optgroup(전국 학교를 목록에 넣지 않음).
- 외부 학교 조회 띠: '외부 학교 평가계획서 조회' + 공식 이름·시도·시군구·주소(학교알리미 학교 선택 기록) + 학적·담당 불변 안내.
- 학교 검색: '이 학교 선택' → **대상 확인 패널**(이름·지역·주소·18개 구간·기존 원본 재사용 안내) → '이 학교로 조회 시작'을 눌러야 선택(수집) POST.
- 검토: 머리글·하단 '검토 n/전체' → **'승인 대상 X · 확인 필요 Y'**, 분석 요약에 기본 승인/관리자 수정/직접 확인/원문에 없음/확인 필요/제외 과목 항목 수, 필터 `전체·확인 필요·관리자 수정·제외(원문에 없음)·기본 승인·직접 확인`, 행마다 '기본 승인'·'확인 필요' 표시, 버튼 '최종 확정' → **'최종 승인'**.
- 최종 확정 4단계 → 마지막 '최종 승인': 화면 수치는 최종 승인 대상(관리자 결정 + 기본 승인) 기준, 주 버튼 `최종 승인 · N개 값 확정하고 학생에게 공개`(§39-13 요청 그대로 1회), 기존 개별 확정은 보조 버튼 '확인·수정한 값만 확정'.
- 결과 화면: 확정 문서에 **'확정 내용 수정'**(확인 창 → §39-8 reopen → 확정값으로 채운 수정 초안 → 검토 화면), 재수정 중 '확정 내용 수정 이어하기'. 확정 이력마다 'AI 값 그대로 n · 관리자 수정 m'(같은 분석 결과만, 모르면 '후보 없음'), **직전 확정 대비 변경(이전 값 → 수정 값, 근거 쪽 포함)**.

### 서버 검증·정책 (바꾸지 않음)
- 원본 SHA 대조(로컬 파일), 과목 연결, 학년 충돌, 과목 제외, 근거 쪽 범위, `expectedDraftVersion` 409(`BULK_CONFIRM_STALE`), 재확정 조건, 한 Transaction 확정 — 모두 기존 그대로. 확인 필요(값·근거 없음)가 1개라도 남으면 최종 승인 버튼이 꺼지고 이유를 보인다.
- '기본 승인'은 초안에 결정을 쓰지 않는다 = 관리자가 확인했다고 기록하지 않는다. 최종 승인 요청에만 합쳐 보낸다.

## X-6. 사용자가 직접 검증할 방법 (8080 재시작 후)

데이터 영향 표시: `읽기` = DB 변화 없음 · `⚠대상` = 사용자 DB·Storage 쓰기, 대상을 정하고 진행.

| # | 화면 · 조작 | 기대 결과 | 데이터 영향 |
|---|---|---|---|
| U-1 | 학생 `http://localhost:5173/assessment?devStudent=stu_demo_021`(대신고 고1) 홈 | 3개년 카드 위에 '같은 이름의 학교가 있어요…' + 지역·주소 후보 고르기(학교 선택 필요). '가져오지 못했어요'가 아니어야 함 | 후보 표시를 위해 서버가 학교알리미 검색·상세를 다시 조회하고 확인 기록(`schoolinfo_sync_year` 3행)을 갱신한다(파일 다운로드 0, 기존 §38-16 동작). 후보를 **고르면** 학생 열람 선택 1행 + 그 학교 3개년 수집 ⚠대상 |
| U-2 | 학생 `?devStudent=stu_demo_037`(가좌고) 홈 → 2025·2024 칸 | '현재 학교 공개 원본 · 재학 기록 아님' + '해당 학년도 학적 정보 없음' + 원본 목록(가좌고 2025·2024 고1 2학기) · 원본 보기(PDF)·내려받기 | 읽기(가좌고 기록 TTL 안일 때) |
| U-3 | 같은 카드 학년 '고2', 학기 '1학기' | 세 칸 모두 고2 1학기 원본, 배지 '같은 학교 다른 학년'/'재학 기록 아님' · '내 학년·학기로' 복귀 | 읽기 |
| U-4 | 관리자 `http://localhost:5174/assessment/evaluation-plans` 학교 Dropdown | '담당 학교'/'조회한 외부 학교' 묶음(관리자 `?devAdmin=adm_demo_b01`일 때 두 묶음이 보임) | 읽기 |
| U-5 | '학교 검색' → '한솔고' → 한 곳 '이 학교 선택' | 대상 확인 패널(이름·지역·주소·18개 구간). '취소'하면 수집 0 | 검색만 읽기 |
| U-6 | 확인 패널 '이 학교로 조회 시작' | 외부 학교 띠(이름·지역·주소) + 3개년 18구간 자동 확인 | ⚠대상(새 학교 매핑 `si_…`·원본 수집) |
| U-7 | 분석 탭 → 문서 '검토하기' | 머리글 '승인 대상 X개 · 확인 필요 Y개', 분석 요약의 기본 승인/관리자 수정/확인 필요/제외 수, 필터 6종 | 읽기(값을 고치면 공유 초안 저장 — 학생 비공개) |
| U-8 | 확인 필요 항목만 고침 → '최종 승인' → 4단계(원본 파일 대조 → 과목 연결 → 결과 확인 → 최종 승인) | 마지막 '최종 승인 · N개 값 확정하고 학생에게 공개' 1회 | ⚠대상(확정 기록 1건·학생 공개 변경) — **QA용으로 정한 문서에서만** |
| U-9 | 결과 화면 '확정 내용 수정' → 1개 수정 → 최종 승인 | 수정 중 학생 화면은 이전 값, 승인 후 새 값 · '확정 이력'에 2차 확정과 '직전 확정 대비 변경 1개(이전 → 수정)' | ⚠대상 |

주의: 07:17 KST 이후에는 가좌고·대신고도 화면 진입만으로 학교알리미 재확인이 시작될 수 있다(1-7). 시연 명단의 다른 학교 학생으로 바꾸면 그 학교 수집이 바로 시작된다.

## X-3. 변경 파일

- Backend(4): `assessment/service/plan/OfficialPlanQueryService.java` · `dto/plan/StudentOfficialPlanResponse.java` · `controller/StudentEvaluationPlanController.java` · `controller/AdminStudentViewController.java`
- Backend 시험(2): `controller/StudentOfficialPlanApiTest.java`(1건 추가) · 신규 `service/plan/OfficialPlanQueryServiceTest.java`(6건)
- Frontend 학생(8): `api/types.ts` · `api/evaluationPlansApi.ts` · `api/http/evaluationPlansHttp.ts` · `components/home/OfficialPlansCard.tsx` · `components/home/dashboard.module.css` · `components/official/OfficialDocuments.tsx` · `model/officialEmptyText.ts` · `routes/EvaluationPlansRoute.tsx`
- Frontend 관리자(16): `components/SchoolYearFilters.tsx` · `model/planSchoolContext.ts` · 신규 `model/confirmedChanges.ts`·`.test.mjs` · `review/{ReviewWorkspace,ConfirmStep,OverviewStep,PerformanceStep,ReReviewPanel}.tsx` · `review/reviewFilter.ts`·`.test.mjs` · `review/review.module.css` · `routes/{PlanSlotsRoute,PlanResultRoute,SchoolDirectorySearch}.tsx` · `routes/planSlots.module.css` · `routes/SchoolDirectorySearch.module.css`
- E2E(4): `tests/a27o-ui.spec.ts`(대상 확인·외부 학교 띠·최종 승인 요약·TEST-06 재수정 추가) · `a27n-ui.spec.ts`·`a27-admin-ui.spec.ts`(필터·단계 이름) · `a27-student-ux.spec.ts`(SCHOOL_PUBLIC·학년 선택)
- 문서(2): `docs/api/api-contract.md`(§10-1-3 A28-01 변경) · 이 보고서

## X-4. API · DB

- API: 학생·관리자 학생 화면 보기 공식 원본 3개 경로에 선택 쿼리 `grade`, 응답 `basis` 추가(하위 호환), ensure 재시작 후 동명 상태 정정. 새 Endpoint 없음. 관리자 검토·확정·재확정·학교 검색 API 변경 없음.
- DB: **Migration 추가 0**, 기존 Migration 수정 0. Flyway 26 그대로.

## X-5. 검증 결과 (이번 실행)

| 항목 | 결과 | 비고 |
|---|---|---|
| Frontend typecheck(`npm run typecheck`) | **PASS** | 학생·관리자 |
| Frontend lint(oxlint --deny-warnings) | **PASS** | |
| Frontend build | **PASS** | |
| Node 시험 | **156/156 PASS** | 기존 152 + 신규 4(기본 승인 168개 시나리오, 이력 변경 비교 3) |
| Backend Unit + ArchUnit | **454건: 451 PASS · 3 skip** | 1회차 `DemoRosterTest` 1건은 시험용 사본에 `../e2e/assessment/fixtures`가 없어 실패(환경) → 사본 보완 후 그 클래스 13/13 PASS. 저장소 `backend/build`는 사용자 8080이 쓰고 있어 저장소 밖 사본에서 실행 |
| Backend IT `StudentOfficialPlanApiTest` + `SchoolDirectoryOfficialViewApiTest` | **12/12 PASS** | 신규 '과거 학년도 공개 원본·학년 선택·칸 밖 404·조회만으로 쓰기 0' 포함 |
| Backend IT 전체 | **NOT RUN(중단)** | 실행 6분 뒤 시스템 메모리 부족으로 Claude Code 가 작업을 강제 종료(가용 RAM 0.3GB 안팎). 결과 0건 — 재실행하지 않았다 |
| Assessment E2E 전체 | **NOT RUN** | 메모리 부족으로 시작하지 않음. 수정한 E2E 5개 파일은 `tsc` 타입 검사만 PASS. 실행 준비: 저장소 밖 래퍼 설정 `scratchpad/a28-build/playwright.a28.config.ts`(시험 Backend를 사본에서 기동) |
| REPLAY E2E | **NOT RUN** | |
| 4개 해상도 화면 확인 | **NOT RUN** | 사용자 8080이 아직 이전 Backend 코드(아래) |

## X-7. 데이터 보존

- Claude 실행분의 사용자 DB 쓰기 0. 행 수: 사용자 조작 직후 스냅샷(`rowcounts-now.tsv`, 01:07)과 작업 끝(`rowcounts-after-a28-dev.tsv`) diff 0.
- 사용자 조작으로 생긴 변화(참고): 01:00경 관리자 화면 삼각산고 3개년 자동 수집 — 원본 116→140, 문서·분석·Revision 192→210, 슬롯 연결 186→204, 확인 기록 12→15.
- Storage·기존 확정값·학교 매핑 변경 0(Claude). 일회용 시험 컨테이너는 Testcontainers 가 정리.

## X-8. 남은 일 · Open

1. **사용자 8080 재시작 필요**: 8080(PID 23308)은 작업 전 코드다. 학생·관리자 화면(Vite 5173·5174)은 새 코드가 이미 반영돼 있어, 재시작 전에는 학생 3개년 카드의 과거 학년도가 '조회할 학교 정보가 없어요'로 보이고 학년 선택이 무시된다. Migration 이 없어 재시작해도 DB 변경 0('Schema is up to date' 예상). 메모리가 확보되면 `start-backend.ps1`로 재시작한다(사용자 확인 후).
2. Backend IT 전체·Assessment E2E·REPLAY·해상도 확인은 메모리 확보 뒤(다른 앱 종료) 순차 실행해야 완료 판정이 가능하다. 지금 상태는 **PARTIAL**.
3. 항목별 '기본 승인/관리자 수정' 출처를 확정 기록에 열로 저장하지 않는다(§39-13 기존 결정). 이력 화면은 같은 분석 결과의 AI 후보와 비교해 계산한다(다른 분석 결과로 확정한 기록은 '후보 없음'). 저장이 필요하면 계약·Migration 결정이 필요하다(Open).
4. HWP·HWPX 문서 검토는 기존 구조 위치 확정 흐름 그대로라 '최종 승인' 화면이 적용되지 않는다(PDF만).
5. 원본 SHA 대조는 여전히 관리자가 원본 파일을 골라야 한다(정책 유지). 학교알리미 원본은 '원본 내려받기' 후 대조한다.

| 요구 | 판정 |
|---|---|
| A28-01 학생 3개년 원본 | (1차) PARTIAL → **X-9 재실행 후 PASS(자동화)** · 사용자 직접 검증 NOT RUN |
| A28-02 관리자 전국 학교 조회 | (1차) PARTIAL → **X-9 재실행 후 PASS(자동화)** · 사용자 직접 검증 NOT RUN |
| A28-03 기본 승인·최종 승인 | (1차) PARTIAL → **X-9 재실행 후 PASS(자동화)** · 사용자 직접 검증 NOT RUN |
| §5 확정 후 수정·재확정 | (1차) PARTIAL → **X-9 재실행 후 PASS(자동화, E2E TEST-06)** · 사용자 직접 검증 NOT RUN |

(X-5·X-8의 NOT RUN·재시작 필요 항목은 아래 X-9에서 해소했다.)

## X-9. 8080 재시작 · 회귀 재실행 결과 (2026-11-22 06:53~07:19, 사용자 지시)

**8080 재시작**
- 이전 프로세스 트리(powershell 5132 → gradle → java 23308) 종료 → `start-backend.ps1` 재기동(java **31140**, 로그 `backend-20261122-065356.log`).
- Flyway 'Successfully validated 26 migrations' · 'Schema `lh_local_run` is up to date. No migration necessary.' — DB 변경 0.
- 사용자 DB 실제 응답(GET, stu_demo_037): 2026·2학기 `ACADEMIC_RECORD` 고1 8건 / 2025·2학기 `SCHOOL_PUBLIC` 고1 8건(2025학년도 2학기 파일만) / 2025·1학기·grade=2 `SCHOOL_PUBLIC` 고2 8건(2025학년도 1학기 파일만) / 2023 `basis=null` 0건.

**회귀 (모두 일회용 DB·저장소 밖 Backend 사본, 사용자 DB·Storage 미연결)**

| 항목 | 결과 |
|---|---|
| Backend IT 전체 51클래스(3묶음 순차) | **269/269 PASS** (53 + 86 + 130, skip 0). 부록 Q 233건과 범위가 다르다 — 이번에는 Student Care·common 통합 시험 7클래스를 포함한 `@Tag("integration")` 전체 |
| Assessment E2E 전체 | 1회차 **66/67** — 실패 1건 `z-a27-autosync.spec.ts:106`: 학적 없는 지난 학년도 칸에 원본이 **보이지 않아야** 한다는 A28 이전 정책 단언(실제 화면은 새 정책대로 '현재 학교 공개 원본 · 재학 기록 아님' + 1건 표시). 시험 규칙 §18(Spec 변경 → 낡은 시험 수정)에 따라 새 정책 단언(SCHOOL_PUBLIC·재학 기록 아님·학적 없음 표시·원본 1건)으로 고친 뒤 그 파일 **2/2 PASS**. 학년도 불일치 공시 0건 단언은 유지 |
| REPLAY E2E(manifest SHA `1802759cb36e5b93`, 부록 Q와 동일) | **8/8 PASS** |
| 사용자 환경 4개 해상도(800·1366·1600·1920, 쓰기 요청 차단) | 학생 홈 · 관리자 평가계획서 · 관리자 검토(운정고 PDF 182항목: '승인 대상 182 · 확인 필요 0') · 결과 화면 — 가로 넘침 0, GET 오류 0, 페이지 오류 0. 캡처 `C:\learnershigh-local-run\a28-20261122\screens-a28\`(16장). 학생 홈의 '공식 원본 상태를 확인하지 못했어요'는 점검용 POST 차단 때문이다 |
| 변경한 E2E 파일 | `z-a27-autosync.spec.ts` 추가(위) |

- E2E 실행용 래퍼 설정(저장소 밖): `scratchpad/a28-build/playwright.a28.config.ts`, `playwright.a28-live.config.mts` — 저장소 설정을 그대로 쓰고 시험 Backend 작업 폴더만 사본으로 바꾼다.
- 1회차 전체 IT(01:42)는 메모리 부족으로 Claude Code 가 강제 종료했다(결과 0건). 이번에는 다른 앱 종료 뒤(가용 3.8~4.6GB) 묶음 실행했다.

**데이터 보존**: 작업 끝 행 수 8,642(사용자 조작 반영) = 직전 스냅샷과 diff 0. Claude 실행분 쓰기 0. Migration 0. Commit 0.

**주의(07:19 기준)**: 가좌고·대신고 학교알리미 확인 기록의 24시간이 지났다. 이제 학생 홈·관리자 평가계획서 진입만으로 그 학교 학교알리미 재확인(원본이 바뀌었으면 새 Revision 저장)이 시작될 수 있다.

---

# A28 — Migration 최종 확인 및 사용자 수동 검증 실행 준비 (2026-11-22 07:28~)

- 원칙: 별도 QA 환경 없음 · 사용자 DB `lh_local_run` 그대로 · Claude 는 사용자 DB 쓰기 시나리오를 실행하지 않음(GET·쓰기 차단 화면 점검만) · Commit 0.

## M-1. Migration

| 항목 | 결과(이번 실행) |
|---|---|
| 적용 전 Flyway | `flyway_schema_history` 26행, 실패 0, 최신 `202611210200` |
| 저장소 Migration 파일 | `database/migrations/V*.sql` 26개, 최신 `202611210200`(파일 최종 수정 11-21 10:41) |
| 버전 대조 | DB 26개 버전 = 파일 26개 버전(집합·순서 동일) |
| Pending | **0건** |
| checksum | Backend 기동 시 Flyway validate 'Successfully validated 26 migrations' — 불일치 0 |
| A28 코드의 새 테이블·열 요구 | 없음(`basis`·기본 승인 요약·이력 변경 비교는 기존 데이터에서 계산) |
| 적용 여부 | **불필요 → 적용하지 않음.** 새 Migration 작성 0, 재적용 0, 실제 DB 변경 0 |
| 데이터 보존 | 행 수 8,642(40표) = 07:19 스냅샷과 diff 0(`rowcounts-0728.tsv`) |

## M-2. 실행 상태와 재기동

- **07:28 점검 시 8080·5173·5174 모두 종료되어 있었다**(MySQL 만 실행). 로그오프 흔적 없음(explorer 00:35 이후 그대로), 시스템 메모리 고갈 이벤트 없음, 각 로그에 종료 기록 없음 — 07:19~07:28 사이 종료, **원인 미확정**. 07:15 화면 점검 때는 정상 응답했다.
- 기존 MySQL 컨테이너는 유지(새 컨테이너 0). 세 서버는 공식 스크립트로 다시 띄웠다.

| 서비스 | 작업 디렉터리 | 실행 명령(실제) | 결과 |
|---|---|---|---|
| MySQL | — | 기존 컨테이너 유지 `lh-local-run-mysql`(Up 7시간, 127.0.0.1:33307) | 기존 유지 |
| Backend 8080 | `C:\learnershigh-assessment-integration\backend`(스크립트가 이동) | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\learnershigh-local-run\start-backend.ps1` (WMI `Win32_Process.Create`, 작업 폴더 `C:\learnershigh-local-run`) → 스크립트 안 `.\gradlew.bat --no-daemon bootRun --args="--spring.profiles.active=local-run"` | 성공 · java **13244** · 07:29 기동 6.4초 |
| 학생 Frontend 5173 | `C:\learnershigh-assessment-integration\frontend` | `... -File C:\learnershigh-local-run\start-student.ps1` → `npm run dev:student` | 성공 · node **14284** |
| 관리자 Frontend 5174 | 같음 | `... -File C:\learnershigh-local-run\start-admin.ps1` → `npm run dev:admin` | 성공 · node **35844** |

- WMI 로 띄운 이유: 이 세션 셸의 자식으로 두면 세션 정리 때 함께 종료될 수 있다(부록 R). 창 없이 실행되고 출력은 로그로만 남는다.
- 로그: `C:\learnershigh-local-run\backend-20261122-072918.log`(UTF-16) · `student-20261122-0729*.log` · `admin-20261122-0729*.log`
- 최신 코드: Backend 소스 최종 수정 01:23 < 기동 07:29, Frontend 는 Vite 가 소스를 직접 제공(최종 수정 01:37).

**실행 설정(비밀값 제외)**

| 항목 | 값 |
|---|---|
| Spring Profile | `local-run`(로그 'The following 1 profile is active') |
| DB | `jdbc:mysql://127.0.0.1:33307/lh_local_run`(로그) · 환경 변수 `DB_URL`·`DB_USERNAME`·`DB_PASSWORD`(계정·암호는 컨테이너 환경에서 메모리로만 읽음) |
| Storage | `ASSESSMENT_STORAGE_ROOT=%USERPROFILE%\.learnershigh-extension\local-run-storage` |
| 시연 명단 | `ASSESSMENT_DEMO_ROSTER_ENABLED=true` |
| 분석기 | `local (ocr=windows)` — LocalPlanAnalyzer, 원문 외부 전송 없음 |
| HWP·HWPX 미리보기 | 변환기 이미지 `lh-plan-preview-converter:e6b3e1dd2ee1` 준비됨 |
| HWP·HWPX 최종 확정 | `ASSESSMENT_PLAN_REVIEW_STRUCTURED_CONFIRM_DEV` 미설정 → `false` → **서버가 400 `verified_auth_required` 로 거절** |
| 학교알리미 | `yearQueryVerified=true ttlHours=24`(로그) |
| Frontend 데이터 출처 | 기본 http(`.env` 없음, Mock 은 `VITE_ASSESSMENT_DATA_SOURCE=mock` 명시 때만) · `/api` 프록시 → `http://localhost:8080` |
| 개발 인증 | Header `X-Assessment-Student-Id` / `X-Assessment-Admin-Id`(local-run 전용). 기본 학생 `stu_demo_037`, 관리자 `adm_plan_operator`(담당 학교 0곳). 전환 `?devStudent=`·`?devAdmin=`(브라우저에 저장됨) |

## M-3. 최소 실행 검증(이번 실행)

**API(GET 만)**

| 확인 | 결과 |
|---|---|
| current-term 학생·관리자 | 200 `{2026, 2, KST_CALENDAR_MARCH_SEPTEMBER}` |
| 인증 없음 / 모르는 관리자 ID | 401 / 401 |
| 학생 공식 원본 2026·2 | 200 `ACADEMIC_RECORD` 가좌 고1 |
| 2025·2(학적 없음) | 200 `contextFound=false` · `SCHOOL_PUBLIC` 가좌 고1 |
| 2024·1·grade=3 | 200 `SCHOOL_PUBLIC` 고3 |
| grade=4 | 400 `grade: range` |
| 없는 원본 ID 내려받기 | 404 `SCHOOLINFO_SOURCE_NOT_FOUND` |
| 등록 학교 검색 '가좌' | 200 |
| 담당 학교(`managed-schools`) | `adm_demo_b01`: 가좌·대신·삼각산·진양·한림 각 4명 / `adm_plan_operator`: 0곳 |
| 전국 학교 검색 '한솔고'(학교알리미 외부 읽기) | 200 · 세종 누리로 34 / 경기 성남 분당 내정로 70, 둘 다 선택 가능 |
| 운정고 2026 평가계획서·분석·검토 초안·확정 이력 | 200 · 200 · 200 · 200(이력 0건 = 미확정) |
| 미확정 문서를 학생이 상세 조회 | 404 |

**화면(쓰기 요청 차단, 800·1366·1600·1920)** — 학생 홈(가좌)·학생 홈(대신)·관리자 평가계획서(b01)·관리자 평가계획서·관리자 검토(운정 PDF)·결과 화면 = 6화면 × 4 = 24장: 가로 넘침 0, GET 오류 0, 페이지·콘솔 오류 0(차단으로 생긴 ERR_FAILED 제외). 캡처 `C:\learnershigh-local-run\a28-20261122\screens-a28-0730\`.
- 학생 홈 '공식 원본 상태를 확인하지 못했어요'·관리자 '자동 확인을 하지 못했어요'는 **점검용 POST 차단 때문**이다(실제 결함 아님). 대신고 실제 화면의 '학교 선택 필요' 전환은 단위 시험으로만 확인했다(POST 필요).
- 삼각산고 2026 고1 2학기 PDF 검토: '승인 대상 133개 · 확인 필요 41개' / 운정고 2026 고1 2학기 PDF: '승인 대상 182 · 확인 필요 0'.

**Assessment E2E 재실행(일회용 DB·시험용 Backend 사본)**: 전체 67건 중 **66 PASS · 1 FAIL · SKIP 0**(07:33~07:39, 6.2분). 실패 1건 `plan-archive.spec.ts:36` = 결과 조회 화면이 시험 Backend 에 연결하지 못함(화면 '분석 결과을(를) 불러오지 못했어요 … NETWORK_ERROR', 렌더링 오류 아님) — 같은 시험이 01시대 전체 실행에서는 PASS. 결과 화면 관련 3개 파일(`plan-archive`·`a27o-ui`(TEST-06 재확정 포함)·`a27-ux`) 재실행 **17/17 PASS** → 일시적 연결 실패로 판단(재현 안 됨, 원인 미확정 · 간헐 실패 가능성으로 기록). 이번 전체 결과에는 A28 정책 변경으로 수정한 시험(`z-a27-autosync`·`a27o-ui`·`a27n-ui`·`a27-admin-ui`·`a27-student-ux`)이 포함되며 모두 PASS. 실행 전후 사용자 DB 행 수 diff 0. 로그 `scratchpad/e2e-all-0735.log`·`e2e-rerun-archive.log`.

## M-4. 화면 진입 자동 쓰기 위험 (07:29 기준, 저장값 UTC → KST)

| 학교 | 기록 | 24시간 만료(KST) | 지금 |
|---|---|---|---|
| 대신고 | 3개 학년도 SCHOOL_AMBIGUOUS | 11-22 07:16 | **만료** |
| 가좌고 | PARTIAL | 11-22 07:17 | **만료** |
| 운정고 | COMPLETED | 11-22 07:20 | **만료** |
| 한림고 | COMPLETED | 11-22 07:32 | **만료** |
| 삼각산고 | COMPLETED | 11-23 00:59 | 유효 |
| 그 외 시연 학교 | 기록 없음 | — | 첫 진입부터 수집 |

- 자동 POST 화면: 관리자 **평가계획서** 탭(선택 학교, `schoolinfo-sync`) · 학생 **홈**·**학교 평가 정보**·수행평가 상세(`official/ensure`, 학생 학교). 분석 탭·검토·결과 화면은 보내지 않는다.
- 만료 학교에 진입하면: 학교알리미 실제 조회 → 원본이 바뀌었거나 새로 공시됐으면 새 원본·문서·Revision 저장(기존 확정값·원본은 덮어쓰지 않음, 같은 SHA 재사용), 확인 기록 갱신. 대신고는 동명 후보를 다시 찾고 '학교 선택 필요'(등록 0).
- 현재 설정만으로 막는 방법: `assessment.schoolinfo.sync-ttl-hours`(기본 24)를 늘려 재시작하는 것뿐(코드 변경 없음, 적용하지 않음). 자동 수집을 끄는 별도 스위치는 없다.

## M-5. 사용자 수동 검증 체크리스트

검증 상태는 모두 **사용자 조작 기준 NOT RUN**(환경 점검과 구분). 데이터 영향: `읽기` · `초안`(공유 검토 초안, 학생 비공개) · `⚠쓰기`(사용자 DB·Storage 변경).

| # | 기능 | 접근 | 조작 순서 | 기대 결과 | 데이터 영향 | 환경 점검 | 사용자 검증 |
|---|---|---|---|---|---|---|---|
| S-1 | 학생 홈 | `http://localhost:5173/assessment?devStudent=stu_demo_037` | 접속 → 학교 칸·KPI 4개·바로가기 | 가좌고 2026 1학년 2학기, KPI 실제 값 | ⚠쓰기 가능(가좌 기록 만료 → 진입 시 학교알리미 재확인) | PASS | NOT RUN |
| S-2 | 3개년 원본 | 홈 '학교 평가계획서 원본 · 3개년' | 2026·2025·2024 칸 비교 | 2026 = 학적 칸, 2025·2024 = '현재 학교 공개 원본 · 재학 기록 아님' + '해당 학년도 학적 정보 없음' + 원본 목록(파일명·형식·학교알리미) | 읽기 | PASS | NOT RUN |
| S-3 | 학년·학기 선택 | 같은 카드 '학년'·'학기' | 고2·1학기 → '내 학년·학기로' | 세 칸 모두 고2 1학기 원본, 배지 갱신, 복귀 | 읽기 | PASS(API) | NOT RUN |
| S-4 | 원본 보기·내려받기 | 원본 행 버튼 | PDF '원본 보기', HWP '내려받기' | PDF 새 탭, HWP 파일 저장(가좌는 HWP·HWPX 라 '원본 보기' 없음) | 읽기 | NOT RUN | NOT RUN |
| S-5 | 동명 학교 | `?devStudent=stu_demo_021` | 홈 → 안내 → 후보 지역·주소 확인 → **고르지 않고** 멈춤 | '같은 이름의 학교가 있어요' + 지역·주소 후보 | 후보 표시 시 학교알리미 검색·상세 재조회 + 확인 기록 갱신. **선택하면** 열람 선택 1행 + 3개년 수집 ⚠쓰기 | 단위 시험만 | NOT RUN |
| A-1 | 담당/외부 학교 | `http://localhost:5174/assessment/evaluation-plans?devAdmin=adm_demo_b01` | 학교 Dropdown 열기 | '담당 학교'(가좌·대신·삼각산·진양·한림) / '조회한 외부 학교' 묶음 | ⚠쓰기 가능(선택 학교 기록 만료 시 자동 확인) | PASS | NOT RUN |
| A-2 | 전국 학교 검색 | '학교 검색' | '한솔고' → 두 곳 비교 → '이 학교 선택' → 확인 패널 → **취소** | 패널에 이름·지역·주소·18개 구간, 취소 시 수집 0 | 읽기(외부 검색) | PASS(API) | NOT RUN |
| A-3 | 외부 학교 3개년 | 확인 패널 '이 학교로 조회 시작' | 진행 표시 → 18구간 → 학년도 변경 → 원본 보기 → 다른 학교 전환 | '외부 학교 평가계획서 조회' 띠 + 이름·지역·주소, 미공시·실패 구분, 전환 시 이전 학교 문서 사라짐 | ⚠쓰기(새 학교 키 `si_…` 매핑·원본 수집·자동 분석) | E2E(일회용) | NOT RUN |
| A-4 | AI 분석·검토 | 분석 탭 → 운정고 2026 고1 2학기 PDF '검토하기' | 원문 Viewer·분석 요약·과목 선택·수행평가·채점기준·근거 쪽 이동·필터 | '승인 대상 182 · 확인 필요 0' | 읽기(값을 고치면 초안) | PASS | NOT RUN |
| A-5 | 확인 필요만 고치기 | 삼각산고 2026 고1 2학기 PDF | 필터 '확인 필요'(41) → 값 입력 또는 '원문에 없음' → 0 까지 | 기본 승인 133 유지, 확인 필요 0 | 초안 | PASS(요약) | NOT RUN |
| A-6 | 최종 승인 | 위 문서 '최종 승인' | ① 원본 내려받아 대조 파일 선택 ② 과목 연결 ③ 결과 확인 ④ 확인 체크 → '최종 승인 · N개 값…' | 결과 화면 이동, 확정 이력 1차 | ⚠쓰기(확정 1건·학생 공개) — **시험용 문서에서만** | E2E(일회용) | NOT RUN |
| A-7 | 확정 내용 수정 | 결과 화면 '확정 내용 수정' | 수정 시작 → 1개 수정 → 최종 승인 | 수정 중 학생은 이전 값, 승인 후 새 값, 이력 2차 + '직전 확정 대비 변경 1개(이전 → 수정)' | ⚠쓰기 | E2E(일회용) | NOT RUN |
| A-8 | 학생 공개 확인 | `?devStudent=stu_demo_033`(삼각산 고1) 또는 `stu_demo_001`(운정 고1) → 학교 평가 정보 | 확정 전·후 비교 | 확정 전 비공개, 확정 후 최신값 | 운정은 기록 만료라 진입 시 ⚠쓰기 / 삼각산은 읽기 | — | NOT RUN |
| F-1 | 수행평가·노트·파일·피드백 | 학생 `stu_demo_037` + 관리자 `?devAdmin=adm_demo_b01` | 수행평가 추가 → 정보 수정 → 탐구노트(한글 IME) → 파일 첨부 → 피드백 요청 → 관리자 확인·답변 → 학생 확인 → 노트 수정 → 새로고침 | 저장 유지, 요청 당시 Snapshot 유지 | ⚠쓰기(그 학생 데이터·Storage) | — | NOT RUN |

**권장 시험 문서**
- 최종 승인 한 번만 볼 때: 운정고 2026 고1 2학기 PDF(`plan_0a97ee81…`, 182/0). 학생 확인 `stu_demo_001`(진입 시 운정고 재수집 가능).
- '확인 필요만 고치기'까지 볼 때: 삼각산고 2026 고1 2학기 PDF(`plan_3d447906…`, 133/41). 학생 확인 `stu_demo_033` — 기록 유효(11-23 00:59)라 자동 재수집 없음.
- **가좌고 문서는 모두 HWP·HWPX 라 최종 확정이 서버에서 거절된다(400 `verified_auth_required`)** — 최종 승인 시험에 쓰지 않는다.

## M-6. 재실행·종료 방법

1. 상태: `netstat -ano | findstr LISTENING | findstr ":8080 :5173 :5174 :33307"` → PID → `Get-CimInstance Win32_Process -Filter "ProcessId=<PID>" | Select CommandLine` 로 이 저장소 실행인지 확인(`learnershigh-assessment-integration`·`local-run` 포함).
2. MySQL: `docker start lh-local-run-mysql`(이미 Up 이면 생략). 새 컨테이너를 만들지 않는다.
3. Backend: PowerShell 새 창에서 `powershell -ExecutionPolicy Bypass -File C:\learnershigh-local-run\start-backend.ps1`(창 닫기·Ctrl+C = 종료).
4. 학생·관리자: 각각 새 창에서 `...\start-student.ps1`, `...\start-admin.ps1`.
5. 정상 확인: 로그 'Schema `lh_local_run` is up to date'·'Started LearnersHighExtensionApplication' · `http://localhost:5173/assessment`·`http://localhost:5174/assessment` 200 · 인증 없는 `http://localhost:8080/api/student/assessment/current-term` 401.
6. 안전한 종료: 스크립트 창이면 Ctrl+C. 창 없이 띄운 경우(이번처럼 WMI) 1번으로 PID·명령줄 확인 후 그 트리(실행기 powershell → cmd → gradle java → 앱 java)만 `Stop-Process`. 다른 java·node 는 끄지 않는다.
7. 흔한 오류: 'lh-local-run-mysql 컨테이너가 실행 중이 아닙니다' → 2번 / 8080 사용 중 → 1번으로 기존 프로세스 확인 / 화면이 Mock 처럼 보임 → `VITE_ASSESSMENT_DATA_SOURCE` 설정 여부 확인 / 메모리 부족 → Chrome·Notion·Discord·ChatGPT 종료.

---

# A28 후속 개선 — 담당 학생 확대 · 원클릭 최종 승인 · 학생 Viewer · Dashboard 재구성 (2026-11-22 08:30~)

- 상태: **코드 구현 완료 · 회귀 일부 미완료(PARTIAL)** — 전체 통합 시험·E2E·Migration 사용자 DB 적용·8080 재시작은 메모리 부족으로 진행하지 않았다(F-8).
- 원칙: Commit 0 · 사용자 DB 쓰기 0(Claude 실행분) · Student Care·공용 인증 변경 0 · 기존 Migration 수정 0.
- 수정 전 사본: `C:\learnershigh-local-run\a28-20261122\pre-edit2\`

## F-1. 기존 문제 원인

| 요구 | 원인(코드 근거) |
|---|---|
| A28-04 학생 확대 | 관리자 학생·학교 목록은 시연 명단(`demo-roster-2026.json`, local-run 전용 코드 리소스)에서 온다. 13개 학교 중 10곳이 없었고(광명·세화·제주는 A·C지점에만 있음), 학교알리미 자동 확인은 관리자 매핑이 없으면 **이름으로만** 학교를 찾아 경일고(동명 4곳)·광명고(2)·세화고(3)·현대고(2)는 '학교 선택 필요'가 된다 |
| A28-05 원본 대조 | 확정 화면이 관리자가 고른 로컬 원본의 브라우저 SHA 를 요구(`blockersOf` hashMatches) — 서버가 이미 보관한 학교알리미 원본도 다시 골라야 했다 |
| A28-05 HWP·HWPX `verified_auth_required` | `EvaluationPlanService.review`: HWP·HWPX 는 `structured-confirm-dev`(기본 false)가 아니면 무조건 거절. 목적은 '관리자 인증 연동 전 HWP 공식 확정 금지'였으나 PDF 는 같은 개발 인증으로 확정 가능(형식별 불일치) |
| A28-05 승인 대상 0/16 | 기본 승인 집계(`defaultIncluded`)가 PDF 쪽 번호만 근거로 인정 — HWP·HWPX 는 근거가 원문 위치(locator)라 전부 '확인 필요' |
| A28-06 HWP 열람 | 학생 미리보기 경로가 PDF 만(HWP·HWPX 415). 관리자는 변환기(§38-10)를 쓰지만 학생 경로에는 연결이 없었다 |
| A28-07 레이아웃 | 바로가기 옆 좁은 원본 카드 + 칸 안 스크롤(max-height 260px) · 최근 기록·메모가 맨 아래 · 달력이 오른쪽 카드와 같은 행 |

## F-2. 수정 내용

**A28-04 (DB 쓰기 없음 — 시연 명단 코드 리소스)**
- 13개 학교를 학교알리미에서 검색해 사용자 지정 주소와 **정확히 일치하는 후보만** 골랐다(UNRESOLVED 0). 첫 결과 자동 선택 없음.
- 명단 학교에 `schoolinfoSchoolId`·`address` 고정 필드 추가(`DemoRoster.School`, 같은 학교 키는 같은 값이어야 기동). 학교알리미 자동 확인은 관리자 매핑이 없고 고정값이 있으면 **이름 검색 없이 그 학교 상세만** 확인하고 이름·주소가 모두 같을 때만 수집(다르면 보류). 관리자 매핑은 만들지 않는다.
- B지점(`adm_demo_b01`)에 합성 학생 52명(학교당 4명: 남 2·여 2, 1·2·3학년 + 1명) `stu_demo_061`~`stu_demo_112` 추가. 기존 60명·학교·학년 변경 0. 광명·세화·제주는 기존 학교 키를 같은 학교로 재사용하고 기존 학생에도 같은 고정값만 더했다. 수강 과목 = 같은 학년 기존 학생의 공통 카탈로그 과목. 생성 스크립트 재실행 시 추가 0(멱등).

**A28-05 원클릭 최종 승인**
- 서버: `sourceCheck.method = SERVER_STORED_ORIGINAL` 추가(`OfficialOriginalVerifier`) — 학교알리미 슬롯 연결·같은 슬롯·원본 기록 SHA = Revision SHA·보관 바이트 재계산 SHA·크기를 확인. 통과하면 HWP·HWPX 도 개발 플래그 없이 확정. 로컬 대조(LOCAL) 경로의 기존 보호는 그대로, 개발 Header 운영 차단도 그대로.
- 기록: `source_check_method=SERVER_STORED_ORIGINAL`, `manual_comparison_confirmed=false`(수동 검토로 기록하지 않음) → **새 Migration `V202611212328__assessment_plan_review_server_source_check.sql`**(CHECK 제약 2개 교체, 데이터 변경 0).
- 화면: 학교알리미 수집 원본이면 '최종 확정' 4단계 대신 **최종 승인 패널 하나**(요약 → 필요하면 앞 단계 수정 → '최종 승인' → 확인 창 1회). AI 추출값 기본 승인, 관리자 결정 우선, 값·근거 없는 항목·이름이 맞는 학업 과목 없는 과목·다른 학년·제외 과목은 넣지 않고 경고(값 생성 없음). 과목 기본 연결은 '분석 과목명 = 슬롯 학업 과목명'이 정확히 하나일 때만. 관리자 직접 업로드 문서는 기존 단계별 확정 유지.
- HWP·HWPX 기본 승인 집계가 원문 위치를 근거로 인정(16개 → 승인 대상 16).
- 확정 후 수정·재확정·이력 비교(A28 X)는 그대로 쓰며, 재확정도 같은 서버 검증으로 1회 승인.

**A28-06 학생 원본 Viewer**: 원본 목록 '원본 보기'(PDF·HWP·HWPX 모두) → 앱 안 Modal + pdf.js Viewer(관리자와 같은 컴포넌트: 쪽 이동·확대·축소·폭 맞춤·새 탭) + '원본 내려받기'·닫기. HWP·HWPX 는 서버 변환 미리보기(원본 아님 안내), 변환기 없음·실패는 원인 + 내려받기. 서버 학생 미리보기 경로가 같은 변환기·캐시를 쓰도록 연결(칸 규칙·SHA 검증 동일).

**A28-07 Dashboard**: KPI → [바로가기 | 최근 업데이트] → 평가계획서 원본 3개년(전체 폭) → [메모 1 : 다가오는 수행평가 2 : 피드백 2] → Calendar(전체 폭). 카드 내용·API 그대로 이동(중복 0). 원본 목록은 칸 안 스크롤 제거, 처음 4개 + '전체 n개 보기', 파일명 2줄(전체는 마우스 올리면). 반응형: 본문 1180px 이하 1:1.5:1.5, 980px 이하 2열(메모 전체 폭)·바로가기/최근 1열, 640px 이하 1열.

## F-3. 학교 13곳 식별 결과 · 추가 학생

| # | 입력 | 학교알리미 정식 이름 | 시도 | 주소(일치) | 고유 ID | 같은 이름 학교 수 | 학교 키 | 결과 |
|---|---|---|---|---|---|---|---|---|
| 1 | 경일고 | 경일고등학교 | 부산광역시 | 부산광역시 강서구 영강길 153-42 | `a0e95c21-74c7-4d65-b7f1-a8a0eb951342` | 4 | `sch_demo_gyeongil` | RESOLVED |
| 2 | 해강고 | 해강고등학교 | 부산광역시 | 부산광역시 해운대구 해운대해변로 33 | `e26e004a-f24a-4e48-a6f0-143d9e3d9451` | 1 | `sch_demo_haegang` | RESOLVED |
| 3 | 서강고 | 서강고등학교 | 전남광주통합특별시 | 전남광주통합특별시 북구 서강로 1 | `0ba67f00-b7c4-4e4d-8a7b-367eb0232892` | 1 | `sch_demo_seogang` | RESOLVED |
| 4 | 보라고 | 보라고등학교 | 경기도 | 경기도 용인시 기흥구 한보라1로43번길 7 | `499aa21f-2d59-4154-b01a-5cbfbb6bcb5a` | 1 | `sch_demo_bora` | RESOLVED |
| 5 | 광명고 | 광명고등학교 | 경기도 | 경기도 광명시 오리로876번길 17 | `b277f9a9-2933-424f-9870-043119f35c36` | 2 | `sch_demo_gwangmyeong` | RESOLVED |
| 6 | 가정고 | 가정고등학교 | 인천광역시 | 인천광역시 서해구 서달로 162 | `425ad6e7-0638-4108-9a16-f44c8268554c` | 1 | `sch_demo_gajeong` | RESOLVED |
| 7 | 효암고 | 효암고등학교 | 경상남도 | 경상남도 양산시 서창로 144 | `f6d2468c-3eab-45f4-9214-47d17e869450` | 1 | `sch_demo_hyoam` | RESOLVED |
| 8 | 제주고 | 제주고등학교 | 제주특별자치도 | 제주특별자치도 제주시 1100로 3213 | `74a9c6e5-4e9e-4f46-9df2-62650f2a551f` | 1 | `sch_demo_jeju` | RESOLVED |
| 9 | 상산고 | 상산고등학교 | 전북특별자치도 | 전북특별자치도 전주시 완산구 거마평로 130 | `ddda6440-86b2-4452-8286-260f760adf21` | 1 | `sch_demo_sangsan` | RESOLVED |
| 10 | 하나고 | 하나고등학교 | 서울특별시 | 서울특별시 은평구 연서로 535 | `1f326780-7ce2-4730-8835-7d8057a70afb` | 1 | `sch_demo_hana` | RESOLVED |
| 11 | 세화고 | 세화고등학교 | 서울특별시 | 서울특별시 서초구 신반포로 56-7 | `7e0cc566-7b34-4f5f-b2ed-41765e58af22` | 3 | `sch_demo_sehwa` | RESOLVED |
| 12 | 포항제철고 | 포항제철고등학교 | 경상북도 | 경상북도 포항시 남구 지곡로212번길 40 | `e2f3e18a-b8a7-40b2-a6ba-1b808b5c0318` | 1 | `sch_demo_pohangsteel` | RESOLVED |
| 13 | 현대고 | 현대고등학교 | 서울특별시 | 서울특별시 강남구 압구정로 127 | `e7624b61-e239-48af-b9e1-a91ccfa9b61c` | 2 | `sch_demo_hyundai` | RESOLVED |

| 학생 ID | 이름 | 성별(합성 속성) | 학년 | 학교 |
|---|---|---|---|---|
| `stu_demo_061` | 김도윤 | 남 | 1 | 경일고등학교 |
| `stu_demo_062` | 이서아 | 여 | 2 | 경일고등학교 |
| `stu_demo_063` | 박서준 | 남 | 3 | 경일고등학교 |
| `stu_demo_064` | 최하린 | 여 | 2 | 경일고등학교 |
| `stu_demo_065` | 정하준 | 남 | 1 | 해강고등학교 |
| `stu_demo_066` | 강지우 | 여 | 2 | 해강고등학교 |
| `stu_demo_067` | 조시우 | 남 | 3 | 해강고등학교 |
| `stu_demo_068` | 윤수아 | 여 | 3 | 해강고등학교 |
| `stu_demo_069` | 장주원 | 남 | 1 | 서강고등학교 |
| `stu_demo_070` | 임다은 | 여 | 2 | 서강고등학교 |
| `stu_demo_071` | 한지호 | 남 | 3 | 서강고등학교 |
| `stu_demo_072` | 오수빈 | 여 | 1 | 서강고등학교 |
| `stu_demo_073` | 서예준 | 남 | 1 | 보라고등학교 |
| `stu_demo_074` | 신채원 | 여 | 2 | 보라고등학교 |
| `stu_demo_075` | 권건우 | 남 | 3 | 보라고등학교 |
| `stu_demo_076` | 황예린 | 여 | 2 | 보라고등학교 |
| `stu_demo_077` | 안현우 | 남 | 1 | 광명고등학교 |
| `stu_demo_078` | 송지안 | 여 | 2 | 광명고등학교 |
| `stu_demo_079` | 전우진 | 남 | 3 | 광명고등학교 |
| `stu_demo_080` | 홍나은 | 여 | 3 | 광명고등학교 |
| `stu_demo_081` | 유선우 | 남 | 1 | 가정고등학교 |
| `stu_demo_082` | 고소율 | 여 | 2 | 가정고등학교 |
| `stu_demo_083` | 문유찬 | 남 | 3 | 가정고등학교 |
| `stu_demo_084` | 양윤서 | 여 | 1 | 가정고등학교 |
| `stu_demo_085` | 손은우 | 남 | 1 | 효암고등학교 |
| `stu_demo_086` | 배하은 | 여 | 2 | 효암고등학교 |
| `stu_demo_087` | 백지환 | 남 | 3 | 효암고등학교 |
| `stu_demo_088` | 허서윤 | 여 | 2 | 효암고등학교 |
| `stu_demo_089` | 남승현 | 남 | 1 | 제주고등학교 |
| `stu_demo_090` | 노가은 | 여 | 2 | 제주고등학교 |
| `stu_demo_091` | 하태윤 | 남 | 3 | 제주고등학교 |
| `stu_demo_092` | 곽시아 | 여 | 3 | 제주고등학교 |
| `stu_demo_093` | 성민재 | 남 | 1 | 상산고등학교 |
| `stu_demo_094` | 차유나 | 여 | 2 | 상산고등학교 |
| `stu_demo_095` | 주준혁 | 남 | 3 | 상산고등학교 |
| `stu_demo_096` | 우아린 | 여 | 1 | 상산고등학교 |
| `stu_demo_097` | 구재원 | 남 | 1 | 하나고등학교 |
| `stu_demo_098` | 나예서 | 여 | 2 | 하나고등학교 |
| `stu_demo_099` | 민로운 | 남 | 3 | 하나고등학교 |
| `stu_demo_100` | 진지유 | 여 | 2 | 하나고등학교 |
| `stu_demo_101` | 지시후 | 남 | 1 | 세화고등학교 |
| `stu_demo_102` | 엄다인 | 여 | 2 | 세화고등학교 |
| `stu_demo_103` | 채이안 | 남 | 3 | 세화고등학교 |
| `stu_demo_104` | 원서영 | 여 | 3 | 세화고등학교 |
| `stu_demo_105` | 천정우 | 남 | 1 | 포항제철고등학교 |
| `stu_demo_106` | 방채은 | 여 | 2 | 포항제철고등학교 |
| `stu_demo_107` | 공윤호 | 남 | 3 | 포항제철고등학교 |
| `stu_demo_108` | 현은서 | 여 | 1 | 포항제철고등학교 |
| `stu_demo_109` | 함도현 | 남 | 1 | 현대고등학교 |
| `stu_demo_110` | 변주아 | 여 | 2 | 현대고등학교 |
| `stu_demo_111` | 염연우 | 남 | 3 | 현대고등학교 |
| `stu_demo_112` | 여하율 | 여 | 2 | 현대고등학교 |


## F-4. 변경 파일

- Backend: `service/plan/OfficialOriginalVerifier.java`(신규) · `EvaluationPlanService.java` · `ReviewFieldRules.java` · `entity/PlanReview.java` · `repository/SchoolInfoSlotLinkRepository.java` · `service/plan/OfficialPlanQueryService.java` · `service/plan/SchoolInfoSyncService.java` · `integration/roster/DemoRoster.java` · `controller/StudentEvaluationPlanController.java` · `controller/AdminStudentViewController.java` · `resources/assessment/demo-roster/demo-roster-2026.json`
- Migration(신규): `database/migrations/V202611212328__assessment_plan_review_server_source_check.sql`
- Backend 시험: 신규 `OfficialOriginalConfirmApiTest`(IT 4) · `SchoolInfoRosterPinApiTest`(IT 2) · `OfficialOriginalVerifierTest`(3) / 수정 `DemoRosterTest`(명단 수치 갱신 + 고정 검증 1) · `OfficialPlanQueryServiceTest`(생성자)
- Frontend 관리자: 신규 `review/finalApproval.ts`·`.test.mjs` · `review/FinalApprovalPanel.tsx` / 수정 `review/ReviewWorkspace.tsx` · `ConfirmStep.tsx` · `reviewFilter.ts` · `review.module.css` · `api/types.ts` · `api/http/assessmentAdminHttp.ts`
- Frontend 학생: 신규 `components/official/OfficialViewerModal.tsx` / 수정 `OfficialDocuments.tsx`·`.module.css` · `routes/AssessmentHomeRoute.tsx` · `components/home/homeDashboard.module.css` · `dashboard.module.css` · `OfficialPlansCard.tsx`
- E2E: `live-replay/z-student-official.spec.ts`(HWPX '원본 보기' 단언 갱신)
- 문서: `docs/api/api-contract.md`(§39-14, §10-1-3 A28-06, 시연 명단 학교 고정)

## F-5. API · Migration

- API: 새 Endpoint 0. `sourceCheck.method` 값 1개 추가, 학생 원본 미리보기 HWP·HWPX 허용(같은 경로), 시연 명단 필드 추가.
- Migration: **1건 신규(`202611212328`) — 일회용 Testcontainers DB 에서 적용 확인(`OfficialOriginalConfirmApiTest` 기동 시 Flyway). 사용자 DB `lh_local_run` 에는 아직 적용하지 않았다**(백업·복제 리허설·적용은 F-8).

## F-6. 검증 결과(이번 실행)

| 항목 | 결과 |
|---|---|
| Backend Unit + ArchUnit | **458건: 455 PASS · 3 skip** (신규·수정 포함) |
| Backend IT `OfficialOriginalConfirmApiTest` | **4/4 PASS** — HWPX 서버 검증 확정(LOCAL 없이·flag false) · 슬롯 아님/다른 학년/원본 기록 불일치 거절 · 로컬 값 혼합 거절 · LOCAL 경로 `verified_auth_required` 유지 · 인증 없음 401 · 재검토 후 재확정 새 기록 |
| Backend IT `SchoolInfoRosterPinApiTest` | **2/2 PASS** — 고정 학교는 이름 검색 0회·매핑 0, 주소 다르면 보류 |
| Backend IT `StructuredPlanReviewApiTest`(기존 HWP 확정) | 3/3 PASS(1차 동시 실행) |
| Backend IT 전체 53클래스 | **NOT RUN(중단)** — 1묶음 실행 중 메모리 부족으로 Claude Code 가 강제 종료(가용 약 0.5GB), 결과 0. 재실행 안 함 |
| Frontend typecheck · lint · build | **PASS** |
| Node 시험 | **160/160 PASS**(신규 4: HWPX 16개 원클릭·PDF 관리자 수정 우선·과목 연결·무결성 조건) |
| Assessment E2E · REPLAY | **NOT RUN**(메모리) |
| 학생 Viewer·Dashboard 화면·4개 해상도 | **NOT RUN**(사용자 8080 이 아직 이전 코드 · 메모리) |
| PDF·HWP·HWPX 원클릭 승인 화면 조작 | **NOT RUN**(UI). 서버 경로는 HWPX IT 로 확인, PDF 서버 경로는 같은 코드(단위 수준)만 |

## F-7. 데이터 보존

- 사용자 DB·Storage 쓰기 0(Claude). 13개 학교 검색은 학교알리미 외부 읽기만(매핑·기록 0).
- 사용자 서버 8080(java 13244)·5173·5174 는 그대로 실행 중이며 8080 은 **이번 변경 전 코드**다(새 명단·서버 검증·Migration 미반영). Frontend(Vite)는 새 화면 코드를 이미 제공하므로, 재시작 전에는 학교알리미 문서 '최종 승인'이 서버에서 거절된다(`sourceCheck.method` 미지원).

## F-8. 남은 일(사용자 확인 필요)

1. **메모리 확보 후** 순차로: ① 사용자 DB 새 백업(+Storage SHA) ② 백업을 일회용 MySQL 에 복원해 새 Backend 로 Migration 리허설(행 수·CHECK·Flyway 27건 확인) ③ 사용자 8080 재시작(공식 스크립트, Flyway 가 `202611212328` 1건 적용) ④ 적용 후 행 수·원본·확정 이력 보존 확인 ⑤ Backend IT 전체(3묶음) ⑥ Assessment E2E·REPLAY ⑦ 화면 4개 해상도.
2. HWP·HWPX 는 검토 화면에서 값 직접 수정(수행평가 검토 단계)이 여전히 읽기 전용이다(기존 제약). 원클릭 승인은 AI 값·제외·과목 연결로 동작한다.
3. 운영 적용: 서버 원본 검증은 학교알리미 수집 원본에만 해당하고 관리자 인증 연동(1팀) 전 운영 Profile 은 개발 Header 401 이라 확정 자체가 불가하다 — 운영 인증 연결 시 이 확정 경로 권한을 다시 검토해야 한다.

## F-9. 전체 회귀 재실행 (2026-11-22 09:00~, 사용자가 다른 앱 종료 후 지시)

가용 메모리 4.4~5.6GB. 모두 일회용 DB(Testcontainers·`lh_e2e_assessment`)와 저장소 밖 Backend 사본에서 실행 — 사용자 DB·Storage 미연결.

| 항목 | 결과 |
|---|---|
| Backend Unit + ArchUnit | 458건: 455 PASS · 3 skip(F-6, 이후 Main 코드 변경 없음) |
| Backend IT 전체 53클래스(3묶음 순차) | **275/275 PASS**(57 + 88 + 130). 1묶음 1회차 실패 1건 `AdminSchoolScopeApiTest`: B지점 담당 학교 5곳·지점 간 학교 겹침 없음 단언이 A28-04 이전 명단 기준 → 새 명단(B지점 18곳, 세화고는 A·B지점 모두 학생 있음)에 맞게 기대값 수정 후 그 클래스 **1/1 PASS**. 지점 격리(다른 지점 학생 404) 단언은 그대로 |
| Frontend typecheck · lint · build · Node | PASS · PASS · PASS · 160/160(F-6) |
| Assessment E2E 전체 | **67/67 PASS**(5.1분). A28 정책 변경으로 수정한 E2E 포함. 지난 실행의 간헐 연결 실패(`plan-archive`) 재현 안 됨 |
| REPLAY E2E(manifest SHA `1802759cb36e5b93`) | **8/8 PASS**(HWPX '원본 보기' → 변환기 없음 안내·내려받기 갱신 단언 포함) |
| 화면 4개 해상도 · 원클릭 승인·학생 Viewer UI 조작 | NOT RUN(사용자 8080 이 아직 이전 코드) |

**사용자 DB 변화 확인(읽기 전용)**: 07:28 스냅샷 대비 평가계획서 210→934 · 원본 140→897 · 학교 매핑 1→4 · 확인 기록 15→21 · 학생 열람 선택 0→1. 생성 시각이 모두 **07:48~08:01 KST**(이 후속 작업·시험 시작 전)이고 주체가 `adm_demo_b01`(대신고 학교 선택 07:52 · 한솔고(성남 내정로 70) 검색 선택 07:51)·`system_student_view`(stu_demo_021 동명 학교 선택 07:48) → **사용자 수동 검증 결과**다. 08:05 이후 생성 0, 확정 기록 0, 검토 초안 5(변화 없음). 회귀 시험 전후 행 수는 같다(`rowcounts-after-regression.tsv`).

**남은 일(사용자 확인 필요)**: 새 Migration `V202611212328` 사용자 DB 적용(백업 → 복제 리허설 → 8080 재시작) — 적용 전에는 학교알리미 문서 '최종 승인'·새 시연 학생 52명·학교 고정·학생 HWP Viewer 가 사용자 화면에서 동작하지 않는다.

## F-10. Migration 사용자 DB 적용 · 8080 재시작 (2026-11-22 10:39~10:45, 사용자 지시)

| 단계 | 결과 |
|---|---|
| 백업 | `C:\learnershigh-local-run\a28-20261122\db-backup-mig\lh_local_run-full-20261122-103952.sql` 64,893,445B · SHA-256 `81dbb8fc79db33d493adca9990c3e6d8d4e126c4874bf4e7fc4e4f09840c44d2` · 종료 코드 0 · CREATE TABLE 40 · 적용 전 40표 12,305행(`rowcounts-before-migration.tsv`) |
| Storage 백업 | SHA 목록 `storage-sha256-before.txt`(1,805개, 759MB) + 사본 `storage-backup-mig\`(SHA 전부 일치) |
| 복제 리허설 | 일회용 MySQL `lh-a28-clone`(127.0.0.1:33361, tmpfs)에 덤프 복원 → 행 수 40표 동일 → 새 코드 Backend(18290, local-run, Storage 사본, 시연 명단 켬): 'Successfully validated 27 migrations' · 'Migrating … 202611212328' · 'Successfully applied 1 migration' · 행 수 변화 = `flyway_schema_history` 26→27 뿐 · CHECK 2개 교체 확인 · `adm_demo_b01` 담당 18개교 각 4명 · 새 학생 200 · 인증 없음 401 → 리허설 Backend·복제 컨테이너 삭제 |
| 재시작 직전 | **8080·5173·5174 가 이미 종료돼 있었다**(마지막 로그 08:36 HikariCP 'Thread starvation' 경고, 종료 기록 없음 — 메모리 부족 시점과 겹침, 원인 미확정). 백업 이후 DB 변화 0 확인 |
| 적용 | 공식 스크립트 `start-backend.ps1`(WMI)로 기동 → Flyway 가 `202611212328` 적용(success=1, 275ms) · 총 27건 · 실패 0 · 최신 `202611212328` |
| 적용 후 보존 | 행 수: `flyway_schema_history` 26→27 외 **39표 동일**(`rowcounts-after-migration.tsv`) · Storage 원본 1,805개 SHA 전부 동일 · 확정 기록 0(변화 없음) · 학교 매핑 ACTIVE 4(변화 없음) |
| 서버 | Backend 8080 java **13580** · 학생 5173 node **36720** · 관리자 5174 node **7856**(모두 공식 스크립트, 실행기 PID 33392·33688·8188) · 로그 `C:\learnershigh-local-runackend-20261122-104209.log` 등 |
| 새 코드 확인(GET) | 인증 없음 401 · 새 학생 `stu_demo_061` 200 · `adm_demo_b01` 담당 학교 18곳·학생 72명 · 학생 2025 원본 `basis=SCHOOL_PUBLIC` 8건 · 5173·5174 `/assessment` 200 |

- 사용자 서버가 세션 밖(WMI)에서 창 없이 실행되는 동안 오늘 세 번 기록 없이 종료됐다. 직접 검증 중에는 PowerShell 창에서 스크립트를 직접 실행해 창을 열어 두는 방식을 권장한다(M-6).
- 남은 사용자 직접 검증: 학교알리미 문서 원클릭 '최종 승인'(PDF·HWP·HWPX)·확정 내용 수정 · 학생 원본 Viewer(HWP 변환 미리보기는 처음 한 번 변환 캐시를 Storage 의 `preview-renditions` 에 만든다) · Dashboard 새 배치 · 새 시연 학생·학교(학교 고정으로 첫 진입 시 그 학교 학교알리미 수집이 시작될 수 있음).

---

# A28 후속 개선 — 통합 확정·학년 공용 원본·학교 정합성·학생 UI (2026-11-22 11:40~15:30)

- 입력: `C:\learnershigh-local-run\a28-followup-input\`(ZIP 압축 해제, 프롬프트·이미지 1~10·참고 보고서). 참고 보고서 = 저장소 A28 보고서와 동일(648줄, 차이 0).
- 결과 요약: A28-08~A28-16 구현 · **Migration 없음**(새 표·열·제약 없음) · 사용자 DB 데이터 보정 1회(A28-09, 칸 연결 34건 추가) · 8080 재시작(공식 스크립트, 보이는 PowerShell 창) · 5173·5174 그대로(Vite 가 새 코드 반영).
- Git Commit·Push·Merge·PR 없음. 다른 Worktree·기존 Migration·학생 케어·상담·공용 인증·분석기 정확도 로직 변경 없음. 사용자 문서의 승인 버튼은 누르지 않았다.

## G-1. 작업 시작 기준값

- DB 백업 `C:\learnershigh-local-run\a28-followup-20261122\backup\lh_local_run-full-20261122-1142xx.sql`(70,810,714B, SHA-256 `8dc702a1…80fe57`, rc=0) · 40표 12,502행(`rowcounts-start.tsv`) · Storage 1,864개 SHA(`storage-sha256-start.txt`) · Flyway 27건 실패 0 최신 `202611212328`.
- 확정 기록 2건(가정고 2026 고1 1학기·2학기, `adm_demo_b01`, 11:15·11:16, `SERVER_STORED_ORIGINAL`) · 확정값 36 · 운영계획 확정 1건(대신고 2026 고1 1학기, 2행) · Snapshot 해시 `2608bdb5…`, 확정값 해시 `744f4b62…`(`db-baseline.txt`). 매핑 4건(`sch_demo_daeshin`·`sch_demo_gajwa`·`si_0925c336…`·`si_856240f4…`).
- 보정 직전 백업 `lh_local_run-pre-repair-*.sql`(SHA-256 `03c7ad95…96dd0`) — 시작 이후 행 수 변화 0.
- 수정 전 파일 사본: `C:\learnershigh-local-run\a28-followup-20261122\pre-edit\`.

## G-2. 원인

| 항목 | 원인(DB·API·코드 확인) |
|---|---|
| A28-10 대신고 2번 | ACTIVE 매핑 `sch_demo_daeshin`(관리자 선택 07:52)과 `si_856240f4-…`(학생 동명 학교 선택 07:48이 만든 검색 학교 키)이 **같은 학교알리미 ID** 를 가리킨다. 학생 선택 때는 관리자 매핑이 없어 `directoryKey()` 가 `si_` 키를 새로 만들었다 → 같은 학교가 두 키로 각각 수집(문서 359·359, 원본 373·373, SHA 373개 전부 같음). 확정 0건. 관리자 학교 목록(`/schools`)이 두 키를 모두 돌려줘 '조회한 외부 학교'에 또 보였다. |
| A28-09 과별 원본이 고1에만 | 파일 이름에 학년이 없는 과별 공시(예: `2026학년도 1학기 과학,기술·가정,정보과 …`)는 분류기가 **제목 첫머리(200자)의 첫 단원 표 학년(1학년)** 을 문서 학년으로 썼다(`gradeFrom = documentTitle`). 본문은 1·2·3학년을 모두 다룬다(예: HWPX 본문 '1학년' 9회·'2학년' 9회·'3학년' 17회). |
| A28-11 확정 후 월별 운영계획 비어 있음 | 가정고 두 문서는 평가 정보만 확정됐고 **운영계획 확정 기록이 없다**(`assessment_plan_teaching_plan_review` 는 대신고 1건뿐). 분석 결과에는 운영계획 후보 24행·33행이 있다. A28-05 '최종 승인'(`finalApproval.ts`)이 평가 정보만 보내고 운영계획(§39-6 별도 확정)을 보내지 않았다 → 학생·관리자 월별 운영계획 조회는 '확정본 없음'이 맞는 상태였다(캐시 문제 아님). |
| A28-08 | 위 A28-11 과 같은 원인 — 최종 승인 1회가 평가 정보(수행·지필)만 확정. |
| A28-12 학생 머리글 '최하은' | `frontend/student/src/app/StudentAppShell.tsx` 에 `const studentDisplayName = '최하은'` 고정값(구형 Fixture 잔재). 활성 학생과 무관. |
| A28-13~15 | 최근 업데이트 5개 조회(높이 불일치), 피드백 요청 현황 카드, 메모·다가오는 수행평가·피드백 1:2:2 + 달력 전체 폭 배치. |
| A28-16 Viewer 겹침 | 모달 본문(`.body`) 전체가 스크롤되고 PdfViewer 도구 막대가 그 안에서 `sticky` 라 스크롤 때 문서 내용이 도구 막대 위·머리글 아래로 비쳐 보였다(이미지 10). |

## G-3. 구현

### A28-08·A28-11 통합 최종 승인 (Backend + 관리자)

- `PUT …/review` 요청에 선택 필드 `teachingPlan`(§39-6 과 같은 모양). `SERVER_STORED_ORIGINAL` + `bulk=true` 일 때만 받고(아니면 `400 teachingPlan not_allowed`), `analysisId` 가 같아야 한다(`teachingPlan.analysisId conflict`). 평가 정보 확정 뒤 **같은 Transaction** 에서 §39-6 운영계획 확정 규칙을 그대로 적용 — 하나라도 거절되면 둘 다 0건, 거절 필드에 `teachingPlan.` 접두어(`EvaluationPlanService.confirmTeachingPlanTogether`). 응답 모양 변경 없음. 계약 §39-15.
- 관리자 '최종 승인' 패널: 유형별 집계(수행평가 승인·빠짐 / 지필평가 승인·빠짐 / 월별 운영계획 승인·제외·빠짐 행 + 상태). 운영계획은 확정할 수 있는 과목(연결·학년·제외 규칙)의 **원문 근거가 있는 행만** 기본 승인, 운영계획 초안의 관리자 결정(수정·제외) 우선, 이미 확정(재검토 아님)이면 넣지 않음, 확정 상태를 못 읽으면 승인 막음. 확인 모달에 유형별 수와 '하나라도 실패하면 아무것도 확정되지 않아요'.
- 평가 정보만 확정된 문서(가정고 두 문서처럼): 확정 요약 아래 **'월별 운영계획 최종 승인'** 하나로 §39-6 만 보낸다(평가 정보 재확정 없음). 사용자 문서를 서버가 자동 승인하지 않는다 — **사용자가 직접 눌러야** 학생 월별 운영계획에 보인다(G-8).
- PDF·HWP·HWPX 같은 흐름(서버 원본 검증 그대로). 재확정은 기존 재검토(초안 다시 열기) 규칙 그대로. 동시성: 기존 `expectedDraftVersion`(평가 초안) + 운영계획 '이미 확정 409'.
- HWP·HWPX 읽기 전용 편집: 범위 안 해결은 하지 않았다 — 기존 규칙대로 HWP·HWPX 는 원문 위치 확인·수정은 단계별 화면에서, 최종 승인은 서버 원본 검증으로 한다(한계로 기록).

### A28-09 학년 미구분 과별 공시 → 같은 학기 고1·고2·고3

- 분류 규칙(`SchoolInfoSourceClassifier`): 파일 이름에 학년이 없고 과별 공시 이름(`…과 교수학습/평가`)인데 제목 학년이 **하나뿐**이면 본문(약 4만 자)을 보고, 1·2·3학년을 모두 다루면 같은 학년도·같은 학기 전 학년(`GRADES_FROM_BODY_ALL`, 근거 `titleGrades`·`bodyGrades`). 제목에 학년이 둘 이상 명시·본문 일부만·과별 이름 아님 → 이전 그대로(넓히지 않음). 관리자 화면에는 기존 '전 학년 자동 적용' 묶음으로 보인다.
- 원본 기록(SourceFile)은 하나, 칸 연결만 여럿. 확정된 평가 정보는 그 칸 문서의 것이며 다른 학년 칸으로 복사하지 않는다(새 칸 문서는 '분석 전·확정 전'). 한계: 기존 구조상 칸마다 문서·Revision 이 따로 생기고 Revision 저장 파일도 칸마다 사본이다(이번에 34개 사본 추가, 원본 SHA 동일).
- 기존 데이터 보정 `SchoolInfoGradeScopeRepair`(1회성, 기본 꺼짐, 값 없으면 아무것도 안 함): `assessment.schoolinfo.grade-scope-repair=dry-run|apply`. 보관 원본 SHA 재확인 후 새 규칙으로 다시 판정, **빠진 칸 연결만** 기존 연결 경로로 추가(이미 있으면 그대로 — 멱등). 학교알리미 재접속 없음.

### A28-10 같은 학교 한 번만

- `SchoolInfoSyncService.canonicalKey(학교알리미 ID)`: ① `si_` 아닌 ACTIVE 관리자 매핑(담당·시연 학교) ② 시연 명단 고정 학교. `aliasOf(si_ 키)` = 같은 고유 ID 의 대표 키. **이름은 보지 않는다**(고유 ID 로만).
- 관리자 학교 목록(`/schools`)에서 별칭 `si_` 키 제외(대표 학교 하나, 문서 수 두 번 세지 않음). 고유 ID 가 다른 `si_` 학교(예: 한솔고)는 그대로. 별칭 키 문서·원본·기록은 지우거나 옮기지 않음(직접 조회 200 유지, 병합 없음).
- 학교알리미 검색으로 같은 학교를 다시 고르면 새 `si_` 키를 만들지 않고 대표 키 사용(`directoryKey`). 학생 화면은 관리자 매핑이 있으면 이미 대표 키로 조회(`StudentOfficialViewService.resolve`) — 대신고 학생은 `sch_demo_daeshin` 문서를 본다. 권한 변경 없음.

### A28-12 학생 머리글 이름

- 새 API `GET /api/student/assessment/me` → `{studentId, displayName}`(계약 §9-0). 인증된 학생 본인만(경로·Query 에 학생 ID 없음 → IDOR 없음), 원천은 기존 학생 정보 경계(`AssessmentStudentDirectory`, 시연 명단은 플래그 ON 일 때만). 못 찾으면 `null` → 화면 '학생'. 고정값 제거. 학생을 바꾸면(개발 학생 전환은 새로고침) 이름도 바뀐다.

### A28-13~15 학생 대시보드

- 최근 업데이트: 데이터 단계에서 최신 2개만 조회(`size: 2`), 바로가기와 같은 높이(`align-items: stretch`).
- 피드백 요청 현황 카드만 제거(KPI '피드백 답변 대기'·선생님 피드백 메뉴 그대로).
- 배치: KPI → [바로가기 | 최근 업데이트] → 원본 3개년(전체 폭) → [Calendar 약 7 | 다가오는 수행평가(위) · 수행평가 메모(아래) 약 3]. 컨테이너 폭 ≤1180px 이면 달력 아래로 쌓고 오른쪽 카드 2열, ≤640px 1열.

### A28-16 학생 원본 Viewer

- Modal `fill`(창 높이 사용·본문 스크롤 없음) + PdfViewer `contained`(도구 막대는 흐름 안에 고정, 문서 영역만 `overflow:auto`). 머리글(파일명·닫기)·안내·도구 막대(쪽 이동·확대/축소·폭 맞춤·새 탭)·바닥글(원본 내려받기·닫기) 고정. 다른 PdfViewer 사용처(대학 기출·평가계획서 원문 화면)는 기본값(이전 동작) 그대로.

## G-4. 변경 파일

- Backend main: `service/plan/SchoolInfoSourceClassifier.java`, `service/plan/SchoolInfoSyncService.java`(canonicalKey·aliasOf·directoryKey), `service/plan/SchoolSearchQueryService.java`, `service/plan/EvaluationPlanService.java`, `dto/plan/PlanReviewRequest.java`, `integration/roster/DemoRoster.java`(pinnedSchoolId), `controller/StudentSchoolAssessmentController.java`, 신규 `service/plan/SchoolInfoGradeScopeRepair.java`, `service/school/StudentMeQueryService.java`, `dto/context/StudentMeResponse.java`.
- Backend test: `SchoolInfoSourceClassifierTest`(+2), 신규 `SchoolSearchAliasTest`, `FinalApprovalTeachingPlanApiTest`(IT 3), `StudentMeApiTest`(IT 2).
- Frontend admin: `review/finalApproval.ts`, `review/FinalApprovalPanel.tsx`, `review/ReviewWorkspace.tsx`, `review/ConfirmStep.tsx`, `api/types.ts`, `review/finalApproval.test.mjs`(+3).
- Frontend student: `app/StudentAppShell.tsx`, 신규 `features/assessment/api/studentMeApi.ts`, `routes/AssessmentHomeRoute.tsx`, `components/home/homeDashboard.module.css`, `components/Modal.tsx`, `components/Modal.module.css`, `components/university/PdfViewer.tsx`, `components/university/university.module.css`, `components/official/OfficialViewerModal.tsx`, `components/official/OfficialDocuments.module.css`.
- E2E: `a27-student-shell.spec.ts`, `a27-student-ux.spec.ts`(피드백 카드 제거 반영).
- 문서: `docs/api/api-contract.md`(§9-0, §38-3 A28-10, 학교알리미 분류 A28-09, §39-15), 이 보고서.

## G-5. API · DB

- API: 새 `GET /api/student/assessment/me`. `PUT …/review` 선택 필드 `teachingPlan` 추가(하위 호환). `/schools` 응답 모양 그대로(별칭 제외만).
- DB: **Migration 없음.** 사용자 DB 데이터 보정 1회(아래 G-6). 확정 기록·확정값·기존 연결·문서·Revision·원본 파일 변경 0.

## G-6. 데이터 보정(A28-09) — 복제 리허설 → 사용자 DB

| 단계 | 결과 |
|---|---|
| 복제 리허설 | 일회용 MySQL `lh-a28-clone`(127.0.0.1:33361, tmpfs)에 시작 덤프 복원 → 40표 행 수 동일 → Storage 사본으로 dry-run(후보 21 → 제목 다학년 4건 제외 규칙 보완 후 **17건·연결 34**) → apply: 문서·Revision·칸 연결 각 +34, 다른 37표 변화 0 → 재실행 0건(행 변화 0) |
| 사용자 DB | 8080 중지(13580) → 보정 직전 백업 → dry-run 17/34(행 변화 0 확인) → apply `added=34 unchanged=0` → 재실행 `candidates=0` 행 변화 0 |
| 보존 확인 | 확정 Snapshot 해시 `2608bdb5…`·확정값 해시 `744f4b62…` 시작과 동일 · Storage 1,864 → 1,898(기존 파일 변경·삭제 0, 새 사본 34) |
| 보고 파일 | `C:\learnershigh-local-run\a28-followup-20261122\repair-user-dry-run-*.tsv`, `repair-user-apply-*.tsv`(대상 원본 ID·파일명·추가 학년) |

- 대상 17건(모두 '고1 칸에만' → 같은 학기 고2·고3 칸 추가): 가정고 2024 1학기 5(과학·기술가정·정보, 국어한문, 사회윤리역사, 예체능·보건, 외국어) · 2024 2학기 6(과학·기술가정·정보, 국어한문, 사회윤리역사, 수학, 예체능·보건, 외국어(수정)) · 2026 1학기 2(과학·기술·가정·정보, 국어한문) · 2026 2학기 3(과학·기술·가정·정보, 국어한문, 수학) · 한솔고 2024 2학기 '전교과' 1.
- 넓히지 않은 것: 가정고 2026 1학기 사회윤리역사·수학·외국어·예체능·보건, 2학기 사회·예체능·보건·외국어 — 본문이 1·2·3학년을 모두 가리키지 않아(근거 부족) 고1 칸 그대로(관리자 분류로 판단). 제목에 학년이 둘 이상 명시된 가좌고 4건도 그대로.
- 가정고 2026 고1 1학기 확정 문서(국어한문과)의 확정값은 새 고2·고3 칸 문서로 복사되지 않았다(새 칸 문서는 분석 전·확정 전).

## G-7. 검증(실행한 것만)

| 검증 | 결과 |
|---|---|
| Backend 단위(전체, `test --rerun-tasks`, ArchUnit 포함) | 68 클래스 461 — 458 통과 · 3 skip(기존) · 실패 0 |
| Backend 통합(MySQL Testcontainers, 3묶음) | 46 클래스 240 — 전부 통과(47+66+127) |
| 새 시험 | Classifier A28-09 2, SchoolSearchAlias 1, FinalApprovalTeachingPlan IT 3(함께 확정 · 운영계획 거절 시 둘 다 0건 · not_allowed/conflict), StudentMe IT 2(학생 전환 이름 · 401) |
| Frontend `scripts/verify-frontend.ps1` | PASS(typecheck·lint·build) |
| Frontend Node 시험 | 38 파일 166 통과(finalApproval +3) |
| Assessment E2E(일회용 MySQL, 시험 사본 Backend 18090·5191·5192) | 67 통과(6.1m) — 홈 피드백 카드 제거 반영 2개 spec 포함 |
| REPLAY(실측 manifest `appendixN-20261121/replay`) | 8 통과(3.1m) — HWPX Viewer·같은 이름 학교·관리자 학생 화면 보기 |
| 실제 서버 확인(읽기 전용, GET 외 요청 차단) | `/me` 서예린 200 · 인증 없음 401 · `/schools`(adm_demo_b01) 대신고 1개(`sch_demo_daeshin` 359) · 별칭 직접 조회 200 · 학생 머리글 stu_demo_021 '서예린' / stu_demo_001 '김민서' · 홈 피드백 카드 0 · 최근 2개 · 바로가기·최근 높이 204=204 · 4개 해상도 가로 스크롤 없음 · 1366 이상 달력:오른쪽 ≈ 7:3 · Viewer 위·중간·아래에서 머리글·도구 막대 위치 고정, 문서 영역만 스크롤, 겹침 없음 · 가정고 2026 고1 1·2학기 확정 단계에 '월별 운영계획 최종 승인'(1학기 6행·2학기 5행 예정) 표시(누르지 않음) |
| 비교 이미지 | `C:\learnershigh-local-run\a28-followup-20261122\compare\before\`(사용자 이미지 1~10) · `after\`(학생 홈 4개 해상도, Viewer top/middle/bottom, 관리자 대신고 목록, 가정고 확정 단계, `results.json`) |

## G-8. 사용자 확인 목록 (NOT RUN — 사용자 직접)

1. 관리자 http://localhost:5174/assessment/evaluation-plans?devAdmin=adm_demo_b01 → 학교 선택에 '대신고등학교'가 담당 학교에 **한 번만**, '조회한 외부 학교'에 대신고 없음.
2. 관리자 http://localhost:5174/assessment/evaluation-plans/plan_b192bfc1-c68c-49a4-8fbb-13780e992db1/revisions/plan_rev_1596bc78-d691-42fe-96fb-c8775fb6f84e?devAdmin=adm_demo_b01 (가정고 2026 고1 1학기) → 마지막 단계 '월별 운영계획 최종 승인' → 승인. 2학기는 `plan_a988234c-e30d-4730-8b4b-7189e46a1f75/revisions/plan_rev_7b9cd52c-6cb4-4237-9724-8e09ee7f6731`. 승인 뒤 관리자 '월별 운영계획'·개요, 학생 '월별 운영계획'(가정고 학생)에 행이 보이는지.
3. 아직 확정 전인 학교알리미 문서 하나에서 '최종 승인' → 유형별 수(수행·지필·월별 운영계획) 확인 후 승인 → 결과 화면·월별 운영계획에 함께 반영되는지.
4. 학생 http://localhost:5173/assessment?devStudent=stu_demo_021 → 머리글 '서예린', 학생을 바꾸면 이름이 바뀌는지. 홈 배치(최근 2개·피드백 카드 없음·달력 7:3).
5. 같은 학생 홈 '학교 평가계획서 원본 · 3개년'에서 고2·고3 을 고르면 가정고처럼 과별 공시가 있는 학교(가정고 학생)는 고2·고3 칸에도 원본이 보이는지(대신고는 학년별 공시라 해당 없음). '원본 보기' → 스크롤 때 머리글·도구 막대가 고정되는지.

## G-9. 남은 문제 · Open Decision

- 가정고 두 문서의 월별 운영계획은 **사용자 승인 전까지 비어 있다**(자동 승인하지 않음) — G-8-2.
- 보정으로 생긴 가정고·한솔고 고2·고3 칸 문서 34건은 분석 전·확정 전이다(관리자 화면 진입 시 기존 규칙대로 분석). 칸마다 Revision 파일 사본이 생기는 기존 구조는 그대로(저장 공간 중복 — 구조 변경은 별도 결정 필요).
- 별칭 `si_856240f4…` 의 문서 359건·원본 373건은 지우지 않고 남아 있다(목록에서만 숨김). 정리(삭제·병합)는 사용자 승인 필요.
- 본문 근거가 부족한 과별 공시(가정고 2026 1학기 사회윤리역사·수학·외국어·예체능·보건, 2학기 사회·예체능·보건·외국어)는 고1 칸만 — 학생 화면 고2·고3 칸에는 해당 과목 원본이 없다. 관리자 분류 확인 필요.
- HWP·HWPX 화면 안 편집은 이번 범위에서 해결하지 않음(단계별 화면 규칙 유지).
- Backend 서버가 이전에 로그 없이 3번 종료된 원인은 여전히 미확인 — 이번 재시작은 보이는 PowerShell 창(공식 `start-backend.ps1`)이라 창을 닫으면 서버도 멈춘다.

---

# A28 사용자 직접 검증 후속 개선 — 관리자 조회 정합성·설명 간소화·학생 수행평가 자동 등록·과목별 운영계획 (2026-11-22 15:40~)

- 입력: `C:\learnershigh-local-run\a28-uat-followup-input\`(ZIP 압축 해제: 프롬프트·이미지 01~05·참고 보고서). 참고 보고서 = 저장소 보고서와 동일(차이 0).
- Git Commit·Push·Merge 없음. 다른 Worktree·기존 Migration·학생 케어·상담·공용 인증·분석기 정확도 로직 변경 없음. 사용자 문서의 승인 버튼은 누르지 않았다(새 확정 기록 0건 — 확정 Snapshot 해시 동일, H-6).

## H-1. 사용자 직접 검증 이력 (G-8 이후)

| 항목 | 사용자 결과 | 비고 |
|---|---|---|
| G-8-1 대신고 학교 목록 중복 해소 | **PASS**(사용자) | 유지 확인(H-7 화면 점검: 대신고 옵션 1개) |
| G-8-2 가정고 운영계획 승인 후 관리자·학생 월별 운영계획 행 표시 | **PASS**(사용자) | DB: 가정고 2026 고1 1학기 `plan_25579908…` 운영계획 21행 확정(15:24). 관리자 전체 현황은 이번 A28-17 에서 따로 검증 |
| G-8-3 미확정 학교알리미 문서 통합 최종 승인 | **PASS**(사용자) | DB 확인: 대신고 2026 고1 2학기 `plan_b55d1bc0…`/`plan_rev_6a895b2c…` 15:15(평가 + 운영계획 19행), 가정고 2026 고1 1학기 `plan_25579908…` 15:24(평가 + 운영계획 21행) |
| G-8-4 학생 머리글·홈 배치·원본 Viewer 스크롤 | **PASS**(사용자) | 유지 |
| G-8-5 학년 공용 원본 추가 검증 | 사용자 결과 없음 → **NOT RUN** 유지 | |
| 이번 발견 결함 | 이미지 01 전체 현황 운영계획 빈 상태(A28-17), 02 학교 코드 UI(A28-18), 설명 과다(A28-19), 04 확정 수행평가 미등록(A28-20), 05 홈 일반 달력(A28-21) | |

## H-2. 작업 시작 기준값 (사용자 조작 반영된 새 기준)

- DB 백업 `C:\learnershigh-local-run\a28-uat-followup-20261122\backup\lh_local_run-start-*.sql`(78,193,969B, rc=0), 적용 직전 `lh_local_run-pre-migration-*.sql`(시작 이후 행 변화 0). SHA-256 은 `backup-sha256.txt`.
- 표별 행 수 `rowcounts-start.tsv`(확정 기록 4 · 확정값 68 · 운영계획 확정 3/42행 · 학생 수행평가 2 · Flyway 27), Storage 1,973개 SHA(`storage-sha256-start.txt`, `…-pre-migration.txt`), 학생 수행평가 개인 필드 해시 `personal-rows-pre.md5`.
- 수정 전 파일 사본 `C:\learnershigh-local-run\a28-uat-followup-20261122\pre-edit\`.

## H-3. A28-17 관리자 전체 현황 ↔ 월별 운영계획

- **재현 조건**: `http://localhost:5174/assessment?school=sch_demo_daeshin`(이미지 01, devAdmin 없음 = 기본 관리자).
- **실제 원인(조사 결과)**: 전체 현황 카드와 월별 운영계획 탭은 **같은 훅·같은 원천**(`useConfirmedTeachingPlan` → §38 목록(학교·학년도) → 해당 학년·학기 문서 최신 개정본 §39-6 확정 행). API·DB 데이터는 정상(대신고 `plan_b55d1bc0…` 19행). 현재 DB·코드로 같은 URL(기본 관리자·`adm_demo_b01` 둘 다)을 다시 열면 정상 표시 — **재현되지 않음**. 응답 캐시 헤더 없음, 관리자 조회는 화면 진입마다 새로 조회(`useRemote`, 탭 전환 = 재마운트). 남는 원인 후보: 승인(15:15) 전에 열어 둔 전체 현황 탭이 새로 조회되지 않은 채 남은 경우(다른 탭에서 승인 후 돌아와도 갱신 계기가 없었다). 확정 근거로 단정하지 않는다.
- **수정**: 오래 열어 둔 화면 보강 — 창 포커스·화면 표시로 돌아오면(최소 10초 간격) 전체 현황(KPI·운영계획·학생)과 월별 운영계획 탭을 **깜빡임 없이** 다시 조회(`useRemote.refresh` 조용한 재조회 + `useRefreshOnReturn`). 같은 탭에서 승인 후 돌아오면 기존대로 재마운트·재조회. 새 API·중복 DB 없음, 권한·별칭 규칙 그대로.
- **같은 Context 대조(실측, 읽기 전용, 1600px)**:

| Context | 전체 현황 카드(월별 개수 · 과목) | 월별 운영계획 탭 | DB 확정 원천 |
|---|---|---|---|
| 대신고 2026 고1 2학기 (`adm_demo_b01`) | 9월 4 · 10월 5 · 11월 4 · 12월 5 · 1월 – · 2월 1 · 공통국어2 19 | 동일 | `plan_b55d1bc0…`/`plan_rev_6a895b2c…` 운영계획 확정 19행(제외 0), 8~12월·2월 |
| 가정고 2026 고1 1학기 | 3월 7 · 4월 5 · 5월 3 · 6월 5 · 7월 1 · 공통수학1 21 | 동일 | `plan_25579908…` 21행 |
| 가정고 2026 고1 2학기 | '확정된 운영계획이 아직 없어요' | 동일(빈 상태) | 운영계획 확정 기록 없음(평가 정보만 확정) |

- 학생 홈(stu_demo_021, 대신고 고1 2학기) 과목별 운영계획 10월 5건·11월 4건 = 같은 확정 19행(학생 공개 조건 = 학적 슬롯). 월별 행 수 차이 없음. 여러 달 걸친 행(8-9월·9-10월 등)은 각 달에 센다(두 화면 같은 규칙).
- 검증: 미확정(가정고 2학기 빈 상태) · 다른 학교·학기 전환(3 Context) · 새로고침(재진입) — **PASS(자동 화면 점검)**. 승인 직후·재확정 → 전체 현황 갱신은 E2E·사용자 확인 대상(H-9, 사용자 문서 승인은 하지 않음).

## H-4. A28-18 분석 탭 학교 코드 UI 제거 · A28-19 설명 간소화

- A28-18: 분석 탭의 '학교 목록은 … 학교 코드로 열 수 있어요' 문단, 학교 코드 입력·'열기' 버튼, 관련 상태(`schoolCode`)·이벤트(`openCode`) 제거. 학교 미선택 빈 상태의 '학교 코드로' 문구 → '평가계획서 탭에서 학교 검색' 링크. 등록 학교 목록 조회 실패는 짧은 경고 1줄만 남김. 학교 Dropdown·학년도·학년·학기·상태 필터·문서 검색·'평가계획서 원본 관리' 유지(화면 점검: select 5 · 검색 1 · 원본 관리 1 · 학교 코드 입력 0). `?school=` 딥링크·서버 계약 그대로.
- A28-19 탭별 변경:

| 탭 | 변경 전 | 변경 후 |
|---|---|---|
| 전체 현황 | '학교·학년·학기를 고르면 지표, 운영계획, 담당 학생이 함께 바뀌어요.' | 삭제(필터로 자명) |
| 학생 Assessment | (설명 문단 없음) | 유지 |
| 피드백 관리 | '학생은 질문을 따로 쓰지 않고 버튼 하나로 … 노트와 고른 파일 버전이 함께 저장돼요.' | '요청 당시의 노트와 파일 버전이 함께 저장돼요.'(판단에 필요한 부분만) |
| 평가계획서 | '학교 원본 문서만 관리해요. AI 분석·검토·확정은 ‘분석’ 탭에서 해요. 한 칸에 여러 문서를 둘 수 있어요(과목별 파일·합본·개정본).' | '원본 문서만 관리해요. 분석·확정은 ‘분석’ 탭에서 해요.' |
| 분석 | '원본 평가계획서의 AI 분석 · 관리자 검토 · 최종 확정과 결과 조회를 해요. 분석은 …' + 학교 코드 문단 | 삭제(제목·버튼으로 자명) |
| 월별 운영계획 | '확정된 운영계획만 보여요. 원문에 주차만 있는 계획은 그 주의 월~금에 ‘잠정’으로 … Outside This Term에 모여요.' | '확정된 운영계획만 보여요. 주차만 적힌 계획은 ‘잠정’(실제 날짜 아님)으로 표시돼요.'(경고 유지) + 달력 옆 '표시 기준' 5줄을 접힘(`details`)으로 — 관리자 화면만, 학생 화면 그대로 |
| 심화 콘텐츠 | 'Student 심화 탐구와 같은 정적 참고자료예요. 이 화면은 읽기 전용이라 서버에 저장하거나 학생 기록을 만들지 않아요.' | '읽기 전용 참고자료예요. 학생 기록을 만들지 않아요.' |
| 관리자 참고자료실 | '자료원 n곳 · 기준 문서 … 주소가 실제로 열리는지는 … ScienceON(KISTI)은 …' | '자료원 n곳 · {기준 문서}({날짜} 확인) · 주소 연결은 확인하지 않아요.' · 개인정보 안내('스크랩과 메모는 관리자만 봐요…')는 유지 |

- 유지한 경고: 학생 공개 여부·최종 승인 영향·삭제·미공시/수집 실패·HWP 변환 한계·주차 임시 표시·읽기 전용. 툴팁에만 숨긴 위험 안내 없음. 관련 상세 화면(검토·결과)의 판단용 안내는 이번에 줄이지 않음(범위 밖 대규모 개편 방지 — 남은 일 H-11).
- 화면: 8개 탭 1600px 가로 넘침 0(`compare\after\admin-*-1600.png`), 전체 현황·분석 4해상도 가로 넘침 0. Before = 사용자 이미지 01·02(`compare\before\`) + 위 문구 표.

## H-5. A28-20 확정 수행평가 → 학생 학교 수행평가 자동 등록

- **기존 구조 조사**: 학생 수행평가 `assessment_school_assessment`(학생 소유, 상태·메모·날짜·노트·파일·피드백 연결)와 공식 항목 연결 `evaluationItemRef`(Revision·과목·항목 Key)가 이미 있었다(§12, 학생 선택 등록용). 자동 등록·중복 방지 식별자는 없었다 → 같은 Entity 를 재사용하고 최소 열만 추가(별도 표·화면별 복제 없음).
- **Migration `V202611220644__assessment_school_assessment_official_link.sql`**(신규, 기존 Migration 수정 없음): 열 추가만(`official_key`·`official_plan_id`·`official_review_id`·`official_status`·`official_timing`·`official_weight_percent`·`official_max_score`·`official_synced_at`, 모두 NULL 허용) + UNIQUE(`student_id`,`official_key`) + CHECK 3개. 기존 행 값 변경 없음.
- **트리거**: ① 평가 정보 확정 Transaction 안(`EvaluationPlanService.review` → `OfficialAssessmentSyncService.syncAfterConfirm`) — 승인 관리자 담당 지점 학생 중 그 문서 슬롯 학적 학생. 실패하면 확정도 0건(통합 승인 rollback 보장 유지). 운영계획만 승인(§39-6)은 평가 정보가 바뀌지 않아 대상 아님. ② 학생 `GET …/school-assessments` 조회 직전 보완 동기화(별도 Transaction·멱등, 이미 있으면 쓰기 0, 실패해도 목록은 응답·로그) — 담당 밖 학생·학적 진입 후 학생도 같은 규칙. ③ 기존 확정본 1회성 보정(H-6). 관리자 '학생 화면 보기'는 쓰기 없음(기존 원칙).
- **식별자·중복 방지**: `official_key = 문서ID|학업 과목ID|분석 항목 Key`(예: `plan_b55d1bc0…|subj_01|P01`). Revision·확정 기록이 바뀌어도 같은 행. DB UNIQUE 로 동시 요청도 1행. 학교명·제목 유사도로 맞추지 않음(대신고 별칭 `si_` 문서는 학생 학적 학교 키가 아니라 대상 아님).
- **학적·과목**: 학생 학적(학교 키·학년도·학년·학기)과 같은 슬롯 문서의 학생 공개 확정 Revision(평가 정보 확정본 중 최신)의 최신 확정 기록에서, 학생 수강 과목 ID 의 `performanceEvaluation.items[n]`(이름 확정된 것만). **지필·운영계획 행은 만들지 않음.** 다른 학년·학기·학교 학생 0건.
- **공식/개인 필드**: 공식(학교 확정, 학생 수정 불가) = 이름·공식 시기·반영·만점·출처. 이름 변경 요청 `400 title official_field`. 개인 = 상태(기본 '시작 전')·중요·메모·내 평가일·마감·유형·제출물·노트·파일·피드백. **날짜를 만들지 않음**(공식 시기는 문자열 '9월' 등).
- **재확정·철회**: 같은 행의 공식 값·출처만 갱신(학생 상태·메모·날짜·첨부 보존). 최신 확정본에서 빠진 항목은 `official.status=WITHDRAWN`('학교 확정에서 빠짐', 행·기록 보존). 학생이 휴지통으로 보낸 학교 확정 행은 다시 만들지 않음.
- **학생 UI**: 학교 수행평가 목록 '학교 확정 · 시기 9월' 표시, 반영 비율은 개인 값 없으면 학교 확정 값, 상세에 '학교 확정' 행(시기·반영·만점·상태), 수정 모달 이름 읽기 전용 + 안내. 홈 '다가오는 수행평가'의 학교 공개 날짜 미정 항목은 자동 등록 행과 같은 자리 하나로(이중 표시 없음, 그 학생 항목으로 이동), 지난 시기는 '지남'으로 뒤에. KPI·목록·과목 Sidebar·관리자 학생 목록은 같은 학생 행으로 센다.
- 계약 `docs/api/api-contract.md` §12-c 추가(GET 의 첫 조회 쓰기 부작용 명시).

## H-6. Migration·기존 확정본 보정 — 리허설 → 사용자 DB

| 단계 | 결과 |
|---|---|
| 일회용 복제 | `lh-a28-clone`(127.0.0.1:33361, tmpfs)에 시작 덤프 복원 → 40표 행 수 동일 → 새 코드 Backend(웹 서버 없음) 기동: Flyway `202611220644` 적용(0.058s) → dry-run `students=125 created=20` → apply: 학생 수행평가 2→22, Flyway 27→28, 다른 표 변화 0 → 재실행 `created=0 unchanged=20` 행 변화 0 → 학생 직접 등록 행 해시 동일 |
| 사용자 DB | 8080 중지(PID 14536) → 적용 직전 덤프·행 수·Storage SHA·개인 행 해시 → Migration + dry-run(`Successfully validated 28 migrations`, 적용 0.506s, 20 예정) → apply `created=20` → 재실행 `created=0 unchanged=20` 행 변화 0 |
| 보존 증거 | 확정 기록·확정값·운영계획 확정 해시(`318e4979…`·`31b908ec…`·`0b3ba23e…`)가 적용 전 복제본과 동일(`snapshot-hash-compare.txt`) · 학생 직접 등록 2건(상태·날짜·메모·version·updated_at) 해시 동일 · Storage 변경 없음 |
| 보고 파일 | `C:\learnershigh-local-run\a28-uat-followup-20261122\backfill-user-dry-run-*.tsv`, `backfill-user-apply-*.tsv`, 등록 결과 `backup\school-assessment-after.tsv` |

- 등록 20건: **stu_demo_021(서예린, 대신고 고1 2학기) 2건** — '사회적 독서 활동'(시기 9월·반영 20%·만점 20) · '공동 탐구 과정을 통한 나만의 보고서 쓰기'(10월·20%·20). 기존 개인 항목 '사회적 독서와 관련된 책 읽기'(진행 중·11/30·12/1)는 병합하지 않고 그대로. 가정고 stu_demo_081·084 각 9건(2026-1: 확정 문서 2개 각 3건 = 6, 2026-2: 확정 문서 1개 3건). 이름·시기는 `backup\school-assessment-after.tsv`.
- 복원 방법(필요 시): 8080 중지 → `backup\lh_local_run-pre-migration-*.sql` 을 컨테이너 `mysql` 로 복원(사용자 확인 후). 임의 복원은 하지 않았다.

## H-7. A28-21 학생 홈 과목별 운영계획

- 일반 일~토 달력(`HomeMonthCalendar`) 대신 `HomeSubjectPlanner`: 과목 행 × [그 달 전체 | 1~N주(일요일 시작 달력 주 = 월별 운영계획 임시 배치와 같은 줄)]. 월 이동·이번 달·과목 필터(전체/과목)·'운영계획 크게 보기'. 모델 `model/homeSubjectPlan.ts` 는 월별 운영계획의 `placeEntries` 규칙을 그대로 쓴다(원문 날짜 → 그 주, 'n월 m주' → 그 주 '잠정', 월만 → 월 전체, 달 미정은 끌어오지 않음).
- 중요 일정: 색 + 글자 배지 — '수행'(파랑, 내 평가일·학교 확정 수행평가), '마감'(주황 + 테두리), '지필'(보라), '수업'(녹색), '잠정'(점선). 분류는 데이터 종류로만(운영계획 행 / 학생 수행평가 날짜 / 확정 지필 항목), 제목 키워드 추정 없음. 날짜 없는 학교 확정 수행평가·지필은 공식 시기 달의 '월 전체'에 '날짜 미정'(임의 날짜·D-day 없음). 일정을 누르면 상세(과목·종류·시기, 임시 표시는 '실제 수업·평가 날짜가 아니에요').
- 오른쪽 '다가오는 수행평가'(위)·'수행평가 메모'(아래), 최근 2개·피드백 카드 없음·3개년 원본 유지. 좁은 화면은 표 안에서만 가로 스크롤.
- 실측(stu_demo_021, 읽기 전용): 11월 = 공통국어2 운영계획 4건(수업 1·잠정 4칸) + 내 '사회적 독서와 관련된 책 읽기' 수행(11/30) · 10월 = 운영계획 5건 + 지필(9-10월) + 학교 확정 '공동 탐구 …' 수행(날짜 미정). 4해상도 가로 넘침 0, 1366/1600/1920 달력:오른쪽 ≈ 748:321·912:391·1136:487(약 7:3), 800 세로 쌓임.

## H-8. 시험(실제 실행한 것만)

| 검증 | 결과 |
|---|---|
| Backend 단위(전체 `test --rerun-tasks`, ArchUnit 포함) | 68 클래스 461 — 458 통과 · 3 skip(기존) · 실패 0 |
| Backend 통합(MySQL Testcontainers, 3묶음, 시험 사본) | 48 클래스 246 — 전부 통과(51 + 73 + 122) |
| 새 통합 시험 `OfficialAssessmentAutoRegisterApiTest` | 4/4 — T20-1(수행 2개만·지필/운영계획 0·날짜 null·담당 밖 학생은 목록 조회 때 2건·두 번 열어도 2건·다른 학기 0) · T20-3(운영계획 거절 → 확정·학생 행 0) · T20-6/7(재확정: 같은 행 id·반영 30·상태·메모·내 평가일 보존·빠진 항목 WITHDRAWN 삭제 아님·이름 변경 400·다른 학생 404) · T20-5/7/9(학생이 지운 공식 행 재생성 없음·비슷한 이름 직접 등록 항목 불변·인증 없음 401) |
| Frontend `scripts/verify-frontend.ps1` | PASS(typecheck·lint·build) |
| Frontend Node 시험 | 39 파일 170 통과(신규 `homeSubjectPlan.test.mjs` 4: 과목×주 배치·종류 배지·날짜 미정·WITHDRAWN 제외·빈 달·시기 해석·자동 등록 홈 연결) |
| Assessment E2E(일회용 MySQL, 시험 사본 Backend) | 전체 67 중 66 통과 · 1 실패 `z-a27-autosync.spec.ts:121`(학교알리미 자동 수집 상태가 10초 안에 '확인 대기'→'학교 식별 필요'로 바뀌지 않음 — 이번 변경과 무관한 영역) → 같은 spec 단독 재실행 2/2 통과(시간 경쟁). 홈 과목별 운영계획 E2E(`a27-student-ux`)는 새 UI 기대값으로 갱신 후 통과 |
| REPLAY(실측 manifest `appendixN-20261121/replay`) | 8/8 통과 — HWPX Viewer·같은 이름 학교·관리자 학생 화면 보기(쓰기 0) |
| 실제 서버 점검(읽기 전용, GET 외 차단) | 관리자 8탭·전체 현황 vs 월별 운영계획 3 Context 일치 · 분석 학교 코드 입력 0 · 학생 홈 4해상도 · 학교 수행평가 목록 3건(개인 1 + 학교 확정 2) · 가로 넘침 0 · 이미지 `compare\after\` |

## H-9. 서버 실행

| 대상 | 방식 | 상태 |
|---|---|---|
| MySQL | 기존 컨테이너 `lh-local-run-mysql`(127.0.0.1:33307) 유지 | Flyway 28건, 최신 `202611220644` |
| Backend 8080 | 보이는 PowerShell 창에서 공식 `C:\learnershigh-local-run\start-backend.ps1`(작업 폴더 `C:\learnershigh-assessment-integration\backend`, `gradlew bootRun`, profile `local-run`) | PID 21476, 로그 `C:\learnershigh-local-run\backend-20261122-160520.log`, `/me` 200 |
| 학생 5173 · 관리자 5174 | 기존 Vite(PID 36720·7856) 유지 — 새 코드 반영(HMR) | 200 |

- 직접 실행: `powershell -ExecutionPolicy Bypass -File C:\learnershigh-local-run\start-backend.ps1` / `start-student.ps1` / `start-admin.ps1`. 창을 닫으면 그 서버가 멈춘다.
- 학교알리미 자동 확인(TTL 24h): 관리자 평가계획서 탭·학생 홈 진입 시 POST 가 DB·Storage 에 쓸 수 있다(설정 그대로, 로그는 Backend 창·로그 파일).

## H-10. 사용자 확인 순서 (NOT RUN — 사용자 직접)

1. 관리자 http://localhost:5174/assessment?devAdmin=adm_demo_b01&school=sch_demo_daeshin&grade=1&semester=2 → 전체 현황 '대신고등학교 · 고1 2학기 운영계획' 9월 4 · 10월 5 · 11월 4 · 12월 5 · 2월 1(공통국어2 19) → '크게 보기'(월별 운영계획) 같은 숫자.
2. 관리자 http://localhost:5174/assessment/analysis?devAdmin=adm_demo_b01 → 학교 코드 입력·열기 없음, 필터·문서 검색·원본 관리 유지, 상단 설명 없음. 나머지 7탭 문구 확인.
3. 학생 http://localhost:5173/assessment/school-assessments?devStudent=stu_demo_021 → 3건: '사회적 독서와 관련된 책 읽기'(기존, 진행 중) + '사회적 독서 활동'(학교 확정 · 시기 9월) + '공동 탐구 과정을 통한 나만의 보고서 쓰기'(학교 확정 · 시기 10월).
4. 학교 확정 항목 상세 → 상태 '진행 중'·메모·내 평가일 입력 → 새로고침 후 유지(이 두 항목만 조작). 이름은 바꿀 수 없음.
5. 학생 홈 http://localhost:5173/assessment?devStudent=stu_demo_021 → 하단 '과목별 운영계획' 11월·10월 전환, 수행·마감·지필·잠정 배지, 오른쪽 다가오는 수행평가·메모.
6. (선택) 미확정 문서 하나를 직접 최종 승인 → 그 학교·학년·학기 학생(담당 학생은 즉시, 그 밖은 목록을 열 때) 학교 수행평가에 등록 → 재검토로 반영 비율 변경 후 재확정 → 같은 항목 갱신·개인 기록 보존.

## H-11. 남은 제약 · Open

- A28-17 이미지 01 의 정확한 발생 시점은 재현되지 않아 확정하지 못했다(현재 데이터·코드로는 정상). 오래 열어 둔 화면 복귀 갱신을 보강했고, 사용자 재확인 필요(H-10-1).
- 자동 등록 즉시 대상은 승인 관리자 담당 지점 학생이다. 그 밖 학생은 학생이 학교 수행평가 목록(홈 포함)을 열 때 등록된다 — 실제 LearnersHigh 학적 목록 API(슬롯별 학생 조회)가 없어서다(OD-A04). 관리자 학생 화면 보기만으로는 등록되지 않는다(읽기 전용 원칙).
- 공식 반영비율(소수 가능)은 `official_weight_percent` 로 따로 두고, 개인 `weightPercent` 는 학생 값 그대로(없으면 화면이 공식 값 표시).
- A28-19 는 8개 탭 주 화면 설명만 줄였다. 검토·결과 상세의 판단용 안내(최종 승인 영향 등)는 유지 — 추가 축약은 사용자 지정 필요.
- G-9 미해결 그대로: 별칭 `si_856240f4…` 자료 정리, 근거 부족 과별 공시, HWP·HWPX 화면 편집, 8080 무로그 종료 원인.
- 사용자 검증: A28-17~21 모두 **NOT RUN**(사용자 직접 확인 전).

---

# A28-22~23 — 최종 승인 즉시 반영 및 학생 홈 월간 달력 복원 (2026-11-22 17:10~)

- 입력: `C:\learnershigh-local-run\a28-approval-calendar-input\`(ZIP: 프롬프트·이미지 01~05·참고 보고서). 참고 보고서 = 저장소 보고서와 동일(차이 0).
- **Migration 없음 · 사용자 DB 쓰기 없음(이번 작업)** · 사용자 문서 재승인 없음 · Git Commit·Push·Merge 없음. 분석기(`service/plan/extract/TeachingPlanRules`, 완규님 담당 정확도 영역) 변경 없음.

## I-1. 시작 기준값

- DB 백업 `C:\learnershigh-local-run\a28-approval-calendar-20261122\backup\lh_local_run-start-*.sql`(78,262,293B, rc=0, SHA-256 `backup-sha256.txt`), 표별 행 수 `rowcounts-start.tsv`, Storage 1,973개 SHA `storage-sha256-start.txt`, Git 상태 `pre-edit\git-status-before.txt`. 수정 전 파일 사본 `pre-edit\`.
- 직전 보고(H) 이후 사용자 조작: 확정 기록 4→5(보라고 16:44), 확정값 68→253, 학생 수행평가 22→43(A28-20 자동 등록), **운영계획 확정 표 변화 0**.

## I-2. A28-22 보라고 원인 추적 (사용자 DB 읽기 전용)

| 단계 | 결과 | 판정 |
|---|---|---|
| 승인 문서 식별 | 보라고 `sch_demo_bora` 2026 고1 2학기 · `plan_cde3c390-ccac-40b8-8915-df38e244c7de` / `plan_rev_d143a2fe-4b27-4f4b-a9db-67f2812f7ba4`(개정 1) · 파일 `2026학년도 2학기 1학년 교수 학습 및 평가 운영 계획.pdf`(**PDF**, SHA `e3d78bc1…`) · analysis `analysis_39b6e203…`(서버 분석기 `learnershigh-plan-extract`, REVIEW_REQUIRED, 과목 11) · 확정 `plan_review_2beb8a44…` `adm_demo_b01` 2026-11-22 16:44:12 KST · `SERVER_STORED_ORIGINAL` | 확인 |
| 이미지 03 | 파일 `2026학년도 2학기 국어한문과 …hwp`·공통국어2 확정 18 은 **보라고가 아니라 가정고** `sch_demo_gajeong` 2026 고1 2학기 `plan_a988234c…`/`plan_rev_7b9cd52c…`(확정값 18개 = 평가 정보 필드 수, 운영계획 행 아님). 이 문서는 운영계획 후보 33행이 있으나 운영계획 확정 0(사용자가 '월별 운영계획 최종 승인'을 아직 누르지 않음) | 확인 |
| ① 원본·분석 | 원본 PDF 197쪽에 과목마다 '교수·학습 운영 계획' 표가 **있다**(예: 1쪽 '■ 8월' 아래 '주 · 단원명 · 교육과정 성취기준 · 수업방법' 표, 18쪽 공통수학2 '■ 8월/■ 9월'). 그러나 분석 결과 11과목 모두 `teachingPlan` 필드 **없음 = 후보 0행**. 원인: 월이 표 **밖 제목('■ 8월')** 에 있고 표 머리에는 '주' 열만 있어, 분석기 진도표 인식 규칙(`TeachingPlanRules` — 머리 줄에 '월·시기' 열 필요, `ImportPayload.java:120` 은 행이 있을 때만 출력)이 표를 진도표로 읽지 못함 | **원인 확인**(원본에 운영계획 있음 → 분석기 0행) |
| ② 승인 요청 | 후보 0행이라 최종 승인 계획(`finalApproval.ts`)이 `teachingPlan` 을 보내지 않음(보낼 행 없음). 당시 패널은 유형별에 '후보 없음'만 작게 보여 다 확정된 것처럼 보였다 | 확인(표시 결함) |
| ③ Backend 쓰기 | 평가 정보 11과목 185 확정값 저장, 같은 Revision 운영계획 확정 기록 0. 서버도 후보 0행이면 운영계획 확정을 `400 no_teaching_plan` 으로 거절한다(가짜 행 불가) | 확인(정상 동작) |
| ④ 읽기 모델 | §38 목록·§39-6 조회 정상. 다만 관리자 조회가 **최신 개정본만** 보던 결함 발견 — 새 원본 개정본(미확정)이 올라오면 이전 운영계획 확정본이 관리자 두 화면에서 사라짐(학생 공개 '최신 확정 개정본' 규칙과 불일치) | 결함 확인 → 수정 |
| ⑤ Frontend | 두 화면 같은 훅(`useConfirmedTeachingPlan`), 응답 경쟁 취소(`cancelled`)·캐시 없음. 보라고는 확정 행이 0이라 빈 상태가 맞았으나, 빈 상태가 '분석 탭에서 검토·확정하면 보여요'로만 나와 '이미 승인했는데 왜 없나'를 설명하지 못함. 다른 탭에서 승인한 뒤 열린 화면은 창 복귀(10초 제한) 때만 갱신 | 확인 → 수정 |

- 결론: 보라고는 **조회·캐시 문제가 아니라 분석 결과에 운영계획 행이 0이라 확정될 운영계획이 없던 상태**다. 확정 데이터 읽기 오류가 아니므로 재승인 없이 보일 행이 없다. 분석기 표 인식 보완은 분석기 담당(완규님) 영역이라 바꾸지 않았다(증거: 위 ①, 원문 1·2·18·188쪽).

## I-3. A28-22 수정

- `admin/.../model/planEvents.ts`(신규): 확정 API 성공(서버 commit 후 응답) 뒤 같은 브라우저 관리자 탭들에 '확정됨' 신호(BroadcastChannel + 같은 탭 이벤트, 문서 ID·학교·학년도·학년·학기만). `api/assessmentAdminApi.ts` 의 `confirmPlanReview`·`confirmTeachingPlan` 한 곳에서 보낸다(통합 최종 승인·운영계획만 승인·단계별 확정·재확정 모두).
- `routes/OverviewRoute.tsx`·`routes/MonthlyPlanTabRoute.tsx`: 같은 슬롯 신호면 즉시 조용히 재조회(복귀 10초 제한 무관, 이전 데이터 유지로 깜빡임·다른 학교 잔상 없음).
- `model/confirmedTeachingPlan.ts`: 문서마다 가장 최근에 운영계획이 확정된 개정본 사용(새 미확정 개정본이 있어도 이전 확정본 유지) + 확정 없는 문서를 '후보 있음·미확정'(후보 행 수)과 '분석 결과 없음'으로 분류.
- `components/TeachingPlanEmpty.tsx`(신규): 빈 상태 이유 — 평가계획서 없음 / '운영계획이 아직 확정되지 않았어요'(문서·후보 n행 · '검토·최종 승인' 링크) / '운영계획 분석 결과가 없어요'(문서별 '분석 결과에 월별 운영계획 행이 없어 확정할 수 없어요'). 일부 문서만 확정이면 Planner 위에 미확정 목록.
- `review/finalApproval.ts`·`FinalApprovalPanel.tsx`: 분석 결과에 운영계획 행이 없으면 경고 '이번 승인으로 운영계획은 확정되지 않아요', 유형별 '분석 결과 없음(이번 승인에 포함 안 됨)'.
- 계약 §39-15 에 A28-22 화면 규칙 추가(API·DB 변경 없음).
- 갱신 보장 범위: 같은 탭(재마운트 재조회) · 같은 브라우저 관리자 다른 탭(신호 즉시) · 학생 화면(5173, 다른 origin)·다른 브라우저는 재진입·창 복귀 때(실시간 push 없음 — 과장하지 않음).

## I-4. A28-23 학생 홈 월간 달력 복원

- 과목×주차 표(`HomeSubjectPlanner`·`homeSubjectPlan.ts`·CSS·시험) **삭제**(사본 `pre-edit\`). 기존 `HomeMonthCalendar` 를 이미지 05 구조(일~토 7열·날짜 칸·오늘·이전/다음/이번 달·운영계획 크게 보기·요약 3칸·범례·날짜 상세 Modal)로 복원하고 일정 모델 `model/homeCalendar.ts`(신규, `placeEntries` 재사용)로 채운다.
- 날짜 칸 일정: '과목 · 제목' + 배지 — 수행(파랑, 내 평가일)·마감(주황+테두리)·지필(보라)·수업(녹색)·잠정(점선, 'n월 m주' 그 달 m번째 줄). 중요 일정(마감→수행→지필) 먼저·굵게, 칸마다 3개 + '+N개 더 보기'(그날 전체). 과목 필터 '전체 과목 / 수강 과목'.
- 달력 아래 '이달 일정 · 날짜 미정': 월만 적힌 운영계획·학기 주차 계획, 공식 시기만 있는 학교 확정 수행평가(A28-20 자동 등록 행), 확정 지필평가(시기 문장의 달). '시기 미정'(달도 없음)은 접힘. 임의 날짜·D-day 없음. 학교 확정에서 빠진(WITHDRAWN) 항목 제외. 공식 시기 '9-10월' 지필은 9월·10월에 각각, 건수는 그 달 기준.
- 수행평가는 학생 학교 수행평가 행(자동 등록 포함) 하나로만 표시 — 확정 평가 정보 항목을 따로 다시 그리지 않아 이중 표시 없음. 학생 개인 평가일·마감은 학생 값 그대로(공식 날짜로 덮지 않음).
- 오른쪽 '다가오는 수행평가'·'수행평가 메모', 7:3, KPI·최근 2개·3개년 원본·Viewer 그대로.

## I-5. 시험 (이번 실행)

| 검증 | 결과 |
|---|---|
| 신규 E2E `z-a28-approval-refresh.spec.ts`(일회용 MySQL·가상 학교알리미·분석 Stub) | **통과** — 학교알리미 공식 PDF(운영계획 후보 있음) 수집·분석 → 관리자 '과목 확인' 연결 → 최종 승인 **실제 클릭** → 요청 `sourceCheck=SERVER_STORED_ORIGINAL`·`teachingPlan` 9행 → 응답 200(301ms) → 첫 GET 확정 9행(77ms) → **미리 열어 둔** 월별 운영계획 탭 +9(응답 후 550ms)·전체 현황 탭 +9(629ms), 새로고침 없음 → '크게 보기' 같은 수 → 학생 stu_001 운영계획 행·학교 확정 수행평가 자동 등록 |
| Node | 39 파일 171 통과(신규 `homeCalendar.test.mjs` 4: 날짜 칸·요일·31일·같은 날 3과목 중요 순·잠정·날짜 미정·시기 미정·WITHDRAWN 제외·다음 달 마감·12월 지필 날짜 미정·과목 필터·윤년 2028-02 29일 / `finalApproval` +1: 운영계획 없음 경고) |
| `scripts/verify-frontend.ps1` | PASS |
| Backend 단위(전체 `test --rerun-tasks`, ArchUnit 포함) | 68 클래스 461 — 458 통과 · 3 skip(기존) · 실패 0 (이번 라운드 Backend 코드 변경 없음, 재실행) |
| Backend 통합(MySQL Testcontainers, 3묶음) | 48 클래스 246 — 전부 통과(51 + 73 + 122) |
| Assessment E2E 전체(일회용) | **68/68 통과**(6.4m, 신규 1 포함). 직전 H-8 의 `z-a27-autosync.spec.ts:121` 시간 경쟁 실패는 이번 전체 실행에서 재발하지 않음. 전체 실행 중 신규 spec 측정: 응답 138ms · 첫 GET 26ms · 월별 탭 883ms · 전체 현황 탭 1,397ms(목표 2초 이내) |
| REPLAY(실측 manifest) | 8/8 통과 |
| E2E 기대값 갱신 | `a27-student-ux.spec.ts` 홈 달력 구간을 월간 달력(날짜 칸·잠정 상세) 기대값으로 되돌림(직전 과목×주차 표 기대값 제거) |
| 사용자 환경 화면(읽기 전용, GET 외 차단) | 보라고 전체 현황·월별 운영계획 모두 '운영계획 분석 결과가 없어요'(문서 2개 이유 표시) · 대신고 두 화면 9월 4 · 10월 5 · 11월 4 · 12월 5 · 2월 1, 공통국어2 19(동일) · 학생 홈 4해상도: 일~토 7열·10월 31칸/11월 30칸/12월 31칸, 과목×주차 표 0, 11/30 '수행 공통국어2 · 사회적 독서와 관련된 책 읽기'·12/1 '마감 …', 10월 날짜 미정 = 학교 확정 수행 '공동 탐구 …'·지필(9-10월)·수업 1, 12월 날짜 미정 = 지필(12월)·수업 1, 잠정 주차 계획 표시 · 1366/1600/1920 달력:오른쪽 ≈ 7:3, 800 세로 쌓임, 가로 넘침 0 |

- 실제 데이터는 대신고 학생이 한 과목(공통국어2)만 확정돼 있어 다과목·같은 날 겹침·'+N개 더 보기'는 Node 합성 시험으로만 확인(실데이터로 검증했다고 하지 않는다).

## I-6. 사용자 확인 순서 (NOT RUN — 사용자 직접)

1. 관리자 http://localhost:5174/assessment?devAdmin=adm_demo_b01&school=sch_demo_bora&year=2026&grade=1&semester=2 → '운영계획 분석 결과가 없어요' + 문서 2개 이유. '크게 보기' → 월별 운영계획 같은 내용. (보라고는 원본에 운영계획 표가 있으나 분석기가 읽지 못해 지금은 확정할 행이 없다 — 분석기 담당 확인 필요)
2. 가정고 2026 고1 2학기(이미지 03 문서): http://localhost:5174/assessment/monthly-plan?devAdmin=adm_demo_b01&school=sch_demo_gajeong&year=2026&grade=1&semester=2 → '운영계획이 아직 확정되지 않았어요 · 후보 33행' → '검토·최종 승인' → 최종 확정 단계 '월별 운영계획 최종 승인'(누르면 사용자 DB 에 운영계획 확정 기록이 생김) → 다른 탭에 열어 둔 전체 현황·월별 운영계획이 새로고침 없이 바뀌는지.
3. 대신고 비교: http://localhost:5174/assessment?devAdmin=adm_demo_b01&school=sch_demo_daeshin&year=2026&grade=1&semester=2 ↔ '크게 보기'.
4. 학생 http://localhost:5173/assessment?devStudent=stu_demo_021 → 홈 하단 월간 달력(일~토) 10·11·12월, 11/30 수행·12/1 마감, 날짜 미정 띠, 과목 필터, 오른쪽 카드.
5. 학생 학교 수행평가 http://localhost:5173/assessment/school-assessments?devStudent=stu_demo_021 → 기존 3건(학교 확정 2 + 개인 1) 유지.

## I-7. 남은 제약

- 보라고 운영계획: 원본 표 형식('■ 월' 제목 + '주' 열)을 분석기가 읽지 못함 — 분석기 담당 영역(이번 미변경). 보정 전까지 확정할 운영계획 행이 없다(가짜 행·자동 승인 없음).
- 학생 화면·다른 브라우저는 실시간 push 가 없어 재진입·창 복귀 때 갱신.
- G-9·H-11 미해결 그대로(별칭 자료 정리, 근거 부족 과별 공시, HWP 편집, 8080 무로그 종료 원인).
- 사용자 검증: A28-22·23 **NOT RUN**.

---

# A28-24~26 — 학년 공통 공시·보라고 운영계획 분석 누락·학생 달력 간소화 (2026-11-22 18:00~)

- 입력: `C:\learnershigh-local-run\a28-gradescope-input\`(ZIP: 프롬프트·README·이미지 01~06·참고 보고서). 참고 보고서 = 저장소 보고서와 동일(차이 0). 브랜치 `integration/assessment-studentcare-20261116`, 시작 시 미커밋 405개(보존).
- **Schema Migration 없음**(Flyway 28 그대로). 사용자 DB 데이터 보정 1회(A28-24, 가정고 2026 학년 칸 연결 14건). Git Commit·Push·Merge 없음. 분석기(`service/plan/extract/*`) 미변경.

## J-1. 요구사항별 결과

| ID | 결과 | 요약 |
|---|---|---|
| A28-24 학년 공통 과별 원본 | **PASS(자동 검증)** · 사용자 확인 NOT RUN | 원인 = 분류기 본문 4만 자 한도. 원문 전체 과목 단원 학년 판정 추가 → 가정고 2026 1·2학기 고1·고2·고3 6·6·6 |
| A28-25 보라고 운영계획 0행 | **진단 완료 · 미해결**(분석기 수정·재추출·확정 없음) | 분석기 추출 로직 결함(분류 1). 인계 문서 작성 |
| A28-26 학생 달력 간소화 | **PASS(자동 검증)** · 사용자 확인 NOT RUN | 잠정 0, 4색(수행·수업 무채색·마감 빨강·지필 파랑), 월간 달력 유지 |

## J-2. A28-24 원인과 수정

- **원인(확인)**: 가정고 2026 과별 공시 12개는 모두 한 파일에 고1·고2·고3 과목 계획 단원이 이어진 통합 문서다. 분류기(`SchoolInfoSourceClassifier`, A28-09 규칙)는 제목 학년(1) + **본문 앞 4만 자**(`SourceTextProbe.BODY_LIMIT`)에서 1·2·3학년을 모두 찾아야 넓혔다. 7개 파일은 2·3학년 단원이 4만 자 뒤(예 사회윤리역사과 3학년 첫 출현 95,144자)에 있어 고1 에만 남았다(G-6 의 '근거 부족'도 같은 원인).
- **수정**: 과별 공시(이름에 학년 없음, 제목 학년 하나)는 원문 전체(HWP·HWPX 최대 150만 자, PDF 앞 20쪽)에서 **과목 계획 머리글 `[과목](과) 교수학습 및 평가 (운영) 계획` + 그 뒤 80자 안의 `N학년`** 만 모은다(`sectionGrades`). 1·2·3 모두 → `ALL_GRADES`(사유 `GRADES_FROM_BODY_ALL`, 근거 `SECTION_GRADES`), 둘 이상 일부 → `EXPLICIT_GRADES`(그 학년만, `GRADES_FROM_SECTIONS`), 그 밖 → 이전 규칙(제목 학년). 학년 낱말 단순 출현은 근거 아님. 파일 이름에 학년이 있으면 적용 안 함. 학기·학년도는 그대로(교차 연결 없음). 새 수집(정기·강제)에도 같은 분류기를 쓴다.
- 보정 실행기 `SchoolInfoGradeScopeRepair`: 새 판정이 제목 학년보다 넓은 경우(일부 학년 포함) 빠진 칸만 추가, **`…-scope=학교키:학년도`** 범위 제한(범위 없으면 apply 거절).
- 파일: `service/plan/SchoolInfoSourceClassifier.java`, `service/plan/SchoolInfoGradeScopeRepair.java`, 시험 `SchoolInfoSourceClassifierTest`(+3: 4만 자 뒤 단원 → 전 학년 · 1·2학년 단원만 → 1·2학년 · 1학년 단원만/낱말만/이름 학년 명시/과별 아님 → 넓히지 않음 · 실측 머리글 변형), 계약 §38 분류 절.

### 파일별 판정(원문 전체 과목 단원 · `C:\learnershigh-local-run\a28-gradescope-20261122\gajeong-2026-section-grades.txt`)

| 학기 | 파일 | sourceFileId | SHA(앞 12) | 학교알리미 ID | 보정 전 칸 | 판정 | 근거(과목=학년) |
|---|---|---|---|---|---|---|---|
| 1 | 과학,기술·가정,정보과 | si_src_38e223a8… | 32f77d07cdc3 | 425ad6e7… | 1·2·3 | ALL | 통합과학1=1 … 물리학=2 … 물리학Ⅱ=3 |
| 1 | 국어한문과 | si_src_6cccccf3… | 0cb1b7581e5f | 〃 | 1·2·3 | ALL | 공통국어1=1 독서와작문=2 언어와매체=3 |
| 1 | 사회윤리역사과 | si_src_f0232fc2… | 134a98a29a08 | 〃 | **1** | ALL | 통합사회1=1 정치=2 여행지리=3 … |
| 1 | 수학과 | si_src_0792fd95… | e942ffd05415 | 〃 | **1** | ALL | 공통수학1=1 대수=2 확률과통계=3 |
| 1 | 예체능·보건과 | si_src_ec712f10… | 5798ce1c1e14 | 〃 | **1** | ALL | 음악=1 미술과매체=2 음악감상과비평=3 |
| 1 | 외국어과 | si_src_676da994… | f067f19ff7a7 | 〃 | **1** | ALL | 공통영어1=1 영어Ⅰ=2 진로영어=3 |
| 2 | 과학,기술·가정,정보과 | si_src_0dd1d77a… | 823e1e0e3f6a | 〃 | 1·2·3 | ALL | 통합과학2=1 역학과에너지=2 물리학Ⅱ=3 |
| 2 | 국어한문과 | si_src_5b6c16e2… | 0f54d9e83e76 | 〃 | 1·2·3 | ALL | 공통국어2=1 문학=2 화법과작문=3 |
| 2 | 사회과 | si_src_3a30ffe4… | ae55652cf8aa | 〃 | **1** | ALL | 통합사회2=1 경제=2 세계지리=3 |
| 2 | 수학과 | si_src_d82edaf4… | 3ff89be796e7 | 〃 | 1·2·3 | ALL | 공통수학2=1 미적분Ⅰ=2 확률과통계=3 |
| 2 | 예체능·보건과 | si_src_f6a54d6b… | f00faa57675f | 〃 | **1** | ALL | 음악=1 미술과매체=2 운동과건강=3 |
| 2 | 외국어과 | si_src_60a78948… | 5159a33f319d | 〃 | **1** | ALL | 공통영어2=1 영어II=2 실용영어=3 |

- 학년 칸 문서 수: **수정 전 1학기 6·2·2, 2학기 6·3·3 → 수정 후 1학기 6·6·6, 2학기 6·6·6**(12개 모두 원문 단원 근거로 전 학년 통합 확인 — 억지 확대 아님).
- 2024·2025·다른 학교: 전체 범위 dry-run 후보 7건 = 모두 가정고 2026(다른 학년도·학교 재발 0) → 범위 밖 보정 없음.

## J-3. A28-24 데이터 보정 — 리허설 → 사용자 DB

| 단계 | 결과 |
|---|---|
| 기준 | 시작 덤프 `backup\lh_local_run-start-*.sql`(78,262,436B, SHA `backup-sha256.txt`), 40표 행 수, Storage 1,973 SHA, 확정 해시(review `85939349…`·values `d11624ce…`·tp `0b3ba23e…`) |
| 복제 리허설(`lh-a28-clone` 33361, tmpfs) | 행 수 동일 복원 → 전체 dry-run `candidates=7 missingLinks=14`(모두 가정고 2026) → 범위 `sch_demo_gajeong:2026` dry-run 동일·쓰기 0 → apply `added=14` (문서·Revision·칸 연결 각 +14, 다른 표 0) → 재실행 `candidates=0` 행 변화 0 → 확정 해시 동일 → 6·6·6 확인 → 컨테이너 삭제 |
| 사용자 DB | 8080 중지(PID 21476) → 직전 덤프 `lh_local_run-pre-repair-*.sql` → 범위 dry-run 7/14·쓰기 0 → apply `added=14` → 재실행 0 · 행 변화 0 |
| 보존 증거 | 확정 해시 3종 시작과 동일 · Storage 1,973 → 1,987(기존 파일 변경 0, 새 Revision 사본 14) · 가정고 2026 칸 연결 22→36, 출처 12개 그대로, 36개 모두 Revision SHA = 원본 SHA, 중복 0 · 이전 A28-09 34건 연결 그대로 |
| 보고 파일 | `C:\learnershigh-local-run\a28-gradescope-20261122\repair-user-dry-run-*.tsv`, `repair-user-apply-*.tsv` |

- 새 고2·고3 칸 문서 14개는 '분석 전'(고1 의 확정 평가 정보·운영계획을 복사·공개하지 않음). 분석·확정은 관리자 정상 절차.

## J-4. A28-25 보라고 진단(분석기 미수정)

- Ownership: `docs/OWNERSHIP.md` 에 분석기 담당 명시 항목은 없고, 기존 보고서(A27·I-7)가 '분석기 정확도 = 완규님'으로 기록. 공동 작업 권한 명시 없음 → **코드 미수정**.
- 원본 근거: 1쪽 `■ 8월` → `주|단원명|교육과정 성취기준|수업방법|수업·평가 연계의 주안점` 표(`3-4 | 1. 한국 문학의 흐름 …`), 2쪽 `■ 9월`, 3쪽 `■ 10월`, 4쪽 `■ 11월`, 5쪽 `■ 12월`·`■ 1월`, 18쪽 공통수학2, 188쪽 생태와 환경.
- 실측(시험 사본, 사용자 DB 쓰기 없음): 표 636개 중 운영계획형 **62개**·본문 원시 행 **224**, 표 앞 문맥(ctx)에 `■ N월` 보존 **61/62**(나머지 p.94 는 쪽 넘김 연속 표), `TeachingPlanRules.rows` **62/62 null** — 실패 분기 `TeachingPlanRules.java:66`(머리 줄 `월·시기` 열 필수).
- 판정: **분류 1 — 분석기 추출 로직 결함**(전처리 정상, 원천 판정 가능).
- 인계 문서: `docs/specs/suyeon/A28-25-ANALYZER-HANDOFF-BORA-TEACHING-PLAN-20261122.md`(변경 제안: `rows(g, monthFromContext)` 오버로드 · ctx 마지막 `■ N월` · 같은 과목 연속 표 이어받기 · 과목 전환 초기화 · 날짜 생성 금지 / 예상 최대 224 원시 행, 실제 행 수 미상 / 정상·음성 시험 / 재현 명령). 재현 자료 `C:\learnershigh-local-run\a28-gradescope-20261122\a28-25\`.
- **보라고 월별 운영계획은 새로 추출·확정되지 않았다(미해결).** 185 확정값 재승인 없음.

## J-5. A28-26 학생 홈 달력

- `model/homeCalendar.ts`: `tentative` 유형 삭제. 날짜 칸 = 원문 날짜가 있는 운영계획(수업)·내 평가일(수행)·제출 마감(마감). 'n월 m주'·학기 주차·연도/시기 미정 운영계획은 홈 날짜 칸·날짜 미정 목록에 두지 않음(관리자·학생 월별 운영계획 화면의 주차 정보는 그대로). 월만 적힌 운영계획·공식 시기 수행평가·지필은 '이달 일정 · 날짜 미정'(점선 없음, 잠정 배지 없음). 운영계획 수 = 원문 날짜 행 + 월 단위 행.
- `HomeMonthCalendar.tsx`: 범례·상세에서 잠정 제거. `homeDashboard.module.css`: 4색 — 수행 `#333d4b`/`#eef0f3`, 수업 `#4e5968`/`#f2f4f6`(무채색), 마감 `#c62828`(빨강, 테두리), 지필 `#1957c2`(파랑, 테두리), 글자 배지 함께. 날짜 미정 띠 테두리 실선.
- 시험: `homeCalendar.test.mjs` 갱신(주차 행 미표시·잠정 유형 없음·운영계획 수), E2E `a27-student-ux` 홈 구간을 '잠정 0·주차 행 미표시'로 갱신(이전: 잠정 표시 상세).
- 실측(stu_demo_021, 4해상도, 읽기 전용): 10·11·12월 일~토 7열, '잠정' 글자 0·점선 요소 0, 11/2·9·16·23 날짜 칸 일정 없음, 11/30 수행(무채색 rgb(51,61,75)), 12/1 마감(빨강 rgb(198,40,40)), 10월 날짜 미정 = 지필·학교 확정 수행·수업 1, 학생 월별 운영계획 화면은 주차 표시 유지, 1366/1600/1920 7:3·800 세로 쌓임, 가로 넘침 0. 확정 평가 정보의 지필은 날짜 필드 없이 시기 문장('9-10월')만 있어 날짜 칸에 놓을 근거가 없다 — 지필은 '날짜 미정' 띠에 파란 배지로만 보인다(날짜 칸 파란 지필은 정확한 시험일 데이터가 생길 때 해당).

## J-6. 시험(이번 회차)

| 검증 | 결과 |
|---|---|
| Backend 단위(전체 `test --rerun-tasks`, ArchUnit 포함) | 68 클래스 464 — 461 통과 · 3 skip(기존) · 실패 0 (분류 시험 +3) |
| Backend 통합(MySQL Testcontainers, 3묶음) | 48 클래스 246 — 전부 통과(51 + 73 + 122) |
| `scripts/verify-frontend.ps1` | PASS(typecheck·lint·build) |
| Node | 39 파일 171 통과 |
| Assessment E2E 전체(일회용) | **68/68 통과**(7.4m) — 홈 달력 기대값 '잠정 0·주차 행 미표시'로 갱신(기존 학생 월별 운영계획 화면의 주차·잠정 단언은 그대로). A28-22 승인 즉시 반영: 응답 168ms·첫 GET 31ms·월별 탭 1,265ms·전체 현황 1,757ms |
| REPLAY(실측 manifest) | 8/8 통과 |
| 진단(시험 사본 임시 시험, 저장소 미포함) | 가정고 12개 원본 과목 단원 학년 덤프 · 보라고 PDF 표 62개 덤프 |

## J-7. 서버 · 확인 순서

- Backend 8080: 보이는 PowerShell 창 `C:\learnershigh-local-run\start-backend.ps1`(새 분류기 반영) · 학생 5173·관리자 5174 Vite 유지(HMR).
- 확인(사용자, NOT RUN):
  1. 관리자 http://localhost:5174/assessment/evaluation-plans?devAdmin=adm_demo_b01&school=sch_demo_gajeong&year=2026 → 고1·고2·고3 1학기·2학기 모두 문서 6개(고2·고3 새 문서는 '분석 전'), '원본 보기'·'원본 내려받기'는 같은 원본.
  2. 학생 http://localhost:5173/assessment?devStudent=stu_demo_021 → 홈 달력 11월(잠정 없음·11/30 수행 회색)·12월(12/1 마감 빨강)·10월(날짜 미정 띠: 지필 파랑).
  3. 보라고 http://localhost:5174/assessment?devAdmin=adm_demo_b01&school=sch_demo_bora&year=2026&grade=1&semester=2 → 여전히 '운영계획 분석 결과가 없어요'(분석기 수정 전까지 정상 — 미해결).
- 학교알리미 자동 확인(TTL 24h)은 평가계획서 탭 진입 시 POST 로 DB·Storage 에 쓸 수 있다(새 분류 규칙 적용).

- 작업 종료 시 확인: 보정 뒤 사용자 DB 행 증가(문서 +168·Revision +170·원본 +67·칸 연결 +172·매핑 +1)는 **사용자 조작** — 19:21 `adm_demo_b01` 이 학교 검색으로 '한영고등학교'(`si_b0e4de76…`)를 골라 학교알리미 자동 수집이 돌았다(새 분류 규칙 적용). 이 작업의 쓰기는 가정고 14건(18:39, `system_schoolinfo_auto`)뿐. 확정 해시 3종은 종료 시에도 시작과 동일.

## J-8. 남은 일

- 분석기 담당(완규님): 인계 문서대로 표 밖 월 제목 문맥 지원 → 이후 사용자가 보라고 문서 '다시 분석' → 운영계획 승인.
- 가정고 고2·고3 새 문서 14개 분석·확정(관리자).
- G-9·H-11·I-7 미해결 그대로(별칭 자료 정리, HWP 편집, 8080 무로그 종료 원인).

---

# A28-27 — 분석기 정확도(표 밖 월 제목 운영계획) · PR #18 통합 · main 병합 준비 (2026-11-22 19:40~)

- 지시: `%USERPROFILE%\Downloads\A28_27_Analyzer_Accuracy_GitHub_Integration_Prompt_20261122.md`. **사용자 결정(이번 회차)**: Assessment 평가계획서 분석기 정확도는 Suyeon 담당 — A28-25 의 '완규님 인계·코드 미수정' 지시 철회. 완규님 기여·이력은 보존하고 비교 결과를 공유한다.
- 가정고 A28-24(사용자 확인 PASS)·학생 홈 A28-26(현행 유지)은 다시 작업하지 않고 회귀만 확인했다.
- **Schema Migration 없음 · API 계약 모양 변경 없음**(계약 §39 schedule 에 규칙 주석만). 사용자 DB 쓰기 0(이번 회차), 사용자 문서 재분석·승인 0.

## K-1. 요구사항별 결과

| 항목 | 결과 | 요약 |
|---|---|---|
| A28-27 보라고 운영계획 0행 | **PASS(자동·복제 리허설)** · 사용자 DB 반영 NOT RUN(사용자 재분석 대기) | 표 밖 월 제목 + '주' 열 진도표 읽기. 1학년 PDF 0 → 195행(11과목), 2학년 0 → 255, 3학년 6 → 350, 소인수 0 → 79 |
| 오탐 방지·회귀 | **PASS** | 실제 원본 396개: 기존 운영계획 37,073행·과목·항목·지필 출력 해시 396/396 그대로. 과목명 미확인 과목에 붙은 새 행 0, 같은 칸 중복 0 |
| 가정고·학생 UI 회귀 | **PASS(자동)** | E2E·Node·frontend 검증(K-6) |
| PR #18 비교 | **PASS** | `docs/specs/suyeon/A28-27-PR18-COMPARISON.md` |
| Git·GitHub | K-7 | |

## K-2. 원인과 수정 (클래스·메서드)

- 원인(A28-25 진단 그대로): `TeachingPlanRules.rows` 가 머리 줄에 월·시기 열이 없으면 표를 버렸다. 보라고 공시는 '■ 8월' 같은 월이 표 **밖** 제목이고 표에는 `주 | 단원명 | 교육과정 성취기준 | 수업방법 | …` 만 있다.
- `TeachingPlanRules`
  - `rows(g)` = `rows(g, (MonthHeading) null)` — 월 열이 있는 기존 진도표는 **같은 코드 경로·같은 결과**.
  - `rows(g, MonthHeading)`: 월 열이 없고 '주' 열 + 단원/성취기준 열이 있을 때만. 주 칸이 월로 시작하면(`9월 1주`) 그 월 우선, 다음 달로 넘어가는 주 칸(`5 - 1월 2주`)·두 달 제목(`■ 12월, 1월`)은 월 범위(주 위치 없음, 원문 `weekLabel` 유지). 숫자 없는 주 칸 줄·같은 표 안 완전 중복 줄 제외, 같은 주·단원·성취기준으로 나뉜 줄은 한 행으로 합침(수업방법 등 합집합).
  - `heading(ctx)`/`headingMonth(ctx)`: 표 바로 앞 **마지막 본문 줄**이 월 제목 하나뿐일 때만(쪽 번호 줄은 건너뜀). `■ 8월`·`8월`·`2026년 8월`·`< 12월 >`·`[9월] 교수·학습 운영 계획`·`■ 12월, 1월`·`■ 12~1월`. 본문 문장 속 월('※ 8월 2주에 진단평가'), 평가 시기('10월 3주'), 날짜, '■ 8월 행사: 축제', 제목 뒤 본문 줄은 인정하지 않음.
  - `weekOnlyPlanTable`, `headSignature`(병합 칸 펼침 수 차이는 같은 머리로), `otherMonthLine`(ctx 의 **마지막** 월 표시가 다른 달이면 이어받지 않음).
- `PlanExtractor.contextMonths` — 표마다 월 문맥: 제목이 없으면 **바로 앞 표**가 같은 과목·같은 과목 머리(setAt)·같은 머리 줄의 월 제목 진도표이고 같은/다음 쪽(HWP·HWPX 는 사이 본문 없음)일 때만 이어받기. 과목 전환·새 과목 머리 표·쪽 건너뜀·사이 다른 표·다른 월 표시 → 이어받지 않음(틀린 월보다 빠짐).
- 보라고 학교 ID·파일 이름 조건문 없음. `ImportPayload`(precision·monthBasis)·DB·API 그대로.

## K-3. 실측 정확도 (사용자 Storage 원본, 읽기 전용, 수정 전 PR #18 규칙 vs 수정 후)

| 원본 | 과목 | '주' 열 표 | 월 확정 표 | 운영계획 행 전 → 후 |
|---|---:|---:|---:|---|
| 보라고 2026 2학기 1학년(197쪽) `e3d78bc172a3` | 11 | 62 | 62(제목 61 + 이어받기 p.94) | 0 → 195 |
| 보라고 2026 2학기 2학년 `fc8ad3a7c014` | 15 | 76 | 76 | 0 → 255 |
| 보라고 2026 2학기 3학년 `98d4c4c90ea3` | 21 | 105 | 105(이어받기 화학Ⅱ p.238~240) | 6 → 350 |
| 보라고 2026 2학기 소인수·공동교육과정 `961d06f4629f` | 4 | 23 | 22(이어받기 화학 실험 p.59·61) | 0 → 79 |
| 그 밖 392개(가정·대신·가좌·경일·한림·현대·삼각산·운정·학교알리미 선택 학교) | — | 삼각산 141(월 제목 없음 → 0행 유지) | — | 변화 0 |

- 합계: 문서 396 · 오류 0 · 운영계획 37,073 → 37,946 · 수정 전 37,073행 그대로 · 과목·항목·지필·비율·채점기준 출력 해시 396/396 동일. 표본: 보라 20·대신 60(357 중)·가정 25·가좌 56·경일 23·한림 20·현대 90·삼각산 18·운정 18·학교알리미 선택 학교 66(SHA 기준 중복 제거).
- 보라고 1학년 1과목 대조(공통국어2, PDF 1~5쪽): `8월 3-4·5 / 9월 1~2·3-4·5 / 10월 1-3·4·5 / 11월 1-2·3·4-5 / 12월 1~2·3·4-5 / 1월 1-2` 15행 — 원문 표와 같음. 통합과학2 p.94 연속 표 11월 3·4주 이어받기 확인.
- 정밀도(보라고 4개 879행): WEEK_IN_MONTH 702 · MONTH_RANGE 177(두 달 제목·다음 달로 넘어가는 주 칸). 날짜 생성 0.
- 오탐 점검: 나뉜 줄 합치기 전 '법과 사회' 65행 → 16행(같은 주·단원·성취기준 중복 49 제거). 최종 같은 칸 중복 0.
- 남은 빠짐: 소인수 PDF 화학 실험 p.60 표 1개(원시 7줄, 앞이 조각 표라 이어받지 않음). 삼각산 2024 1학기 '주(시수)' 표 141개는 월 근거가 없어 행을 만들지 않는다(기존과 같음).
- 산출물: `C:\learnershigh-local-run\a28-27-20261122\` — `corpus-compare.md`, `corpus-before-*.tsv`·`corpus-final3-*.tsv`, `bora-new-rows.tsv`(새 879행: 과목·월·주·정밀도·쪽·단원·성취기준), `week-table-audit4.tsv`(표별 제목 월·최종 월·행 수·ctx 끝), `drop-audit.tsv`.

## K-4. 실제 문서 E2E (복제 환경만)

- 사용자 DB 덤프(`backup\lh_local_run-start-20261122-202112.sql`, 95,076,189B) → 일회용 MySQL `lh-a28-clone`(33361, tmpfs) + Storage 사본 + 복제 Backend 18290(이 코드) + 관리자 5194·학생 5193. 사용자 8080·33307 미사용.
- 보라고 1학년 2학기 문서(같은 원본 SHA `e3d78bc1…`) 재분석 → `analysis_70dca75e…` 과목 11·평가 항목 그대로·운영계획 후보 **195**.
- 관리자 검토 화면(실제 클릭): 4단계 '월별 운영 계획' 후보 195 → 최종 확정 단계 제목 '월별 운영계획 최종 승인'(평가 정보 재확정 없음) · '승인 195행 · 제외 0 · 빠짐 0' → 승인 PUT `…/teaching-plan-review` 200(1.3초) → 확정 v1 195행 · 날짜 있는 행 0.
- 미리 열어 둔 관리자 월별 운영계획·전체 현황 탭: 새로고침 없이 0 → 195. 학생 `stu_demo_073`(보라고 1학년) 운영계획 API 195행 · 제외/초안 노출 없음 · 학생 홈 '잠정' 0.
- 복제 DB 확인: 보라고 평가 확정 기록 1개·**185 확정값 해시 `9b03cad4…` 그대로**, 운영계획 확정 0 → 1. 리허설 뒤 컨테이너·프로세스 삭제.
- 2학기 '8월' 행(예: 공통국어2 8월 3-4주)은 2학기 달력(9~2월) 밖이라 기존 'Outside This Term' 묶음에 보인다(화면 규칙 변경 없음).
- 화면: `C:\learnershigh-local-run\a28-27-20261122\clone-rehearsal\01~08*.png`, `result.json`.

## K-5. 사용자 DB·Storage 보존

| 항목 | 시작(20:21) | 종료 |
|---|---|---|
| 확정 해시 review / values / tp | `85939349…` / `d11624ce…` / `0b3ba23e…` (A28-24 시작과 같음) | 같음(22:0x 재조회) |
| 보라고 확정 기록 · 185 확정값 · 운영계획 확정 · 분석 실행 | 1 · `9b03cad4…` · 0 · 1 | 같음 |
| 학생 수행평가 43건 해시 | `d3587b1a…` | 같음 · 40표 행 수 시작과 같음 · Storage 3,295파일(시작과 같음) |

- 이번 회차 사용자 DB 쓰기: 0(덤프·조회만). 사용자 보라고 문서는 **재분석·승인하지 않았다**.

## K-6. 시험 (이번 실행)

| 검증 | 결과 |
|---|---|
| 분석기 집중 시험 | `TeachingPlanMonthHeadingTest` 12 · `LocalAnalyzerMonthHeadingPlanTest` 1(합성 PDF 끝까지) · 기존 `ExamAndTeachingPlanRulesTest` 9 · `LocalAnalyzerScenarioTest`·`ExtractCorpusTest`·`ExtractSampleTest`·`PdfTablesSampleTest` — 전부 통과 |
| 실제 원본 코퍼스(읽기 전용) | 396개 오류 0 · 기존 출력 동일 396/396(K-3) |
| Backend 단위(전체 `test --rerun-tasks`, ArchUnit 포함) | 70 클래스 477 — 474 통과 · 3 skip(기존) · 실패 0 |
| Backend 통합(MySQL Testcontainers, 3묶음) | 48 클래스 246 — 전부 통과(51 + 73 + 122) |
| `scripts/verify-frontend.ps1` | PASS |
| Node | 39 파일 171 통과 |
| Assessment E2E 전체(일회용) | **68/68 통과**(7.9m) — 가정고·학생 홈 달력·승인 즉시 반영 회귀 포함 |
| REPLAY(실측 manifest 8건) | **미완료** — 1/8 통과 뒤 시스템 메모리 부족으로 실행이 중단됨(Claude Code 가 메모리 압박 때 정지). 재실행 필요 |
| 복제 환경 실제 문서 리허설 | PASS(K-4) |

- 위 Backend·E2E 는 시험 사본(`a28-build`)을 최종 분석기 코드로 동기화한 뒤 실행했다. 그 뒤 바뀐 것은 줄바꿈 정규화(CRLF → LF, 87개, 내용 동일)·문서뿐이다.

## K-7. Git · GitHub

- 시작: 작업 트리 미커밋 406항목(`-uall` 434파일 = M 176 · D 14 · ?? 244). 비밀값 패턴 0, 원본 평가계획서·DB 덤프·대형 바이너리 0, 보고서 3개의 Windows 사용자 경로는 `%USERPROFILE%` 로 가림, 줄바꿈 LF 로 정규화.
- 통합 방식(사용자 미커밋 작업 보존): 깨끗한 임시 worktree `C:\learnershigh-a28-27-stage`(브랜치 `a28-27/stage`, origin 통합 브랜치 `9755581` 기준)에서 PR #18 을 `--no-ff` 로 합침(22 커밋·작성자 보존, 충돌 0) → 현재 작업을 논리 커밋으로 올림(`V202611180100` 은 미채택이라 제거, PR 연구 자료 79개는 보존).
- **Push·PR #17 갱신·main 병합: 보류** — REPLAY 가 끝나지 않아 품질 게이트 미충족(K-6). 진행 상태는 아래 '다음 단계'.

## K-8. 사용자 보라고 반영 방법(사용자 조작)

1. 새 코드 Backend(8080) 재시작(K-7 의 SHA).
2. 관리자 → 보라고 2026 1학년 2학기 → 분석 탭에서 문서 '다시 분석' — 새 분석 결과가 생긴다. 기존 평가 정보 확정(185)·확정 이력은 그대로.
3. 검토 화면 4단계 '월별 운영 계획'에서 후보 195행 확인·제외 → 최종 확정 단계 '월별 운영계획 최종 승인'(평가 정보 재확정 없음).
4. 2·3학년·소인수 문서도 같은 방법(평가 정보 확정 여부에 따라 '최종 승인' 또는 '월별 운영계획 최종 승인').

---

# A28-28 — REPLAY 최종 검증 · GitHub 통합 마무리 · main 병합 준비 (2026-11-22 22:20~)

- 지시: REPLAY 재실행 명시 허용(메모리 점검 후 순차), Stage 커밋 검증 후 통합 브랜치 push, PR #18 상태 확인, PR #17 점검·설명 갱신·Draft 해제 가능, **main 병합은 하지 않음**, 완규님 메시지 작성하지 않음.
- 원본 작업 트리(`C:\learnershigh-assessment-integration`)의 미커밋 변경은 Git 조작 없이 그대로 둠(HEAD `9755581`, 내용은 push 한 트리와 같음 — 미러 비교 차이 0).

## L-1. 메모리 점검과 REPLAY

- 시작 시 가용 메모리 643MB(전체 16GB, Chrome·Notion·WSL·사용자 8080 등). 사용자 앱·서버는 종료하지 않았다. 출처를 확정할 수 없는 Gradle daemon(PID 512, 11:53 시작)도 그대로 둠.
- REPLAY 는 포그라운드·worker 1 로 실행: 시험 사본(`a28-build`)을 **Stage 트리에서** 동기화(`backend/src`·Migration 이 Stage 와 같음 확인) → 일회용 MySQL·격리 Backend(18090)·학생/관리자(5191/5192)·학교알리미 Stub. 사용자 `lh_local_run`·사용자 Storage 미연결.
- 결과: **8/8 통과 (2.2m)** — `C:\learnershigh-local-run\a28-27-20261122\replay-a28-28.log`. 실행 뒤 일회용 컨테이너 0, 사용자 DB 확정 해시 시작과 같음.
- 이전 결과의 유효성: A28-27 의 Backend 단위(477: 474 통과·3 skip)·통합(246)·E2E(68/68)는 최종 분석기 코드로 실행됐고, 그 뒤 바뀐 것은 줄바꿈 정규화·문서·새 파일 2개의 끝 빈 줄뿐이다. 끝 빈 줄 수정 뒤 `verify-frontend` PASS·Node 171/171 을 다시 돌렸다. push 한 SHA 는 GitHub CI 가 Backend(단위·통합)·Frontend·E2E 를 새로 실행해 모두 통과(L-4).
- 실수 기록: 하네스 검사를 잘못된 인자로 Stage 에서 실행해 Backend 전체 검사가 기존 Gradle daemon 에서 시작됨 → 즉시 중지, Testcontainers 컨테이너는 Ryuk 가 모두 정리(사용자 컨테이너 영향 없음). 이어 CI 와 같은 명령 `scripts/verify.ps1 -SkipFrontend -SkipBackend` 로 PASS.

## L-2. Push 전 감사

| 항목 | 결과 |
|---|---|
| PR #18 22 커밋 보존 | `b09ef4a^2` 에서 22개 모두 `beans3142` 작성, `e161f15` 가 HEAD 의 조상 |
| A28-27 커밋 | `bf3c290`·`f160e97`·`1faac3c`·`7aabd06`·`07e602e`·`00c56f6` + 이번 `d35b9f2`(새 파일 2개 끝 빈 줄 제거) |
| 미커밋 작업 누락 | 원본 작업 트리 ↔ Stage 미러 비교: 복사할 것 0 · 지울 것 0(PR #18 연구 자료 79개만 Stage 에 추가 보존) |
| `V202611180100` | 최종 트리에 없음. Migration 28개 = 사용자 DB `flyway_schema_history` 28건(버전 일치, 실패 0), **Flyway 체크섬 28/28 일치**(LF 정규화한 `V202611170200` 포함) |
| 파괴적 변경 | 새 Migration 9개에 DROP TABLE·DELETE·TRUNCATE 없음. `V202611212328` 은 CHECK 제약 2개를 같은 이름으로 교체(데이터 변경 없음, 이미 사용자 DB 적용) |
| 비밀값·덤프·개인 경로·산출물 | 비밀값 패턴 0(문자열 `e2e-stub-token-not-a-secret-…` 은 E2E Stub 고정값), DB 덤프·원본 평가계획서·빌드 산출물 0, 개인 경로·이메일 0. 예전 `application.yml` 의 Railway 분석기 토큰은 이번에 **삭제**됨(과거 Git 이력에는 남아 있음 — 교체 권장) |
| Student Care·다른 담당 | Student Care 소스 변경 0. 공용 파일: `README.md`(분석기 문서 링크), `application.yml`(분석기 local·local-run 프로필), 시험 설정, `api-contract.md`, `e2e/tsconfig.json`, 학생 `StudentAppShell.tsx`·`vite.config.ts`(Assessment 메뉴·개발 Proxy), 독립 실행기 `e2e/student-care/run-isolated.mjs`(신규, 기존 Care 시험 코드 변경 없음) |
| 개발 Header 인증 | `MockHeaderAssessmentActorProvider`: `learnershigh.integration.mode=mock` 일 때만, `prod`·`production`·`staging` Profile 에서는 Header 무시(401). 시험 `DemoRosterTest` |
| `git diff --check` | 끝 빈 줄 2건 수정 후 `core.whitespace=cr-at-eol` 기준 통과(PR #18 연구 결과 파일 `r3_all_schools.txt` 의 원문 공백 제외 — 완규님 파일이라 수정하지 않음). 기본 설정 경고는 HEAD 에서 이미 CRLF 였던 파일의 줄 끝 CR |
| 하네스(CI 첫 단계와 같은 명령) | PASS |

## L-3. Push · PR #18

- `git fetch` → 원격 통합 브랜치 `9755581`(변동 없음) → Stage HEAD 의 조상 확인 → `git push origin a28-27/stage:integration/assessment-studentcare-20261116` → `9755581..d35b9f2`(fast-forward, force 없음).
- 로컬 HEAD = 원격 HEAD = `d35b9f2664eaca68c6b2f8adb1b3e27d608cc888`.
- **PR #18: closed · merged = true** (GitHub API, merged_at 2026-11-22T13:47:44Z = 22:47 KST, merge commit `b09ef4a`). Close·재병합 조작 없음.

## L-4. PR #17 점검

| 항목 | 결과 |
|---|---|
| 방향 | `integration/assessment-studentcare-20261116` → `main`, Draft |
| main 과의 차이 | `main`(`c03a1a4`) = 통합 브랜치의 조상(main 쪽 새 커밋 0) → 충돌 없음, 통합 쪽 164 커밋 · 1,666 파일 |
| GitHub Actions(`d35b9f2`) | push·PR 두 실행 모두 Harness · Frontend · Backend · E2E (Playwright) · CI Result **success** |
| 보호 규칙 | `main`·통합 브랜치 보호 규칙 없음, 필수 리뷰 없음(리뷰 0건) |
| Flyway | 28개, 사용자 DB 와 체크섬 일치, 새 Migration 은 추가형(L-2) |
| 개발 Header 인증 | 운영 Profile 차단(L-2) |
| API 계약 | A28-27 은 계약 모양 변경 없음(분석기 규칙 주석만). A27·A28 의 DRAFT 계약 5건은 '사용자 승인, 팀 승인 별도' 표시 그대로 |

## L-5. main 병합 전 남은 일

1. PR #17 설명 최신화(이번 회차) · Draft 해제(필수 CI 통과 · 확인할 문제 없음 → 해제).
2. **팀 확인 필요**: PR #17 은 1,666 파일 · 164 커밋 규모이고 공용 파일(`api-contract.md`, `application.yml`, `StudentAppShell.tsx`)을 바꾼다. 필수 리뷰 규칙은 없지만 Student Care 담당(완규님)과 공용 계약 DRAFT 5건 확인을 권장.
3. Railway 분석기 토큰 교체(과거 이력에 공개됨) — 저장소 밖 작업.
4. main 병합 실행은 사용자 지시 후(이번 회차 금지).

## L-6. main 병합 뒤 문서 정리 계획 (별도 `docs/` 브랜치 · PR)

| 문서 | 현재(통합 브랜치 `d35b9f2`) | 할 일 |
|---|---|---|
| `README.md` | 분석기 설정 문서 링크 1줄뿐 | Assessment 실행 요약: Backend(local-run)·학생/관리자 실행, 분석기 `local`·OCR, 학교알리미 자동 확인(3개 학년도·TTL 24h), Flyway 28 |
| `docs/OWNERSHIP.md` | Assessment 절 없음 | '3-6 Assessment(평가계획서·분석기·학교알리미·학생 수행평가)' 추가: 담당 Suyeon(분석기 정확도 포함, 2026-11-22 사용자 결정), PR #18 기여 완규님 기록. 공용 문서라 팀 확인 |
| `docs/SOURCE_OF_TRUTH.md` | Assessment 문서 위치 없음 | Assessment Source of Truth: `docs/specs/suyeon/domain.md` §30-A, `api-contract.md` §38~§39, `assessment-analyzer-setup.md`, 최신 보고서 |
| `docs/api/api-contract.md` | A27·A28 절이 날짜별 덧붙임 | '현재 계약' 요약표 + 이력은 부록으로 분리, DRAFT 5건 상태 갱신 |
| `docs/specs/suyeon/assessment-analyzer-setup.md` | 서버 안 분석·OCR | A28-27 월 제목 규칙, 코퍼스 회귀 방법(읽기 전용), 알려진 한계(두 달 표·조각 표) |
| `docs/architecture/overview.md` | Assessment 분석 경계 언급 없음 | `assessment/integration/analysis`(local·none·loopback-stub)·`integration/schoolinfo` 외부 경계 |
| `docs/adr/` | 0001~0007 | 새 ADR 제안: '서버 안 분석기 · Railway 퇴역(2026-11-19)', '검토 표 병합(V202611180100) 미채택' |
| `docs/specs/suyeon/` 보고서 | A27·A28 보고서 여러 개 | 보고서 색인(현재 상태 vs 이력 표시) — 과거 보고서는 덮어쓰지 않음 |

## L-7. 사용자 DB · Backend

- 이번 회차 사용자 DB 쓰기 0, 보라고 재분석·승인 0, 새 Schema Migration 불필요(분석기 규칙만 변경).
- 실행 중 8080(PID 25796, 18:40 시작 — A28-24 재시작)은 **A28-27 이전 분석기 코드**(시작 시점 작업 트리)로 떠 있다 — 보라고 재분석 전에 재시작 필요. 재시작해도 Migration 적용 없음(28 = 28).
- 재시작: 8080 창을 닫고 PowerShell 에서 `C:\learnershigh-local-run\start-backend.ps1` (학생 5173·관리자 5174 는 그대로).
- 보라고 반영(사용자 조작): A28-27 K-8 순서 — 관리자 http://localhost:5174/assessment?devAdmin=adm_demo_b01&school=sch_demo_bora&year=2026&grade=1&semester=2 → 분석 탭 '다시 분석' → 검토 4단계 후보 195행 확인 → 최종 확정 단계 '월별 운영계획 최종 승인'(평가 정보 185 재확정 없음) → 전체 현황·월별 운영계획·학생(`stu_demo_073`) 확인.
