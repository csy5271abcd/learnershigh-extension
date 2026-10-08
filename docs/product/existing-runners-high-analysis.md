# Existing Runners High Analysis

> 기존 러너스 하이 분석 문서

> 기준 자료: `기존 러너스 하이 앱 분석 화면 (2026/09/21).pdf`  
> 분석 범위: 관리자 웹 1~18p, 학생 화면 19~31p  
> 목적: 기존 러너스 하이의 사용자, 정보구조, 기능, 화면 구성, 화면 간 이동 및 데이터 흐름을 정리하여 이후 LearnersHigh 확장 기능의 기준점으로 사용한다.

> 이미지 기준 경로: `references/existing-runners-high/screens/`  
> 아래 `참고 이미지` 경로는 **프로젝트 루트(`C:\learnershigh-extension`) 기준 상대경로**다.  
> Claude Code는 기존 화면 구조·Navigation·정보 밀도·Interaction을 확인할 때 해당 이미지를 우선 참고한다. 신규 확장 화면의 색상/폰트/Component Style을 그대로 복제하는 용도로 사용하지 않는다.


---

# 1. 서비스 개요

러너스 하이는 학원·관리형 학습공간에서 학생의 학습계획, 순공시간, 학습기록, 리포트, 수행평가 등을 관리하기 위한 학습 관리 플랫폼이다.

기존 서비스는 크게 다음 두 Surface로 나뉜다.

- **관리자 웹**
  - 학원/지점/학생을 관리한다.
  - 학생별 학습 상태와 순공 상태를 확인한다.
  - 계획, 라이브러리, 리포트, 수행평가 등 학생 데이터를 관리한다.
  - 실시간 학습 현황과 운영 상태를 모니터링한다.

- **학생 화면**
  - 학습 계획을 세운다.
  - 학습 타이머로 실제 순공시간을 기록한다.
  - 라이브러리와 수행평가를 관리한다.
  - 학습 이력, 다이어리, 리포트, 통계를 확인한다.
  - 진단 및 리워드 기능을 이용한다.

핵심 구조는 다음과 같이 볼 수 있다.

```text
학습 계획
   ↓
오늘의 학습 선택
   ↓
학습 타이머
   ↓
순공시간 / 학습 이력 누적
   ↓
다이어리 / 리포트 / 통계
   ↓
관리자 웹에서 학생 상태 확인
```

---

# 2. 주요 타겟층

러너스 하이는 학생이 직접 사용하는 학습 서비스이지만, **사업·도입 관점의 핵심 타겟과 실제 서비스 사용자를 구분해서 보는 것이 적절하다.**

## 2-1. 1차 핵심 타겟 — 학원 / 관리형 스터디카페

가장 중요한 타겟은 학생의 학습을 관리하고 성과를 높여야 하는 **학원과 관리형 스터디카페 같은 교육 운영 기관**이다.

이들에게 러너스 하이가 제공하는 핵심 가치는 다음과 같다.

- 학생별 학습시간과 순공시간 관리
- 학생별 학습계획 및 실행률 확인
- 지점·좌석·출결·학습 상태 실시간 모니터링
- 학생별 학습 이력과 리포트 확인
- 학습이 저조하거나 관리가 필요한 학생 파악
- 수행평가 및 학습 관련 데이터 관리
- 여러 학생을 한 화면에서 비교·관리
- 학부모에게 보여줄 수 있는 학습 성과 자료 확보
- 학원의 관리 품질과 학습관리 서비스를 체계화

즉 기관 입장에서는 러너스 하이를 **학생의 공부 과정을 데이터로 관리하고, 학습관리 서비스의 품질을 높이기 위한 운영 플랫폼**으로 사용할 수 있다.

관리자 화면 역시 이러한 타겟 특성을 반영해 **지점 → 학생 목록 → 학생 상세 데이터**를 반복적으로 확인하는 구조를 가진다.

## 2-2. 1차 핵심 타겟 — 자녀의 성적 향상을 원하는 학부모

또 다른 핵심 타겟은 단순히 공부시간만 확인하는 것이 아니라 **자녀의 실제 학습 습관과 성적이 좋아지기를 원하는 학부모**다.

학부모가 기대하는 핵심 가치는 다음과 같다.

