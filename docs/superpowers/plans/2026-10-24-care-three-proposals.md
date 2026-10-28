> 이전 시안 기록입니다. 2026-10-24 최신 요구사항과 구현 기준은 [student-care-baseline-requirements.md](../../design/student-care-baseline-requirements.md)를 따릅니다. 폐기된 레이아웃·용어를 이 문서에서 복원하지 않습니다.

# Student Care Three Proposals Implementation Plan

**Goal:** 조사에 근거한 세 상호작용 시안을 같은 예시 데이터로 만들고 맥락 없는 검토를 수행한다.
**Architecture:** 기존 FE adapter/snapshot/설정/원본을 재사용한다. PrototypeWorkspace가 학생·학습관·기간을 관리하고 시안별 본문만 바꾼다. 시각화와 상세는 공통 컴포넌트다.
**Tech Stack:** React, TypeScript, CSS, SVG, 기존 Playwright. 추가 라이브러리 없음.

- [x] `components/proposals/PrototypeWorkspace.tsx`: 지점/학생 선택, 기간/주말 제외, 세 본문, 상세 열기.
- [x] `components/proposals/MetricVisual.tsx`: 상태 줄·날짜별 시간·시간축 점·계획/실적·과목 비교. 0과 기록 없음 분리.
- [x] `components/proposals/proposals.css`: 기존 테마 토큰, 1600/850/390 레이아웃, 포커스와 모달.
- [x] `app/StudentCareRoute.tsx`, `AdminShell.tsx`, `App.tsx`: 기존 원본 보존, 시안 1/2/3 진입.
- [x] `e2e/tests/student-care-proposals.spec.ts`: 14/28 날짜, 정확한 날짜 상태, 지점 변경, 셀/차트→상세, Escape/닫기, 두 테마/뷰포트, 기본 화면 과다 스크롤 확인.
- [x] 빌드·린트·모델 테스트 및 브라우저 화면 검사. 별도 맥락 없는 에이전트의 오독 기록/수정. 증거 캡처와 잔여 한계 보고.

실행은 사용자가 요청한 시안 제작 범위 안에서 진행하며 커밋/배포는 하지 않는다.
