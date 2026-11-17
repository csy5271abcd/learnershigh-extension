# 다음 단계 (시연 이후)

## 1. 시연 직후

| 할 일 | 비고 |
|---|---|
| 승인 요청서 공유·서명 받기 | `PHASE-B-APPROVAL-PACKET.md`. Suyeon + Wangyu |
| 시연에서 나온 질문·버그 기록 | `docs/specs/suyeon/progress.md`(실제 상태 기준) |

## 2. PDF 색인·중복 무결성 (결정 5)

현재 PDF review는 `items[01]` 같은 비정규 색인을 허용하고, **같은 fieldPath를 한 요청에 두 번 보내도 둘 다 저장한다**(서버 중복 검사·DB Unique 없음). 학생 응답에 같은 필드 값이 두 개 나갈 수 있다. 로컬 합성 데이터에는 해당 행이 없다(실측 0).

순서: 결정 5 승인 → PDF `FIELD_PATH` 색인 정규형 + 요청 안 `duplicate` 검사(Assessment 코드) → PDF 브라우저 43·회귀 33·HTTP 33 재실행 → 필요하면 DB Unique 제약을 별도 Migration으로(Shared 승인).

## 3. HWP·HWPX 검토 활성화

`PHASE-B-APPROVAL-PACKET.md` §6의 1~11. 실험 Flag 기본 OFF는 승인 뒤에도 유지하고, 활성화는 따로 결정한다.

## 4. 실제 관리자 인증

- 기존 LearnersHigh 인증 확인(Open Decision, `api-contract.md` API-OD-A01) → Integration Client
- 그 전에는 운영에서 HWP·HWPX 확정을 켜지 않는다(결정 4)
- 검토자 신원·시각이 실제 감사 기록이 되는 시점부터 "사람 검토 실적"을 집계한다

## 5. Storage

- B안(서버 보관 원본 열람)의 전제. 지금은 원본을 저장하지 않고 SHA-256·크기만 저장한다
- 결정 후 Admin의 "원본 PDF 보기" 버튼(현재 비활성)과 HWP·HWPX 서버 측 원문 대조를 연결한다

## 6. AI v21.2-quality 반영

- 계정 B 593 테스트 통과 보고. 시연 기준선은 v21.1
- 승인된 계약(M-3·M-6) 기준으로 v21.2 출력 JSON을 Backend 수신 검증에 통과시키는 시험을 새 Schema에서 실행
- 계정 B 협의: 필드별 근거 참조, 영역 노드 구조 Locator(결정 3-(C)), itemKey 안정성 규칙
- 기본 분석기 전환은 별도 결정

## 7. 정책 결정 대기 (바꾸지 않음)

| 정책 | 현행 |
|---|---|
| 같은 Revision 재검토 | 화면에서 추가 확정 차단, 서버는 여러 검토 기록 허용 |
| 최신 미확정 Revision이 있을 때 이전 확정본 학생 공개 | 최신 Revision만 학생에게 보임(시연 주의점, `DEMO-RUNBOOK.md` §6) |
| 재분석으로 itemKey 변경 시 학생 참조 | 자동 수정 없음 |

## 8. 환경

- 기본 개발 DB `learnershigh_extension`의 Migration 이력 불일치(`202610150300`) 원인 확인 — 다른 담당자 작업일 수 있으므로 **확인 전 수정 금지**
- 시험 Schema가 40개 가까이 쌓였다(모두 합성). 정리 여부는 사용자가 결정(이번에 삭제하지 않음)
- 백그라운드 Vite 종료 시 Node 자식 프로세스가 남는 문제 — 시험 스크립트에 종료 확인 단계 추가 검토
