# 학생 관리 지표 표시: 참고 사례와 오답 목록 (2026-11-07)

사용자 지적: "디자인에 정답은 없지만 오답은 있다. 오답률이 너무 높다." 이 문서는 비슷한 문제(많은 사람 중 관리가 필요한 사람을 찾고, 한 사람을 자세히 보는 화면)를 다루는 분야의 공개 자료에서 반복되는 방식과, 이번 작업에서 낸 오답을 정리한다. 자료 중 업체 홍보 글은 주장으로만 다루고, 공공·연구 자료를 우선한다.

## 1. 참고 사례에서 반복되는 방식

| 분야·자료 | 반복되는 방식 | 학생 케어에 옮기면 |
|---|---|---|
| 결석 미리 알림(Attendance Works 단계, Ohio·TalkingPoints 출결 현황 화면) | 학생을 **단계(정상·주의·중간·심각)로 나눈 인원 비율**을 막대 하나로 보이고, 단계를 누르면 그 학생 목록. 추이는 "기준을 넘은 학생 수"의 주별 선 하나 | 학습관 지표마다 "정상 / 주의 / 기준 넘음" 학생 수 막대 + 7일 동안 기준 넘은 학생 수의 작은 선. 누르면 학생 목록 |
| 위험 학생 미리 찾기 체계 공통(Colorado EWS, Prichard Committee) | 출결만이 아니라 여러 지표를 한 사람 단위로 묶음, 숫자 나열보다 **패턴**, 표시와 함께 **맥락과 다음 행동**을 같은 화면에 | 확인할 학생 목록에 사유(무엇이)와 다음 행동(상담 기록)을 붙임. 이미 C의 방향 |
| 병동 환자 위험 점수(NHS NEWS2 화면) | 환자마다 **점수 하나 + 색 + 오름·내림 화살표**, 측정 못 한 칸은 회색으로 비우고 점수를 쓰지 않음 | 학생 행: 상태 하나(색+글자) + 평소 대비 방향(↑↓). 기록 없는 날은 비움 |
| Stephen Few, 정보 현황 화면 설계 | **요약과 예외**: 다수는 흐리게, 주목할 몇 개만 진한 색. 작은 공간에 역사를 보이는 **작은 추이선**, 실제 값을 기준·평소와 비교하는 **기준과 비교하는 막대** | 학생 상세: 지표마다 기준과 비교하는 막대(7일 실제 vs 평소 범위) + 35일 작은 추이선. 학습관: 예외(기준 넘은 학생)만 진하게 |
| 현황 화면 일반(NN/g 인용 자료, IBM 점검표) | 처음 보자마자 핵심이 전달될 것, **눌렀을 때 자세히 보이기**(자세한 것은 다음 화면), 막대·선·산점도가 가장 쉽게 읽힘 | 첫 화면은 단계별 인원과 확인할 학생 수. 날짜·학생별 분포는 눌렀을 때만 |
| 학습 분석 교사용 현황 화면 연구(SoLAR 12장 등) | 집단 → 일부 집단 → 개인의 세 단계, 위험 학생 목록은 **정렬·필터 가능한 표**. 효과 증거는 엇갈리므로 시험이 필요 | 학습관(집단) → 단계·사유(일부) → 학생(개인). 과업 시험으로 확인 |

## 2. 이번 작업에서 낸 오답

