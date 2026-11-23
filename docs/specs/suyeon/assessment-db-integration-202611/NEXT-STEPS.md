# 남은 작업 (AI 분석 고도화 제외)

| 순서 | 작업 | 비고 |
|---|---|---|
| 1 | HWP·HWPX Phase B 구현 (D-1 Migration + PDF Review `evidence_format` 기록 + M-1~M-7 + A안 원문 대조 기록 + Mock 인증 운영 확정 차단 + fieldPath 중복 방지) | `HWP-HWPX-REVIEW.md` 순서대로. PDF 회귀 필수 |
| 2 | 관리자 "학생 화면 보기"(읽기 전용) http 연결 | 학생 전체 Snapshot API 또는 Student 화면이 관리자 읽기 API를 쓰는 방식 결정 |
| 3 | 결과물 미리보기(§26 `/preview`, PDF·이미지) 및 두 버전 비교(§25-1·§37) | 미지원 형식은 메타데이터 비교 |
| 4 | 삭제·휴지통·보존 정책(OD-A11) | 결과물·자료·참고자료 DELETE |
| 5 | 노트 블록 저장 형식 확정(OD-A05), 자료 카드 삽입 계약(§23) 검토 | 지금은 임시 형식 그대로 저장 |
| 6 | 추천 자료원(과목별)을 정적 원천으로 http에서도 제공 | 과목 이름 매핑을 학업 정보와 분리 |
| 7 | 관리자 전체 현황 KPI http 연결 | Source Entity 계산 |
| 8 | 실제 인증·학생 원천·관리자 권한 모델(API-OD-A01·OD-A04·OD-A08) | Mock 관리자 `adm_demo_gangnam` 제거 |
| 9 | 운영 Storage(Provider·백업·보존·악성코드 검사) | 지금은 개발용 로컬 |
| 10 | 기준선 6종 브라우저·HTTP 회귀를 새 Schema에서 재실행 | Schema 생성 권한 필요 |
| 11 | PR 단계 공동 Review(`/database/`, `docs/api/`) 기록 | 사용자 전달 승인과 별도로 저장소 기록 |