- 자녀가 실제로 얼마나 공부하고 있는지 확인
- 계획을 세우고 실제로 수행하고 있는지 확인
- 과목별 학습량과 순공시간 변화 확인
- 학습 습관이 좋아지고 있는지 확인
- 시험 성적과 학습 과정의 변화 확인
- 학원에서 학생을 어떻게 관리하고 있는지 확인
- 학습 결과와 관리 성과를 이해하기 쉬운 형태로 전달받기

기존 화면에는 별도의 학부모 전용 앱/웹이 명확하게 존재하지 않지만, 학생 리포트와 관리자 리포트센터가 존재하므로 **학부모에게 학습 결과와 관리 성과를 전달할 수 있는 기반은 이미 존재한다.**

따라서 학부모는 단순한 간접 이해관계자라기보다, 서비스 도입과 지속 이용에 영향을 주는 **중요한 의사결정자이자 성과 수요자**로 보는 것이 적절하다.

## 2-3. 2차 핵심 타겟 / 실제 서비스 사용자 — 학생

학생은 사업적으로 서비스를 구매·도입하는 주체라기보다, 러너스 하이의 기능을 직접 사용하고 학습관리 서비스를 제공받는 **핵심 End User**다.

학생에게 제공되는 핵심 가치는 다음과 같다.

- 오늘 공부할 항목 확인
- 주간·월간 학습계획 수립
- 학습 타이머를 통한 순공시간 측정
- 과목별 학습량 확인
- 계획 달성률 확인
- 학습 이력 확인
- 일간·주간·월간 리포트 확인
- 학습 통계와 Ranking 확인
- 수행평가 관리
- 학습 성향·역량 진단
- 학습 성과에 따른 리워드 확인

학생 화면은 단순 타이머가 아니라 **계획 → 실행 → 기록 → 분석 → 다음 학습**으로 이어지는 개인 학습 사이클을 지원한다.

따라서 타겟 구조를 정리하면 다음과 같다.

```text
1차 핵심 타겟
├─ 학원 / 관리형 스터디카페
│  └─ 학생 관리 효율 + 학습 성과 관리 + 운영 품질 향상
│
└─ 학부모
   └─ 자녀의 실제 학습 변화 + 성적 향상 + 관리 성과 확인

2차 핵심 타겟 / End User
└─ 학생
   └─ 계획 + 실행 + 기록 + 분석을 통한 학습관리 서비스 이용
```

즉 러너스 하이는 **기관이 학생을 효과적으로 관리하고, 학부모가 그 관리와 성과를 확인하며, 학생이 실제 학습 기능을 사용하는 B2B2C 성격의 학습관리 플랫폼**으로 정리할 수 있다.

---

# 3. 기존 정보구조(IA)

## 3-1. 관리자 웹

기존 관리자 웹의 대표 메뉴 구조는 다음과 같다.

```text
관리자 웹
├─ 학원관리
│  ├─ 매니저/운영 계정
│  ├─ 지점
│  └─ 선생님 관련 관리
│
├─ 학습관리
│  ├─ 지점 학습현황
│  ├─ 학생 학습계획
│  ├─ 그룹/기관 학습계획
│  ├─ 학생 라이브러리
│  ├─ 순공TV
│  ├─ 리포트센터
│  └─ 학생별 학습 데이터
│
├─ 학습조정
│  ├─ 클래스
│  ├─ 선생님
│  ├─ 주간 스케줄
│  └─ 신청/배정 관련 기능
│
├─ 학원비결제 / 스토어
├─ 리워드
├─ 자리배치도
└─ ADMIN
```

관리자 화면은 기본적으로 다음 레이아웃을 반복한다.

```text
Left Sidebar
    │
    ├── 기관/지점/학생 목록
    │
    └── Main Detail Area
```

상단 Header에는 알림, 설정, 계정 등 전역 기능이 배치된다.

## 3-2. 학생 화면

기존 학생 화면의 상단 Navigation은 다음 기능들로 구성된다.

```text
학생
├─ 타이머
├─ 계획
├─ 라이브러리
├─ 다이어리
├─ 레포트
├─ 통계
├─ 전국통계
├─ 상벌점
├─ 수행평가
├─ 진단
└─ 리워드
```

