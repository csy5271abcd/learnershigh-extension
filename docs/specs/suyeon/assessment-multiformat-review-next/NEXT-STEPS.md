# 다음 단계

## 1. 승인 요청 (이 폴더의 제안서)

| 승인 대상 | 문서 | 결정할 것 |
|---|---|---|
| Shared API 계약 M-1~M-7 (M-8 보류) | `API-CONTRACT-PROPOSAL.md` | 등록 형식·응답 필드·수신 필드·path 규칙·review 근거 Shape |
| D-1 Migration | `MIGRATION-D1-PROPOSAL.md` | `JSON` Column 채택 여부, CHECK 제약, 원문 확인 기록 Column |
| 원문 검토 절차 | `SOURCE-REVIEW-DESIGN.md` | A안(관리자 수동 확인 기록) 단기 도입 여부, B안(Storage) 일정, A′(HWPX 브라우저 칸 보기) 라이브러리 승인 |

## 2. 승인 뒤 작업 순서

`REVIEW-IMPLEMENTATION-STATUS.md` §4.

## 3. 정책 결정 대기 (기존 동작 유지 중)

| 정책 | 지금 동작 | 대안과 영향 |
|---|---|---|
| 같은 Revision 재검토 | 이미 확정된 Revision은 화면에서 추가 확정 차단. 서버는 막지 않음(여러 검토 기록 가능), itemKey는 "검토된 Run 중 하나" 기준 | (a) 새 검토가 이전을 대체(대체됨 상태 필요) (b) 누적 — 학생 노출 값이 여러 개가 될 수 있음 |
| 최신 미확정 Revision이 있을 때 이전 확정 Revision의 학생 공개 | 학생 목록은 문서별 **최신 Revision**만(개정본이 미확정이면 확정 정보가 학생에게 안 보임) | (a) 최신 확정 Revision을 보여줌 (b) 현행 유지. HWP·HWPX 도입과 무관하게 PDF에도 같은 영향 — 이번에 바꾸지 않음 |
| 재분석으로 itemKey가 바뀔 때 학생 참조 | 기존 참조는 바꾸지 않음(자동 수정 없음) | 계정 B의 itemKey 안정성 규칙과 함께 결정 |

## 4. 운영 적용 전 요구사항

- 실제 관리자 인증(확정자 신원), 실제 학업 Context·운영 권한
- File Storage 정책(B안 전제)
- 개인 메타데이터 없는 합성 HWP·HWPX Fixture로 저장소 안 자동 테스트
- 실제 학교 HWP·HWPX(승인 범위)로 검토 절차 시범 운영
- Docker·메모리 여유 확인(최근 환경 장애 2회)
