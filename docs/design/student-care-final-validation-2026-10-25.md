# 학생 케어5 API 연결 및 피드백 검수 기록

기준: 대화 전체에서 구성한 `student-care-feedback-contract.md` F01–F24. 구현 보고를 사용자 승인으로 보지 않는다. 현 문서는 증거와 한계를 기록하며, 최종 적대적 판정은 별도 `student-care-final-adversarial-review.md`에 둔다.

## 실제 연결 범위

- `/student-care/5` 기본은 HTTP. `?preview=1`만 FE varied fixture이며, 원본1/비교용2·3은 예시 자료를 보존한다.
- FE5174 → 학생 케어 전용 프록시 → Spring8081 → MySQL8.4(로컬3337). 다른 기능의 API 프록시는8080 유지.
- 명부·학습관은 board+일괄metrics. 학생을 펼칠 때만 해당 detail. 상담·메모·관리 결정·설정·전체 이력도 동일한 API를 쓴다.
- 기존 LearnersHigh 학습 원본은 로컬 MockExisting이다. 운영 API/auth Open Decision을 임의로 확정하지 않았다. UI 태그도 `API 연결 · 로컬 예시 원본`이다. 운영 원본 연동/배포가 완료됐다는 의미가 아니다.
- 서버 관찰일asOf=10/24, 업무일today=10/25. 최근7일10/18–10/24와 이전28일9/20–10/17을 분리한다. 상대 확인일은today에서 계산한다.

## 피드백별 확인 위치

