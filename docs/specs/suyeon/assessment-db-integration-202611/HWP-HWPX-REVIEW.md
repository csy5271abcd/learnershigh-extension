# HWP·HWPX 공식 검토 (Phase B) — 상태

**이번 작업에서 구현하지 않았다.** 학생 기록 실데이터(노트·결과물·피드백·성장 기록·자료)와 교차 E2E를 먼저 끝까지 완성하는 데 시간을 썼다(지시서 §21 "핵심 데이터 흐름을 끝까지 완성").

| 항목 | 상태 |
|---|---|
| D-1 Migration(`evidence_format`·`evidence_locator_json`·`analysis_subject_index`·`source_check_method`·`source_check_sha256`) | 미적용. 초안은 `assessment-multiformat-review-gate-202611/` 그대로 |
| PDF Review Service의 `evidence_format` 기록(D-1 NOT NULL 호환) | 미변경 — D-1과 **함께** 한 배포 단위로 바꿔야 함 |
| M-1~M-7 검토 API·`evidence_scope_unavailable`·`evidence_required` | 미구현 |
| 관리자 로컬 원본 수동 대조 A안 기록 | 미구현 |
| fieldPath 비정규 색인·중복 확정 방지(PDF 포함) | 미구현 — 기존 PDF 데이터 회귀 검증 필요 |
| 현재 동작 | HWP·HWPX 확정은 기존대로 차단(`review_not_supported`, 확정 버튼 비활성). 실험 Flag 기본 OFF |

사용자가 Gate 1~3·결정 1~6 채택을 전달했으므로, 다음 작업에서 바로 구현할 수 있다. 권장 순서: D-1 SQL을 새 Migration으로(기존 PDF 행은 `evidence_format='PDF'` Backfill) → Entity·PDF Review Service가 `evidence_format` 기록 → HWP·HWPX 검토 요청에 필드별 `documentLocator`·원본 SHA·명시적 확인 → Mock 인증일 때 운영 확정 차단 → PDF fieldPath 중복 방지 회귀 → 합성 HWPX 확정 E2E.
