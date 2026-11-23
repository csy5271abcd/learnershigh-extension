# 기술적 한계와 대응 계획

> 실제 코드·실행 기록에서 확인된 한계만 적는다. 대응은 `FUTURE-WORK-BACKLOG.md` ID로 연결했다.

## 1. 분석기

| # | 한계 | 근거 | 영향 | 대응 |
|---|---|---|---|---|
| L1 | 실제 문서 정확도 미측정 | 사람 판정 0 | 어떤 수치도 정확도로 말할 수 없음 | P1-01·02 |
| L2 | 분석기를 실제 문서 10개에만 실행 | v4~v21.2 | 5,170개 중 형식·학교 다양성 대부분 미검증 | P1-17, P1-11 |
| L3 | PDF 표는 괘선이 있어야 재구성 | `pdf_model` docstring | 괘선 없는 표·2단 배치 미인식(G009) | P1-08 |
| L4 | 여러 쪽에 걸친 표 연결 없음 | `integrity.limits` | 쪽 넘김 채점표가 끊김(후보 259) | P1-06 |
| L5 | PDF 칸 글 섞임·이름 손상 | G003 이름 손상 11 | 해당 평가 전송 제외 | P1-05 |
| L6 | PDF 세부표 연결 실패로 수행 활동 0 | G003·G009·G013 | 학생에게 활동이 비어 보임 | P1-04 |
| L7 | 회전된 PDF 쪽 표 재구성 안 함 | `pdf_model` | 가로 쪽 PDF 일부 | P1-05 |
| L8 | 스캔 PDF 분석 불가(OCR 없음) | 텍스트 없음 120 | 해당 학교 문서 분석 불가 | P1-18, P3-02 |
| L9 | DOCX 미지원 | `UNSUPPORTED_FORMAT` | 1개교 5개 | P3-03 |
| L10 | HWP·HWPX 쪽 정보 없음 | 형식 특성 | 공식 PDF 계약 사용 불가 → 실험 계약 | P2-11·12 |
| L11 | HWPX 0.1 중첩 표 칸 좌표 결함, 캡션 미보존(기본 경로) | v21.2 NEXT-STEPS | 중첩 표 HWPX에서 Locator 겹칠 수 있음 | P1-10 |
| L12 | 평가 영역(`area`) 거의 미추출 | Adapter 출력 | Backend `area` 대부분 null | P1-12 |
| L13 | 시기 표현이 여러 곳에서 다르면 null | G024 P01 | 사람이 골라야 함 | (의도된 동작) |
| L14 | 차수는 이름에 숫자가 있을 때만 | Adapter 0.2 | '중간·기말'형 지필 전송 제외(실문서 9) | P2-12(차수 표현 계약) |
| L15 | 추정 제출물 미전송 | Adapter | 학생 화면 제출물 빈 칸 | P2-12 |
| L16 | 기본점수·조건 구조·문항 유형 점수·학년/학기 계약 밖 | gaps | Backend에 저장 안 됨 | P2-12 |
| L17 | 운영계획 구조화 없음 | 표 분류만 | 운영계획 자동 추출 불가 | P1-13 |
| L18 | 감점형 채점표 | G031 | 채점 구조 미추출 | P1-12 |
| L19 | 처리 시간: 수백 쪽 PDF 수십 초 + Java | v4 | 120초 제한·동시 2에서 대형 문서 위험 | P2-08, P3-05 |
| L20 | 분석 서비스는 개발용(127.0.0.1, 공유 토큰, 개인 PC) | 서비스 코드 | 운영 불가 | P2-07 |

## 2. Backend·Frontend·운영

| # | 한계 | 근거 | 대응 |
|---|---|---|---|
| B1 | 인증이 Mock Header | `MockHeaderAssessmentActorProvider`, Spring Security 없음 | P2-01 |
| B2 | 학업 Context Mock | `MockAcademicContextProvider` | P2-04 |
| B3 | 평가계획서 원본 미보관 | Revision에 SHA·크기만 | P2-05 |
| B4 | 결과물 Storage 개발용 로컬 | `LocalFileArtifactStorage` | P2-05·06 |
| B5 | 분석 수신 Endpoint가 계약 문서에 없음(PROPOSED) | `api-contract.md` 검색 0 | P2-11 |
| B6 | 분석 상태 2종(REVIEW_REQUIRED/FAILED), 비동기·재시도 없음 | `PlanAnalysisStatus` | P2-08 |
| B7 | HWP·HWPX 운영 확정 차단 | `structured-confirm-dev=false` | P2-03 |
| B8 | 학생은 확정 값을 받지 못함(상태·itemKey만) | `StudentEvaluationPlanResponse` | P3-09 |
| B9 | 결과물 비교는 메타데이터만 | Phase B | P3-06 |
| B10 | Frontend 단위 테스트 없음 | REGRESSION | P3-08 |
| B11 | 최신 회귀 일부 미실행, 낡은 스크립트 2 FAIL | Phase B REGRESSION | P0-01·02 |
| B12 | 기본 개발 DB Migration 이력 불일치 | 시연 점검 | P0-03 |
| B13 | Backend Claude 경로가 분석기 근거 체계와 분리 | 코드 | P3-01 결정 시 통합 |