학생 화면은 관리자 웹과 달리 개인의 학습 흐름을 중심으로 수평 Navigation을 사용한다.

---

# 4. 관리자 웹 화면 분석

## 4-1. 로그인 / 관리자 Home

### 참고 이미지

- 관리자 로그인: `references/existing-runners-high/screens/admin/auth/admin-login.png`
- 관리자 Home: `references/existing-runners-high/screens/admin/home/admin-home-dashboard.png`
- 관리자 Home 업데이트/공지 상태: `references/existing-runners-high/screens/admin/home/admin-home-updates.png`

PDF 1p에서 관리자 로그인과 로그인 후 기본 Home을 확인할 수 있다.

### 로그인

- ID
- Password
- Continue

로그인 성공 후 관리자 공통 Layout으로 진입한다.

### Home

- Left Sidebar
- 서비스 공지/업데이트
- 알림
- 설정
- 사용자 계정

관리자 Home은 직접 학습을 수행하는 화면이 아니라 각 관리 기능으로 이동하는 **업무 허브** 역할을 한다.

### 주요 Interaction

```text
로그인
→ 관리자 Home
→ Sidebar 메뉴 선택
→ 기관/학생 선택
→ 상세 관리 화면
```

---

## 4-2. 학원 / 매니저 / 지점 관리

### 참고 이미지

- 매니저/운영 계정 관리: `references/existing-runners-high/screens/admin/operations/manager-management.png`
- 지점 학습현황: `references/existing-runners-high/screens/admin/student-management/branch-study-status.png`

PDF 2p 등에서 운영 계정과 지점 데이터를 관리하는 화면이 확인된다.

대표 구성:

- 좌측 대상 목록
- 검색
- 추가 버튼
- 상세정보 Form
- 상태
- 저장

관리자는 목록에서 대상을 선택하고 오른쪽 Detail Form을 수정하는 Master-Detail 패턴을 사용한다.

### Interaction

```text
목록 검색
→ 대상 선택
→ 상세정보 표시
→ 정보 수정
→ 저장
```

이 패턴은 관리자 웹 전반에서 반복된다.

---

## 4-3. 지점 학습현황

### 참고 이미지

- 지점 학습현황: `references/existing-runners-high/screens/admin/student-management/branch-study-status.png`
- 학생별 학습상태 목록: `references/existing-runners-high/screens/admin/student-management/student-study-status-list.png`

지점 단위로 학생의 학습상태를 조회한다.

화면에서 확인되는 대표 정보:

- 학생
- 좌석/Room
- 상태
- 공부시간
- 순공시간
- 순공률
- 학습계획 상태
- 관련 Detail

상단에는 날짜, 상태 등 검색/Filter를 제공한다.

### 특징

- 한 지점의 여러 학생을 한 표에서 비교한다.
- 학생 단위 상태를 운영자가 빠르게 확인하는 데 초점이 있다.
- `보기` 같은 Detail Action으로 더 깊은 화면으로 이동한다.

---

## 4-4. 실시간 학습 모니터

### 참고 이미지

- 순공 Ranking Dashboard: `references/existing-runners-high/screens/admin/studyroom/studyroom-ranking-dashboard.png`
- 실시간 학생 상태 Grid: `references/existing-runners-high/screens/admin/studyroom/studyroom-live-student-grid.png`
- 좌석/학생/Camera Monitor: `references/existing-runners-high/screens/admin/studyroom/studyroom-seat-monitor.png`
- 지점/스터디룸 통계 Dashboard: `references/existing-runners-high/screens/admin/studyroom/studyroom-statistics-dashboard.png`
- 학생 Leaderboard: `references/existing-runners-high/screens/admin/studyroom/studyroom-leaderboard.png`
- 학생별 학습 Timeline: `references/existing-runners-high/screens/admin/studyroom/studyroom-timeline.png`

PDF 3~5p에는 실시간 학습공간 운영 화면이 나타난다.

### Today 현황 / Ranking

대표 정보:

- 출석률
- 평균 순공시간
- 평균 순공률
- Today 순공 Ranking
- Weekly Top 10
- Monthly Top 10

### 학생별 실시간 상태

학생을 Card/Grid 형태로 표시한다.

대표 정보:

