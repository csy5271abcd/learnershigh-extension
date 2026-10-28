> 이전 검토 기록입니다. 최신 기준은 [student-care-current.md](student-care-current.md) 및 2026-10-25의 28일/7일 설계를 따릅니다. 이전 시안은 사용자 기각 상태입니다.

# 학생 케어: 공개 사례 조사와 세 시안

## 조사 범위
2026-10-24 공식 도움말·디자인 시스템을 읽고 Airbridge, Oura의 원본 화면 이미지를 브라우저에서 확인했다. 별도 조사 에이전트는 Canvas와 Toggl의 공개 화면을 확인했다. 로그인한 운영 화면이나 사용자 실험을 검증한 것은 아니다.

## 사례에서 확인한 것 / 이번 화면에 적용할 것
- [Airbridge Overview](https://www.airbridge.io/en/blog/overview-dashboard): 요약 수치·이전 기간 차이, 기간 차트, 상세 보고서로의 연결. 숫자 카드만 복제하지 않고 기간과 상세 진입을 유지한다. 광고 지표·도넛은 가져오지 않는다.
- [Oura Trends](https://support.ouraring.com/hc/en-us/articles/360055983614-Using-Trends): 최근 수치와 기준 평균, 일·주·월 보기, 실제 시각을 세로 시간축에 놓는 화면. 입실 시각을 학습량 막대로 표현하지 않고 날짜×HH:mm 점과 개인 평균선을 사용한다. 수면 길이 막대는 출입 종료 정보가 없는 이 데이터에 적용하지 않는다.
- [Canvas Roll Call](https://community.instructure.com/en/kb/articles/660707-how-do-i-take-roll-call-using-the-attendance-tool): 출석·결석·지각·미기록을 기호와 색으로 구분. 우리 데이터는 예정 등원일이 없으므로 결석·지각 대신 입실·미입실로 표시한다. 날짜 셀과 상태 기호를 사용한다.
- [Google Classroom](https://support.google.com/edu/classroom/answer/9157286?hl=en): 제출·누락 상태, 필터, 과제/학생 클릭 후 기록 확인. 입실 여부와 제출 여부를 독립적으로 표시한다. 마감 전 미제출/지각 제출 판정은 데이터가 없어 추가하지 않는다.
- [Toggl Workload](https://docs.toggl.com/utilization-and-workload-reports-in-toggl-2-0): 날짜별 시간, 계획 용량과 실제 시간의 겹친 비교, 구성원별 상세표. 계획을 옅은 외곽, 실제를 진한 채움으로 표시한다. 계획 없음은 0이 아니며 초과 공부를 자동 경고하지 않는다.
- [Clockify Attendance](https://clockify.me/help/reports/attendance-overtime): 시작 시각과 총 시간을 다른 열로 분리. 시각과 시간량을 별도로 읽게 한다.
- [Carbon Chart types](https://v10.carbondesignsystem.com/data-visualization/chart-types/), [Modal](https://carbondesignsystem.com/components/modal/usage/): 시각화 목적을 먼저 선택, 복잡한 내용에는 큰 모달. 모든 날짜를 담는 상세 창과 명확한 닫기·Escape를 제공한다.
- [NN/g Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): 기본 화면은 핵심 정보, 상세는 요청 시 표시. 같은 날짜표와 지표 설명을 상시 중복 배치하지 않는다.

## 서로 다른 세 구조
1. 기간 비교: 출입·제출을 공유 날짜축의 상태 줄로, 학습량/계획/입실시각을 날짜순 차트로, 과목 비율을 계획·실제 점 비교로 배치. 선택 지표는 큰 모달로 펼친다.
2. 날짜 확인: 선택 기간의 날짜 그리드. 날짜별 입실·제출 기호와 학습량을 확인하고 날짜를 클릭하면 그날의 정확한 기록을 연다. 합계만 보고 빠진 날을 추측하지 않는다.
3. 학습관 비교: 전체 학생×여섯 지표. 학습량의 날짜 추이, 입실·제출 상태 줄, 시간·비율을 각 데이터형에 맞게 표시한다. 확인 대상 우선 정렬. 셀을 클릭하면 같은 학생·항목의 상세를 연다.

## 검토 기준
설명 없는 에이전트에게 화면 캡처와 URL만 제공한다. 화면 목적·기간·기준값·미입실 날짜·미제출 날짜·상세 진입을 읽게 한다. 설계 의도나 정답은 전달하지 않는다. 결과는 AI 기반 이해도 점검이며 실제 관리자 사용성 검증을 대체하지 않는다. 오독은 UI를 수정한 뒤 새 에이전트로 재검토한다.

원본 /student-care/1과 원본 소스는 보존한다. 세 신규 시안은 기존 /2, /3, /4 주소에서 시안 1/2/3으로 구분한다. API·DB·다른 기능은 변경하지 않는다.
