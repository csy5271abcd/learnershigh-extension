# 학생 케어 디자인 토큰 정리

작성 2026-11-07. 개선안(`/student-care/ops`)이 새 디자인 시스템을 만들지 않고 기존 토큰을 재사용하도록, 지금 학생 케어 화면이 실제로 쓰는 토큰과 값을 정리했다. 1~6장은 현재 코드의 사실이고, 7장만 제안이다. 제안은 개선안 경로에만 적용하며 원본 `/student-care`와 공용 토큰 파일은 바꾸지 않는다.

## 1. 토큰이 적용되는 순서

토큰 파일은 두 개다. `frontend/admin/src/main.tsx`가 `app/theme.css`를 먼저, `index.css`를 나중에 불러온다.

| 파일 | 접두어 | 성격 |
|---|---|---|
| `app/theme.css` | `--color-*`, `--font-size-*`, `--space-*`, `--radius-*` | 학생 케어용 테마. 라이트·다크 둘 다 있음(`prefers-color-scheme`) |
| `index.css` | `--lh-*` | Admin 공통. 라이트만 있음 |

이 순서 때문에 실제로 적용되는 값이 문서 주석과 다른 곳이 있다. 두 파일 모두 `body`를 지정하는데 뒤에 오는 `index.css`가 이겨서, 학생 케어의 기본 글자는 `theme.css`가 의도한 16px·행간 1.5가 아니라 **14px(`--lh-font-body`)·행간 1.57·`--lh-font-family`(Pretendard)**다. 배경은 Shell이 덮어써서 테마를 따른다.

`app/AdminShell.module.css`는 학생 케어 메뉴일 때 `.shell[data-care-theme]`에서 `--lh-color-*` 12개를 `theme.css` 값으로 다시 연결한다(`--lh-color-background → --color-background`, `--lh-color-surface → --color-surface-muted`, `--lh-color-text-tertiary → --color-text-tertiary`, `--lh-color-accent → --color-accent` 등). 그래서 학생 케어 화면 안에서는 Shell(사이드바·헤더)도 `theme.css` 색을 쓰고 다크 테마를 따른다. `--lh-font-*`, `--lh-space-*`, `--lh-radius-*`는 다시 연결하지 않으므로 Shell의 글자 크기와 간격은 `index.css` 값 그대로다.

**실제로 쓰이는 CSS.** `app/StudentCareRoute.tsx`에서 import를 따라가면 학생 케어 CSS 22개 가운데 11개만 화면에 포함된다(`student-care.css`, `components/AllHistory.css`, `components/baseline/baseline.css`, `components/weekly/` 아래 7개, `app/StudentCareRoute.module.css`). `student-care-v2.css`, `designs/*.css`, `proposals/proposals.css`, `baseline/DateComparisons·MetricPanels·WeeklyBoard.css`, `branch-overview-v2.css`는 지금 경로에서 import되지 않는다. 아래 수치는 포함되는 11개 파일 기준이다. 포함되는 파일 안에도 지금 컴포넌트가 쓰지 않는 선택자가 있어서(예: `student-care.css`의 `.sc-level`, `.sc-cal`, `.sc-strip`, `.sc-datelist`), 선택자의 클래스 이름이 import된 TSX에 나오는지로 한 번 더 걸렀다. 동적 클래스 이름 때문에 이 거름은 근사치다.

## 2. 색 토큰

`theme.css` 값이다. "사용 수"는 포함되는 11개 파일에서 `var()`로 참조한 횟수다. `WeekStudentViews.css`의 지역 별칭 `--ww-blue`(→accent), `--ww-orange`(→flag), `--ww-gray`(→text-tertiary), `--ww-line`(→border)은 원래 토큰 쪽에 따로 적었다.