- 학생 이름
- 좌석 번호
- 순공률
- 현재 학습시간
- 대기/학습/휴식 등의 상태

### 좌석/카메라 모니터

좌석 위치 또는 실제 학습공간의 Camera View와 학생 상태를 결합한 화면이 존재한다.

운영자는 현재 누가 학습 중인지, 어느 좌석이 비어 있는지, 학습상태가 어떤지 한 화면에서 확인한다.

### 지점 통계

그래프와 KPI 형태로 다음과 같은 지점 상태를 보여준다.

- 누적 공부시간
- 평균 공부시간
- 순공 관련 수치
- 출석 관련 수치
- 날짜별 추이

### Timeline

학생별 입실/학습/휴식/퇴실과 같은 상태를 시간축으로 표시하는 화면이 존재한다.

### Interaction

```text
지점 선택
→ 실시간 현황
→ Ranking / 좌석 / Timeline / 통계 전환
→ 학생 상태 확인
```

---

# 5. 관리자 학습관리 화면

## 5-1. 학생 학습계획 관리

### 참고 이미지

- 학생 Library 현황: `references/existing-runners-high/screens/admin/student-management/student-library-status.png`
- 학생 Library 관리: `references/existing-runners-high/screens/admin/student-management/student-library-management.png`
- 학생 주간 학습계획: `references/existing-runners-high/screens/admin/study-plan/student-weekly-plan.png`

관리자도 학생의 학습계획을 확인할 수 있다.

화면은 학생을 선택한 뒤 여러 Tab을 전환하는 구조다.

확인되는 대표 Tab/데이터:

- 라이브러리 현황
- 학습현황
- 라이브러리 관리
- 학습계획
- 학습기록
- 레포트
- 학습이력
- 학습통계
- 스터디룸
- 학습로그

즉 관리자 화면은 학생의 여러 학습 데이터를 **동일 학생 Context 아래에서 Tab으로 전환**하여 확인하는 방식이다.

## 5-2. 라이브러리 관리

### 참고 이미지

- 학생 Library 현황: `references/existing-runners-high/screens/admin/student-management/student-library-status.png`
- 학생 Library 관리: `references/existing-runners-high/screens/admin/student-management/student-library-management.png`

학생의 교재/학습 콘텐츠를 Card 형태로 확인한다.

대표 정보:

- 분류
- 과목
- 제목
- Page
- 진행률
- 상태

관리자는 학생의 학습계획이 어떤 라이브러리 항목을 참조하는지 확인할 수 있다.

## 5-3. 그룹/기관 학습계획

### 참고 이미지

- 그룹 학습계획 목록: `references/existing-runners-high/screens/admin/study-plan/group-study-plan-list.png`
- 학습계획 추가 Modal: `references/existing-runners-high/screens/admin/study-plan/study-plan-create-modal.png`
- 주간 학습계획 Grid: `references/existing-runners-high/screens/admin/study-plan/weekly-study-plan-grid.png`
- 학습계획 Empty State: `references/existing-runners-high/screens/admin/study-plan/study-plan-empty-state.png`
- 그룹/학생 주간 일정: `references/existing-runners-high/screens/admin/study-plan/group-weekly-schedule.png`
- 학습계획 복사/등록 Modal: `references/existing-runners-high/screens/admin/study-plan/study-plan-copy-modal.png`

개별 학생뿐 아니라 그룹/클래스 수준의 계획을 관리하는 화면이 존재한다.

대표 기능:

- 주간 학습계획
- 월간 학습계획
- 계획 추가
- 일정 Grid
- Library 선택
- 학습 내용
- 날짜
- 시간
- Page
- 진행상황 Memo

### 계획 추가 Interaction

```text
계획 추가
→ Library 선택
→ 학습 내용 입력
→ 학습 날짜/시간 선택
→ Page 입력
→ 진행상황 입력
→ 확인
→ 주간/월간 Grid에 반영
```

학생 화면의 계획 추가 Flow와 매우 유사한 구조를 사용한다.

---

# 6. 순공TV / 리포트 / 운영 데이터

## 6-1. 순공TV

### 참고 이미지

- 순공TV 설정: `references/existing-runners-high/screens/admin/studyroom/studytv-settings.png`
- 순공TV 실제 Display: `references/existing-runners-high/screens/admin/studyroom/studytv-display.png`

