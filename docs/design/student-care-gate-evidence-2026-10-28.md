# 피드백 항목별 검수 근거

대상: 최신 케어5, 로컬100명60/30/10 및35일 합성자료. 사용자 승인이나 운영 효과 검증과 구분한다. 최종26개 Playwright와 별도 실제 저장 이력 원문 대조1개가 통과했다.

증거 경로: `e2e/tests/student-care-{branch-overview,branch-patterns,final,history-details,metric-extremes}.spec.ts`, FE model/api test80개, seed test6개, BE unit270개와 studentcare MySQL integration75개. 실시간 API 대조는 `scripts/research/verify-care-live.mjs`와 `student-care-api-check-2026-10-28.json`. 스크린샷은 로컬 handoff의 oct28-distribution-final 폴더 및 test-results/history-*.png.

## 항목별 반례와 확인 수단

- G01: 원본/비교 화면 접근과 컴포넌트 보존을 final spec에서 확인. 케어1을 새 분포 화면으로 교체하지 않음.
- G02: 공개 메뉴1/2/3/5,4/6/7 없음. final spec.
- G03: 원본 명부60/30/10, 학생 클릭 인라인 상세. overview population/final roster tests.
- G04: 명부 priority 정렬/테두리, 전체 검색·지점변경. RosterStudies와 final roster test. 신호 없는 학생을 삭제하지 않음.
- G05: 학생 케어 범위, 승인휴무 미추가. final missing-source test. 실제 운영 원본 변경 없음.
- G06: 전체 인원과4개 지표를 먼저 표시. 독립 냉독이 전체60명과 변화5/3명을 구별.
- G07: SQL100명/3500행, API60/30/10명. 지점 명칭 강남/분당/수지.
- G08: personalDistribution에 전체 포함 학생 관측 사용. 지표 툴팁 표본 인원, 제외 인원·복원 명시. exclusion/API oracle tests.
- G09: 반복 감소/지연 여러 학생 이름·점·날짜행 동시 표시. repeated/whole-group/named-marker tests. 이름6명 초과는+N 해당 카드 전체 변화 목록.
- G10: 회색 학생 기록, 파란 평균/중간50% 분포, 변화는 주황 테두리. 띠를 정상 범위라고 표시하지 않음. 냉독과 tooltip assertions.
- G11: 개인 같은요일 편차, 오전/저녁/짧음/종일/주말군을 원시 시각으로 판정하지 않음. 모델 반례+실제 정상45명 falseFlag0. BE 기간 구성 오탐 반례도 수정.
- G12: 큰 양수 학습량을 경고하지 않는 단측 모델. 정상 장시간군 실제 API 무신호. 회복군의 높은 증가를 상담 이상치로 명명하지 않음.
- G13: 주요 학습 수치는 입실일 평균, 분포는 개인 변화. 제외 전후 같은 평균 분모. source oracle/zero baseline test.
- G14: 입실은 개인 평소 대비 분 차이, 주요 요약은 지연 학생 인원. +3.3분 상쇄 요약/시각% 없음. BE/재확인도 같은 개인 편차로 정합화.
- G15: 별도60분 KPI 없음. 설정값은 유지, 의미를 요청했을 때만 작은 범례 도움말. optional marker test.
- G16:6명 비교·제한·해제·고유 색.6-selection test3폭/tooltip date bounds. 순위 밖 학생을 첫 학생 색으로 가장하지 않음.
- G17: excluded 학생을 현재/기준/평균/분포 모두에서 제거, 상태/DB 변경 없음. 다중제외·지점변경 초기화·복원 test.
- G18: recent10/21–27, baseline9/23–10/20. source JSON/SQL+weeklyPolicy test.35일이 서로 겹치지 않음.
- G19:7개 날짜/요일 존재와 텍스트 영역 비겹침 실측. 개별 그래프 좁은 폭은 월+일로 읽히며 월 경계 표기 유지.
- G20: 출결/제출은 날짜별 상태 셀.0/1 긴 수량 막대 제거, 결석 날짜별 유지. actual offday submit fixture test.
- G21: 시간/편차 시계열, 과목 비중쌍 공통100%축, 출결 상태, 제출률의 비율축 구분. 텍스트만으로 학습관 상태를 대체하지 않음.
- G22: 실제0·결석·일정없음·미확인·비교기록부족 구별. extra visit/submitted offday/unknown baseline test. 학생 상세도 실제 제출 우선 보존.
- G23: 기존 source 계획분/과목 비중 확인. 동일 입실/제출/양수 계획 날짜만 actual/planned,100% 초과 그대로. BE/FE unit tests 및 extremes UI test.
- G24:10/90 쌍을 같은 축에 넣은 fixture UI에서 막대 길이 비9배 및80%p 차이 확인하는 extremes test. 실제 관측이라고 주장하지 않음.
- G25: 하루500분이 나머지40분4일을 합계에서 상쇄하는 모델 반례. 반복 감소4일 유지. 일별 matrix/markers로 확인.
- G26: 기본1일 결석/2일 미제출/30% 감소/60분 지연 등은 설정 가능한 운영 제안값. 업계 최적값 주장 없음. 정기 휴일 미제출 오탐 제거, 기존 저장 설정은 보존.
- G27: 카드·날짜 클릭 전후 scrollY 차이<5px, 같은 카드 내 상세. local-expansion test.
- G28: 점/이름 클릭 해당 카드7일 상세·접기, 학습관 탭 유지. named marker3폭 test.
- G29: 결석 날짜 해당 카드 학생 목록→그 위치 상세. absence local test. 기존 날짜별 구성을 보존.
- G30: hover/focus tooltip 이름/날짜/actual/usual/delta, Escape. 정확값이 차트 아래 고정영역으로 바뀌지 않음. named/date/6-selection tests.
- G31: 투명 hit area, opaque 사각형 제거, 날짜축 아래 침범 없음. 가장자리/3폭/6선 tooltip bounds 검사.
- G32: 학생 상세7일을 한번에 표시, 원문 여러‘다음’ 없음. 기여 표 시각 중복 제거. 전체 학생 표 페이지는 이름 탐색이며 날짜 넘기기가 아님.
- G33: 상시 상담 입력/저장, 과거 이력만 펼침. final counseling test. 구버전 snapshot은 새 계산으로 비교하지 않고 비교 기록 없음으로 표시/저장.
- G34: 본문 집계기준 장문 제거. 날짜/단위/전체인원/짧은 기호 설명 유지. overview text assertion+냉독.
- G35: 새 변경 범위는 도래/판단필요/비등원/이상치 문구 미사용. 출결 입실/결석/미확인. 구버전 저장 원문은 임의 개작하지 않음.
- G36: 핵심 수치/변화값 강조색, 이름/날짜 위계. 냉독과 actual 캡처 확인. 주요 변화를 회색 작은 주석으로만 제시하지 않음.
- G37: light/dark3폭 실제 캡처. 흰 배경 혼입/문서 overflow 검사. 냉독 dark mobile/light desktop.
- G38:1600/850/390 문서overflow와 날짜/기호문구 Range bounds. 새 모바일2행 학생 matrix로 글자를9px 압축하지 않음. 최신 입실기호 왼쪽 잘림 지적은 재캡처/냉독에서 해소 확인.
- G39: SQL100명3500행,3지점. board/metrics IDs와 학생 detail review를 실제 대조. API 오류를 FE fixture로 바꾸지 않는 tests.
- G40:14개 합성군/하루 경계 seed6 tests, 정상45명 source 대조. 일시/지속/회복/누락/과목극단/초과진행 반례를 별도 검사. 모든 실제 사용자 분포의 검증이라고 주장하지 않음.
- G41: loading/error/empty 분리, stale branch404 복구2tests,503모델검사. 실제 서버 종료에서 재시도로 복구 확인.
- G42: 최신 코드의 타입/린트/빌드·모델·API·BE·MySQL·Playwright 결과 확인 후 판정. 운영 인증/운영 배포는 미연동이며 로컬 예시 명시.
- G43: 오른쪽 실제 탭의 오류→재시도 복구, 학습관/정확값/카드내 상세 직접 조작. 최종 새 API의 원문/필터와 카드 내 상세까지 직접 확인했다.
- G44: independent cold reader 실제4카드+overview 직접 읽음. 기호불명확/캡처가림 수정 후 재독해. 최신 입실기호와 history 원문은 재독해에서 추가 차단 없음. 당시 사용량 제한 실패는 이후 실제 수행과 구분.
- G45: 독립 코드 리뷰: 표본/제출/extra visit/중복/버전/음수/비교불가 이력 지적→수정. 마지막 코드 리뷰는 두 수정 확인, 추가 명확한 차단 없음. 전체 게이트 일괄 승인으로 해석하지 않음.
- G46: current/validation/handoff 최신 상태와 과거 기록 구분. 최종 완료 시 아래 문서의 미연결·미검증 문구를 역사로 명시. 발표 Notion 자동수정 없음.
- G47: source100명을3지점으로 나누고 전체 관측을 분포로 표현. 특정 상담1명만 자동 선출하는 안 제거. 선행 조사 case-first 문서.
- G48: 정상원시값다름 모델 및API45명 무신호. BE 요일구성 변경/정기휴일2일 반례 tests. 동일 편차와 개인 변동성까지 정밀 정상범위를 보장하지 않음.
- G49: 본인평소 기준 모델 morning/evening, heterogeneous baselines. 절대 시간 집단 평균 부근이어도 개인 감소/지연 기준에 포함. exact tooltip에 원래 값·분 차이 병기.
- G50: 개인비율평균/원시 입실일평균/분편차/중간분포 구분. 분포 밖=상담아님. BE/FE 비교단위 변경과 기존 version1/2 snapshot 호환검사. startSamples 보존.
- G51: whole60shift420markers와0IQR test, 한 학생 큰날이 반복4일을 상쇄하는 반례, 다중선/동일좌표는 날짜 목록에서 모두 식별/선택.
- G52: metric-research 문서의 실제 읽은 원출처와 지표별 적용/제외 이유,13개 산술 반례. 연구 전 실험과 연구 후 최종 구현 시점을 구분. 링크만 모은 것으로 통과시키지 않음.
- G53: 단위 반례+실제API+wholegroup/normal/missing UI fixture+실제 캡처/독립독해를 교차검증. 최종26개 및 실제 저장 이력1개 통과.
- G54: history 전체명부61옵션/원문줄바꿈/1000자내 긴글/학생0건/전체복원/동일지점명부변경/3폭2테마 tests. 독립냉독은 원문 끝/현재지표와 구별 확인. 현재 DB history0건, 원문 화면은 명시적인 네트워크 fixture임.

## 실제 운영과 구분해야 하는 한계

API는 로컬 합성 원본과 연결했다. 실제 LearnersHigh 운영 인증/운영DB에 연결하거나 배포한 것이 아니다. 임계값은 유효한 운영 가설로 편집 가능하며 통계적으로 최적화된 허용범위가 아니다. UI 사용성 효과는 사용자 테스트로 측정하지 않았다. 회색 점의 좌표가 겹칠 수 있어 날짜 목록/전체 명부 선택 경로로 식별한다. 형상만으로100명 전원의 이름을 항상 동시에 읽을 수 있다고 주장하지 않는다.
