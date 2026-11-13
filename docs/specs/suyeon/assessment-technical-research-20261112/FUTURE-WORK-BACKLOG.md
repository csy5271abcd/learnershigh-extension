# 향후 작업 Backlog (Assessment 전체)

> 근거: 최신 코드·보고서 대조(`CURRENT-IMPLEMENTATION-STATUS.md`). 이미 구현된 항목은 넣지 않았다(예: 학생 기록 DB·피드백·휴지통·HWPX 개발 검토는 완료).
> 출처 약어: **PB** = `docs/specs/suyeon/assessment-phase-b-and-ux-completion-202611/NEXT-STEPS.md` · **DF** = `assessment-demo-final-check-202611/NEXT-STEPS.md` · **Q2** = `CA/runs/v21-2-quality-improvement-202611/NEXT-STEPS.md` · **EP** = `CA/runs/v19-real-document-validation-20261109/REAL-DOCUMENT-EVALUATION-PLAN.md` · **TL** = 이 조사의 `TECHNICAL-LIMITATIONS-AND-PLANS.md` · **AC** = `docs/api/api-contract.md` Open Decisions
> 코드의 TODO·FIXME 표시는 Assessment Backend·Frontend·분석기 핵심 모듈에서 0건이었다(이번 검색). 남은 일은 모두 보고서의 NEXT-STEPS에 적혀 있다.
> 우선순위: **P0** 시연·핵심 안정화 · **P1** 분석 기술·검증 · **P2** 운영 준비 · **P3** AI·서비스 고도화

## P0 — 시연·핵심 기능 안정화

| ID | 영역 | 작업 | 현재 상태 | 선행 조건 | 완료 기준 | 근거 |
|---|---|---|---|---|---|---|
| P0-01 | 테스트 | 빈 Schema에서 미실행 기준선 재실행: PDF HTTP 33 · 실험 OFF 9 · Adapter 83 · D-1 42 · PDF 사본 14 · Admin PDF 13 · HWP/HWPX 15×2 | 미실행(11-12) | 새 시험 Schema 생성 권한 | 기준 수 그대로 통과, 결과 문서화 | PB 4 |
| P0-02 | 테스트 | 낡은 브라우저 스크립트 갱신(A1·`review-confirm-disabled`·A4 Schema 의존, 점검표 6을 Phase B 상태로) | 2 FAIL씩 남음 | – | 요구사항을 약화하지 않고 43/33 기준 재통과 | PB 5 |
| P0-03 | Backend·DB | 기본 개발 DB `learnershigh_extension`의 Migration 이력 불일치(`202610150300`) 원인 확인 | 미확인, 수정 금지 | 담당자 확인 | 원인 기록, 필요 시 공동 Review로 정리 | DF 8 |
| P0-04 | 운영 | 시험 Schema 약 40개 정리 여부 결정 | 보류 | 사용자 결정 | 정리 또는 보존 목록 | DF 8 |
| P0-05 | 운영 | 백그라운드 Vite 종료 시 Node 자식 프로세스 잔존 대응 | 미해결 | – | 시험 스크립트에 종료 확인 단계 | DF 8 |
| P0-06 | 협업 | PR 단계 공동 Review 기록(Migration 3개, `docs/api/` §62-2) | 사용자 전달 승인만 | PR 생성 | `@suyeon @wangyu` Review 기록 | PB 11 |
| P0-07 | Frontend | 학생 홈 바로가기 버튼의 읽기 전용 표시 정리 | 안내 Modal만 | – | 읽기 전용 화면에서 쓰기 버튼 비노출 | PB 8 |

## P1 — 분석 기술·검증

