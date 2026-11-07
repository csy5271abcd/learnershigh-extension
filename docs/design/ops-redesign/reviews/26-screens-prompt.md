너는 학원·독서실 관리자용 "학생 케어" 시안 A–D의 실제 화면 관문 검토자다. 사용자는 작업 중 답할 수 없으므로 네 판정이 승인을 대신한다.

## 배경
- 계획 `docs/design/ops-redesign/plan-v5.md`(4차), 지표 표현 기준 `representation-v5.md`(이번에 새로 정함), 기능 보존표 `function-map-v5.md`, 계약 `contract-v5.md`.
- 배치 관문 2차(`reviews/24-layout-result.md`)는 A·B·D 통과, C는 L02 잔여(결과를 연 상태에서 날짜 변화+분포 유지, 비전 네 축·비교 확장 상태 제시)였다.
- 그 뒤 사용자가 지적했다: "지표별 적합한 표현을 고민하라 했는데 막대·꺾은선에서 못 벗어났고, 값 하나를 그대로 그리는 1차원 표기라 다량(150명)·극단 데이터에 취약하다. 텍스트를 우겨넣는 것은 좋지 않다. 텍스트는 최후 수단으로 최소한." 이 지적으로 P5를 `representation-v5.md`로 바꿨고, 정적 배치도 대신 실제 화면을 만들었다.

## 이번은 2차 검토다
1차 결과 `reviews/25-screens-result.md`의 필수 수정 S01–S08이 해소됐는지 먼저 확인하라(커밋 8b17953 이후 현재 HEAD). 1차에 쓴 증거 스크립트(`reviews/25-evidence/*.mjs`)를 다시 써도 된다.

## 대상 (실행 중, DB에 쓰지 마라)
- 기존 http://localhost:5174/student-care , 시안 http://localhost:5174/student-care/a , /b , /c , /d
- 코드 `frontend/admin/src/features/student-care/variants/`
- 브라우저: `e2e/node_modules/@playwright/test` chromium, `channel: 'chrome', args: ['--no-proxy-server']`
- 측정기 `scripts/research/care-p34-probe.mjs`(P3·P4), 텍스트는 `scripts/research/care-screen-metrics.mjs`의 probe와 같은 방식으로 세도 된다.

## 판정
1. 안마다 P1–P8(`plan-v5.md` 3장 판정 상태)과 `representation-v5.md` 원칙(모양 우선, 숫자는 머리 숫자·극단·선택 대상에만, 150명 학생별 점, 극단값 처리, 범례 최소)이 실제 화면에서 성립하는가. 1600·1280px, 라이트·다크.
2. 지표별 표현이 그 지표의 데이터 성격과 관리자 판단에 맞는가. 더 나은 표현이 분명하면 구체적으로.
3. 보이는 글자량: 같은 상태끼리 기존 화면보다 적은가(학생 목록, 학생 상세, 학습관).
4. C의 L02 잔여: 결과를 연 상태에서도 그 지표의 날짜 변화와 분포가 남는가, 비전 네 축·비교 상태.
5. 기능 보존(`function-map-v5.md`)의 큰 누락. 세부 검증은 최종 채점에서 한다.

## 출력
`docs/design/ops-redesign/reviews/26-screens-result.md`에 한국어로: (1) 안별 판정과 근거(캡처 파일), (2) 지표별 표현 평가와 개선 제안, (3) 필수 수정(이것 없이는 과업 시험·최종 채점으로 가면 안 되는 것), (4) 통과 여부(필수 수정 0건), (5) 다음 단계 주의. 소스는 수정하지 마라. 시험 파일은 `docs/design/ops-redesign/reviews/26-evidence/` 안에만.
