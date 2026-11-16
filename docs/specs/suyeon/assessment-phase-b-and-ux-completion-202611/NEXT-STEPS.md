# 남은 작업 (AI 분석 고도화 제외)

| 순서 | 작업 | 비고 |
|---|---|---|
| 1 | 실제 관리자 인증·인가 연결(API-OD-A01) → `reviewer_auth=VERIFIED`일 때만 HWP·HWPX 운영 확정 | 지금은 운영 확정 차단, 개발 합성 시험만 |
| 2 | 실제 HWP 원본 + 계정 B 분석기 출력으로 검토 E2E | HWP는 서명 검사용 합성 바이트로 통합 테스트만 함 |
| 3 | 필드별 근거 참조(계정 B 분석 계약 변경) | 같은 항목 안 필드 근거를 구분하지 못함 |
| 4 | 빈 Schema 기준선 재실행: PDF HTTP 33·실험 OFF 9·Adapter 83·D-1 진리표 42·PDF 사본 14, Admin PDF 13·HWP/HWPX 15×2 | 새 시험 Schema 이름 권한 필요(기존 시험 Schema는 지우지 않음) |
| 5 | 낡은 브라우저 기준선 갱신(`browser-e2e.mjs`·`regression-browser-e2e.mjs`의 A1·`review-confirm-disabled`·A4 Schema 상태 의존) + 점검표 6을 Phase B 상태로 | 스크립트만 고치면 된다. Requirement를 약화하지 않는다 |
| 6 | 휴지통 보존 기간·영구 삭제·개인정보 삭제 의무(OD-A11) | 지금은 자동 영구 삭제 없음 |
| 7 | 문서 내용 비교(PDF 텍스트 Diff), Office·HWP 안전한 변환 미리보기 | 지금은 메타데이터 비교와 내려받기 |
| 8 | 학생 홈 바로가기 버튼의 읽기 전용 표시 정리 | 쓰기는 막혀 있고 안내 Modal만 뜸 |
| 9 | 운영 Storage(Provider·백업·악성코드 검사), WebP 업로드 허용 여부 | |
| 10 | 노트 블록 형식(OD-A05), 관리자 전체 현황 KPI http | 이전 NEXT-STEPS 그대로 |
| 11 | PR 단계 공동 Review(`/database/` Migration 3개, `docs/api/` §62-2) 기록 | 사용자 전달 승인과 별도 |