| 토큰 | 라이트 | 다크 | 사용 수 | 주로 쓰는 곳 |
|---|---|---|---:|---|
| `--color-background` | #f5f6f8 | #101318 | 2 (+Shell) | 페이지 바탕, `StudentCareRoute .surface` |
| `--color-surface` | #ffffff | #191d24 | 60 | 카드·표·대화상자 바탕 |
| `--color-surface-muted` | #f2f4f6 | #22272f | 46 | 배지·결석 버튼·제외 상태 바탕 |
| `--color-text-primary` | #191f28 | #eef1f5 | 65 | 이름·수치 |
| `--color-text-secondary` | #4e5968 | #b6bec9 | 130 | 표 머리글·상태 설명·보조 문장 |
| `--color-text-tertiary` | #5d6875 | #9aa4b0 | 40 (+ww-gray 9) | 미확인·기록 없음, 날짜 보조 |
| `--color-border` | #e5e8eb | #313843 | 86 (+ww-line 13) | 구분선, 카드 테두리 |
| `--color-input-border` | #7d8793 | #737d8a | 9 | 입력 테두리, `.bwk-status-unknown` 점선 |
| `--color-accent` | #1b64da | #4c95ff | 87 (+ww-blue 12) | 선택 상태, 출석·제출 표시, 차트 선 |
| `--color-accent-hover` | #1957c2 | #79afff | 1 | 버튼 hover |
| `--color-accent-soft` | #e8f3ff | #16263d | 17 | 선택 바탕 |
| `--color-accent-text` | #1b64da | #79afff | 26 | 링크성 버튼 글자 |
| `--color-on-accent` | #ffffff | #0b1220 | 5 | accent 바탕 위 글자 |
| `--color-flag` | #b93c0a | #ff9a5c | 81 (+ww-orange 7) | 관리 필요·결석·미제출·지각 (3장) |
| `--color-flag-soft` | #fff1e8 | #33200f | 7 | 결석·미제출 배지 바탕 |
| `--color-positive` | #0d7050 | #4cc38a | 15 | 출석·제출 완료, 상단 정상 상태 |
| `--color-negative` | #c92a2a | #ff7b7b | 9 | 오류 메시지(`.sc-state[role=alert]`) |
| `--color-chart-bar` | #c4cad2 | #4a5361 | 13 | 지난 기간 막대 |
| `--color-focus` | #1b64da | #79afff | 2 (+전역 `:focus-visible`) | 포커스 윤곽 |

토큰이 아닌 색도 있다. `BranchOverviewDashboard.css`가 정의되지 않은 `var(--color-danger, #e05252)`를 2번 써서 두 테마 모두 `#e05252`가 그대로 나온다. `student-care.css`의 `.sc-panel`은 `--color-chart-bar`를 `#a9b2bd`로 덮어쓰는데 테마 구분이 없어 다크에서도 이 값이다. `RosterStudies.css`의 팝오버는 토큰마다 다크 계열 대체값(`#202631`, `#edf1f7` 등)을 달아 두었지만, 토큰이 항상 정의되어 있어 실제로 쓰이지는 않는다. 그 밖에 그림자용 `#0003`·`#0005`·`#0009`가 있다.