순공TV는 학생들의 학습상태를 대형 화면이나 별도 Display에 노출하기 위한 기능으로 보인다.

관리자 화면에서 다음을 설정/확인할 수 있다.

- 채널 ID
- 송출 URL
- 사용자 지정 CSS
- 화면 관련 URL
- Display 설정

실제 출력 화면에서는:

- 현재 교시
- 남은 시간
- 실시간 재실 인원
- 실시간 순공률
- 학습 시작/중지/완료 이벤트

등을 크게 표시한다.

## 6-2. 리포트센터

### 참고 이미지

- Report Center 목록: `references/existing-runners-high/screens/admin/report/report-center-list.png`
- 학생별 Report 조회: `references/existing-runners-high/screens/admin/report/report-center-student-list.png`
- Report/학습계획 Preview: `references/existing-runners-high/screens/admin/report/report-study-plan-preview.png`
- Report 이력 목록: `references/existing-runners-high/screens/admin/report/report-history-list.png`

관리자는 학생별 일간/주간/월간 리포트를 조회한다.

대표 기능:

- 기간 검색
- 학생 선택
- Report List
- 순공시간
- 계획 관련 데이터
- `보기`
- 전달/관리 Action

리포트센터는 학생 화면에서 생성된 학습시간과 계획 결과를 운영자가 다시 확인하는 지점이다.

---

# 7. 학생 화면 분석

## 7-1. 로그인

### 참고 이미지

- 학생 로그인: `references/existing-runners-high/screens/student/auth/student-login.png`

PDF 19p.

학생은 ID/Password로 로그인한다.

로그인 후 학생 전용 Navigation과 개인 학습 화면으로 진입한다.

---

## 7-2. 학습 타이머

### 참고 이미지

- 학습 타이머 기본 화면: `references/existing-runners-high/screens/student/timer/study-timer-home.png`
- 학습 타이머 실행 상태: `references/existing-runners-high/screens/student/timer/study-timer-active.png`
- 학습 타이머 Focus Mode: `references/existing-runners-high/screens/student/timer/study-timer-focus-mode.png`

PDF 19, 21p.

학생 화면의 핵심 기능이다.

### 구성

왼쪽:

- 오늘의 학습 목록
- 과목/교재/계획
- 각 항목 시간

오른쪽:

- 선택한 학습
- THIS TURN
- TOTAL
- Start / Pause

추가 요소:

- AI 모니터링 On/Off
- 학습 중 Focus Mode 형태의 단순화된 화면

### Interaction

```text
오늘의 학습 선택
→ START
→ THIS TURN 증가
→ TOTAL 누적
→ PAUSE / 완료
→ 학습이력 및 리포트에 반영
```

타이머는 단독 기능이 아니라 계획, 학습이력, 리포트, 통계의 데이터 생성 지점이다.

---

## 7-3. 주간 / 월간 학습계획

### 참고 이미지

- 학습계획 추가 Modal: `references/existing-runners-high/screens/student/plan/study-plan-create-modal.png`
- 주간 학습계획: `references/existing-runners-high/screens/student/plan/weekly-study-plan.png`
- 주간 학습계획 Detail: `references/existing-runners-high/screens/student/plan/weekly-study-plan-detail.png`

PDF 20, 22p.

### 화면 구조

- 주간 학습계획
- 월간 학습계획
- 날짜/시간 Grid
- 계획 Card/Block
- 계획 추가

### 계획 추가 Form

- 라이브러리
- 학습 내용
- 학습 일자
- 학습 시간
- Page
- 진행상황

### Interaction

```text
계획 화면
→ 계획 추가
→ Library 선택
→ 일정/범위 입력
→ 저장
→ Calendar/Grid 반영
→ 해당 날짜의 오늘의 학습에서 실행
```

계획과 타이머가 직접 연결되는 구조가 서비스의 핵심이다.

---

## 7-4. 라이브러리

### 참고 이미지

- 학생 Library: `references/existing-runners-high/screens/student/library/student-library.png`

PDF 22p.

학생이 사용할 교재/학습 항목을 Card 형태로 관리한다.

대표 정보:

- 개인/공통
- 과목
- 제목
- Page 범위
- 진행 Page
- 진행률
- 수정

### Interaction

```text
Library 생성/선택
→ 학습계획에서 Library 참조
→ 계획 실행
→ Page/진행률 갱신
```

---

## 7-5. 나의 학습 이력 / 학습 Ranking

### 참고 이미지

- 나의 학습 이력 Dashboard: `references/existing-runners-high/screens/student/history/learning-history-dashboard.png`
- 학습 Ranking: `references/existing-runners-high/screens/student/history/study-ranking.png`

PDF 23p.

### 나의 학습 이력

대표 정보:

- 한달 공부시간
- 최근 공부일
- 마지막 공부시간
- 오늘 순공시간
- 전체 기간 추이
- 평균 공부시간
- 평균 순공률
- 출석 관련 수치

### Ranking

- 최근 5일 등 기간별 Ranking
- 학생 이름
- 공부시간
- 순위

개인 기록과 경쟁/비교 요소를 함께 제공한다.

---

## 7-6. 학습 다이어리

### 참고 이미지

- 학습 Diary: `references/existing-runners-high/screens/student/history/learning-diary.png`

PDF 24p.

날짜별 학습내용을 일기장 형태로 확인한다.

대표 정보:

- 날짜
- 오늘 학습시간
- 학습 항목
- 항목별 기록

### Interaction

```text
날짜 이동
→ 해당 날짜 학습 기록 표시
→ 특정 항목 확인
```

타이머에서 발생한 기록을 날짜 중심으로 다시 보는 기능이다.

---

## 7-7. 일간 / 주간 / 월간 리포트

### 참고 이미지

- 일간 Report: `references/existing-runners-high/screens/student/report/daily-report.png`
- 주간 Report: `references/existing-runners-high/screens/student/report/weekly-report.png`
- 월간 Report: `references/existing-runners-high/screens/student/report/monthly-report.png`

PDF 24~25p.

### 일간 리포트

- 오늘의 계획
- 진행/완료 수
- 시간대별 학습
- 오늘의 학습 결과
- 순공률
- 학습 만족도

### 주간 리포트

- 주간 순공률
- 전주 대비
- 공부 Level/랭킹
- 계획 달성률
- 자습 비율
- 최근 순공시간 비교
- 주간 학습 만족도

### 월간 리포트

주간 리포트와 유사한 지표를 월 단위로 보여주며 Calendar와 기간 비교를 포함한다.

### Interaction

```text
Report 메뉴
→ 일간 / 주간 / 월간 선택
→ 기간 이동
→ 학습시간 / 계획 / 순공률 / 만족도 확인
```

---

## 7-8. 학습 통계 / 전국 학습통계

### 참고 이미지

- 개인 학습통계: `references/existing-runners-high/screens/student/statistics/learning-statistics.png`
- 전국 학습통계: `references/existing-runners-high/screens/student/statistics/national-learning-statistics.png`
- 전국 학습통계 Detail: `references/existing-runners-high/screens/student/statistics/national-statistics-detail.png`

PDF 26~27p.

### 개인 학습 통계

- 기간 선택
- 과목별 공부시간
- 과목별 비율
- 순공률
- 목표 대비 순공률
- 과목별 학습 추이

### 전국 학습통계

- 학년 선택
- 평균 공부시간
- 평균 계획 수
- 달성률
- 순공률
- 과목별 평균 학습량
- 과목 비중

학생 자신의 데이터를 전체 평균과 비교할 수 있게 구성되어 있다.

---

## 7-9. 상벌점

### 참고 이미지

- 상벌점 이력: `references/existing-runners-high/screens/student/reward/reward-penalty-history.png`

PDF 27p.

기간 기준으로 상점/벌점 내역을 조회한다.

대표 정보:

- 기간
- 상점
- 벌점
- 합계
- 일시
- 내용
- 점수

운영 정책과 학생 행동 기록을 개인이 확인할 수 있게 한다.

---

## 7-10. 수행평가

### 참고 이미지

