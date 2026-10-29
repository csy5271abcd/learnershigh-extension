## 2026-10-29 학생 케어 단일화·관리 이력·미입실 표시

비교 시안 학생 케어 1~3을 메뉴·라우트에서 제거하고 최종안을 `/student-care` 하나의 '학생 케어'로 정리했다(`/student-care/5`는 같은 화면으로 연결). 화면 상단의 'API 연결 · 로컬 DB 예시' 표시는 뺐다. 학습관별 미입실은 이전 28일 같은 요일 4회 모두 미입실이면 '매주 안 오는 요일', 아니면 '결석'(빨강)으로 나누고 날짜별 숫자는 둘을 합친 '미입실'로 표시한다. 상단 숫자는 결석이 있는 학생 수다. 승인·사유 데이터가 없어 '무단'으로 단정하지 않는다. 학습 시간·입실 시간 그래프에 학습관 평균선 켜기/끄기, 학생 선택 시 정확값 칸의 학습관 평균, 이름 목록의 '전체' 항목을 추가했고 학생을 골라도 색이 바뀌지 않게 했다. 관리 이력은 관리 건 단위로 묶고 같은 시각 이벤트도 기록 순서를 유지한다. 기록자(actorName, V202610291700)는 새 이벤트에만 저장하고 과거 기록은 비워 둔다. 검증: Backend 단위 274, MySQL 통합 106, Node 92, Playwright 전체(결석 집계·평균선·이력 순서 포함).

## 2026-10-29 조회 API 부하 테스트

학생별 목록(`/board`)과 학습관 지표(`/metrics`)가 학생마다 원본 기록을 따로 조회하던 것을 일괄 조회(`ExistingStudyClient.findDailyStudies`)로 바꾸고 응답 압축을 켰다. 1000명 학습관 기준 SQL 1,005 → 7, `/board` p50 853 → 224ms, `/metrics` 전송 3,136KB → 57KB. 쿨다운 조회 인덱스를 `(branch_id, status, closed_on)`으로 넓혔다(V202610290800). 학생 수와 무관하게 일괄 조회 1회인지 보는 회귀 테스트를 추가했다. k6 동시 접속(1000명 지점 초당 약 4.5회 탭 열기, 오류 0)과 데이터 누적(학생 10,400명, 상담 이력 83,200건)을 확인했다. 관리 이력 탭은 학생마다 이력을 따로 불러 1000명이면 요청 1,001개라 지점 단위 이력 API + 커서 페이지네이션을 다음 작업으로 남긴다. API 계약·응답 형태 변경 없음. Backend 단위 273, MySQL 통합 104 통과. 상세: `docs/design/student-care-load-test-2026-10-29.md`, 재현: `scripts/perf/`.

## 2026-10-28 최신 상태

학생 케어5: 전체 명부100명/60·30·10명 학습관, 개인 평소 대비 분포·다중 비교·카드 내7일 상세, 날짜별 결석/계획 제출, 관리 이력 학생별 필터와 당시 원문 펼침을 API에 연결했다. 공식3은 개인 요일별 입실 편차·정기휴일 제외·과목 동일 날짜 비교를 적용하고 이전 snapshot은 보존한다.

관리 이력 합성 시딩12건/49이벤트를 추가했으며 기존 예시와 합쳐13건/51이벤트(관리 중10, 종료3)다. 과거 날짜의 API로 생성했으며 원문·출결 원본을 덮어쓰지 않았다. 재실행 추가0건. 로컬 검증은 verify.ps1 -Strict PASS, BE단위270 및 학생케어 MySQL75, FE모델/API80+seed6, 최종 브라우저26+실제 저장 이력1 PASS. PR CI는 현재27개 acceptance suite로 명시한다. 운영 연결·인증·배포와 효과 측정은 별도다.

이전 기록은 당시 상태이며 최신 검수는 docs/design/student-care-validation-2026-10-28.md 및 전체 피드백 게이트를 따른다.

# Wangyu Progress

## 2026-10-25 주간 지표 확장

- BE: board 전원 명부,detail.review,metrics API와 이전28일/최근7일 집계 구현. 공식버전 마이그레이션 V202610251000 추가. 단위254/실제MySQL 통합104개 통과(전체 build integrationTest).
- FE:1~4보존,전체명부기본5/6/7시안과hover/focus정확값구현. 검토용예시자료이며새BE와실데이터연결은분리한다.
- FE build/lint,모델/API34개,Playwright1~7의흐름/테마/반응형12개통과. 사용자디자인승인또는운영효과검증을뜻하지않는다.
- 실제일정/승인휴무원본은미확정으로일정없는미입실은자동결석판정하지않는다. 기존인증·과목표준화·무계획모드Open Decision 유지.
- 근거: docs/design/student-care-backend-validation-2026-10-25.md, student-care-567.md.

> 위치: `docs/specs/wangyu/progress.md`  
> Progress는 Requirement Source가 아니다. 실제 구현 상태에 맞춰 갱신한다.

## 학생 케어 (Student Care)

| 단계 | 상태 | 비고 |
|---|---|---|
| Spec / Domain / API Contract | DONE | `features/student-care.md`, `domain.md`, `api-contract.md` §65 |
| Backend | DONE | `studentcare` Domain, Migration `V202610131200` |
| Admin Frontend | DONE | `frontend/admin/src/features/student-care/` |
| E2E | DONE | `e2e/tests/student-care.spec.ts` (7 Scenario) |
| 최소 UX 재구성 | DONE | `docs/design/student-care-ux.md`: 단일 화면, 상담 기록, 약속·지점 요약·약속 수정 제거 |

### 검증 (2026-10-13, 로컬, 최소 UX 재구성 후)

```text
backend  ./gradlew clean build integrationTest : 322 tests, 0 fail (Unit 222 + Integration 100)
frontend npm run typecheck / lint / build      : pass
e2e      npm run typecheck / playwright test   : 7 passed
```

### 남은 항목 / Open Decision

```text
Existing LearnersHigh 실제 출결·학습·계획 API (현재 Mock Client)
Authentication / 관리자 권한 범위 (현재 지점 단위 접근 제어 없음)
ADR-0006 / ADR-0007 Proposed
성적 신호(등급 하락, 정답률 하락) — 범위 제외
```
