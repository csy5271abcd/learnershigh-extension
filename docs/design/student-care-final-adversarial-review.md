# 최종 케어5 적대적 리뷰 — 2026-10-25

## 범위와 판정

근거: 전체 대화에서 구성된 `student-care-feedback-contract.md` F01–F24와 현재 FE/BE 코드를 대조했다. 이 리뷰는 구현 담당과 별도 agent가 읽기 전용으로 수행했다. 코드 수정은 하지 않았다. 전체 대화를 상속했으므로 맥락 없는 독해 시험으로 간주하지 않는다.

**최종 판정: 검토 범위 내 PASS.** 최초 FAIL 원인 A1–A4의 코드 수정과 관련 회귀 증거를 확인했고 추가 차단 결함을 발견하지 못했다. 로컬 MockExisting 원본을 쓰는 최종5의 구현·검증 게이트에 대한 판정이며, 운영 원본 연결·배포 완료나 사용성 최적값을 뜻하지 않는다. 코드가 타당한 것과 실제 가독성이 좋은 것은 다른 검증이다.

## 발견 사항

### A1. 전체 관리 이력이 아직 예시 학생 ID에 종속됨 — 높음

- 기준: F05/F24, 저장·조회 보존, Error ≠ Empty.
- 위치: `components/AllHistory.tsx`의 MOCK_STUDENT_IDS 및 loadAll.
- 현재 새/실제 branchId가 예시 두 지점 이외이면 API 조회 없이 `기록 없음`이 표시된다. 기존 지점에 학생이 추가돼도 이력 조회에서 빠진다.
- Promise.allSettled 결과에서 일부 history 실패를 버려 성공한 이력만 정상 화면처럼 표시한다. 실패한 학생의 이력이 조용히 사라진다.
- 수정 방향: 실제 board.students로 명부를 얻어 조회하고, 개별 조회 실패는 전체 오류 또는 명확한 부분 실패로 표시한다. 임의 예시 ID fallback 금지.
- 회귀 조건: 예시에 없는 지점/학생 ID의 이력 표시, 한 학생 503일 때 누락을 정상 빈 이력으로 표시하지 않는지 확인.

### A2. 다음 확인 날짜가 화면 관찰 기준일에서 계산됨 — 중간

- 기준: F06/F24, 화면 선택 의미와 저장 의미 일치.
- 위치: `CounselForm.tsx`의 addDays(asOf, days), `RecheckPanel.tsx`의 같은 계산.
- UI 선택은 `3일 후 / 1주 후 / 2주 후 / 4주 후`. live asOf는 어제의 완료된 관찰 날짜이고 BE 저장은 reader.today 기준이므로 1주 후를 고르면 실제 오늘에서6일 뒤로 저장된다.
- 수정 방향: 상담 업무일을 관찰 기준일과 분리해 계산한다. 서버의 업무 날짜와 브라우저 날짜가 어긋나지 않도록 계약과 기존 clock 처리도 확인한다.
- 회귀 조건: 관찰10/24, 저장업무10/25에서 1주 후→11/1; 관찰 기간7/28은 그대로 유지.

### A3. API 과목 비중 double이 긴 소수 문자열로 그대로 노출됨 — 중간

- 기준: F10/F19, 의미 있는 숫자와 가독성.
- 위치: `WeekStudentViews.tsx` SubjectPairs의 `{subject.plan}%` / `{subject.actual}%`, 수치열 CSS40px(좁으면34px).
- 서버 plannedShare/actualShare는 Double이고 임의 비율은 긴 소수가 된다. FE 예시는 정수여서 기존 screenshot이 이 문제를 검증하지 않는다.
- 수정 방향: 원본 값을 보존하면서 표시값을 정수 또는 소수1자리로 제한하고 긴 label overflow도 실측한다.
- 회귀 조건:14.285714285714286% 같은 응답을 넣어 명확한 표시, 좁은 수치열·날짜와 비중첩 확인.

### A4. 일정 미확정의 입실 로그 부재를 원본 부재로 오표시 — 높음

