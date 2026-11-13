# 시연 전 최종 점검 — 결과 보고 (2026-11-11)

## 1. 결론

**PDF v21.1 기준선은 시연 가능한 상태다.** 이번에 실행한 회귀가 모두 기준선과 같은 수로 통과했고 실패는 0건이다. HWP·HWPX 확정은 계속 막혀 있다. Phase B는 공동 승인 기록이 없어 **시작하지 않았다.**

| 성공 기준 | 결과 |
|---|---|
| 1. 기존 PDF 시연 기능 정상 | 통과 — 브라우저 43/43, 회귀 33/33, HTTP 33/33 |
| 2. Backend 261 단위·129 통합 | 통과 — 261 / 129, 실패·건너뜀 0 |
| 3. Frontend typecheck·lint·build | 통과(PARTIAL PASS — Frontend 단위 테스트는 원래 미구성이라 **통과로 보지 않음**) |
| 4. PDF 브라우저·HTTP 회귀 | 통과 |
| 5. HWP·HWPX E2E | 통과 — HWP 42 · HWPX 41(재시험 기준, `FINAL-REGRESSION.md` §2) |
| 6. 실험 OFF | 통과 — 9/9 |
| 7. HWP·HWPX 확정 차단 유지 | 유지 — 9개 항목 확인(`FINAL-REGRESSION.md` §3) |
| 8. Phase B 결정 항목 6개 정리 | 완료 — `PHASE-B-APPROVAL-PACKET.md` §3 |
| 9. Gate 1~3 상태 명확화 | 완료 — Gate 1 수정 후 승인 필요, Gate 2·3 승인 대기, 승인자 미정 |
| 10. 시연 실행 가이드 | 완료 — `DEMO-RUNBOOK.md` |

## 2. 작업 중 발견한 것

| # | 내용 | 조치 |
|---|---|---|
| 1 | HWP·HWPX E2E 1차가 **실험 표시 Flag 없는 Admin**(이전에 띄운 Vite가 남아 있었음)을 상대로 돌았다 | 1차 결과 무효 처리, 남은 프로세스(제가 띄운 것만) 종료, 새 Schema에서 Flag 확인 뒤 재시험 83/83 |
| 2 | PDF review는 fieldPath 비정규 색인뿐 아니라 **같은 fieldPath 중복 확정도 막지 않는다**(서버 검사·DB Unique 없음). 학생 응답에 같은 필드 값이 두 개 나갈 수 있다 | 시연 전 PDF 코드는 바꾸지 않음. 결정 5에 영향 분석(합성 데이터 비정규 0행, 실제 흐름 중복 0)과 권장안 기록 |
| 3 | 계약안은 HWP·HWPX Locator 누락을 `required`로 적었지만, PDF는 같은 상황에 `evidence_required`를 쓴다 | 결정 1에 `evidence_required`로 맞추는 안 기록(계약 미변경) |
| 4 | 기본 개발 DB `learnershigh_extension`에 Assessment 테이블이 없고, 저장소에 없는 Migration 이력(`202610150300`)이 있다 | 수정하지 않음. 시연은 전용 새 Schema를 쓰도록 가이드에 기록 |
| 5 | Admin의 "Backend 꺼짐" 오류는 "연결 전" 리소스로만 확인됐다 | 한계로 기록. Admin 네트워크 실패는 PDF 등록 흐름(43건 중 1건)에서 확인됨 |

## 3. 변경 파일

| 파일 | 내용 |
|---|---|
| `docs/specs/suyeon/assessment-demo-final-check-202611/REPORT.md` 외 4개 | 이 보고서 묶음(신규) |
| `docs/specs/suyeon/assessment-demo-final-check-202611/scripts/demo-env-check.mjs` | Mock 모드·Backend 꺼짐 화면 점검 스크립트(신규, 읽기 전용 확인) |

코드·계약·Migration·설정 변경 없음. 기존 보고서는 덮어쓰지 않았다. Commit·Push·Merge하지 않았다.

## 4. 환경 변경과 최종 상태

| 항목 | 내용 |
|---|---|
| 새로 만든 Schema | `lh_demo_v211`, `lh_demo_off`, `lh_demo_pdf`, `lh_demo_mf`(1차, 무효), `lh_demo_mf2` — 합성 데이터, `learnershigh` 사용자에게 각 Schema 권한만 부여. 삭제하지 않음 |
| 기존 Schema·Volume | 읽기만(중복 집계 쿼리). 변경·삭제 없음 |
| 종료한 프로세스 | 지난 턴과 이번 턴에 제가 띄운 Backend(java)·Vite(node)만. 명령줄로 확인한 뒤 종료 |
| 개발 서버 | 모두 종료(18080·5173·5174 응답 없음 확인) |
| MySQL 컨테이너 | `learnershigh-mysql` **실행 중(healthy)** — 시연 준비를 위해 켜 둠 |
| Docker Desktop | 실행 중 |
| Backend Jar | `backend/build/libs/` 재빌드(현재 코드, 빌드 산출물) |

## 5. 미완료 / 남은 일

1. Gate 1~3 승인과 결정 1~6(`PHASE-B-APPROVAL-PACKET.md`)
2. Phase B 구현 전체(승인 후)
3. PDF 중복·비정규 색인 무결성(결정 5, 시연 후)
4. 실제 관리자 인증·Storage·v21.2 반영(`NEXT-STEPS.md`)
5. 시연 PC 해상도에서의 시각 확인(이번에는 Headless만)
