# 원본 기반 세 시안 구현 계획

목표: 원본 1의 탐색·상담 구조를 유지하면서 세 가지 독립 시각화를 /2 /3 /4에 제공한다.
기준: docs/design/student-care-baseline-requirements.md. 최신 사용자 지시로 이미 승인된 작업 범위에서 실행하며 추가 승인이나 커밋을 요구하지 않는다.

- [x] 요구사항·거절된 방식·공식 자료·데이터 제약을 문서화한다.
- [x] 독립 렌더러 MetricPanels / WeeklyBoard / DateComparisons를 각각 구현한다. CareVisualProps를 공유하며 서로의 차트 컴포넌트를 복제하거나 호출하지 않는다.
- [x] 현재 StudentCarePage를 라우트에 연결하고 전체 명부·학생 상세·상담·이력을 유지한다. 원본 private copy는 수정하지 않는다.
- [x] SignalOverview에서 selectedPeriodSnapshot으로 7/14/28 집계를 통일한다. 각 렌더러는 여섯 지표를 모두 시각적으로 보여 주고 상세 콜백을 제공한다.
- [x] 확인 필요 상태 아래 신규/재확인 구분을 적용한다. 지점 전체 비교에서 여섯 지표와 학생 전원을 함께 표시한다.
- [x] 기간·목록·상세·상태·지점·원본 보존에 대한 Playwright 검증을 새 화면 기준으로 작성한다. build/lint/모델 테스트와 브라우저 검증을 수행한다.
- [x] 밝은/어두운 실제 화면 캡처를 검토하고 새 에이전트에 정답 없이 제공해 오독을 확인한다. 결과와 한계를 기록한다.

작업 파일: features/student-care/components/baseline/*, components/SignalOverview.tsx, StudentList.tsx, StudentPanel.tsx, StudentCarePage.tsx, model/format.ts, app/StudentCareRoute.tsx, e2e/tests/student-care-preview.spec.ts.
데이터 모델·API 계약·원본 기능은 복제하지 않는다. FE fixture와 기존 mock adapter만 사용한다.