- 기준: F11/F12,0/누락/일정 미확인의 분리.
- 근거: BE CareWeeklyReviews.day는 recordAvailable=true여도 checkedIn=false이고 scheduled=null이면 attendance=UNKNOWN을 반환한다. 그 날 minutes=0, 제출상태 등 원본은 존재한다.
- FE는 attendance==='unknown'만으로 clock/status/readout을 `기록 없음`이라 처리한다. 실제로 원본은 있고 입실 로그만 없는 날과 완전한 source missing이 다시 합쳐졌다.
- 위치: `model/branchDistribution.ts` missingRecordLabel, `WeekStudentViews.tsx` status/clock readout, `RosterStudies.tsx` entry 및 all-unknown 요약.
- 수정 방향: 원본 존재와 일정 확인을 별도로 보존한다. 현 계약에서는 minutes null 여부가 원본 존재를 구분한다. 일정이 미정이어도 원본이 있으면 `입실 기록 없음`, 원본 자체가 없으면 `기록 없음`. PRESENT지만 시각 null은 `입실 시각 기록 없음`처럼 입실 사실을 부정하지 않는다.
- 회귀 조건: UNKNOWN+minutes0+submissionMISSING, UNKNOWN+minutesnull+submissionUNKNOWN, PRESENT+startnull 세 경우 구별. 일정 미확정을 결석으로 바꾸지 않는다.

## 코드에서 확인된 구현 방향 (완료 보증 아님)

- 공개 경로1/2/3/5, 최종5 default HTTP 및 명시 preview query 분리.
- 목록은 일괄 metrics를 받아 간략 전원 명부를 표시하고 학생 선택 시 detail을 조회한다.
- 최종 확장 상세는 care3 방식이며 팝업/지표별 상세 버튼이 기본 탐색에 쓰이지 않는다.
- 서버 review가 있으면 FE fixture를 생성하는 분기보다 먼저 처리한다. baseline raw28일을 합성하지 않는다.
- API 오류의 preview fallback이 없으며 현재 tag는 로컬 예시 원본임을 표시한다.
- 분포 차트는 Q25–Q75/평균/선택 학생만 선으로 그린다. 이상치는 운영 상담 판정과 별도 설명이 있다.

## 최종 증거 재검토 대기

- A1–A4의 수정 diff 및 회귀 실행 결과.
- live API GET/쓰기/재조회/DB 영속화,404·503 error-state 검증.
- 양테마1600/850/390의 최신 실측 JSON과 실제 screenshot.
- 날짜7개,선택 이름/선 일치, 고정 readout/plot 비중첩, 작은 표본/누락, 긴 소수 표시.
- F01–F24 항목별 증거 매핑. 이전 테스트 수만으로 PASS 처리하지 않는다.

## 수정 재검토 — 2026-10-25 후속

- **A1 해결 확인**: loadCareHistory가 실제 board.students를 받고 Promise.all로 이력을 병합한다. 새 지점/학생 ID 및1명503의 회귀 테스트2건을 검토했다. AllHistory의 고정 ID가 제거됐다.
- **A2 해결 확인**: detail.today를 BE응답/계약/FE타입에 추가하고 최종5 상담/관리 폼에는 today를 넘긴다. 독립 live GET에서 asOf=2026-10-24, today=2026-10-25, activeCase.recheckDate=2026-11-01을 확인했다. 관찰기간7일과 상대 업무일을 구분한다.
- **A3 해결 확인**: SubjectPairs가 원본을 반올림하여 저장하지 않고 표시만 소수1자리, native title에 원본 수치를 유지한다. live-network.json에서25.1% 등 짧은 값으로 표시된 결과를 확인했다. 최신 문맥 이미지 추가 확인 대기.
- **A4 해결 확인**: missingRecordLabel은 minutes null로 원본 부재를 구분하며, UNKNOWN+원본0은 입실 기록 없음, PRESENT+시각null은 입실 시각 기록 없음으로 구별한다. 명부/개별상태표/clock readout/학습관readout에 적용된 코드를 확인했다. helper 회귀 테스트와 browser 경계 테스트가 작성됐다.
- keyboard 상세 포커스는 실제 detail revision 도착 후 적용하도록 수정되어 최초 loading시 ref null 문제도 보완됐다. 명부에 보기/접기와 명시적 accessible name이 추가됐다.