- 학생 수행평가 목록: `references/existing-runners-high/screens/student/performance-task/performance-task-list.png`
- 학생 수행평가 Detail/등록: `references/existing-runners-high/screens/student/performance-task/performance-task-detail.png`
- 관리자 수행평가 목록: `references/existing-runners-high/screens/admin/performance-task/performance-task-list.png`
- 관리자 수행평가 Detail: `references/existing-runners-high/screens/admin/performance-task/performance-task-detail.png`

PDF 28p.

### 목록

- 수행평가 제목
- 과목
- 날짜
- 상태
- 새 수행평가 등록

### 등록 Form

- 학년
- 학기
- 과목
- 마감일
- 제목
- 설명
- 첨부파일
- 학생 초안

기존 수행평가는 **과제 등록과 결과/완료 관리가 중심**이며, 과정 단계가 세밀하게 구조화되어 있지는 않다.

### Interaction

```text
수행평가 목록
→ 새 수행평가
→ 기본정보/설명/첨부/초안 입력
→ 등록
→ 목록
→ Detail/상태 확인
```

---

## 7-11. 학습 진단

### 참고 이미지

- 학습/MBTI 진단 시작: `references/existing-runners-high/screens/student/diagnosis/learning-diagnosis-intro.png`
- 진단 문항: `references/existing-runners-high/screens/student/diagnosis/learning-diagnosis-question.png`
- 학습 성향 결과: `references/existing-runners-high/screens/student/diagnosis/learning-tendency-result.png`
- 학습 역량 분석: `references/existing-runners-high/screens/student/diagnosis/learning-competency-analysis.png`

PDF 29~30p.

진단 기능은 크게 다음 영역으로 구성된다.

- MBTI 성향 진단
- 학습 성향 진단
- 학습 역량 분석

### 성향 진단

질문에 선택형으로 응답한다.

```text
진단 시작
→ 문항 응답
→ 결과
```

결과에서는 강점/약점과 학습 성향 해석을 제공한다.

### 학습 역량 분석

실제 학습 데이터를 기반으로 다음과 같은 역량을 Card 형태로 보여준다.

- 계획 이행률
- 학습 지속력
- 일관성
- 학습 집중도
- 회복 관리
- 졸음 관리

---

## 7-12. 리워드

### 참고 이미지

- Reward Dashboard: `references/existing-runners-high/screens/student/reward/reward-dashboard.png`

PDF 31p.

학습 행동과 포인트를 연결한다.

대표 요소:

- 획득 가능한 포인트
- 오늘의 Action
- Badge
- 기프티콘 교환
- 공부 알림/이벤트

학습 지속을 위한 Gamification Layer로 볼 수 있다.

---

# 8. 화면 간 핵심 Interaction

> 이 장의 Flow를 구현·분석할 때는 위 각 화면 섹션의 `참고 이미지`를 함께 확인한다.  
> Claude Code는 텍스트 명세와 이미지가 충돌하는 경우 임의로 판단하지 말고, 기존 기능의 실제 동작/구조인지 또는 단순 Visual 차이인지 구분한 뒤 보고한다.


## 8-1. 학생 학습 핵심 Flow

```text
Library
  ↓
학습계획
  ↓
오늘의 학습
  ↓
Timer Start
  ↓
학습 Session 저장
  ↓
학습 이력
  ├─ 다이어리
  ├─ 일/주/월 리포트
  ├─ 학습 통계
  └─ Ranking
```

이 Flow가 기존 러너스 하이의 가장 중심적인 사용자 경험이다.

## 8-2. 학생 계획 Flow

```text
주간/월간 계획
→ 계획 추가
→ Library 선택
→ 날짜/시간/Page 설정
→ 계획 저장
→ 오늘의 학습에 노출
→ Timer로 실행
→ 진행률/완료 반영
```

## 8-3. 학생 수행평가 Flow

```text
수행평가
→ 목록 확인
→ 새 수행평가 등록
→ 기본 정보 / 설명 / 첨부 / 초안
→ 저장
→ 상태 확인
```

기존 구조는 수행 과정의 세부 Stage보다 등록/완료 중심이다.

## 8-4. 관리자 학생 관리 Flow

```text
Admin Login
→ Sidebar
→ 지점 선택
→ 학생 선택
→ 학생별 Tab 전환
   ├─ 학습현황
   ├─ 계획
   ├─ 라이브러리
   ├─ 이력
   ├─ 통계
   ├─ 리포트
   └─ 로그
```