| 오답 | 왜 오답인가(근거) | 어디서 |
|---|---|---|
| 첫 화면에 날짜 7개 × 학생 150명 점 그림 | 처음 보자마자 답이 나오지 않는다. 일곱 칸이 거의 같은 모양이라 같은 그림을 일곱 번 보여 준다. 눌렀을 때 자세히 보이기 위반 | A·B·C·D 학습관 |
| 그림 안에 글자를 고정 좌표로 얹음(이름, "기준 넘음 n명", 평균 행) | 칸 폭이 바뀌면 겹치고 꺾인다. 글자는 축·제목 같은 정해진 자리에 둬야 한다 | 분포 그림 |
| 모든 칸·날짜에 숫자 | Few: 예외만 강조. 숫자를 다 쓰면 강조가 사라진다 | 4판 명부, 5판 초안 |
| 행마다 다른 배율로 칠한 농도 표 | 같은 진하기가 지표마다 다른 뜻 | 한눈에 보기 줄 |
| 범례 금지 → 모든 값에 글자 | 자료는 짧은 범례를 쓴다. 금지 규칙이 글자를 늘렸다 | 4판 P5 |
| 학생 목록 행에 7일 그림 | 목록은 고르는 수단. 그림은 상세에서. 병동 화면도 행에는 점수·방향만 | 4판 명부 |
| 축소된 막대·꺾은선만 반복 | 지표 성격(범주·분포·기준 대비)에 맞는 형태를 고르지 않음 | 4판 학습관 |

## 3. 이 자료로 바꿀 방향(제안)

- **학습관 첫 화면**: 지표마다 한 줄 = 단계별 학생 수 막대(정상·주의·기준 넘음, 누르면 학생 목록) + 7일 동안 기준 넘은 학생 수 작은 추이선 + 숫자 하나(기준 넘은 학생 수). 날짜별 분포와 학생 점은 지표를 눌렀을 때의 자세히 화면으로 옮긴다.
- **확인할 학생 목록**: 정렬·필터 가능한 표. 행 = 이름 · 상태(색+글자) · 대표 사유 · 평소 대비 방향 화살표. 그림 없음.
- **학생 상세**: 지표마다 기준과 비교하는 막대(7일 실제 막대, 평소 범위 띠, 설정 기준 눈금) + 35일 작은 추이선, 출결은 달력. 숫자는 지표마다 하나(7일 실제)와 평소 대비 %.
- **글자 자리 규칙**: 그림 안에는 축 눈금과 강조 대상 1개만. 나머지 글자는 제목줄·행 머리·안내 상자에.
- **단계 기준**: 결석은 Attendance Works처럼 비율 단계(7일 중 0 / 1 / 2일 이상 = 정상·주의·기준 넘음, 기준은 설정 값), 학습·입실은 평소 대비 설정 기준의 절반 / 기준.

## 출처

- Attendance Works, 단계 정의와 3단계 개입: https://www.attendanceworks.org/wp-content/uploads/2017/08/MakingDataWork_Brief_Proof_final11.3.16.pdf , https://attendanceworks.org/?p=1856
- TalkingPoints 학군 출결 현황 화면(단계 비율, 누르면 상세): https://intercom.help/talkingpoints/en/articles/12676372-district-attendance-dashboard-overview-faq
- Ohio 주 출결 현황 화면: https://education.ohio.gov/Media/Ed-Connection/April-21-2026/Statewide-Attendance-Dashboard-launches-to-assist
- Colorado 위험 학생 미리 찾기 체계: https://www.cde.state.co.us/dropoutprevention/dpframeworkewsoverview
- Prichard Committee, 실시간 출결 현황 화면: https://prichardcommittee.org/real-time-attendance-dashboards-and-early-warning-systems/
- NHS Lothian NEWS2 화면 안내: https://policyonline.nhslothian.scot/wp-content/uploads/2026/08/NEWS2-on-Trak-User-Guide.pdf
- Stephen Few, 기준과 비교하는 막대 설계 명세와 현황 화면 글: https://www.perceptualedge.com/blog/?p=160 , https://uxmatters.com/mt/archives/2007/04/book-review-information-dashboard-design.php
- SoLAR, 학습 분석 현황 화면(12장): https://www.solaresearch.org/wp-content/uploads/2017/05/chapter12.pdf
- IBM 현황 화면 점검표: https://public.dhe.ibm.com/software/data/sw-library/cognos/mobile/C11/book/Checklist_for_effective_dashboard_design.pdf