| ID | 영역 | 작업 | 현재 상태 | 선행 조건 | 완료 기준 | 근거 |
|---|---|---|---|---|---|---|
| P1-01 | AI·검증 | **개발 분할 10개 문서 사람 검토 → 두 번째 독립 검토 → 판정(ADJUDICATED)** | 0건. 스키마·검토 도구 있음 | 검토자 2명 지정 | 10개 문서 ADJUDICATED, 검토자 간 불일치율 기록 | EP §3 |
| P1-02 | AI·검증 | 실제 문서 Baseline 지표 산출(평가 P/R, 구간 정확도, 과제 누락률, 채점 연결, Locator 정확도, 형식별 실패율) | 계산 코드 있음(`real_metrics.py`), 값 없음 | P1-01 | v21.1 지표표, 합성과 분리 | EP §2 |
| P1-03 | AI·검증 | 60개교 Benchmark 확장: 검증 분할 10개교 → 시험 분할 10개교 정답 | 분할만 고정(개발 40·검증 10·시험 10) | P1-02, 스키마·지침 고정 | 시험 분할 정답은 개발에 참여하지 않은 검토자가 작성 | EP §1 |
| P1-04 | AI·PDF | 세부표 ↔ 평가 연결(PDF 수행 활동 0 문제: G013·G003·G009) | 미해결 | P1-01 일부(정답) 권장 | 활동 FOUND 증가 + 잘못 연결 0(사람 확인) | Q2 §2-1 |
| P1-05 | AI·PDF | PdfLayout 칸 복원 개선(괘선 누락·칸 글 섞임, G003) | 파서 재설계 범위 | 새 파서 버전 분리 | 이름 손상·구조 손상 표 감소, 기존 결과 재현 프로필 유지 | Q2 §2-3 |
| P1-06 | AI·PDF | 쪽 넘김 표 연결 | 미구현(후보 259개 미연결) | 재현 사례 수집 | 쪽 넘김 채점표가 한 평가로 들어감 | v19 감사, Q2 §2-5 |
| P1-07 | AI·PDF | 40자 초과·여러 줄 평가명 처리 | 미해결(G009) | – | `nameQuality` 표시 유지 + 이름 부분 추출 | Q2 §2-2 |
| P1-08 | AI·PDF | 2단 가로 배치·괘선 없는 평가요소 레이아웃 해석 | 미해결(G009) | – | 연결할 세부 영역 생성 | v21.1 PDF-BEFORE-AFTER |
| P1-09 | AI·공통 | v21.2-quality(2단 머리글·캡션·HWPX 0.2) 기본 반영 여부 결정 | 개발 프로필 | P1-01(G013 새 평가 39개 검토) | 승인 후 기본 프로필 전환, `analyzer.version` 구분 | Q2 §6 |
| P1-10 | AI·HWPX | HWPX 파서 0.1 중첩 표 좌표 결함 해소(0.2 기본화) | 기본 경로에 결함 잔존 | P1-09 | 중첩 표 Locator 중복 0 | Q2 §3 |
| P1-11 | 데이터 | 평가가 들어 있는 실제 HWPX·캡션 있는 HWP/HWPX·다른 학교 PDF 추가 확보(개발 분할) | 실문서 HWPX 1개(평가 없음) | – | 형식별 개발 문서 ≥3개 | Q2 §3·§4 |
| P1-12 | AI·채점 | 감점형·복합 채점표, 기본점수·미제출 규정의 구조화 | 표시·gaps만 | P1-01 | 규정이 평가에 연결되고 계약 제안 C-항목에 반영 | v4 실패 3, v21 gaps |
| P1-13 | AI·운영계획 | 교수학습 운영표 구조화(월·주·단원·성취기준·방법) | 표 분류만 | 계약 필드 결정(P2-12) | 운영계획 JSON + 근거 | `DOCUMENT-MODEL-AND-EXTRACTION.md` |
| P1-14 | Backend·AI | 필드별 근거 참조(같은 항목 안 필드별 Locator) | 미구현 | 계약 변경 합의 | 확정값마다 자기 근거 | PB 3 |
| P1-15 | 테스트 | 실제 HWP 원본 + 분석기 출력으로 검토 E2E(브라우저) | 합성 HWP 통합 테스트만 | 실제 문서 반입 승인 | HWP 브라우저 E2E 통과 | PB 2 |
| P1-16 | 테스트 | 실제 PDF·HWPX 실문서 E2E(등록 → 수신 → 검토) | 합성만 | 실제 문서 DB 반입 승인, 격리 Schema | 실문서 1건 이상 E2E | v21.1 REPORT §6 |
| P1-17 | 테스트 | 분석기 전수 실행(5,170 또는 고유 5,132)으로 파싱·구간·목록 생성률 측정 | 10개만 | 실행 시간·메모리 계획(시연 환경 밖) | 형식별 성공률·처리 시간 분포 | 이번 조사 |
| P1-18 | AI·PDF | 스캔 PDF 식별·분리(텍스트 없음 120개) | Probe 상태만 | – | 스캔 PDF는 `UNSUPPORTED` 이유와 함께 명확히 실패 | 코퍼스 통계 |

## P2 — 운영 준비