- **F01 원본 보존**: student-care-v1 및 originalPreviewApi/Data. originalPreviewApi.test와 메뉴 E2E. 최종5 변경으로 원본 fixture를 덮어쓰지 않는다.
- **F02 메뉴**: studentCarePaths/StudentCareRoute/AdminShell. 공개1/2/3/5, 메뉴4/6/7 없음. 메뉴 E2E.
- **F03 간략 명부→학생 상세**: RosterStudies. 기본 행에 날짜별 그래프 없음, 선택 시 한 학생만 care3 방식으로 확장. compact roster E2E.
- **F04 기본 팝업 제거**: 최종5는 인라인 상세/상담. 지표별 상세 버튼 없이 7일 지표와 기록을 노출. dialog0/ww-detail0 E2E.
- **F05 전체 학생/정렬**: board.students+metrics.students, 강남10/분당3. 경과 확인·상담 필요 우선, 테두리. 검색 및 branch 전환 E2E. 비교안의 정상 학생도 제외하지 않는다.
- **F06 업무 상태/상담 유지**: 상담 필요/경과 확인/관리 중/기록 부족. 저장 시 목록·선택 상세·인라인 이력·전체 이력 refresh. preview/live 상담 E2E.
- **F07 기간**: weeklyReview/serverWeeklyReview/CareWeeklyReviews. 경계35일/관찰·기준 비중첩 Node·BE 테스트. 날짜 선택기는 최종7일 고정으로 대체.
- **F08 날짜/요일/단위**: StatusTable/DailyChart/BranchDistribution에7개 날짜+요일. 시간량은시간·분/분, 입실은시각. SVG 날짜 내포/비중첩 실측.
- **F09 비교 집계**: 완전한28일 합/4만 주평균. weekdayBaseline은 이전 같은요일4개 기록 평균. 불완전 기준을0으로 채우거나 raw28일을 FE에서 합성하지 않음. weeklyReview/serverWeeklyReview/BE 테스트.
- **F10 지표별 표현**: 출결·제출=날짜 상태표, 학습량=날짜 연속 추이/요일 기준, 입실=시각축, 계획실제=동일 날짜 쌍비교, 과목=비중 쌍비교. 출석5회를 긴 양적 막대로 표현하지 않음.
- **F11 누락/실제0/로그 부재**: 날짜별 상태와 값 독립. branchDistribution helper 및 server mapper,0/null 테스트. 원본 있음+일정 미정의 입실 로그 부재도 구분. 실제 API 형태를 넣는 browser 경계 테스트 추가.
- **F12 허구 기능/결석 단정**: 휴무 승인 필드/UI/API 없음. UNKNOWN는 일정 미정과 원본 부재가 다를 수 있어 minutes null 여부로 구별. 일정 미확인 로그 부재를 결석으로 판정하지 않음. PHAPI mapper/BE availability tests.
- **F13 학습관 평균+전원**: 중간50% 띠+평균1개+선택학생1개. 정확한 전원 값 표/학생선택. 미선택 학생선0, 선택명/선 일치 E2E.
- **F14 통계 표시 구별**: Q25–Q75/선형 보간/1.5IQR, 표본4 미만 이상치 판정 없음.0포함/null제외. 운영 케어 판정과 별개임을 접힌 분포 기준에서 설명. 모델 테스트.
- **F15 정확값/가림 방지**: 날짜 hover/focus/click→차트 밖 readout. 전원 값과 평균/범위/학생 선택 제공. 구형불투명block/스크롤tooltip 없음. plot/readout 겹침면적0 실측, 첫/마지막 날짜 검증.
- **F16 다양한 예시/가능성**: varied fixture는별도모드.35일×학생별 입실+학습≤하루, 극단값·0·누락·미제출·100%초과. diverseData/weeklyReview 테스트. live 학습원본과 fixture를 혼합하지 않음.
- **F17 짧은 용어**: 상담 필요/경과 확인/관리 중/기록 부족, 입실 기록 없음/기록 없음. 긴 산식은기준설명에두고 필수단위/기간/분모는남김. 보편성만으로 특정 표현이 업계 표준이라고 단정하지 않음.
- **F18 전반 상태/정보량**: 기본은 간략명부, 클릭 후 상세. 좁은 화면의 기록표만 내부 가로스크롤. 전체학생을한뷰포트에억지압축하지 않음. 전원 상세그래프/텍스트전용 기본화면 없음.
- **F19 테마/폭**: 두테마1600/850/390 문서가로넘침0, 날짜7개 내포/비중첩, hit>24px, readout대비>4.5. raw double 비중을소수1자리로표시하고 원본값은title보존. 최신 캡처/JSON 참조.
- **F20 자료 근거**: 기존 research 문서의 Datawrapper 선형·범주형 자료와 W3C hover/focus 원칙, NIST 사분위/IQR, Plotly filled-area 방식을 각 표현 선택에 적용. 설치라이브러리추가 없음. NIST분포를상담임계치의최적값근거로쓰지 않음.
- **F21 직접 조작/실측**: CUA 오른쪽 실제5에서학생선택/서버값/학습관선택을조작. Playwright로별도모드·live GET/쓰기/오류·geometry 확인. PASS수만으로가독성승인이라고하지 않음.
- **F22 독립 검토**: final_api_adversarial이F01–F24코드검토, cold_final5_reader는맥락없이3이미지독해. 초기결함과수정/재검토를아래에기록. 최종판정은별도리뷰문서.
- **F23 초기값**:1/2/30/60/20/60/3/7. 예정일확인된로그부재1일부터상담목록, 원본부족/일정미정은단정하지 않음. 학습관별설정및기존저장값유지. 운영제안값이며효과를입증한표준값아님. 운영확인후오탐/누락률과담당자처리량으로조정해야함.
- **F24 BE/API/DB**: board전원/detail.review/branchmetrics/상담·설정·이력 연결. 기존case snapshot formula1보존, 새formula2. 실제MySQL통합+live브라우저저장/재조회/SQL확인. 운영원본한계상술.

## 이번 독립 리뷰의 결함과 조치