### 이 리뷰 agent가 직접 확인한 실행 증거

- Node22 model/api 전체 테스트46/46, 실패0/skip0.
- BE test/integrationTest XML을 직접 합산하여358건, 실패0/오류0/skip0 확인. BE명령 자체의 재실행은 구현 agent가 수행했고 이 리뷰에서는 재실행하지 않았다.
- 로컬5174 프록시를 통한 실제 detail GET의 관찰일/업무일/확인일/일별7개를 독립 조회했다.
- 기존19:49 live-detail 전체 이미지와 network/save JSON은 확인했다. 이후 새 context 캡처/12건 결과는 아직 생성 전이므로 최신 UI 증거로 간주하지 않았다.

추가 코드 blocker는 이번 재검토에서 발견하지 못했다. 최종 화면/실측/독해 검토가 이 사실만으로 대체되지는 않는다.

## 최종 증거 확인 및 판정 근거

- 최신 `e2e/test-results/.last-run.json`의 수정시각2026-10-25 19:58과 status=passed/failedTests=[]를 직접 확인했다. 구현 agent가 회수한 최종 실행 출력은 preview7+live5=12/12 PASS이며, 경계 테스트가 코드에 포함됐음을 재확인했다. 이 리뷰 agent가 E2E 전체를 별도로 중복 실행한 것은 아니다.
- 새 `final5-live-detail-context.png`(19:56) 직접 시각 검토: 전체학생 명부/선택행/최학생 상세 이름/보기·접기/인라인 확장 관계가 한 화면 문맥에서 식별된다. 기존 큰+ 표시는 보기/접기로 바뀌었다.
- 새 `final5-live-distribution.png` 직접 시각 검토: 7개 날짜/요일, 중간50% 범위·평균·선택학생선과 이름, 차트 밖 전원 정확한 분 값이 서로 가리지 않고 나타난다. 기존 전원 겹친 선과 불투명 hover 블록은 없다.
- 최신 `final5-dark-850-detail.png` 직접 시각 검토: 다크 배경에 흰 카드가 섞이지 않고, 선택상세는 세로로 흐른다. 좁은 전체기록표는 내부 가로스크롤의 예외이며 7개 일자 구조를 유지한다.
- 최신 light/dark 실측 JSON을 직접 읽어 폭1600/850/390이 모두 존재하고 plot/readout overlapArea 최댓값0을 확인했다. 명부/날짜/hit/대비 추가 수치는 구현 검수 문서와 E2E assertion에 연결되어 있다. 수치 검사는 전체 사용성 승인이 아니다.
- 구현 agent가 전달한 별도 cold_final5_reader의 새4개 이미지 독해 결과에서는 대상학생, 인라인 펼침, 보기/접기, 학생 클릭 비교를 읽었고 차단 문제를 보고하지 않았다. 이 리뷰 agent는 그 cold-reader가 아니며 사용자 이해도를 보증하지 않는다.
- F01–F24 대응표는 `student-care-final-validation-2026-10-25.md`에 연결되어 있다. 원본1/비교2·3은 보존하고 최종5만 HTTP 기본 연결이라는 범위를 확인했다.

### 남아 있는 비차단 한계

각 지표의 분모가 달라 해석 부담이 있을 수 있다. 차트 기본 선택일의 강조는 약하고, 상세 차트와 원본표를 함께 둬 세로 길이가 길다. 고정 readout의 높이에 맞춘 차트 아래 여백이 있고 분포 정의는 접힌 설명을 열어 읽는다. 이들은 데이터 숨김·오표시·차트 가림의 재현된 결함으로 확인되지 않았으며 새 기능을 추가해 해결했다고 주장하지 않는다. 실제 운영자 사용성/분모 이해도 검증으로 후속 판단해야 한다.

운영 원본/auth/배포와 임계치 효과 검증은 현재 완료 범위 밖이다. 이 한계를 최종 보고에서 빠뜨리거나 운영 실데이터 연결 완료라고 쓰면 이 PASS의 전제가 깨진다.
