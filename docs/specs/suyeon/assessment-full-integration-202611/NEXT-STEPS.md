# 남은 작업 (AI 분석 품질 개선 제외)

| 순서 | 작업 | 선행 조건 | 담당 |
|---|---|---|---|
| 1 | 학생 기록 테이블 Migration·계약 확정 PR (노트·Revision·Artifact·Version·Feedback·Snapshot·Reply·Growth·Resource·Favorite) | Wangyu Review (B-1) | Suyeon 작성 + Wangyu 승인 |
| 2 | File Storage 결정(로컬 격리 폴더 → 운영 저장소), 다운로드 권한 검사 | API-OD-A03 (B-2) | Suyeon + 팀 |
| 3 | Backend assessment 패키지: 노트·Revision → 결과물·Version → 피드백(Snapshot 불변) → 성장 기록 → 자료함·즐겨찾기 순 구현 + Integration Test | 1·2 | Suyeon |
| 4 | Student·Admin http Adapter 교체(같은 계약), Admin 피드백 대기열·답변·전달, 학생 기록 읽기 전용 | 3 | Suyeon |
| 5 | Cross-Surface E2E 03~07·11 작성 (`testing.md` §8·9·16) | 4 | Suyeon |
| 6 | 관리자 학생 목록·담당 범위 원천(기존 LearnersHigh 연동) | Integration Boundary·인증(B-5·B-6) | 팀 |
| 7 | 분석 수신 Endpoint(C-10)·분석 서비스 호출 경로를 공식 계약으로(Backend가 분석기 호출 → 원본 보관과 함께) | B-2·B-4 | Suyeon + Wangyu |
| 8 | HWP·HWPX 공식 확정(Phase B Gate 1~3) | 승인 패킷 서명 | Suyeon + Wangyu |
| 9 | 회귀 기준선 6종을 새 Schema에서 재실행, 5173 Flag OFF 상태로 S7 확인 | root로 Schema 생성 (B-7) | Suyeon |
| 10 | 작은 개선: Admin 검토 페이지 제목의 Revision ID → 파일명, Admin 심화 탐구 화면도 정적 원천으로 | 없음 | Suyeon |
| 11 | 미사용 심화 Task 코드 정리(직전 보고서 §4 목록) | Admin canonicalSource·Type 정리 영향 검토 | Suyeon |