## 8-5. 실시간 운영 Flow

```text
지점 학습현황
→ 실시간 학생 Grid
→ 좌석/Camera
→ 학생 상태
→ Timeline / Ranking / 통계
```

## 8-6. 리포트 연결

```text
학생 Timer/Plan Data
→ Student Report
→ Admin Report Center
```

동일한 학습데이터가 학생에게는 자기관리 정보로, 관리자에게는 관리/운영 정보로 사용되는 구조다.

---

# 9. 기존 데이터 관계 분석

기존 화면을 기준으로 보면 다음 Entity 관계를 추정할 수 있다.

```text
Organization / Branch
├─ Admin / Manager
├─ Student
│  ├─ Library
│  │  └─ Study Plan
│  │     └─ Study Session
│  │        ├─ Learning History
│  │        ├─ Diary
│  │        ├─ Report
│  │        └─ Statistics
│  │
│  ├─ Performance Task
│  ├─ Diagnosis
│  ├─ Reward / Point
│  └─ Attendance / Seat Status
│
└─ Study Room / Seat
```

이 관계를 확장 기능 개발 시 가능한 한 재사용해야 한다.

---

# 10. UI/UX 특성

## 10-1. 관리자

장점:

- Sidebar 중심이라 많은 관리 기능을 수용하기 쉽다.
- List → Detail 구조가 일관적이다.
- 학생과 지점을 빠르게 전환할 수 있다.
- Table 기반 운영 업무에 적합하다.
- 실시간 모니터링 화면은 관리형 학습공간의 특성이 분명하다.

한계:

- 메뉴가 많아 정보 밀도가 높다.
- 같은 학생을 여러 메뉴에서 반복 선택해야 할 가능성이 있다.
- 운영 데이터와 학생 성장 데이터가 서로 분리되어 있다.
- 기능 단위 페이지가 많아 학생의 전체 Context를 한 번에 보기 어렵다.

## 10-2. 학생

장점:

- Timer, Plan, Library가 직접 연결된다.
- 학습 결과를 일/주/월 단위로 확인할 수 있다.
- 통계와 Ranking으로 자기 상태를 파악하기 쉽다.
- Dark UI와 타이머 중심 화면은 집중 모드와 잘 맞는다.
- 수행평가, 진단, 리워드까지 학습관리 기능이 넓다.

한계:

- 상단 Icon Navigation은 기능 의미를 처음 이해하기 어렵다.
- 화면별 정보량과 시각 스타일이 서로 다르다.
- Report/통계가 숫자 확인에 집중되어 다음 행동으로 이어지는 연결이 약하다.
- 수행평가는 과정 관리보다 등록/완료 중심이다.
- 학생의 활동, Evidence, Reflection을 장기적으로 누적하는 구조가 약하다.
- 선배/멘토 경험을 참고하는 독립 기능이 확인되지 않는다.

---

# 11. 기존 구조에서 유지해야 할 핵심

향후 LearnersHigh 확장 시 기존 기능을 대체하기보다 다음 구조를 유지하는 것이 중요하다.

- 기존 관리자 Sidebar / Header Context
- 기존 Student Top Navigation Context
- Timer
- Plan
- Library
- Learning History
- Diary
- Report
- Statistics
- Study Room / 실시간 모니터
- 수행평가 기본 데이터
- 기존 학생/지점 식별 구조

확장 기능은 이 데이터를 다시 만들기보다 기존 데이터에 연결되는 형태가 적절하다.

---

# 12. 분석 결론

기존 러너스 하이는 이미 다음 사이클을 갖고 있다.

```text
계획
→ 실행
→ 순공 측정
→ 기록
→ 리포트/통계
→ 관리자 확인
```

따라서 신규 확장 기능의 핵심은 기존 학습시간 관리 기능을 다시 만드는 것이 아니라,

- 수행평가의 과정과 Version을 더 세밀하게 연결하고,
- 수행평가 밖의 성장 활동을 축적하고,
- 학생이 참고할 수 있는 Mentor 경험을 제공하고,
- 관리자에게 여러 데이터를 학생 단위로 통합해 보여주며,
- 기존 Report를 더 의미 있는 결과 중심 정보로 확장하는 것

에 있다.