| ID | 영역 | 작업 | 현재 상태 | 선행 조건 | 완료 기준 | 근거 |
|---|---|---|---|---|---|---|
| P2-01 | 인증 | 실제 학생·관리자 인증·인가 연결(기존 LearnersHigh) | Mock Header | API-OD-A01 결정 | Mock Provider는 개발 Profile에만, `reviewer_auth=VERIFIED` | PB 1, AC |
| P2-02 | 인증 | 학교·지점 권한 범위 | 일부(관리자 학생 화면 보기 지점 확인) | P2-01 | 모든 관리자 API 지점 범위 검사 | Phase B |
| P2-03 | Backend | HWP·HWPX 운영 확정 활성화 | 차단 | P2-01, P1-15 | 실제 인증 + 실험 Flag 정책 결정 후 허용 | PB 1, DF 3 |
| P2-04 | 연동 | 학업 Context 실제 Client | Mock | API-OD-07 | `learnershigh.integration.mode=mock` 제거 | `application.yml` |
| P2-05 | Storage | 운영 File Storage(Provider·백업·악성코드 검사), 평가계획서 원본 보관 | 개발 로컬, 원본 미저장 | Storage 결정(API-OD-A03) | "원본 PDF 보기" 활성, 서버 측 원문 대조 | PB 9, DF 5 |
| P2-06 | 보안 | 업로드 파일 악성코드 검사·WebP 허용 여부 | 서명 검사만 | P2-05 | 검사 통과 파일만 저장 | PB 9 |
| P2-07 | 분석 연동 | 분석기를 Backend 뒤로(브라우저 → Vite Proxy 구조 제거) | 개발 Proxy | 배포 위치·인증 결정 | 운영 번들·브라우저에 분석기 경로 없음, Backend가 서비스 간 인증으로 호출 | 이번 조사(구조) |
| P2-08 | 분석 연동 | 비동기 분석·상태 관리·실패 재시도 | 동기(120초), 상태 2종 | P2-07 | PROCESSING 등 상태 Enum 결정, 재시도 정책 | `PlanAnalysisStatus` 주석 |
| P2-09 | 데이터 | 휴지통 보존 기간·영구 삭제·개인정보 삭제 의무 | 자동 영구 삭제 없음 | OD-A11 | 정책 + 배치 | PB 6 |
| P2-10 | 운영 | 백업·복구, 로그·모니터링, 비밀정보 관리 | 없음 | 배포 환경 결정 | 운영 Runbook | 이번 조사 |
| P2-11 | 계약 | analysis-imports Endpoint를 `api-contract.md`에 반영(PROPOSED → 확정) | 미반영(검색 0건) | 공동 Review | 계약 절 추가 | API 조사 |
| P2-12 | 계약 | 계약 밖 정보(기본점수·학년/학기·조건 구조·값 상태·운영계획) 필드 확장 결정 | gaps로만 | P1-02 근거 | 계약 버전 업 + Validator | v21.1 Adapter C1~C4 |
| P2-13 | 데이터 | 재분석으로 itemKey가 바뀔 때 학생 참조 처리, 같은 Revision 재검토 정책, 이전 확정본 공개 정책 | 정책 대기 | domain 결정 | 정책 문서 + 구현 | DF 7 |
| P2-14 | 비용 | Backend Claude 분석 사용 시 Provider·비용·재시도·외부 전송 정책 | OPEN_DECISION | API-OD-A10 | 승인 기록 | §47-A |

## P3 — AI·서비스 고도화

| ID | 영역 | 작업 | 현재 상태 | 선행 조건 | 완료 기준 | 근거 |
|---|---|---|---|---|---|---|
| P3-01 | AI | 선택적 LLM 결합(규칙이 실패한 구간·표만 LLM, 근거 검증 필수) | 합성 실험만(22회) | P1-02 Baseline, 개인정보 마스킹·실문서 전송 승인 | 같은 문서에서 규칙 대비 지표 개선 + 근거 검증 100% | `AI-ENHANCEMENT-RESEARCH.md` |
| P3-02 | AI | OCR(스캔 PDF 120개 + 이미지 전용 쪽) | 없음 | P1-18, 필요성 확인 | OCR 결과도 Locator·인용 검증 | 코퍼스 통계 |
| P3-03 | AI | DOCX 지원 | 없음(코퍼스 5개) | 필요성 확인 | DOCX → DocumentModel | 코퍼스 통계 |
| P3-04 | AI | 문서 개정본(Revision) 비교 | 없음 | P2-05(원본 보관) | 평가 값 Diff + itemKey 매핑 | – |
| P3-05 | AI | 분석 처리 속도(PDF 수백 쪽 수십 초) | 측정만 | P1-17 | 쪽 수 대비 처리 시간 목표 | v4 |
| P3-06 | Frontend | 결과물 내용 비교(PDF 텍스트 Diff), Office·HWP 안전 변환 미리보기 | 메타데이터 비교만 | P2-05 | 내용 Diff 화면 | PB 7 |
| P3-07 | Frontend | 반응형·접근성·실제 학생 사용성 검증 | 미실시(Headless만) | – | 사용성 시험 기록 | DF §5 |
| P3-08 | Frontend | Frontend 단위 테스트 구성 | 미구성 | – | 핵심 Adapter·화면 테스트 | REGRESSION |
| P3-09 | 서비스 | 공식 평가정보(확정값)를 학생 화면에 활용(현재 상태·itemKey만) | 미구현 | 계약 결정 | 학생 응답에 확정 값 | API 조사 |
| P3-10 | Backend | 노트 블록 형식(OD-A05), 관리자 전체 현황 KPI http | 미정 | 계약 결정 | | PB 10 |