1. **고정 예시 ID 전체이력/부분실패 은폐**: loadCareHistory가 실제board.students를 사용하고 Promise.all 실패를오류로표시. 새로운지점/학생ID와1명503회귀2건. 예시ID fallback삭제.
2. **업무일과 관찰일 혼동**: detail.today를 계약/BE에추가, 최종상담·관리의상대확인일에주입. today누락BE테스트실패를확인한뒤수정. 관찰10/24·업무10/25에서1주후11/1을live POST/SQL확인.
3. **긴 소수 비율**: 서버원본유지, SubjectPairs표시만소수1자리. title에원본. 실제API응답을쓰는브라우저검증.
4. **일정 미정 UNKNOWN/원본 부재 혼동**: 입실시각 missingRecordLabel은원본0과null구분, PRESENT+시각null도별도표기. 기존잘못된UNKNOWN0기대값을바꿔RED확인후GREEN. FE일별상태/상세표/학습관readout에적용.
5. **독해 이미지 상단 가림/이름 식별**: 긴상세요소만캡처할때sticky공통header가이름을가리던증거수집문제. 실제주변목록과학생명이들어간page/context이미지로재캡처. cold-reader가새4개이미지를직접읽고선택행·상세제목·접기대상이일치함을확인했다. 최초가림증거를누락하거나제품전체가독성승인으로과장하지않는다.
6. **명부+의 모호함**: 전형적펼침표시라도새리더가추가로오해할수있어보기/접기및명시적accessible name으로변경. 선택행과학생상세이름을함께확인한다.

## 실행 증거

- `scripts/verify-frontend.ps1` PASS. student/admin/mentor typecheck/lint/build. Vite500kB이상청크경고는기존대로남아있음.
- Node22 strip-types model/api tests46/46, 실패/skip0.
- `backend/gradlew.bat build integrationTest --console=plain` PASS. XML합산unit254+MySQL integration104, 실패/오류/skip0. 업무일추가후실행.
- 첫live포함Playwright11/11 PASS: preview7+live4(GET·선택detail·bulk·설정PUT복원·상담POST/새로고침·503).
- 학생보기/접기·캡처문맥·일정미정/시각누락브라우저경계1건을추가한최종 **12/12 PASS(4.5분)**. preview7+live5. E2E TypeScript 검사도exit0. 이후변경은문서와EOF빈줄정리뿐이다.
- SQL로student stu_002의케이스formula2/다음확인일2026-11-01/저장이벤트2건을독립확인. 로컬테스트기록을삭제하지않음.
- 두테마1600/850/390: 최대plot/readout중첩0px², 날짜겹침0/7개내포, 최소hit폭/높이25.176px. readout제목대비최소light16.56:1/dark14.92:1. 이수치로전체화면의가독성을보증하지않음.

증거폴더: `C:/Users/green/.codex/visualizations/2026/10/23/01a1691a-65a2-76b1-b9a0-578fcef98c40`.

- final5-{light|dark}-{1600|850|390}-{roster|detail|branch}.png, final5-measurements-{light|dark}.json
- final5-live-detail.png / final5-live-detail-context.png / final5-live-branch.png / final5-live-distribution.png
- final5-live-network.json / final5-live-save.json

## 한계와 잔여 판정

운영원본·인증정책·배포는별도확인필요. 임계치효과는미검증제안이다. 전체이력은지점명부를받아학생별이력을조회하므로학생수만큼요청한다. 현재별도전체이력endpoint를추가하지않았으며대규모지점에서지연이측정되면서버페이지처리를검토한다. 미구현성능개선을완료성과로쓰지않는다.

맥락없는독해재검토에서대상식별/펼침/학생비교에차단문제는보고되지않았다. 비차단부담은남는다: 지표마다다른분모의해석, 기본선택일강조가약함, 상단상태표와하단기록표의중복및세로길이, 전원readout높이에맞춘차트아래공백, 산출정의는분포기준을펼쳐야확인가능함. 이것을해결완료라고쓰지않으며사용성평가가필요한후속개선으로둔다.

최종독립코드재리뷰판정은student-care-final-adversarial-review.md를참조한다. 이는사용자의디자인승인이나객관적가독성보증이아니다.

독립최종판정: **검토 범위 내 PASS(로컬 MockExisting 원본을 쓰는 최종5 API/UI)**. A1–A4수정·실제GET·새context/distribution이미지·실측·회귀결과를재검토했고추가차단문제는보고되지않았다. 운영원본/auth/배포/임계치효과에대한판정이아니다.