`index.css`의 `--lh-color-*` 라이트 값(text-tertiary #5f6b78, accent #3182f6, negative #d9263a 등)은 학생 케어 안에서는 위처럼 다시 연결되므로 쓰이지 않는다. 다른 Admin 메뉴에서만 의미가 있다.

## 3. 상태 색

학생 케어는 상태를 색 두 개와 회색으로만 나눈다. 별도의 상태 토큰은 없고 아래처럼 의미 토큰을 재사용한다.

| 상태 | 글자 | 바탕·표시 | 선택자 예 |
|---|---|---|---|
| 관리 필요(attention) | `--color-flag` | 왼쪽 3px `--color-flag` 선 | `.sc-week .sc-row--attention`, `.cm-card[data-attention]`, `.rs-summary[data-attention]`, `.bwk-attention`, `.ww-card--attention`(flag 4% 섞은 바탕) |
| 결석·미제출(absent, missing) | `--color-flag` | `--color-flag-soft` | `.bwk-status-absent/missing`, `.cm-status-card [data-state=absent/missing]`, `.wk-roster-marks i[data-state=absent/missing]` |
| 출석·제출(present, submitted) | `--color-positive` 또는 `--color-accent` | `--color-surface-muted` | `.bwk-status-present/submitted`(positive), `.wk-roster-marks …present/submitted`(accent), `.ww-state--ok`(accent 10% 바탕) |
| 미확인(unknown) | `--color-text-tertiary` | `--color-input-border` 점선 | `.bwk-status-unknown`, `.ww-record-missing` |
| 제외(excluded) | `--color-text-secondary` | `--color-surface-muted` | `.bwk-status-excluded`, `.bl-status-dots i[data-state=excluded]` |
| 예상 밖 결석 | `#e05252`(정의 안 된 `--color-danger`의 대체값) | `--color-surface-muted` 버튼 위 | `.bov-absence button[data-unexpected]>b`, `.bov-absence-students [data-pattern=unexpected]>span` |
| 패턴 강조 칸 | `--color-flag` | flag 18% + surface 섞은 색 | `.bov-pattern-cell[data-flag=true]` |
| 오류 | `--color-negative` | 없음 | `.sc-state[role=alert] p` |

출석·제출 표시가 화면에 따라 positive(초록)와 accent(파랑)로 갈린다. 같은 의미를 두 색으로 쓰는 것이므로 개선안에서는 하나로 정해야 한다(7장 P7).

## 4. 글자 크기와 행간

**정의된 토큰.** `theme.css`는 `--font-size-sm` 14px, `-md` 16px, `-lg` 18px, `-xl` 22px 네 단계다. `index.css`는 `--lh-font-caption` 12px, `-label` 13px, `-body` 14px, `-title-sm` 16px, `-title-md` 20px, `-title-lg` 24px, `-page-title` 30px 일곱 단계다. 행간 토큰은 어느 파일에도 없다.

**실제 선언.** 포함되는 11개 파일의 `font-size` 선언(`font:` 축약 1개 포함)을 px로 환산해 셌다. 왼쪽은 파일 안 전체, 오른쪽은 import된 TSX가 쓰는 클래스만 남긴 근사치다.

| 크기 | 전체 선언 | 쓰는 선택자(근사) |
|---:|---:|---:|
| 9px | 4 | 3 |
| 10px | 18 | 14 |
| 11px | 53 | 40 |
| 12px | 112 | 83 |
| 13px | 40 | 31 |
| 14px | 70 | 36 |
| 15px | 11 | 5 |
| 16px | 16 | 7 |
| 17px | 10 | 7 |
| 18px | 12 | 8 |
| 19~28px (19·20·21·22·23·24·26·28) | 28 | 22 |
| 합계 | 374 | 256 |

12px 미만이 전체 75개(20%), 쓰는 선택자 기준 57개(22%)다. 크기 값은 9px부터 28px까지 18가지이고, 토큰(`var(--font-size-*)`)으로 지정한 선언은 54개로 모두 `student-care.css` 안에 있다. `components/weekly/` 아래 파일은 전부 px 고정값이며, `student-care.css`에도 `0.9375rem`(15px)·`1.0625rem`(17px)·`1.625rem`(26px) 같은 토큰에 없는 rem 값이 섞여 있다. 기준점 측정(`plan.md` 3장)에서 학습관별 탭 최소 글자 10px, 학생별·관리 이력 11px로 나온 것과 맞는다.

12px 미만이 몰린 곳은 학습관별 탭이다. 쓰는 선택자 57개 중 `BranchOverviewDashboard.css`가 36개다. 9px는 `.bd-student small`, `.bov-absence em`, 440px 이하에서의 `.bov-pattern-head time`·`.bov-pattern-cell`이고, 10px는 `.bov-card>footer`, `.bov-key`, 차트 축 `text`, `.bov-pattern-cell`, `.bov-study-tooltip` 등이다. 11px는 표 머리글(`.bov-impact-table thead th`, `.bd-readout`), 범례(`.cm-chart-key`, `.bov-pattern-legend`), 툴팁(`.cm-tooltip`, `.bov-tooltip`), 관리 이력의 반·상태(`.sc-history-state`, `.sc-all__class`)다. 범례·표 머리글·상태처럼 의미를 읽어야 하는 글자가 가장 작다.

**행간.** 선언된 행간 값은 14가지다: 1.6(6회), 1.8(4), 1.5(4), 1.7(2), 1.2(2), 1.4(2), 1.65·1.35·1.3·1(각 1), 그리고 10px·14px·16px·17px 고정값(각 1)과 `font: 13px/1.6` 1회. 나머지는 body의 1.57을 물려받는다.

**굵기.** 400(16회), 500(21), 600(36), 650(8), 700(28), 750(3), 800(2)로 일곱 단계다.

## 5. 간격과 모서리

| 토큰 | `theme.css` | `index.css` |
|---|---|---|
| space 1/2/3/4 | 4 / 8 / 12 / 16px | 4 / 8 / 12 / 16px |
| space 5 | **24px** (`--space-5`) | **20px** (`--lh-space-5`) |
| space 6 | 32px (`--space-6`) | 24px (`--lh-space-6`) |
| space 8 / 10 | 없음 | 32 / 40px |
| radius | small 8px, medium 12px | sm 6px, md 12px, lg 16px |
| 기타 | `--control-height` 44px | `--lh-admin-header-height` 56px |

같은 번호 5·6이 두 파일에서 다른 값이다. 섞어 쓰면 의도와 다른 간격이 나온다.

포함되는 파일의 padding·margin·gap 선언 646개 중 간격 토큰을 쓴 것은 107개(17%)다. 나머지 px 고정값은 12px(67회), 8px(56), 4px(49), 10px(48), 6px(41), 16px(38), 5px(37), 14px(35), 7px(25), 18px(24), 20px(23) 순이고 1~55px 사이 26가지다. 10·6·5·14·7·18px처럼 4의 배수 척도에 없는 값이 많다.

모서리는 토큰 사용이 18회(`--radius-small` 12, `--radius-medium` 5, `--lh-radius-lg` 1)이고 나머지는 2px(12), 6px(11), 3px(10), 4px(10), 5px(8), 50%(7), 10px(5), 14·9·8px(각 3), 12·16·999px(각 2), 7px(1) 등이다.

## 6. 대비

WCAG 2.2의 상대 휘도 공식으로 계산했다. 글자는 1.4.3 기준 4.5:1(18.66px 굵게 또는 24px 이상은 3:1), 의미를 가진 그래픽·입력 테두리는 1.4.11 기준 3:1이다. 섞은 색(`color-mix(in srgb, …)`)은 sRGB 값을 비율대로 섞어 계산했다.

**토큰 조합**

| 글자 / 바탕 | 라이트 | 다크 |
|---|---:|---:|
| text-primary / background | 15.32 | 16.43 |
| text-primary / surface | 16.56 | 14.92 |
| text-primary / surface-muted | 15.02 | 13.25 |
| text-secondary / background | 6.58 | 9.92 |
| text-secondary / surface | 7.11 | 9.01 |
| text-secondary / surface-muted | 6.45 | 8.00 |
| text-tertiary / background | 5.25 | 7.37 |
| text-tertiary / surface | 5.67 | 6.69 |
| text-tertiary / surface-muted | 5.14 | 5.94 |
| accent-text / surface | 5.41 | 7.56 |
| accent-text / accent-soft | 4.82 | 6.81 |
| accent / surface | 5.41 | 5.67 |
| on-accent / accent | 5.41 | 6.29 |
| flag / surface | 5.65 | 8.07 |
| flag / surface-muted | 5.13 | 7.17 |
| flag / flag-soft | 5.12 | 7.41 |
| positive / surface | 6.09 | 7.63 |
| positive / surface-muted | 5.52 | 6.78 |
| negative / surface | 5.46 | 6.74 |
| input-border / surface (그래픽 3:1) | 3.65 | 4.05 |
| chart-bar / surface (그래픽 3:1) | **1.65** | **2.17** |
| border / surface (장식) | 1.23 | 1.43 |

**토큰 밖 조합과 섞은 색**

| 조합 | 쓰는 곳 | 라이트 | 다크 |
|---|---|---:|---:|
| flag / flag 18%+surface | `.bov-pattern-cell[data-flag]`, 10·11px | **4.30** | 5.69 |
| flag / flag 12%+surface | `.ww-state--warn` | 4.74 | 6.48 |
| accent / accent 10%+surface | `.ww-state--ok` | 4.71 | 4.92 |
| text-primary / flag 4%+surface | `.ww-card--attention` | 15.59 | 13.99 |
| #e05252 / surface-muted | `.bov-absence button[data-unexpected]>b` | **3.46** | **3.93** |
| #e05252 / surface | `.bov-absence-students` 예상 밖 결석 | **3.82** | 4.42 |
| #a9b2bd / surface (그래픽) | `.sc-panel` 지난 막대 덮어쓰기 | **2.15** | 7.88 |
| #ffffff / flag | `.sc-level--big`, `.sc-datelist__item--miss` (지금 미사용) | 5.65 | **2.09** |
| #ffffff / accent-soft | `.sc-strip__mark` (지금 미사용) | **1.12** | 15.23 |

토큰끼리의 글자 조합은 두 테마 모두 4.5:1을 넘는다. 기준에 못 미치는 것은 모두 토큰 밖 값이거나 섞은 색이다. 지금 화면에 나오는 것은 라이트의 패턴 강조 칸(4.30, 10~11px라 큰 글자 예외도 안 됨), 두 테마의 예상 밖 결석 `#e05252`(3.46~4.42), 지난 기간 막대(1.65~2.17)다. 흰 글자를 쓰는 미사용 선택자 두 개는 다크 또는 라이트에서 크게 미달하므로 개선안에서 다시 쓰면 안 된다.

## 7. 가독성 문제와 개선안 범위 조정 (제안)

이 장의 내용은 모두 **제안**이다. 원본 화면과 `theme.css`·`index.css`는 그대로 두고, 개선안 루트 요소 안에서만 적용한다. 기준은 KRDS 타이포그래피(https://www.krds.go.kr/html/site/style/style_03.html, 2026-11-07 확인)와 WCAG 2.2다. KRDS 표준 크기 표에서 가장 작은 단계는 본문·레이블 xsmall 13px이고, 본문은 최소 16px, 행간은 최소 150%를 권한다(Pretendard GOV 기본 17px). WCAG 2.2에는 최소 글자 크기 기준이 없으므로 크기 근거는 KRDS와 `plan.md`의 필수 조건(최소 12px)에서 가져온다.

| 번호 | 문제(현재 사실) | 제안 | 이유·출처 |
|---|---|---|---|
| P1 | 9~11px 선언이 쓰는 선택자 기준 57개, 범례·표 머리글·상태 글자가 가장 작음 | 개선안의 모든 글자 13px 이상. 차트 축 눈금 숫자만 12px 허용 | KRDS 최소 단계 13px. `plan.md` 5장 필수 조건 12px 이상. 축 눈금은 반복되는 숫자라 13px에서 겹침이 생기면 12px로 둔다 |
| P2 | 실제 본문 14px(`index.css`가 `theme.css` 16px을 덮음) | 표 행·목록의 본문 15px, 문단·대화상자 설명은 기존 `--font-size-md` 16px | KRDS 본문 small 15px, 본문 권장 16px 이상. 150명 표는 밀도 때문에 16px 대신 15px로 두고, 1600×900에서 첫 화면 학생 수를 재서 결정한다(아래 남은 불확실성) |
| P3 | 크기 값 18가지, 토큰 사용은 54/374 | 개선안 크기를 13·15·16·18·22px 다섯 단계로 제한. 16·18·22는 기존 `--font-size-md/lg/xl`을 그대로 쓰고, 13px은 기존 `--lh-font-label`을 쓴다. 15px만 새 값이므로 개선안 지역 변수 `--ops-font-row: 0.9375rem`(제안, 신규)로 둔다 | 기존 토큰 재사용이 원칙(`plan.md` 7장). 이미 `student-care.css`가 0.9375rem을 6번 쓰고 있어 새로 고르는 값은 아니다 |
| P4 | 행간 14가지, 토큰 없음 | 여러 줄 글자 1.5 이상, 한 줄 숫자·제목만 1.2~1.3 허용. 개선안 지역 변수 없이 선언으로 통일 | KRDS 행간 150% 이상. WCAG 2.2 1.4.12(사용자가 행간을 1.5로 바꿔도 잘리지 않아야 함) |
| P5 | `--color-danger` 미정의로 `#e05252`가 나와 3.46~4.42 | 예상 밖 결석 글자는 `--color-flag`(5.13/7.17) 또는 `--color-negative`(5.46/6.74). 결석은 오류가 아니므로 flag를 우선 | WCAG 2.2 1.4.3 4.5:1. 기존 토큰으로 해결되므로 새 색을 만들지 않는다 |
| P6 | 패턴 강조 칸 flag/flag 18% 라이트 4.30 | 바탕을 `--color-flag-soft`로 바꿈(5.12/7.41) | WCAG 2.2 1.4.3. 기존 배지와 같은 조합이 된다 |
| P7 | 지난 기간 막대 1.65(라이트)·2.17(다크), `.sc-panel` 덮어쓰기는 라이트 2.15·다크에서도 같은 값 | 막대가 값을 전달하면 `--color-input-border`(3.65/4.05)를 쓰고 테마 구분 없는 덮어쓰기는 쓰지 않음. 출석·제출 색은 accent 하나로 통일 | WCAG 2.2 1.4.11 그래픽 3:1. 같은 의미에 두 색을 쓰지 않는다(3장) |
| P8 | `--space-5` 24px와 `--lh-space-5` 20px가 다름, 간격 선언 83%가 고정 px | 개선안은 `theme.css`의 `--space-*`만 쓰고 4의 배수가 아닌 고정값(5·6·7·10·14·18px)은 가장 가까운 토큰으로 맞춤 | 이름이 같은 다른 값을 섞으면 생기는 오차를 막는다. 새 토큰은 만들지 않는다 |
| P9 | 흰 글자 고정값(#fff)이 flag·accent-soft 위에서 테마에 따라 2.09·1.12 | 개선안에서 `#fff` 고정 글자를 쓰지 않음. 강조 바탕 위 글자는 `--color-on-accent`(accent 위)나 flag/flag-soft 조합만 사용 | WCAG 2.2 1.4.3. 다크 테마에서 깨지는 조합을 처음부터 배제한다 |

남은 불확실성은 두 가지다. P2의 15px는 150명 목록의 첫 화면 밀도와 맞바꾸는 값이라 여기서 확정할 수 없다. 와이어프레임 단계에서 15px과 16px 각각으로 `scripts/research/care-screen-metrics.mjs`를 돌려 첫 화면에 보이는 문제 학생 수와 탐색 거리를 비교한 뒤 정한다. 4장의 "쓰는 선택자" 수치는 클래스 이름 문자열로 거른 근사치라서, 실제 렌더링된 최소 글자는 같은 측정기의 "최소 글자" 값으로 확인한다.
