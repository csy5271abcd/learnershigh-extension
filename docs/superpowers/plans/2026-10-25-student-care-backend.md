# 학생 케어 주간 API 확장 구현 계획

사용자의 BE 착수 지시에 따라 실행한다. 기존 FE와 미커밋 변경을 유지하며 커밋·배포하지 않는다.

목표: 원본 데이터 경계를 유지하며 최근 7일 / 이전 28일의 공통 학생·학습관 지표를 제공한다.

## 설계

- 기존 board에 전원 students를 추가한다. 기존 분류 배열·상담 API는 유지한다.
- 기존 학생 detail에 review를 추가한다. 기존 dailyStudy(last14)는 호환 필드로 유지한다.
- GET /api/admin/student-care/metrics?branchId=... 를 추가한다. 전원 student+review와 날짜별 학습관 평균/표본 수를 한 응답으로 제공한다. 기존 어댑터는 학생별 조회만 지원하므로 외부 호출 수 감소를 주장하지 않는다.
- review는 서버가 만든 current7/baseline28 요약, current7 일별 기록, 같은 요일 기준 평균4개 표본 및 최근7일 과목계획/실제를 제공한다. 화면 차트 모양은 계약에 넣지 않는다.
- 서버 asOf는 Asia/Seoul의 완료된 전날. baseline은 asOf-34~asOf-7, 관찰은 asOf-6~asOf.
- 등원 예정일은 검증된 원본이 없어 nullable scheduled와 recordAvailable로 구분한다. 실제 매퍼와 오래된 생성자는 일정 null을 유지한다. report/stat 없는 날은 unknown이며 실제0과 구별한다. Mock에만 명시적 일정 자료를 둔다. 존재하지 않는 휴무 승인 상태는 FE/API/모델에서 제거했다.
- CONSECUTIVE_ABSENCE 식별자는 호환 유지하되 최근7일 중 등원예정일에 입실 로그가 없는 횟수로 계산한다. 미확인 일정은 결석 판정에서 제외한다. 화면은 원본 부재와 입실 로그 부재를 구분한다.
- 총량 기준은 완전한28일 기록만 합계/4로 사용한다. 시각/비율은 유효 표본과 분모를 표시한다. 달성률은 입실·양수계획·실제기록이 함께 있는 최근7일로 계산하며100%에서 자르지 않는다.
- 설정 기본은 1/2/30/60/20/60/3/7. 기존 저장 설정은 덮어쓰지 않는다. absenceDays 허용 범위는1~14 유지.
- 실제 원본 API/권한·학생 이동 정책은 변경하지 않는다. 리뷰에서 발견한 기존 상담 공식 호환 문제를 해결하기 위해 care_case.metric_formula_version 마이그레이션을 추가했다. 기존 snapshot은 버전1로 보존한다.

## 실행

- [x] API §65 및 도메인/기능 문서에 변경 계약을 먼저 기록한다.
- [x] 입력 경계의 미기록/예정일 의미를 테스트로 고정하고 record/mapper/mock를 확장한다.
- [x] 35일 경계/7일 판정/결측/달성률/설정 테스트를 실패 확인한 뒤 기존 계산기를 수정한다.
- [x] 공통 review 집계와 DTO, detail/board/metrics 조회를 테스트 우선 구현한다.
- [x] 기존 권한 Open Decision 유지/지점범위/503/전원응답 회귀, 전체 backend build/test, Docker 가능 시 integrationTest를 실행한다.
- [x] 명세 일치 및 코드 리뷰 후 실제 검증 결과와 원본 연동 제한을 기록한다.

## 최종5 HTTP 연결 후속 단계

- [x] 서버review 직접 변환, 기본HTTP/명시preview, board+bulk metrics 명부/학습관, 선택학생detail 연결.
- [x] 상담/설정/실제명부 기반 전체이력 API 연결. 서버 업무일today를 관찰일asOf와 분리.
- [x] HTTP 읽기/쓰기/재조회/새로고침, 503 no-fallback, DB 보존 검증 및 FE/BE 전체 관련 gate. 최종E2E12/Node46/BE254+104/FE3surface검증통과.
- [x] 두테마3폭 실측/오른쪽 브라우저/맥락없는 독해/피드백F01–F24 검수기록. 최종독립판정은student-care-final-adversarial-review.md,비차단한계는final-validation문서에남긴다.
