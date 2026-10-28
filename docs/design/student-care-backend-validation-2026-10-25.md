# 학생 케어 BE 주간 API 검증

## 구현

- 기존 board 응답에 지점 전체 students를 추가했다. 정상/관리중/기록부족도 명부에서 빠지지 않는다.
- 기존 detail에 review를 추가했다. current7/baseline28 요약, 날짜7개, 같은요일 평균·표본수, 과목 계획/실제다. 기존 dailyStudy(last14)는 호환 유지한다.
- GET /api/admin/student-care/metrics?branchId=...에 전원 student+review, 날짜별 학습관 평균·표본수를 제공한다. 학습0은 평균에 포함하고 미기록은 제외한다. 일부 연동 실패를 부분성공/빈값으로 숨기지 않는다.
- 완료된 전날까지 지표를 계산하고, 상담일·재확인 가능일·종결 후 숨김은 실제 오늘을 사용한다.
- 입력 경계에 scheduled(nullable), recordAvailable을 추가했다. 실제 어댑터의 일정은 확인되지 않았으므로 null을 유지한다. report/stat가 없는 날짜를 학습0/계획미제출로 확정하지 않는다.
- 초기값1/2/30/60/20/60/3/7과 이전28일/최근7일 공식을 구현했다. 기존 저장 설정은 덮어쓰지 않는다.
- 새 마이그레이션 V202610251000__version_student_care_metric_formula.sql: 기존 상담 공식1, 신규 상담2. 이전 snapshot을 새 계산식으로 비교해 개선으로 오판하지 않도록 이전 건의 비교값은null로 반환한다. snapshot/이력/수동 관리종료는 보존한다.

## 검증

backend에서 `.\gradlew.bat build integrationTest --console=plain` 실행 성공.

- 단위 테스트254개: 실패0/오류0/skip0.
- 실제 Docker MySQL 통합 테스트104개: 실패0/오류0/skip0.
- 전원 명부·detail.review·metrics,35일 경계와 표본수,0/미기록,미확인 일정,503/404/400,설정,상담 상태·잠금·동시요청·기존snapshot 마이그레이션 포함.
- read-only 코드 검토에서 발견한 미확인일정→0일 개선 오판과 불완전한 기준자료→‘평소 수준’ 문구를 회귀 테스트와 함께 수정했다.

보고서: backend/build/reports/tests/test/index.html 및 integrationTest/index.html.

## 실제 연동 범위

API/DB 마이그레이션은 로컬 코드와 Testcontainers에서 검증했다. 운영 배포·운영DB 적용은 하지 않았다. 기존 실데이터 어댑터의 일정 원본은 미확정이므로 미입실 자동판정은 명시적 일정 정보가 있을 때만 동작한다. 원본 학습/계획 조회는 기존 경계를 사용한다.

학습관 API를 한 응답으로 제공하지만 원본 어댑터의 학생별 조회를 반복한다. 원본 API 호출 수 감소나 대규모 학습관 성능을 검증한 것은 아니다. 인증/관리자 지점권한·무계획모드·과목표준화·지점이동 정책은 기존 Open Decision을 유지한다.

현재 1~7 시안은 FE 예시 공급자로 동작한다. 새 BE review 응답을 사용하는 실데이터 FE 연결은 이 구현과 구분한다. 기존 화면의 학습/계획 원본 자체를 새로 만들지 않았다.
